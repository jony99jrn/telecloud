// PIN lock for Code Vault.
//
// Two places use the PIN:
//   1. This device: the Telegram login is encrypted with the PIN (AES-GCM, key made
//      with PBKDF2) before it is saved in the browser. Opening the app asks for the PIN.
//   2. Your Telegram account: a private channel keeps a salted hash of the PIN (never
//      the PIN itself), so the same PIN works on every device you sign in on.
//
// Wrong PINs are limited (separately for the device and for the Telegram check):
// from the 3rd wrong try there is a waiting time that doubles each time, and after
// MAX_FAILS wrong tries the saved login is deleted / the person is signed out.

const KEY_ENC = 'cv_session_enc';
const STATE = { local: 'cv_lock_state', remote: 'cv_remote_state' };

export const PIN_LENGTH = 6;
export const MAX_FAILS = 10;
const ITERATIONS = 600000;
const BASE_WAIT = 30 * 1000; // wait after the 3rd wrong PIN
const MAX_WAIT = 60 * 60 * 1000; // never wait more than 1 hour

const te = new TextEncoder();
const td = new TextDecoder();

function toB64(buf) {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function readState(kind) {
  try {
    const s = JSON.parse(localStorage.getItem(STATE[kind]) || '{}');
    return { fails: Number(s.fails) || 0, until: Number(s.until) || 0 };
  } catch (e) {
    return { fails: 0, until: 0 };
  }
}
const writeState = (kind, s) => localStorage.setItem(STATE[kind], JSON.stringify(s));

export const isValidPin = (pin) => /^\d{6}$/.test(String(pin));

/** true when an encrypted Telegram login is saved on this device */
export const hasEncrypted = () => !!localStorage.getItem(KEY_ENC);

/** kind: 'local' (this device) or 'remote' (the check against Telegram).
 *  Returns { fails, until (ms timestamp, 0 = no wait), left (tries before the wipe) } */
export function status(kind = 'local') {
  const s = readState(kind);
  return { fails: s.fails, until: s.until, left: Math.max(0, MAX_FAILS - s.fails) };
}

export function clear() {
  localStorage.removeItem(KEY_ENC);
  localStorage.removeItem(STATE.local);
}

/* ---------- the limit on wrong tries (shared) ---------- */

async function attempt(kind, check, onWipe) {
  const st = readState(kind);
  if (st.until > Date.now()) return { ok: false, wait: st.until - Date.now(), left: Math.max(0, MAX_FAILS - st.fails) };

  // count the try first, so closing the tab in the middle cannot skip the limit
  const fails = st.fails + 1;
  writeState(kind, { fails, until: 0 });

  let res = null;
  try {
    res = await check();
  } catch (e) {
    res = null;
  }
  if (res) {
    writeState(kind, { fails: 0, until: 0 });
    return { ok: true, ...res };
  }
  if (fails >= MAX_FAILS) {
    localStorage.removeItem(STATE[kind]);
    onWipe();
    return { ok: false, wiped: true };
  }
  const wait = fails >= 3 ? Math.min(BASE_WAIT * 2 ** (fails - 3), MAX_WAIT) : 0;
  writeState(kind, { fails, until: wait ? Date.now() + wait : 0 });
  return { ok: false, wait, left: MAX_FAILS - fails };
}

/* ---------- this device: encrypted login ---------- */

async function deriveKey(pin, salt) {
  const base = await crypto.subtle.importKey('raw', te.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function seal(key, salt, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(text));
  localStorage.setItem(KEY_ENC, JSON.stringify({ v: 1, s: toB64(salt), i: toB64(iv), d: toB64(ct) }));
}

/** Encrypts `text` with the PIN and saves it. Returns a handle used to re-save later. */
export async function createLock(pin, text) {
  if (!isValidPin(pin)) throw new Error('The PIN must be exactly 6 digits.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(pin, salt);
  await seal(key, salt, text);
  writeState('local', { fails: 0, until: 0 });
  return { key, salt };
}

export async function saveSession(handle, text) {
  await seal(handle.key, handle.salt, text);
}

/**
 * Tries the PIN on this device. Result:
 *   { ok: true, text, handle }
 *   { ok: false, wait }              still waiting from earlier wrong tries (ms)
 *   { ok: false, wait, left }        wrong PIN (wait may be 0)
 *   { ok: false, wiped: true }       too many wrong tries, saved login deleted
 */
export async function unlock(pin) {
  let blob = null;
  try {
    blob = JSON.parse(localStorage.getItem(KEY_ENC));
  } catch (e) {
    /* damaged data */
  }
  if (!blob || !blob.s || !blob.i || !blob.d) {
    clear();
    return { ok: false, wiped: true };
  }
  return attempt(
    'local',
    async () => {
      const salt = fromB64(blob.s);
      const key = await deriveKey(pin, salt);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(blob.i) }, key, fromB64(blob.d));
      return { text: td.decode(pt), handle: { key, salt } };
    },
    clear
  );
}

/* ---------- your Telegram account: salted hash of the PIN ---------- */

async function hashPin(pin, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', te.encode(pin), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, 256));
}

/** The record saved in the private Telegram channel. It never contains the PIN. */
export async function makeVerifier(pin) {
  if (!isValidPin(pin)) throw new Error('The PIN must be exactly 6 digits.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const h = await hashPin(pin, salt, ITERATIONS);
  return { v: 1, n: ITERATIONS, s: toB64(salt), h: toB64(h) };
}

/** true when a record read from Telegram has the expected shape */
export function isVerifier(rec) {
  return !!rec && typeof rec.s === 'string' && typeof rec.h === 'string' && Number.isInteger(rec.n) && rec.n >= 100000 && rec.n <= 2000000;
}

/** Checks the PIN against the record from Telegram. Same result shape as unlock(). */
export function verifyRemote(pin, rec) {
  return attempt(
    'remote',
    async () => {
      const got = await hashPin(pin, fromB64(rec.s), rec.n);
      const want = fromB64(rec.h);
      let diff = got.length ^ want.length;
      for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
      return diff === 0 ? {} : null;
    },
    () => {}
  );
}
