// Telegram storage layer for Telecloud.
//
// Layout inside your own Telegram account:
//   folder = a private channel whose title starts with "TC · "
//   entry  = 1 document message (the code file, caption "#tc {json}")
//          + 1 optional text message ("#tcq <id>" + the question)
//          + 1 optional photo/album (caption "#tci <id>", the screenshots)
//
// Everything new is written with the TC tags. Data saved by older versions ("CV · " folders and
// "#cv", "#cvq", "#cvi", "#cvpin" messages, in any letter case) is still read, and is upgraded to
// the TC tags the next time that entry is edited or moved.

import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { CustomFile } from 'telegram/client/uploads';
import { Buffer } from 'buffer';
import * as lock from './lock.js';
import { splitSolutions } from './solutions.js';

const PREFIX = 'TC · ';
const LEGACY_PREFIX = 'CV · '; // old folders still show until you rename them to TC
// The localStorage names below still start with "cv_" on purpose: renaming them would sign
// everybody out of the app.
const LS = { id: 'cv_api_id', hash: 'cv_api_hash', session: 'cv_session' };

// First tag in each list is the one that gets written, the rest are only read.
const TAGS = {
  code: ['#tc ', '#cv '],
  question: ['#tcq ', '#cvq '],
  image: ['#tci ', '#cvi '],
  pin: ['#tcpin ', '#cvpin '],
};

/** The text after the tag when `text` starts with a tag of that kind (old or new), else null. */
function afterTag(text, kind) {
  const t = String(text || '');
  const head = t.slice(0, 8).toLowerCase();
  for (const tag of TAGS[kind]) if (head.startsWith(tag)) return t.slice(tag.length);
  return null;
}

/** Which folder prefix a channel title has (new, old, or none). Letter case is ignored. */
function prefixOf(title) {
  const head = String(title || '').slice(0, PREFIX.length).toUpperCase();
  if (head === PREFIX.toUpperCase()) return PREFIX;
  if (head === LEGACY_PREFIX.toUpperCase()) return LEGACY_PREFIX;
  return null;
}

const qText = (id, q) => `${TAGS.question[0]}${id}\n${q}`;
const imgTag = (id) => `${TAGS.image[0]}${id}`;

export const LANGUAGES = ['C', 'C++', 'Java', 'Python', 'JavaScript', 'SQL', 'HTML/CSS', 'Other'];
const EXT = { C: 'c', 'C++': 'cpp', Java: 'java', Python: 'py', JavaScript: 'js', SQL: 'sql', 'HTML/CSS': 'html', Other: 'txt' };

/** File extension for a language, for example "c" for C. */
export const extFor = (lang) => EXT[lang] || 'txt';

// Telegram answers "everything" with a limit this big when listing chats.
const MAX_DIALOGS = 20000;

let client = null;
let pending = null;
let lockHandle = null; // set once the PIN is entered or created
let sessionCache = null; // the decrypted session, only until restore() has used it
let memKeys = null; // API ID and Hash, kept in memory only (they are saved encrypted, inside the PIN lock)

/* ---------- keys & session (kept in this browser only) ---------- */

// The keys live in memory. They are written to the browser only inside the PIN-encrypted
// login, never as plain text. The plain localStorage copy is only read to upgrade older installs.
export function getKeys() {
  if (memKeys) return memKeys;
  return {
    apiId: Number(localStorage.getItem(LS.id)) || 0,
    apiHash: localStorage.getItem(LS.hash) || '',
  };
}

export function saveKeys(apiId, apiHash) {
  memKeys = { apiId: Number(apiId) || 0, apiHash: String(apiHash) };
}

/** deletes any plain-text keys left in the browser by older versions */
export function wipePlainKeys() {
  localStorage.removeItem(LS.id);
  localStorage.removeItem(LS.hash);
}

// What is encrypted with the PIN: the login session together with the API keys.
function packLogin(session) {
  const { apiId, apiHash } = getKeys();
  return JSON.stringify({ v: 2, s: session, i: apiId, h: apiHash });
}

function unpackLogin(text) {
  try {
    const o = JSON.parse(text);
    if (o && typeof o === 'object' && typeof o.s === 'string') return o;
  } catch (e) {
    /* an older login saved without keys */
  }
  return null;
}

export function hasSession() {
  return lock.hasEncrypted() || !!localStorage.getItem(LS.session);
}

/* ---------- PIN lock ---------- */

/** true when an encrypted login is saved on this device and the PIN is needed to open it */
export const hasLockedLogin = lock.hasEncrypted;

/** true once the PIN was entered or created in this session */
export const isUnlocked = () => !!lockHandle;

