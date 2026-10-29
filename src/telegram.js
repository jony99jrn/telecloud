// Telegram storage layer for Code Vault.
//
// Layout inside your own Telegram account:
//   folder  = a private channel whose title starts with "CV · "
//   entry   = 1 document message  (the code file, caption "#cv {json}")
//           + 1 optional text message  ("#cvq <id>" + the question)
//           + 1 optional photo/album   (caption "#cvi <id>", the screenshots)

import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { CustomFile } from 'telegram/client/uploads';
import { Buffer } from 'buffer';

const PREFIX = 'CV · ';
const LS = { id: 'cv_api_id', hash: 'cv_api_hash', session: 'cv_session' };

export const LANGUAGES = ['C', 'C++', 'Java', 'Python', 'JavaScript', 'SQL', 'HTML/CSS', 'Other'];
const EXT = { C: 'c', 'C++': 'cpp', Java: 'java', Python: 'py', JavaScript: 'js', SQL: 'sql', 'HTML/CSS': 'html', Other: 'txt' };

let client = null;
let pending = null;

/* ---------- keys & session (kept in this browser only) ---------- */

export function getKeys() {
  return {
    apiId: Number(localStorage.getItem(LS.id)) || 0,
    apiHash: localStorage.getItem(LS.hash) || '',
  };
}

export function saveKeys(apiId, apiHash) {
  localStorage.setItem(LS.id, String(apiId));
  localStorage.setItem(LS.hash, apiHash);
}

export function hasSession() {
  return !!localStorage.getItem(LS.session);
}

async function makeClient(sessionString) {
  const { apiId, apiHash } = getKeys();
  client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 5,
    useWSS: true,
  });
  await client.connect();
  return client;
}

function persist() {
  localStorage.setItem(LS.session, client.session.save());
}

/* ---------- login ---------- */

export async function restore() {
  const s = localStorage.getItem(LS.session);
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
  persist();
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
  persist();
}

export async function signOut() {
  try {
    await client.invoke(new Api.auth.LogOut());
  } catch (e) {
    console.warn(e);
  }
  try {
    await client.disconnect();
  } catch (e) {
    /* ignore */
  }
  localStorage.removeItem(LS.session);
  client = null;
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
  const r = await client.getMessages(folder.entity, {
    limit: 1,
    filter: new Api.InputMessagesFilterDocument(),
  });
  folder.count = r.total ?? r.length ?? 0;
  folder.last = r[0] ? r[0].date * 1000 : null;
}

export async function listFolders() {
  const dialogs = await client.getDialogs({ limit: 300 });
  const folders = [];
  for (const d of dialogs) {
    const e = d.entity;
    if (e && e.className === 'Channel' && e.broadcast && (e.title || '').startsWith(PREFIX)) {
      folders.push({ id: String(e.id), entity: e, name: e.title.slice(PREFIX.length), count: 0, last: null });
    }
  }
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
        about: 'Code Vault folder. Created by Code Vault.',
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
  await client.invoke(new Api.channels.DeleteChannel({ channel: folder.entity }));
}

/* ---------- entries ---------- */

export async function loadEntries(folder) {
  const msgs = await client.getMessages(folder.entity, { limit: 3000 });
  const entries = new Map();
  const questions = new Map();
  const photos = [];
  const groups = new Map();

  for (const m of msgs) {
    const text = m.message || '';
    if (text.startsWith('#cv ') && m.document) {
      try {
        const meta = JSON.parse(text.slice(4));
        entries.set(meta.id, {
          id: meta.id,
          title: meta.t || 'Untitled',
          lang: meta.l || 'Other',
          tags: meta.g || [],
          ts: meta.ts || m.date * 1000,
          lines: meta.n || 0,
          shotCount: meta.s || 0,
          codeMsg: m,
          msgIds: [m.id],
          question: '',
          shots: [],
          code: null,
        });
      } catch (e) {
        /* not one of ours */
      }
    } else if (text.startsWith('#cvq ')) {
      const nl = text.indexOf('\n');
      const id = text.slice(5, nl === -1 ? undefined : nl).trim();
      questions.set(id, { text: nl === -1 ? '' : text.slice(nl + 1), msgId: m.id });
    } else if (m.photo) {
      const gid = m.groupedId ? String(m.groupedId) : null;
      let id = null;
      if (text.startsWith('#cvi ')) {
        id = text.slice(5).trim();
        if (gid) groups.set(gid, id);
      }
      photos.push({ m, gid, id });
    }
  }

  for (const [id, q] of questions) {
    const e = entries.get(id);
    if (e) {
      e.question = q.text;
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

export async function addEntry(folder, { title, question, lang, tags, files, code }) {
  const id = rid();
  const meta = {
    id,
    t: title.slice(0, 120),
    l: lang,
    g: tags.slice(0, 8).map((t) => t.slice(0, 24)),
    ts: Date.now(),
    n: code.split('\n').length,
    s: files.length,
  };
  const buf = Buffer.from(code, 'utf8');
  const name = `${slug(title)}.${EXT[lang] || 'txt'}`;
  await client.sendFile(folder.entity, {
    file: new CustomFile(name, buf.length, '', buf),
    caption: '#cv ' + JSON.stringify(meta),
    forceDocument: true,
  });

  if (question.trim()) {
    await client.sendMessage(folder.entity, { message: `#cvq ${id}\n${question.trim().slice(0, 3900)}` });
  }

  if (files.length) {
    const cfs = [];
    for (let i = 0; i < files.length; i++) {
      const b = await shrinkImage(files[i]);
      cfs.push(new CustomFile(`shot-${i + 1}.jpg`, b.length, '', b));
    }
    await client.sendFile(folder.entity, {
      file: cfs.length === 1 ? cfs[0] : cfs,
      caption: `#cvi ${id}`,
    });
  }
  return id;
}

export async function deleteEntry(folder, entry) {
  await client.deleteMessages(folder.entity, entry.msgIds, { revoke: true });
}

export async function getCode(entry) {
  if (entry.code !== null) return entry.code;
  const buf = await client.downloadMedia(entry.codeMsg, {});
  entry.code = new TextDecoder().decode(buf);
  return entry.code;
}

export async function getShotUrl(msg) {
  const buf = await client.downloadMedia(msg, {});
  return URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }));
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
  if (/^FLOOD/.test(m) || /FLOOD_WAIT/.test(m)) {
    const secs = (m.match(/\d+/) || [''])[0];
    return `Telegram asks you to wait${secs ? ' ' + secs + ' seconds' : ''} before trying again.`;
  }
  return map[m] || m;
}