/** saves the current login, encrypted, with the PIN that is already unlocked */
export async function saveLogin() {
  sessionCache = null;
  await persist();
}

export const lockStatus = lock.status;

/** Encrypts the current login with a new 6-digit PIN (also upgrades an older, unlocked login). */
export async function setPin(pin) {
  const s = client ? client.session.save() : localStorage.getItem(LS.session);
  if (!s) throw new Error('Not signed in. Please sign in again.');
  memKeys = getKeys(); // keep them in memory, then remove the plain copies
  lockHandle = await lock.createLock(pin, packLogin(s));
  if (!client) sessionCache = s;
  localStorage.removeItem(LS.session); // the plain copies must not stay behind
  wipePlainKeys();
}

async function applyUnlocked(r) {
  lockHandle = r.handle;
  const o = unpackLogin(r.text);
  if (o) {
    memKeys = { apiId: Number(o.i) || 0, apiHash: o.h || '' };
    sessionCache = o.s;
  } else {
    // saved by an older version: the keys are still in plain storage. Move them inside the lock now.
    sessionCache = r.text;
    memKeys = getKeys();
    await lock.saveSession(lockHandle, packLogin(r.text));
    wipePlainKeys();
  }
}

/** Result of lock.unlock(): ok, wait, left or wiped */
export async function unlock(pin) {
  const r = await lock.unlock(pin);
  if (r.ok) await applyUnlocked(r);
  else if (r.wiped) wipePlainKeys();
  return r;
}

/** After a refresh: true when this tab was already unlocked, so the PIN is not asked again. */
export async function autoUnlock() {
  const r = await lock.restoreTab();
  if (!r) return false;
  await applyUnlocked(r);
  return true;
}

/** "Forgot PIN": deletes the saved login so the person can sign in to Telegram again. */
export function resetLock() {
  lock.clear();
  lockHandle = null;
  sessionCache = null;
  memKeys = null;
  localStorage.removeItem(LS.session);
  wipePlainKeys();
}

/* ---------- PIN saved in your Telegram (private channel) ---------- */

// Holds one message "#tcpin {json}" with a salted hash of the PIN, never the PIN. (Older: "#cvpin".)
// The title must NOT start with "TC · " or "CV · ", or it would show up as a code folder.
export const PIN_CHANNEL = 'Private PIN for Tele Cloud';

export const verifyRemotePin = lock.verifyRemote;

async function findPinChannel() {
  await ensureConnected();
  for await (const d of client.iterDialogs({ limit: MAX_DIALOGS })) {
    const e = d.entity;
    // only a channel you own counts, so nobody else can plant a fake one
    if (e && e.className === 'Channel' && e.broadcast && e.creator && e.title === PIN_CHANNEL) return e;
  }
  return null;
}

async function createPinChannel() {
  if (!client.connected) await client.connect();
  const old = client.floodSleepThreshold;
  client.floodSleepThreshold = 0; // show the wait instead of sleeping silently
  let res;
  try {
    res = await client.invoke(
      new Api.channels.CreateChannel({
        title: PIN_CHANNEL,
        about: 'Created by Telecloud. Keeps a scrambled check of your PIN so it works on all your devices. Do not delete.',
        broadcast: true,
        megagroup: false,
      })
    );
  } finally {
    client.floodSleepThreshold = old;
  }
  const chats = res?.chats || res?.updates?.chats || [];
  const ch = chats.find((c) => c.className === 'Channel');
  if (!ch) throw new Error('Telegram did not confirm the new channel. Open Telegram and check, then try again.');
  return ch;
}

/** Looks for the PIN channel and the saved PIN record. rec is null when there is none yet. */
export async function getRemotePin() {
  const channel = await findPinChannel();
  if (!channel) return { channel: null, msgId: null, rec: null };
  const msgs = await reliable(() => client.getMessages(channel, { limit: 30 }), { ms: 60000 });
  for (const m of msgs) {
    const body = afterTag(m.message, 'pin');
    if (body === null) continue;
    try {
      const rec = JSON.parse(body);
      if (lock.isVerifier(rec)) return { channel, msgId: m.id, rec };
    } catch (e) {
      /* not a valid record */
    }
  }
  return { channel, msgId: null, rec: null };
}

/** Saves (or replaces) the PIN record. Creates the channel the first time. `existing` comes from getRemotePin(). */
export async function saveRemotePin(pin, existing) {
  const rec = await lock.makeVerifier(pin);
  const channel = existing?.channel || (await createPinChannel());
  const text = TAGS.pin[0] + JSON.stringify(rec);
  if (existing?.msgId) await reliable(() => safeEdit(channel, { message: existing.msgId, text }));
  else await reliable(() => client.sendMessage(channel, { message: text }));
}

async function makeClient(sessionString) {
  const { apiId, apiHash } = getKeys();
  client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 5,
    useWSS: true,
  });
  // Never sleep silently on a Telegram flood wait: an error comes back instead, so the screen can
  // show the wait (reliable() below waits and retries by itself for saves and edits).
  client.floodSleepThreshold = 0;
  await client.connect();
  return client;
}

async function persist() {
  // Only an encrypted copy is ever saved. A brand new login is saved by setPin().
  if (lockHandle) await lock.saveSession(lockHandle, packLogin(client.session.save()));
}

/* ---------- login ---------- */

export async function restore() {
  const s = sessionCache || localStorage.getItem(LS.session);
  sessionCache = null;
  const { apiId, apiHash } = getKeys();
  if (!s || !apiId || !apiHash) return false;
  try {
    await makeClient(s);
    if (await client.checkAuthorization()) return true;
  } catch (e) {
    console.warn('restore failed', e);
  }
  return false;
}

export async function sendCode(phone) {
  await makeClient('');
  const { apiId, apiHash } = getKeys();
  const r = await client.sendCode({ apiId, apiHash }, phone);
  pending = { phone, hash: r.phoneCodeHash };
}

/** returns "done" or "password" (two-step verification is on) */
export async function verifyCode(code) {
  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: pending.phone,
        phoneCodeHash: pending.hash,
        phoneCode: code,
      })
    );
  } catch (e) {
    if (e.errorMessage === 'SESSION_PASSWORD_NEEDED') return 'password';
    throw e;
  }
  await persist();
  return 'done';
}

export async function verifyPassword(password) {
  const { apiId, apiHash } = getKeys();
  let last = null;
  try {
    await client.signInWithPassword(
      { apiId, apiHash },
      {
        password: async () => password,
        onError: async (err) => {
          last = err;
          return true; // stop retrying, we show the error ourselves
        },
      }
    );
  } catch (e) {
    throw last || e;
  }
  await persist();
}

/** Name, username, phone and photo of the signed-in account. Cached until sign-out. */
let profileCache = null;

export async function getProfile(force = false) {
  if (profileCache && !force) return profileCache;
  if (!client) throw new Error('Not connected to Telegram. Please sign in again.');
  if (!client.connected) await client.connect();
  const me = await client.getMe();
  let photo = null;
  try {
    const buf = await client.downloadProfilePhoto(me, { isBig: false });
    if (buf && buf.length) photo = URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }));
  } catch (e) {
    /* no photo, or it could not be loaded: the app shows initials instead */
  }
  const name = [me.firstName, me.lastName].filter(Boolean).join(' ').trim();
  const phone = me.phone ? (String(me.phone).startsWith('+') ? String(me.phone) : '+' + me.phone) : '';
  profileCache = {
    name: name || me.username || 'Telegram user',
    username: me.username || '',
    phone,
    id: me.id != null ? String(me.id) : '',
    photo,
  };
  return profileCache;
}

function clearProfile() {
  if (profileCache?.photo) URL.revokeObjectURL(profileCache.photo);
  profileCache = null;
}

export async function signOut() {
  try {
    await client.invoke(new Api.auth.LogOut());
  } catch (e) {
    console.warn(e);
  }
  clearProfile();
  try {
    await client.disconnect();
  } catch (e) {
    /* ignore */
  }
  localStorage.removeItem(LS.session);
  lock.clear();
  lockHandle = null;
  sessionCache = null;
  memKeys = null; // the keys are erased too: sign-in starts empty next time
  wipePlainKeys();
  client = null;
}

/* ---------- staying connected (why "Saving…" used to hang) ---------- */

// Telegram's connection (a WebSocket) can die quietly while the app sits idle or in the background.
// GramJS then waits for an answer that never comes, so the Save button stayed on "Saving…" until a
// refresh. Every call that talks to Telegram now goes through reliable(): it checks the connection,
// gives up after a time limit, reconnects, and tries again. Waits that Telegram asks for (flood
// waits) are counted down on screen instead of looking like a freeze.

const OP_TIMEOUT = 45 * 1000; // a message or an edit
const UPLOAD_TIMEOUT = 90 * 1000; // a file or an album
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function withTimeout(promise, ms) {
  let timer;
  promise.catch(() => {}); // if it fails after the time limit, nobody is left to hear about it
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const e = new Error('Telegram did not answer in time.');
      e.isTimeout = true;
      reject(e);
    }, ms);
  });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

export async function ensureConnected() {
  if (!client) throw new Error('Not connected to Telegram. Please sign in again.');
  if (!client.connected) await withTimeout(client.connect(), 20000);
}

async function reconnect() {
  try {
    await withTimeout(client.disconnect(), 8000);
  } catch (e) {
    /* it was already closed */
  }
  await withTimeout(client.connect(), 20000);
}

/** Call when the app comes back to the screen or the internet returns: reconnects if the line is dead. */
export async function warmUp() {
  if (!client) return;
  try {
    await ensureConnected();
    await withTimeout(client.getMe(), 8000);
  } catch (e) {
    if (e?.errorMessage) return; // Telegram answered, so the line is fine
    try {
      await reconnect();
    } catch (e2) {
      /* still offline: the next save shows the problem */
    }
  }
}

function floodSeconds(e) {
  const n = Number(e?.seconds);
  if (n > 0) return n;
  const m = String(e?.errorMessage || e?.message || '');
  if (/FLOOD/.test(m)) return Number((m.match(/\d+/) || [])[0]) || 30;
  return 0;
}

/**
 * Runs one Telegram call safely.
 *   ms          time limit for one try
 *   alreadyDone optional: after a dropped connection, returns the result if the call had actually
 *               gone through (so a retry never saves the same thing twice)
 *   onStatus    optional: shows "Reconnecting…" or the flood-wait countdown on the screen
 */
async function reliable(fn, { ms = OP_TIMEOUT, alreadyDone, onStatus } = {}) {
  let lastErr;
  let dropped = 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      await ensureConnected();
      return await withTimeout(fn(), ms);
    } catch (e) {
      lastErr = e;
      const wait = floodSeconds(e);
      if (wait) {
        if (wait > 120) throw e;
        for (let s = wait; s > 0; s--) {
          onStatus?.(`Telegram asks you to wait… ${s}s`);
          await sleep(1000);
        }
        onStatus?.('Saving…');
        continue;
      }
      // Telegram answered with a real error (or a bug): retrying would not help
      if (e?.errorMessage || e instanceof TypeError || e instanceof RangeError) throw e;
      if (++dropped >= 3) throw e;
      onStatus?.('Connection lost. Reconnecting…');
      try {
        await reconnect();
      } catch (e2) {
        lastErr = e2;
        continue;
      }
      if (alreadyDone) {
        try {
          const done = await withTimeout(alreadyDone(), 20000);
          if (done) return done;
        } catch (e3) {
          /* could not check: just try again */
        }
      }
      onStatus?.('Saving…');
    }
  }
  throw lastErr;
}

const asList = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const idsOf = (x) => asList(x).map((m) => m.id).filter(Boolean);

// Does this message belong to the entry `id`? kind: 'code', 'question', 'image', or 'any'.
function belongs(m, id, kind) {
  const text = m.message || '';
  if ((kind === 'code' || kind === 'any') && m.document) {
    const j = afterTag(text, 'code');
    if (j !== null) {
      try {
        if (JSON.parse(j).id === id) return true;
      } catch (e) {
        /* not ours */
      }
    }
  }
  if (kind === 'question' || kind === 'any') {
    const r = afterTag(text, 'question');
    if (r !== null && r.split('\n')[0].trim() === id) return true;
  }
  if (kind === 'image' || kind === 'any') {
    const r = afterTag(text, 'image');
    if (r !== null && r.trim() === id) return true;
  }
  return false;
}

/** Looks at the newest messages of the channel for ones that belong to entry `id` (null when none).
 *  `exclude` is a Set of message ids that were already there before, so they do not count. */
async function findRecent(ent, id, kind, exclude = new Set()) {
  const recent = await client.getMessages(ent, { limit: 20 });
  const hits = recent.filter((m) => !exclude.has(m.id) && belongs(m, id, kind));
  const out = new Map(hits.map((m) => [m.id, m]));
  for (const m of hits) {
    if (!m.groupedId) continue;
    for (const x of recent) if (x.groupedId && String(x.groupedId) === String(m.groupedId) && !exclude.has(x.id)) out.set(x.id, x);
  }
  return out.size ? [...out.values()] : null;
}

async function removeMessages(ent, ids) {
  if (!ids.length) return;
  try {
    await reliable(() => client.deleteMessages(ent, ids, { revoke: true }));
  } catch (e) {
    console.warn('cleanup failed', e);
  }
}

/* ---------- folders ---------- */

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    })
  );
  return out;
}

async function countFor(folder) {
  const r = await reliable(
    () => client.getMessages(folder.entity, { limit: 1, filter: new Api.InputMessagesFilterDocument() }),
    { ms: 60000 }
  );
  folder.count = r.total ?? r.length ?? 0;
  folder.last = r[0] ? r[0].date * 1000 : null;
}

export async function listFolders() {
  // Goes through ALL your chats, not just the newest 300, so an old folder never goes missing.
  const folders = await reliable(
    async () => {
      const found = [];
      for await (const d of client.iterDialogs({ limit: MAX_DIALOGS })) {
        const e = d.entity;
        if (!e || e.className !== 'Channel' || !e.broadcast) continue;
        const title = e.title || '';
        const pre = prefixOf(title);
        if (pre) found.push({ id: String(e.id), entity: e, name: title.slice(pre.length), count: 0, last: null });
      }
      return found;
    },
    { ms: 180 * 1000 }
  );
  await pool(folders, 4, countFor);
  folders.sort((a, b) => (b.last || 0) - (a.last || 0));
  return folders;
}

export async function createFolder(name) {
  const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!clean) throw new Error('Please type a folder name.');
  if (!client) throw new Error('Not connected to Telegram. Please sign in again.');
  if (!client.connected) await client.connect();

  // GramJS silently sleeps on short FLOOD_WAITs, which made the button look dead.
  // Channel creation is heavily rate limited by Telegram, so show the wait instead.
  const oldThreshold = client.floodSleepThreshold;
  client.floodSleepThreshold = 0;
  let res;
  try {
    res = await client.invoke(
      new Api.channels.CreateChannel({
        title: PREFIX + clean,
        about: 'Telecloud folder. Created by Telecloud.',
        broadcast: true,
        megagroup: false,
      })
    );
  } finally {
    client.floodSleepThreshold = oldThreshold;
  }

  const chats = res?.chats || res?.updates?.chats || [];
  const ch = chats.find((c) => c.className === 'Channel');
  if (!ch) throw new Error('Telegram did not confirm the new channel. Open Telegram and check, then press Try again.');

  // make sure the channel really exists and is reachable before we show it
  try {
    await client.invoke(
      new Api.channels.GetChannels({
        id: [new Api.InputChannel({ channelId: ch.id, accessHash: ch.accessHash })],
      })
    );
  } catch (e) {
    console.warn('verify failed', e);
  }
  return { id: String(ch.id), entity: ch, name: clean, count: 0, last: null };
}

export async function deleteFolder(folder) {
  await reliable(() => client.invoke(new Api.channels.DeleteChannel({ channel: folder.entity })));
}

/* ---------- entries ---------- */

export async function loadEntries(folder) {
  const msgs = await reliable(() => client.getMessages(folder.entity, { limit: 3000 }), { ms: 120 * 1000 });
  const entries = new Map();
  const questions = new Map();
  const photos = [];
  const groups = new Map();

  for (const m of msgs) {
    const text = m.message || '';
    const codeJson = m.document ? afterTag(text, 'code') : null;
    const qBody = codeJson === null ? afterTag(text, 'question') : null;
    if (codeJson !== null) {
      try {
        const meta = JSON.parse(codeJson);
        entries.set(meta.id, {
          id: meta.id,
          title: meta.t || 'Untitled',
          lang: meta.l || 'Other',
          tags: meta.g || [],
          sub: cleanSub(meta.d),
          ts: meta.ts || m.date * 1000,
          lines: meta.n || 0,
          shotCount: meta.s || 0,
          solutions: meta.c || 1,
          codeMsg: m,
          msgIds: [m.id],
          question: '',
          qMsgId: null,
          shots: [],
          code: null,
        });
      } catch (e) {
        /* not one of ours */
      }
    } else if (qBody !== null) {
      const nl = qBody.indexOf('\n');
      const id = qBody.slice(0, nl === -1 ? undefined : nl).trim();
      questions.set(id, { text: nl === -1 ? '' : qBody.slice(nl + 1), msgId: m.id });
    } else if (m.photo) {
      const gid = m.groupedId ? String(m.groupedId) : null;
      let id = null;
      const imgId = afterTag(text, 'image');
      if (imgId !== null) {
        id = imgId.trim();
        if (gid) groups.set(gid, id);
      }
      photos.push({ m, gid, id });
    }
  }

  for (const [id, q] of questions) {
    const e = entries.get(id);
    if (e) {
      e.question = q.text;
      e.qMsgId = q.msgId;
      e.msgIds.push(q.msgId);
    }
  }
  for (const p of photos) {
    const id = p.id || (p.gid && groups.get(p.gid));
    const e = id && entries.get(id);
    if (e) {
      e.shots.push(p.m);
      e.msgIds.push(p.m.id);
    }
  }
  for (const e of entries.values()) {
    e.shots.sort((a, b) => a.id - b.id);
    e.shotCount = Math.max(e.shotCount, e.shots.length);
  }

  const list = [...entries.values()].sort((a, b) => b.ts - a.ts);
  folder.count = list.length;
  folder.last = list[0] ? list[0].ts : folder.last;
  return list;
}

/* ---------- subfolders ---------- */

// A subfolder is just a name in the "d" field of an entry's #cv caption. "" means no subfolder.
export function cleanSub(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
}

// Subfolders that have no entry yet are remembered in this browser until the first entry uses them.
const subKey = (fid) => 'tc_subs_' + fid;

function readLocalSubs(fid) {
  try {
    const a = JSON.parse(localStorage.getItem(subKey(fid)) || '[]');
    return Array.isArray(a) ? a.map(cleanSub).filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

export function addLocalSub(fid, name) {
  const n = cleanSub(name);
  if (!n) return;
  const list = readLocalSubs(fid);
  if (!list.some((x) => x.toLowerCase() === n.toLowerCase())) list.push(n);
  try {
    localStorage.setItem(subKey(fid), JSON.stringify(list));
  } catch (e) {
    /* storage blocked: the subfolder still appears once an entry uses it */
  }
}

export function removeLocalSub(fid, name) {
  const key = cleanSub(name).toLowerCase();
  try {
    localStorage.setItem(subKey(fid), JSON.stringify(readLocalSubs(fid).filter((x) => x.toLowerCase() !== key)));
  } catch (e) {
    /* ignore */
  }
}

/** All subfolder names of a folder: the ones entries use, plus the empty ones made here. Sorted A to Z. */
export function listSubs(fid, entries) {
  const seen = new Map();
  for (const e of entries || []) if (e.sub) seen.set(e.sub.toLowerCase(), e.sub);
  for (const n of readLocalSubs(fid)) if (!seen.has(n.toLowerCase())) seen.set(n.toLowerCase(), n);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

// The #cv caption of an entry, with the subfolder set to `sub`.
function metaOf(entry, sub) {
  const meta = {
    id: entry.id,
    t: entry.title.slice(0, 120),
    l: entry.lang,
    g: entry.tags.slice(0, 8).map((t) => t.slice(0, 24)),
    ts: entry.ts,
    n: entry.lines,
    s: entry.shotCount,
  };
  if (entry.solutions > 1) meta.c = entry.solutions;
  const d = cleanSub(sub);
  if (d) meta.d = d;
  return TAGS.code[0] + JSON.stringify(meta);
}

/**
 * Moves entries into a subfolder ("" = out of any subfolder) by rewriting only their captions.
 * The code files, questions and screenshots are not touched. onProgress(done, total) is optional.
 */
export async function moveEntries(folder, entries, sub, onProgress) {
  const target = cleanSub(sub);
  let done = 0;
  for (const entry of entries) {
    if (entry.sub !== target) {
      await reliable(() => safeEdit(folder.entity, { message: entry.codeMsg.id, text: metaOf(entry, target) }));
      entry.sub = target;
    }
    done++;
    if (onProgress) onProgress(done, entries.length);
  }
  if (target) addLocalSub(folder.id, target);
}

function rid() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
}

function slug(s) {
  return (s || 'code').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'code';
}

async function shrinkImage(file, maxSide = 1600) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
  return Buffer.from(await blob.arrayBuffer());
}

/** Turns the picked image files into ready-to-send JPEG buffers. Done before anything is sent,
 *  so a bad image can never leave a half-saved entry behind. */
async function prepareShots(files, stamp = '') {
  const out = [];
  for (let i = 0; i < files.length; i++) {
    const buf = await shrinkImage(files[i]);
    out.push({ name: `shot-${stamp}${i + 1}.jpg`, buf });
  }
  return out;
}

const sendShots = (ent, shots, caption, opts) =>
  reliable(
    () => {
      const cfs = shots.map((s) => new CustomFile(s.name, s.buf.length, '', s.buf));
      return client.sendFile(ent, { file: cfs.length === 1 ? cfs[0] : cfs, caption });
    },
    { ms: UPLOAD_TIMEOUT, ...opts }
  );

/**
 * Saves a new entry. If any step fails, whatever was already sent for this entry is removed again,
 * so you never end up with half an entry. onStatus(text) is optional (shows waits on the button).
 */
export async function addEntry(folder, { title, question, lang, tags, files, code, sub, onStatus }) {
  const id = rid();
  const ent = folder.entity;
  const meta = {
    id,
    t: title.slice(0, 120),
    l: lang,
    g: tags.slice(0, 8).map((t) => t.slice(0, 24)),
    ts: Date.now(),
    n: code.split('\n').length,
    s: files.length,
  };
  if (splitSolutions(code).length > 1) meta.c = splitSolutions(code).length;
  if (cleanSub(sub)) meta.d = cleanSub(sub);
  const buf = Buffer.from(code, 'utf8');
  const name = `${slug(title)}.${EXT[lang] || 'txt'}`;
  const shots = await prepareShots(files);

  try {
    await reliable(
      () =>
        client.sendFile(ent, {
          file: new CustomFile(name, buf.length, '', buf),
          caption: TAGS.code[0] + JSON.stringify(meta),
          forceDocument: true,
        }),
      { ms: UPLOAD_TIMEOUT, onStatus, alreadyDone: () => findRecent(ent, id, 'code') }
    );
    if (question.trim()) {
      await reliable(() => client.sendMessage(ent, { message: qText(id, question.trim().slice(0, 3900)) }), {
        onStatus,
        alreadyDone: () => findRecent(ent, id, 'question'),
      });
    }
    if (shots.length) {
      await sendShots(ent, shots, imgTag(id), { onStatus, alreadyDone: () => findRecent(ent, id, 'image') });
    }
  } catch (e) {
    // take back everything of this entry that did reach Telegram
    try {
      await ensureConnected();
      const sent = await withTimeout(findRecent(ent, id, 'any'), 20000);
      if (sent) await removeMessages(ent, idsOf(sent));
    } catch (e2) {
      console.warn('could not check for leftovers', e2);
    }
    throw e;
  }
  return id;
}

export async function deleteEntry(folder, entry) {
  await reliable(() => client.deleteMessages(folder.entity, entry.msgIds, { revoke: true }));
}

export async function getCode(entry) {
  if (entry.code !== null) return entry.code;
  const buf = await reliable(() => client.downloadMedia(entry.codeMsg, {}), { ms: 60000 });
  entry.code = new TextDecoder().decode(buf);
  return entry.code;
}

export async function getShotUrl(msg) {
  const buf = await reliable(() => client.downloadMedia(msg, {}), { ms: 60000 });
  return URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }));
}

/* ---------- editing an entry ---------- */

async function safeEdit(entity, params) {
  try {
    return await client.editMessage(entity, params);
  } catch (e) {
    if ((e?.errorMessage || e?.message || '').includes('MESSAGE_NOT_MODIFIED')) return null;
    throw e;
  }
}

/**
 * Saves changes to an entry in a safe order, because Telegram has no "all or nothing" save:
 *   1. add the new question / screenshots (nothing existing is touched yet)
 *   2. change the question text and the code message (each change can be undone)
 *   3. only then delete what you removed
 * If step 1 or 2 fails, everything done so far is undone and the entry stays exactly as it was.
 * If only step 3 fails, your changes are saved and the error says so (err.partial = true).
 */
export async function editEntry(folder, entry, { title, question, lang, tags, code, newFiles, keepShotIds, sub, onStatus }) {
  const id = entry.id;
  const ent = folder.entity;
  const oldCode = await getCode(entry);

  const q = question.trim().slice(0, 3900);
  const keep = new Set(keepShotIds);
  const removed = entry.shots.filter((m) => !keep.has(m.id));
  const kept = entry.shots.filter((m) => keep.has(m.id));
  const before = new Set(entry.msgIds); // messages that already exist, so a retry never mistakes them for new ones

  // everything that can fail on this device happens first
  const shots = await prepareShots(newFiles, `${Date.now()}-`);
  const buf = Buffer.from(code, 'utf8');
  const name = `${slug(title)}.${EXT[lang] || 'txt'}`;
  const meta = {
    id,
    t: title.slice(0, 120),
    l: lang,
    g: tags.slice(0, 8).map((t) => t.slice(0, 24)),
    ts: entry.ts,
    n: code.split('\n').length,
    s: kept.length + shots.length,
  };
  if (splitSolutions(code).length > 1) meta.c = splitSolutions(code).length;
  const newSub = cleanSub(sub === undefined ? entry.sub : sub);
  if (newSub) meta.d = newSub;
  const caption = TAGS.code[0] + JSON.stringify(meta);
  const fileChanged = code !== oldCode || title !== entry.title || lang !== entry.lang;

  const created = []; // new messages: deleted again if something fails
  const undo = []; // steps that put a changed message back
  const edit = (params) => reliable(() => safeEdit(ent, params), { ms: UPLOAD_TIMEOUT, onStatus });

  try {
    // 1. add
    if (!entry.qMsgId && q) {
      const r = await reliable(() => client.sendMessage(ent, { message: qText(id, q) }), {
        onStatus,
        alreadyDone: () => findRecent(ent, id, 'question', before),
      });
      created.push(...idsOf(r));
    }
    if (shots.length) {
      const r = await sendShots(ent, shots, imgTag(id), { onStatus, alreadyDone: () => findRecent(ent, id, 'image', before) });
      created.push(...idsOf(r));
    }

    // 2. change (each with its undo)
    if (entry.qMsgId && q && q !== entry.question.trim()) {
      await edit({ message: entry.qMsgId, text: qText(id, q) });
      undo.push(() => edit({ message: entry.qMsgId, text: qText(id, entry.question) }));
    }
    // every remaining album must still carry the #tci caption (old #cvi captions are fine too)
    const groups = new Map();
    for (const m of kept) {
      const k = m.groupedId ? String(m.groupedId) : 's' + m.id;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(m);
    }
    for (const list of groups.values()) {
      if (!list.some((m) => (afterTag(m.message, 'image') || '').trim() === id)) {
        await edit({ message: list[0].id, text: imgTag(id) });
      }
    }
    const oldCaption = entry.codeMsg.message || '';
    if (fileChanged) {
      await edit({ message: entry.codeMsg.id, text: caption, file: new CustomFile(name, buf.length, '', buf), forceDocument: true });
      const oldBuf = Buffer.from(oldCode, 'utf8');
      const oldName = `${slug(entry.title)}.${EXT[entry.lang] || 'txt'}`;
      undo.push(() =>
        edit({ message: entry.codeMsg.id, text: oldCaption, file: new CustomFile(oldName, oldBuf.length, '', oldBuf), forceDocument: true })
      );
    } else {
      await edit({ message: entry.codeMsg.id, text: caption });
      undo.push(() => edit({ message: entry.codeMsg.id, text: oldCaption }));
    }
  } catch (e) {
    onStatus?.('Something went wrong. Undoing…');
    for (const u of undo.reverse()) {
      try {
        await u();
      } catch (e2) {
        console.warn('undo failed', e2);
      }
    }
    await removeMessages(ent, created);
    throw e;
  }

  // 3. delete (last, because it cannot be undone)
  try {
    if (entry.qMsgId && !q) await reliable(() => client.deleteMessages(ent, [entry.qMsgId], { revoke: true }), { onStatus });
    if (removed.length) await reliable(() => client.deleteMessages(ent, removed.map((m) => m.id), { revoke: true }), { onStatus });
  } catch (e) {
    const err = new Error('Your changes were saved, but some old items could not be removed. Open the entry and press Save again.');
    err.partial = true;
    throw err;
  }
}

export function friendlyError(e) {
  const m = e?.errorMessage || e?.message || String(e);
  const map = {
    API_ID_INVALID: 'Those API keys were not accepted. Check the API ID and API Hash on my.telegram.org.',
    PHONE_NUMBER_INVALID: 'That phone number looks wrong. Use the international format, like +8801XXXXXXXXX.',
    PHONE_CODE_INVALID: 'That code is not right. Check the code Telegram sent you.',
    PHONE_CODE_EXPIRED: 'That code has expired. Go back and request a new one.',
    PASSWORD_HASH_INVALID: 'Wrong two-step verification password.',
    PHONE_NUMBER_BANNED: 'Telegram says this phone number is banned.',
    CHANNELS_TOO_MUCH: 'Your Telegram account has too many channels. Leave or delete some first.',
    AUTH_KEY_UNREGISTERED: 'Your session has ended. Please sign in again.',
    USER_CHANNELS_TOO_MUCH: 'Your Telegram account has too many channels. Leave or delete some first.',
    CHANNELS_ADMIN_LOCATED_TOO_MUCH: 'Telegram says you own too many channels. Delete some first.',
    USER_RESTRICTED: 'Telegram has restricted this account from creating channels (often spam limits on new accounts). Try again later.',
    CHAT_TITLE_EMPTY: 'Please type a folder name.',
    CHAT_ABOUT_TOO_LONG: 'The channel description is too long.',
  };
  if (e?.isTimeout) return 'Telegram is not answering. Check your internet connection and try again.';
  if (/Not connected|disconnected|CONNECTION/i.test(m)) return 'The connection to Telegram dropped. Check your internet and try again.';
  if (/^FLOOD/.test(m) || /FLOOD_WAIT/.test(m)) {
    const secs = (m.match(/\d+/) || [''])[0];
    return `Telegram asks you to wait${secs ? ' ' + secs + ' seconds' : ''} before trying again.`;
  }
  return map[m] || m;
}
