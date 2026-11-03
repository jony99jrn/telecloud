import './styles.css';
import * as tg from './telegram.js';
import { highlightLines } from './highlight.js';

/* ---------- tiny helpers ---------- */

const app = document.getElementById('app');
const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const $ = (sel, root = document) => root.querySelector(sel);

const I = {
  logo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
  enter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h11M11 7l5 5-5 5M20 5v14"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
  hash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 012-2h9"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6M6 12l6-6 6 6M5 20h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>',
  android: '<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M7 8a5 5 0 0 1 10 0zM9.6 6.2a.6.6 0 1 0 1.2 0 .6.6 0 1 0-1.2 0zM13.2 6.2a.6.6 0 1 0 1.2 0 .6.6 0 1 0-1.2 0z"/><path d="M7 9h10v8a1.5 1.5 0 0 1-1.5 1.5H15V21a1.2 1.2 0 0 1-2.4 0v-2.5h-1.2V21a1.2 1.2 0 0 1-2.4 0v-2.5h-.5A1.5 1.5 0 0 1 7 17zM5 9.5a1.1 1.1 0 0 1 2.2 0v5a1.1 1.1 0 0 1-2.2 0zM16.8 9.5a1.1 1.1 0 0 1 2.2 0v5a1.1 1.1 0 0 1-2.2 0z"/><path d="M9 2.6l1.1 1.5M15 2.6l-1.1 1.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 015.5 5H9l2 2.5h7.5A2.5 2.5 0 0121 10v7.5a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5z"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="19" r="1.9"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0116 0"/></svg>',
  at: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-4 8"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M10 8l-4 4 4 4M6 12h11"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.3M12 17h.01"/></svg>',
};

function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  if (ms > 0) toast.t = setTimeout(() => t.classList.remove('show'), ms);
}

function hideToast() {
  clearTimeout(toast.t);
  $('#toast').classList.remove('show');
}

function fmtDate(ts) {
  return new Date(ts)
    .toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\b(am|pm)\b/, (m) => m.toUpperCase());
}

const fmtDay = (ts) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const BADGE = { C: 'C', 'C++': 'C++', Java: 'Java', Python: 'Py', JavaScript: 'JS', SQL: 'SQL', 'HTML/CSS': 'HTML', Other: 'Txt' };

// Accepts text or a promise of text. Returns true if the text reached the clipboard.
async function copyText(src) {
  // A promise inside ClipboardItem keeps the tap permission while a long download finishes
  if (typeof src !== 'string' && navigator.clipboard && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/plain': Promise.resolve(src).then((t) => new Blob([t], { type: 'text/plain' })) }),
      ]);
      return true;
    } catch (e) {
      /* try the next way */
    }
  }
  const text = await Promise.resolve(src);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    /* try the old way */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {
    ok = false;
  }
  ta.remove();
  return ok;
}

function modal({ title, text, input, confirm = 'OK', placeholder = '', noCancel = false }) {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<form class="modal"><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}
${input ? `<input class="in" name="v" maxlength="60" placeholder="${esc(placeholder)}" autocomplete="off" />` : ''}
<div class="btns">${noCancel ? '' : '<button type="button" class="btn btn-light btn-small" data-x>Cancel</button>'}
<button class="btn btn-small">${esc(confirm)}</button></div></form>`;
    document.body.appendChild(back);
    const field = $('input', back);
    if (field) field.focus();
    const done = (v) => {
      back.remove();
      resolve(v);
    };
    const x = $('[data-x]', back);
    if (x) x.onclick = () => done(null);
    back.addEventListener('mousedown', (e) => e.target === back && done(null));
    $('form', back).onsubmit = (e) => {
      e.preventDefault();
      done(input ? field.value.trim() || null : true);
    };
  });
}

/* ---------- state ---------- */

const S = { authed: false, folders: null, entries: {}, cleanup: null, forgot: false, profile: null };

const initials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

// What goes inside a round avatar: the Telegram photo, else initials, else a person icon.
function avatarInner(p = S.profile) {
  if (p?.photo) return `<img src="${esc(p.photo)}" alt="" />`;
  if (p?.name) return `<span>${esc(initials(p.name))}</span>`;
  return I.user;
}

// Loads the profile once and updates every avatar already on screen.
async function loadProfile() {
  if (S.profile) return S.profile;
  try {
    S.profile = await tg.getProfile();
    document.querySelectorAll('[data-avatar]').forEach((a) => (a.innerHTML = avatarInner()));
  } catch (e) {
    console.warn('profile failed', e);
  }
  return S.profile;
}

// The APK download is offered only in a normal browser, never inside the installed app.
const APK_URL = 'https://github.com/jony99jrn/telecloud/releases/latest/download/Telecloud.apk';
function insideApp() {
  try {
    if (document.referrer.startsWith('android-app://')) sessionStorage.setItem('tc_in_app', '1');
    if (sessionStorage.getItem('tc_in_app') === '1') return true;
  } catch (e) { /* storage blocked, fall through */ }
  const mq = (q) => window.matchMedia && window.matchMedia(q).matches;
  return mq('(display-mode: standalone)') || mq('(display-mode: fullscreen)') || mq('(display-mode: minimal-ui)') || window.navigator.standalone === true;
}
function canOfferApk() {
  return !insideApp() && !/iphone|ipad|ipod/i.test(navigator.userAgent);
}
function apkHeaderLink() {
  return canOfferApk()
    ? `<a class="dl-btn" href="${APK_URL}" rel="noopener" aria-label="Download the Android app" title="Download the Android app">${I.android}<span>Get app</span></a>`
    : '';
}

function header() {
  if (S.authed && !S.profile) loadProfile();
  return `<div class="topbar"><a class="brand" href="#/"><span class="logo">${I.logo}</span>Telecloud</a>
<div class="top-actions">${apkHeaderLink()}<a class="avatar" href="#/profile" data-avatar aria-label="Your profile" title="Your profile">${avatarInner()}</a></div></div>`;
}

async function ensureFolders(force = false) {
  if (!S.folders || force) S.folders = await tg.listFolders();
  return S.folders;
}

function bindShared(root) {
  const so = $('[data-signout]', root);
  if (so)
    so.onclick = async () => {
      const ok = await modal({
        title: 'Sign out?',
        text: 'This ends the Telegram session for this app. Your folders and code stay safe in Telegram.',
        confirm: 'Sign out',
      });
      if (!ok) return;
      await tg.signOut();
      S.authed = false;
      S.profile = null;
      S.folders = null;
      S.entries = {};
      location.hash = '';
      L.step = 1;
      renderLogin();
    };
}

/* ================= PROFILE ================= */

async function renderProfile() {
  app.innerHTML = `<div class="shell narrow">${header()}
<a class="back" href="#/">${I.back}All folders</a>
<div id="pf"><div class="loading">Loading your profile…</div></div></div>`;

  const p = await loadProfile();
  if (location.hash.replace(/^#\/?/, '') !== 'profile') return; // the person already left this page
  const box = $('#pf');
  if (!p) {
    box.innerHTML = `<div class="empty">Could not load your Telegram profile.<br/><button class="link-btn" id="retry">Try again</button></div>`;
    $('#retry').onclick = renderProfile;
    return;
  }

  const row = (icon, label, value, copy = '') =>
    `<div class="pf-row"><span class="pf-ic">${icon}</span><div class="pf-tx"><small>${label}</small><b>${value ? esc(value) : '<i>Not set</i>'}</b></div>${
      copy && value ? `<button class="pf-copy" data-copy="${esc(copy)}" aria-label="Copy ${label}">${I.copy}</button>` : ''
    }</div>`;

  box.innerHTML = `<div class="card pf-card">
<div class="pf-head"><div class="pf-photo">${avatarInner(p)}</div>
<h1>${esc(p.name)}</h1>
<div class="pf-user">${p.username ? '@' + esc(p.username) : 'No username set'}</div>
<span class="pill"><span class="dot"></span>Connected to Telegram</span></div>
<div class="pf-rows">
${row(I.phone, 'Phone number', p.phone, p.phone)}
${row(I.at, 'Username', p.username ? '@' + p.username : '', p.username ? '@' + p.username : '')}
${row(I.hash, 'Telegram ID', p.id, p.id)}
${row(I.shield, 'Security', 'PIN locked. API keys stay on this device.')}
</div>
<button class="btn btn-full pf-out" data-signout>${I.out}Sign out</button>
<p class="pf-note">Signing out ends the Telegram session for this app. Your folders and code stay safe in Telegram.</p>
</div>`;

  bindShared(app);
  box.querySelectorAll('[data-copy]').forEach((b) => {
    b.onclick = async () => toast((await copyText(b.dataset.copy)) ? 'Copied' : 'Could not copy');
  });
}

/* ================= LOGIN ================= */

const L = { step: 1, phone: '', error: '' };

// Step-by-step guide for finding the API ID and API Hash, drawn with small mock-ups.
const GUIDE = [
  {
    t: 'Open my.telegram.org',
    d: 'Use any browser, on your phone or your computer.',
    v: `<div class="m-bar">${I.lock}<span>my.telegram.org</span></div>`,
  },
  {
    t: 'Log in with your phone number',
    d: 'Type your number with the country code. Telegram sends a code to your Telegram app (not an SMS). Type that code on the site.',
    v: `<div class="m-field">+880 1XXXXXXXXX</div><div class="m-field">Code from your Telegram app</div>`,
  },
  {
    t: 'Click “API development tools”',
    d: 'It is in the list of options right after you log in.',
    v: `<div class="m-item">Delete account</div><div class="m-item hot">API development tools</div>`,
  },
  {
    t: 'Create an application',
    d: 'Fill App title and Short name with anything you like, for example “Telecloud”. Choose “Other” as the platform and press Create application.',
    v: `<div class="m-field">App title: Telecloud</div><div class="m-field">Short name: telecloud</div><div class="m-field">Platform: Other</div><div class="m-btn">Create application</div>`,
  },
  {
    t: 'Copy your API ID and API Hash',
    d: 'The API ID is a number. The API Hash is a long mix of 32 letters and numbers. Paste them into the two boxes in this app.',
    v: `<div class="m-kv"><span>App api_id</span><b>12345678</b></div><div class="m-kv"><span>App api_hash</span><b>0123abcd4567ef89…</b></div>`,
  },
];

function openGuide() {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal guide" role="dialog" aria-modal="true" aria-label="How to find your API ID and API Hash">
<div class="g-head"><div><h3>Find your API ID and Hash</h3><p>It takes about two minutes and is free.</p></div>
<button type="button" class="g-x" data-x aria-label="Close">${I.x}</button></div>
<ol class="g-steps">${GUIDE.map(
    (s, i) => `<li><span class="g-n">${i + 1}</span><div class="g-body"><b>${s.t}</b><p>${s.d}</p><div class="mock">${s.v}</div></div></li>`
  ).join('')}</ol>
<div class="g-tip">${I.help}<span>If the site shows an error, wait a few minutes, turn off any VPN and try again. Never share your API Hash with anyone.</span></div>
<div class="btns"><a class="btn btn-light btn-small" href="https://my.telegram.org" target="_blank" rel="noopener">${I.ext}Open my.telegram.org</a>
<button type="button" class="btn btn-small" data-x>Got it</button></div></div>`;
  document.body.appendChild(back);
  const onKey = (e) => e.key === 'Escape' && close();
  const close = () => {
    document.removeEventListener('keydown', onKey);
    back.remove();
  };
  back.querySelectorAll('[data-x]').forEach((b) => (b.onclick = close));
  back.addEventListener('mousedown', (e) => e.target === back && close());
  document.addEventListener('keydown', onKey);
}

function renderLogin(busy = false) {
  const keys = tg.getKeys();
  const dots = [1, 2, 3, 4].map((n) => `<i class="${n === L.step ? 'on' : ''}"></i>`).join('');
  let title = '',
    lead = '',
    body = '',
    cta = 'Continue';

  if (L.step === 1) {
    title = 'Connect your Telegram';
    lead = 'Your folders are private channels in your own Telegram account. Enter the API keys from my.telegram.org.';
    body = `<label class="field">${I.key}<input id="f-id" inputmode="numeric" placeholder="API ID" value="${keys.apiId || ''}" autocomplete="off" /></label>
<label class="field">${I.lock}<input id="f-hash" type="password" placeholder="API Hash" value="${esc(keys.apiHash)}" autocomplete="off" />
<button type="button" class="eye" data-eye aria-label="Show or hide">${I.eye}</button></label>`;
  } else if (L.step === 2) {
    title = 'Your phone number';
    lead = 'Telegram will send a login code to your Telegram app. Use the international format.';
    body = `<label class="field">${I.phone}<input id="f-phone" type="tel" inputmode="tel" placeholder="+8801XXXXXXXXX" value="${esc(L.phone)}" autocomplete="tel" /></label>`;
  } else if (L.step === 3) {
    title = 'Enter the code';
    lead = 'Open Telegram on your phone and type the login code it just sent you.';
    body = `<label class="field">${I.hash}<input id="f-code" inputmode="numeric" placeholder="Login code" autocomplete="one-time-code" /></label>`;
  } else {
    title = 'Two-step password';
    lead = 'Your account has a two-step verification password. Enter it to finish.';
    body = `<label class="field">${I.lock}<input id="f-pw" type="password" placeholder="Telegram password" autocomplete="current-password" />
<button type="button" class="eye" data-eye aria-label="Show or hide">${I.eye}</button></label>`;
    cta = 'Finish';
  }

  app.innerHTML = `<div class="login-wrap">
<span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span>
<form class="login-card" id="login-form">
<div class="login-top brand"><span class="logo">${I.logo}</span>Telecloud</div>
<div class="login-icon">${I.enter}</div>
<h1>${title}</h1><p class="lead">${lead}</p>
${body}
${L.error ? `<div class="err">${esc(L.error)}</div>` : ''}
<button class="btn btn-full" id="go" ${busy ? 'disabled' : ''} style="height:54px;border-radius:18px">${busy ? 'Please wait…' : cta}</button>
${
  L.step === 1
    ? `<div class="divider">Where do I find these?</div>
<button type="button" class="ext ext-guide" data-guide>${I.help}Show me step by step</button>
<a class="ext" href="https://my.telegram.org" target="_blank" rel="noopener" style="margin-top:10px">${I.ext}Open my.telegram.org</a>
${canOfferApk() ? `<a class="apk-card" href="${APK_URL}" rel="noopener"><span class="apk-ic">${I.android}</span><span class="apk-tx"><b>Download the Android app</b><small>Free Android app (APK)</small></span><span class="apk-go">${I.download}</span></a>` : ''}`
    : `<div style="margin-top:12px"><button type="button" class="link-btn" data-back>Back</button></div>`
}
<div class="steps">${dots}</div>
<p class="step-note">Step ${L.step} of 4. Your keys stay on this device.</p>
</form></div>`;

  const first = $('input', app);
  if (first && !busy) first.focus();

  const eye = $('[data-eye]', app);
  if (eye)
    eye.onclick = () => {
      const inp = eye.parentElement.querySelector('input');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    };

  const guide = $('[data-guide]', app);
  if (guide) guide.onclick = openGuide;

  const back = $('[data-back]', app);
  if (back)
    back.onclick = () => {
      L.error = '';
      L.step = L.step === 4 ? 3 : L.step - 1;
      renderLogin();
    };

  $('#login-form').onsubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    L.error = '';
    try {
      if (L.step === 1) {
        const id = $('#f-id').value.trim();
        const hash = $('#f-hash').value.trim();
        if (!/^\d+$/.test(id) || hash.length < 16) throw new Error('Enter the numeric API ID and the long API Hash from my.telegram.org.');
        tg.saveKeys(id, hash);
        L.step = 2;
        renderLogin();
      } else if (L.step === 2) {
        L.phone = $('#f-phone').value.trim().replace(/[\s()-]/g, '');
        if (!/^\+\d{7,15}$/.test(L.phone)) throw new Error('Use the international format, like +8801XXXXXXXXX.');
        renderLogin(true);
        await tg.sendCode(L.phone);
        L.step = 3;
        renderLogin();
      } else if (L.step === 3) {
        const code = $('#f-code').value.trim().replace(/\s/g, '');
        if (!code) throw new Error('Enter the code from Telegram.');
        renderLogin(true);
        const r = await tg.verifyCode(code);
        if (r === 'password') {
          L.step = 4;
          renderLogin();
        } else await finishLogin();
      } else {
        const pw = $('#f-pw').value;
        if (!pw) throw new Error('Enter your Telegram password.');
        renderLogin(true);
        await tg.verifyPassword(pw);
        await finishLogin();
      }
    } catch (err) {
      L.error = tg.friendlyError(err);
      renderLogin();
    }
  };
}

async function finishLogin() {
  if (!(await ensurePin())) {
    L.step = 1;
    return renderLogin(); // L.error explains why
  }
  S.authed = true;
  L.step = 1;
  L.error = '';
  location.hash = '#/';
  route();
}

/* ================= HOME ================= */

async function renderHome() {
  S.curSub = {};
  app.innerHTML = `<div class="shell">${header()}
<div class="head-row"><div><h1 class="title">Your folders</h1>
<p class="sub">Each folder is a private channel in your Telegram. Open one to see your code.</p></div>
<button class="btn" data-newfolder>${I.plus}New folder</button></div>
<label class="searchbar">${I.search}<input id="q" placeholder="Search folders and code" autocomplete="off" /></label>
<div id="out"><div class="loading">Loading your folders…</div></div></div>`;
  bindShared(app);
  $('[data-newfolder]').onclick = newFolder;

  try {
    await ensureFolders(true);
  } catch (e) {
    $('#out').innerHTML = `<div class="empty">Could not load your folders. ${esc(tg.friendlyError(e))}<br/><button class="link-btn" id="retry">Try again</button></div>`;
    $('#retry').onclick = renderHome;
    return;
  }

  const draw = async () => {
    const q = $('#q').value.trim().toLowerCase();
    const list = S.folders.filter((f) => !q || f.name.toLowerCase().includes(q));
    let html = `<div class="grid">${list.map(folderCard).join('')}${
      q ? '' : `<div class="new-card" data-newfolder2><div><b>+</b>Create a new folder</div></div>`
    }</div>`;
    if (!S.folders.length && !q) html = `<div class="empty">No folders yet. Create one for each subject, like “C Programming”.</div>` + html;
    $('#out').innerHTML = html;
    const nf = $('[data-newfolder2]');
    if (nf) nf.onclick = newFolder;

    if (q.length >= 2) {
      const hits = await searchAll(q);
      if ($('#q').value.trim().toLowerCase() !== q) return;
      if (hits.length)
        $('#out').insertAdjacentHTML(
          'beforeend',
          `<h2 class="section-title">Matching code</h2><div class="grid">${hits
            .map(
              ({ f, e }) => `<a class="card entry" href="#/f/${f.id}/e/${e.id}">
<div class="row"><span class="badge">${esc(BADGE[e.lang] || 'Txt')}</span><span class="date">${esc(f.name)}</span></div>
<h3>${esc(e.title)}</h3><div class="meta">${fmtDate(e.ts)}</div></a>`
            )
            .join('')}</div>`
        );
    }
  };
  $('#q').oninput = draw;
  draw();
}

function folderCard(f) {
  const meta = f.count ? `${plural(f.count, 'entry').replace('entrys', 'entries')} · updated ${fmtDay(f.last)}` : 'No entries yet';
  return `<a class="card folder" href="#/f/${f.id}">
<div class="row"><span class="ficon">${I.folder}</span><span class="badge">Channel</span></div>
<div class="info"><h3>${esc(f.name)}</h3><div class="meta">${meta}</div></div><span class="chev">${I.chev}</span></a>`;
}

let creating = false;
async function newFolder() {
  if (creating) return;
  const name = await modal({ title: 'New folder', text: 'This creates a private channel in your Telegram.', input: true, placeholder: 'e.g. Data Structures', confirm: 'Create' });
  if (!name) return;
  creating = true;
  document.querySelectorAll('[data-newfolder],[data-newfolder2]').forEach((b) => b.setAttribute('disabled', ''));
  toast('Creating channel in Telegram…', 0);
  try {
    const f = await tg.createFolder(name);
    hideToast();
    S.folders = [f, ...(S.folders || []).filter((x) => x.id !== f.id)];
    S.entries[f.id] = [];
    toast('Folder created in Telegram');
    location.hash = `#/f/${f.id}`;
  } catch (e) {
    console.error('createFolder failed', e);
    hideToast();
    await modal({ title: 'Folder was not created', text: tg.friendlyError(e), confirm: 'OK', noCancel: true });
  } finally {
    creating = false;
    document.querySelectorAll('[data-newfolder],[data-newfolder2]').forEach((b) => b.removeAttribute('disabled'));
  }
}

async function searchAll(q) {
  const out = [];
  for (const f of S.folders) {
    if (!S.entries[f.id]) {
      try {
        S.entries[f.id] = await tg.loadEntries(f);
      } catch (e) {
        continue;
      }
    }
    for (const e of S.entries[f.id]) if (matches(e, q)) out.push({ f, e });
  }
  return out.slice(0, 30);
}

function matches(e, q) {
  return (
    e.title.toLowerCase().includes(q) ||
    e.question.toLowerCase().includes(q) ||
    e.tags.some((t) => t.toLowerCase().includes(q)) ||
    (e.code || '').toLowerCase().includes(q)
  );
}

/* ================= THREE-DOT MENU AND SUBFOLDER PICKER ================= */

const NEW_SUB = '\u0000new';

function closeMenu() {
  document.querySelectorAll('.menu').forEach((m) => {
    if (m._off) m._off();
    m.remove();
  });
}

// A small menu next to a button. items: [{ label, icon, danger, fn }]. Tapping the same button again closes it.
function openMenu(btn, items) {
  const open = [...document.querySelectorAll('.menu')].find((m) => m._btn === btn);
  closeMenu();
  if (open) return;
  const m = document.createElement('div');
  m.className = 'menu';
  m.setAttribute('role', 'menu');
  m.innerHTML = items
    .map((it, i) => `<button type="button" role="menuitem" class="${it.danger ? 'danger' : ''}" data-i="${i}">${it.icon || ''}<span>${esc(it.label)}</span></button>`)
    .join('');
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect();
  const w = m.offsetWidth;
  const h = m.offsetHeight;
  const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
  let top = r.bottom + 6;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
  m.style.left = left + 'px';
  m.style.top = top + 'px';
  m._btn = btn;
  m.querySelectorAll('button').forEach((b) => {
    b.onclick = (ev) => {
      ev.stopPropagation();
      closeMenu();
      items[+b.dataset.i].fn();
    };
  });
  const onDown = (ev) => {
    if (!m.contains(ev.target) && !btn.contains(ev.target)) closeMenu();
  };
  const onKey = (ev) => ev.key === 'Escape' && closeMenu();
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', closeMenu);
  window.addEventListener('scroll', closeMenu, true);
  m._off = () => {
    document.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', closeMenu);
    window.removeEventListener('scroll', closeMenu, true);
  };
}

// Asks where to put entries. Resolves to the subfolder name, "" (no subfolder), or null if cancelled.
async function pickSub({ title, text, subs, current }) {
  const opts = [{ v: '', label: 'No subfolder (main folder)' }, ...subs.map((s) => ({ v: s, label: s })), { v: NEW_SUB, label: 'New subfolder…' }];
  const choice = await new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal"><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}
<div class="picklist">${opts
      .map((o, i) => {
        const isNew = o.v === NEW_SUB;
        const on = !isNew && o.v === (current || '');
        return `<button type="button" class="pick ${on ? 'on' : ''} ${isNew ? 'new' : ''}" data-i="${i}">${isNew ? I.plus : I.folder}<span>${esc(o.label)}</span>${on ? '<em>current</em>' : ''}</button>`;
      })
      .join('')}</div>
<div class="btns"><button type="button" class="btn btn-light btn-small" data-x>Cancel</button></div></div>`;
    document.body.appendChild(back);
    const done = (v) => {
      back.remove();
      resolve(v);
    };
    back.querySelectorAll('.pick').forEach((b) => (b.onclick = () => done(opts[+b.dataset.i].v)));
    $('[data-x]', back).onclick = () => done(null);
    back.addEventListener('mousedown', (e) => e.target === back && done(null));
  });
  if (choice !== NEW_SUB) return choice;
  const name = await modal({ title: 'New subfolder', text: 'It appears in this folder once something is saved in it.', input: true, placeholder: 'e.g. Lab 3', confirm: 'Create' });
  const clean = tg.cleanSub(name);
  return clean || null;
}

/* ================= FOLDER ================= */

const entriesWord = (n) => plural(n, 'entry').replace('entrys', 'entries');

async function renderFolder(fid, entryId) {
  await ensureFolders().catch(() => {});
  const folder = (S.folders || []).find((f) => f.id === fid);
  if (!folder) {
    location.hash = '#/';
    return;
  }
  S.curSub = S.curSub || {};
  let cur = S.curSub[fid] ?? null; // null = top level of the folder, else the open subfolder
  let selecting = false;
  const picked = new Set();
  let visible = [];

  app.innerHTML = `<div class="shell">${header()}
<a class="back" id="backlink" href="#/">${I.back}All folders</a>
<div class="head-row"><div class="folder-head"><span class="ficon big">${I.folder}</span>
<div><h1 id="ftitle">${esc(folder.name)}</h1><p id="count">Stored in a private Telegram channel.</p></div></div>
<div class="head-btns"><button class="btn btn-light" id="selbtn">${I.check}Select</button>
<button class="btn btn-light" id="newsub">${I.folder}New subfolder</button>
<a class="btn" href="#/f/${fid}/new">${I.plus}Add entry</a></div></div>
<label class="searchbar">${I.search}<input id="q" placeholder="Search by title, question, tag or code" autocomplete="off" /></label>
<div id="out"><div class="loading">Loading entries…</div></div>
<div class="footer-actions"><button class="link-btn danger" id="delfolder">Delete this folder</button></div></div>
<div class="selbar" id="selbar" hidden><span id="selcount">0 selected</span>
<div class="btns"><button class="btn btn-light btn-small" id="selall">Select all</button>
<button class="btn btn-small" id="selmove">${I.folder}Move</button>
<button class="btn btn-light btn-small" id="selcancel">Cancel</button></div></div>`;
  bindShared(app);
  S.cleanup = () => {
    closeMenu();
    const bar = $('#selbar');
    if (bar) bar.remove();
  };

  $('#delfolder').onclick = async () => {
    const ok = await modal({
      title: `Delete “${folder.name}”?`,
      text: 'This deletes the Telegram channel and every entry inside it. This cannot be undone.',
      confirm: 'Delete folder',
    });
    if (!ok) return;
    try {
      await tg.deleteFolder(folder);
      S.folders = S.folders.filter((f) => f.id !== fid);
      delete S.entries[fid];
      toast('Folder deleted');
      location.hash = '#/';
    } catch (e) {
      toast(tg.friendlyError(e));
    }
  };

  try {
    if (!S.entries[fid]) S.entries[fid] = await tg.loadEntries(folder);
  } catch (e) {
    $('#out').innerHTML = `<div class="empty">Could not load this folder. ${esc(tg.friendlyError(e))}</div>`;
    return;
  }
  const entries = S.entries[fid];

  let codesLoading = null;
  const loadCodes = () =>
    (codesLoading ||= (async () => {
      for (const e of entries) {
        try {
          await tg.getCode(e);
        } catch (err) {
          /* skip */
        }
      }
    })());

  const inSub = (e, name) => e.sub.toLowerCase() === name.toLowerCase();

  const copyEntry = async (e) => {
    try {
      const ok = await copyText(tg.getCode(e));
      toast(ok ? 'Code copied' : 'Could not copy. Open the entry and select the code.');
    } catch (err) {
      toast('Could not read this code. ' + tg.friendlyError(err));
    }
  };

  const syncSel = () => {
    $('#selbar').hidden = !selecting;
    $('#selcount').textContent = `${picked.size} selected`;
    $('#selmove').disabled = !picked.size;
    $('#selall').textContent = picked.size && picked.size === visible.length ? 'Clear' : 'Select all';
    $('#selbtn').innerHTML = selecting ? `${I.x}Done` : `${I.check}Select`;
    $('#out').classList.toggle('pad-sel', selecting);
  };

  const setSelecting = (on) => {
    selecting = on;
    if (!on) picked.clear();
    draw();
  };

  // Moves entries into a subfolder: asks where, then rewrites only their captions.
  const moveFlow = async (list) => {
    if (!list.length) return;
    const subs = tg.listSubs(fid, entries);
    const here = list.every((e) => e.sub === list[0].sub) ? list[0].sub : '';
    const target = await pickSub({
      title: list.length === 1 ? 'Move to subfolder' : `Move ${list.length} entries`,
      text: 'Only the caption of each entry changes. Your code, questions and screenshots stay as they are.',
      subs,
      current: here,
    });
    if (target === null) return;
    try {
      toast(`Moving ${list.length === 1 ? 'entry' : 'entries'}…`, 0);
      await tg.moveEntries(folder, list, target, (d, t) => t > 1 && toast(`Moving ${d} of ${t}…`, 0));
      toast(target ? `Moved to “${target}”` : 'Moved to the main folder');
      if (selecting) {
        selecting = false;
        picked.clear();
      }
    } catch (err) {
      toast(tg.friendlyError(err));
    }
    draw();
  };

  const deleteOne = async (e) => {
    const ok = await modal({ title: 'Delete this entry?', text: 'It will also be removed from your Telegram channel.', confirm: 'Delete' });
    if (!ok) return;
    try {
      await tg.deleteEntry(folder, e);
      entries.splice(entries.indexOf(e), 1);
      picked.delete(e.id);
      folder.count = entries.length;
      toast('Entry deleted');
    } catch (err) {
      toast(tg.friendlyError(err));
    }
    draw();
  };

  const subMenu = (btn, name) =>
    openMenu(btn, [
      {
        label: 'Rename',
        icon: I.edit,
        fn: async () => {
          const next = tg.cleanSub(await modal({ title: 'Rename subfolder', input: true, placeholder: name, confirm: 'Rename' }));
          if (!next || next === name) return;
          try {
            toast('Renaming…', 0);
            await tg.moveEntries(folder, entries.filter((e) => inSub(e, name)), next);
            tg.removeLocalSub(fid, name);
            tg.addLocalSub(fid, next);
            toast('Subfolder renamed');
          } catch (err) {
            toast(tg.friendlyError(err));
          }
          draw();
        },
      },
      {
        label: 'Remove subfolder',
        icon: I.trash,
        danger: true,
        fn: async () => {
          const ok = await modal({
            title: `Remove “${name}”?`,
            text: 'Its entries are not deleted. They move back to the main folder.',
            confirm: 'Remove',
          });
          if (!ok) return;
          try {
            toast('Removing…', 0);
            await tg.moveEntries(folder, entries.filter((e) => inSub(e, name)), '');
            tg.removeLocalSub(fid, name);
            toast('Subfolder removed');
          } catch (err) {
            toast(tg.friendlyError(err));
          }
          draw();
        },
      },
    ]);

  const subCard = (name, i) => {
    const n = entries.filter((e) => inSub(e, name)).length;
    return `<div class="card folder subcard" data-sub="${i}" tabindex="0" role="link">
<div class="row"><span class="ficon">${I.folder}</span><button type="button" class="dots" data-subdots="${i}" aria-label="Subfolder options">${I.dots}</button></div>
<div class="info"><h3>${esc(name)}</h3><div class="meta">${n ? entriesWord(n) : 'Empty'}</div></div><span class="chev">${I.chev}</span></div>`;
  };

  const entryCard = (e, showSub) => `<div class="card entry${selecting ? ' selectable' : ''}${picked.has(e.id) ? ' picked' : ''}" data-id="${e.id}">
<div class="row"><span class="badge">${esc(BADGE[e.lang] || 'Txt')}</span><span class="date">${fmtDate(e.ts)}</span>
${selecting ? `<span class="chk" aria-hidden="true">${I.check}</span>` : `<button type="button" class="dots" data-dots="${e.id}" aria-label="More options">${I.dots}</button>`}</div>
<h3>${esc(e.title)}</h3>
<div class="meta">${plural(e.lines, 'line')}${e.shotCount ? ' · ' + plural(e.shotCount, 'screenshot') : ''}${showSub && e.sub ? ` · <span class="subchip">${I.folder}${esc(e.sub)}</span>` : ''}</div>
${e.tags.length ? `<div class="tags">${e.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
${
  selecting
    ? ''
    : `<div class="actions"><a class="btn btn-light btn-small" href="#/f/${fid}/e/${e.id}">Open</a>
<a class="btn btn-light btn-small" href="#/f/${fid}/edit/${e.id}">${I.edit}Edit</a>
<button class="btn btn-small" data-copy="${e.id}">${I.copy}Copy </button></div>`
}</div>`;

  function draw() {
    closeMenu();
    const q = $('#q').value.trim().toLowerCase();
    const subs = tg.listSubs(fid, entries);
    if (cur !== null && !subs.some((s) => s.toLowerCase() === cur.toLowerCase()) && !entries.some((e) => inSub(e, cur))) cur = null;
    S.curSub[fid] = cur;

    const back = $('#backlink');
    back.innerHTML = cur !== null ? `${I.back}${esc(folder.name)}` : `${I.back}All folders`;
    back.onclick = (ev) => {
      if (cur === null) return;
      ev.preventDefault();
      cur = null;
      picked.clear();
      draw();
    };
    $('#ftitle').textContent = cur !== null ? cur : folder.name;
    $('#count').textContent =
      cur !== null
        ? `Subfolder of ${folder.name}.`
        : `${entriesWord(entries.length)}${subs.length ? ' · ' + plural(subs.length, 'subfolder') : ''}. Stored in a private Telegram channel.`;
    $('#newsub').hidden = cur !== null;
    const addLink = $('.head-btns a.btn');
    addLink.href = `#/f/${fid}/new`;

    visible = q ? entries.filter((e) => matches(e, q)) : cur === null ? entries.filter((e) => !e.sub) : entries.filter((e) => inSub(e, cur));

    let html = '';
    const showSubCards = !q && cur === null && subs.length > 0;
    if (!entries.length && !subs.length) {
      $('#out').innerHTML = `<div class="empty">Nothing here yet. Tap “Add entry” to save your first code.</div>`;
      syncSel();
      return;
    }
    if (showSubCards) html += `<h2 class="section-title">Subfolders</h2><div class="grid">${subs.map(subCard).join('')}</div>`;
    if (visible.length) {
      if (showSubCards) html += `<h2 class="section-title">Entries</h2>`;
      html += `<div class="grid">${visible.map((e) => entryCard(e, !!q)).join('')}</div>`;
    } else if (q) {
      html += `<div class="empty">No entries match “${esc(q)}”.</div>`;
    } else if (cur !== null) {
      html += `<div class="empty">This subfolder is empty. Select entries in the folder and move them here, or tap “Add entry”.</div>`;
    }
    $('#out').innerHTML = html;

    // subfolder cards
    $('#out').querySelectorAll('.subcard').forEach((c) => {
      const name = subs[+c.dataset.sub];
      const go = () => {
        cur = name;
        picked.clear();
        selecting = false;
        $('#q').value = '';
        draw();
        window.scrollTo(0, 0);
      };
      c.onclick = (ev) => {
        if (ev.target.closest('button')) return;
        go();
      };
      c.onkeydown = (ev) => {
        if (ev.target === c && (ev.key === 'Enter' || ev.key === ' ')) {
          ev.preventDefault();
          go();
        }
      };
      $('[data-subdots]', c).onclick = (ev) => {
        ev.stopPropagation();
        subMenu(ev.currentTarget, name);
      };
    });

    // entry cards: the whole card opens the entry, or toggles the tick in select mode
    $('#out').querySelectorAll('.entry').forEach((c) => {
      const e = entries.find((x) => x.id === c.dataset.id);
      if (!e) return;
      const act = () => {
        if (selecting) {
          if (picked.has(e.id)) picked.delete(e.id);
          else picked.add(e.id);
          c.classList.toggle('picked', picked.has(e.id));
          syncSel();
        } else {
          location.hash = `#/f/${fid}/e/${e.id}`;
        }
      };
      c.tabIndex = 0;
      c.setAttribute('role', selecting ? 'checkbox' : 'link');
      if (selecting) c.setAttribute('aria-checked', picked.has(e.id) ? 'true' : 'false');
      c.onclick = (ev) => {
        if (!selecting && ev.target.closest('a,button')) return;
        act();
      };
      c.onkeydown = (ev) => {
        if (ev.target === c && (ev.key === 'Enter' || ev.key === ' ')) {
          ev.preventDefault();
          act();
        }
      };
      const dots = $('[data-dots]', c);
      if (dots)
        dots.onclick = (ev) => {
          ev.stopPropagation();
          openMenu(ev.currentTarget, [
            { label: 'Open', icon: I.ext, fn: () => (location.hash = `#/f/${fid}/e/${e.id}`) },
            { label: 'Edit', icon: I.edit, fn: () => (location.hash = `#/f/${fid}/edit/${e.id}`) },
            { label: 'Copy code', icon: I.copy, fn: () => copyEntry(e) },
            { label: 'Move to subfolder', icon: I.folder, fn: () => moveFlow([e]) },
            {
              label: 'Select',
              icon: I.check,
              fn: () => {
                selecting = true;
                picked.add(e.id);
                draw();
              },
            },
            { label: 'Delete', icon: I.trash, danger: true, fn: () => deleteOne(e) },
          ]);
        };
    });

    $('#out').querySelectorAll('[data-copy]').forEach((b) => {
      b.onclick = () => copyEntry(entries.find((x) => x.id === b.dataset.copy));
    });
    syncSel();
  }

  $('#q').oninput = () => {
    loadCodes().then(draw);
    draw();
  };
  $('#selbtn').onclick = () => setSelecting(!selecting);
  $('#selcancel').onclick = () => setSelecting(false);
  $('#selall').onclick = () => {
    if (picked.size && picked.size === visible.length) picked.clear();
    else visible.forEach((e) => picked.add(e.id));
    draw();
  };
  $('#selmove').onclick = () => moveFlow(entries.filter((e) => picked.has(e.id)));
  $('#newsub').onclick = async () => {
    const name = tg.cleanSub(
      await modal({ title: 'New subfolder', text: 'It appears in this folder once something is saved in it.', input: true, placeholder: 'e.g. Lab 3', confirm: 'Create' })
    );
    if (!name) return;
    tg.addLocalSub(fid, name);
    toast('Subfolder created');
    draw();
  };
  draw();

  if (entryId) {
    const entry = entries.find((e) => e.id === entryId);
    if (entry) openViewer(folder, entry);
  }
}

/* ================= VIEWER (full screen) ================= */

async function openViewer(folder, entry) {
  const v = document.createElement('div');
  v.className = 'viewer';
  const hasSide = !!entry.question || entry.shots.length > 0;
  v.innerHTML = `<div class="v-head"><span class="ficon">${I.folder}</span>
<div class="v-title"><b>${esc(entry.title)}</b><small>${esc(folder.name)} · ${fmtDate(entry.ts)}</small></div>
<span class="v-lang">${esc(entry.lang)}</span>
<div class="v-btns">
${hasSide ? `<button class="vbtn" data-side>Question${entry.shots.length ? ' & images' : ''}</button>` : ''}
<button class="vbtn sq" data-minus aria-label="Smaller text">A−</button>
<button class="vbtn sq" data-plus aria-label="Bigger text">A+</button>
<button class="vbtn primary grow" data-copyall>${I.copy}<span>Copy </span></button>
<button class="vbtn sq" data-edit aria-label="Edit entry">${I.edit}</button>
<button class="vbtn sq" data-del aria-label="Delete entry">${I.trash}</button>
<button class="vbtn sq" data-close aria-label="Close">${I.x}</button></div></div>
<div class="v-body"><div class="v-code" id="vcode"><div class="loading" style="color:#a8bbd0">Loading code…</div></div>
<aside class="v-side" id="vside" hidden></aside></div>`;
  document.body.appendChild(v);
  document.body.style.overflow = 'hidden';

  let size = Number(localStorage.getItem('cv_code_size')) || 15;
  const applySize = () => {
    v.style.setProperty('--code-size', size + 'px');
    localStorage.setItem('cv_code_size', String(size));
  };
  applySize();
  $('[data-minus]', v).onclick = () => ((size = Math.max(10, size - 1)), applySize());
  $('[data-plus]', v).onclick = () => ((size = Math.min(30, size + 1)), applySize());
  $('[data-close]', v).onclick = () => (location.hash = `#/f/${folder.id}`);
  const onKey = (e) => e.key === 'Escape' && (location.hash = `#/f/${folder.id}`);
  document.addEventListener('keydown', onKey);
  v.cleanup = () => {
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
  };

  $('[data-edit]', v).onclick = () => (location.hash = `#/f/${folder.id}/edit/${entry.id}`);

  $('[data-del]', v).onclick = async () => {
    const ok = await modal({ title: 'Delete this entry?', text: 'It will also be removed from your Telegram channel.', confirm: 'Delete' });
    if (!ok) return;
    try {
      await tg.deleteEntry(folder, entry);
      S.entries[folder.id] = S.entries[folder.id].filter((e) => e.id !== entry.id);
      folder.count = S.entries[folder.id].length;
      toast('Entry deleted');
      location.hash = `#/f/${folder.id}`;
    } catch (e) {
      toast(tg.friendlyError(e));
    }
  };

  const side = $('#vside', v);
  const sideBtn = $('[data-side]', v);
  if (sideBtn) {
    let built = false;
    sideBtn.onclick = async () => {
      side.hidden = !side.hidden;
      if (side.hidden || built) return;
      built = true;
      side.innerHTML =
        (entry.question ? `<h4>Question</h4><p>${esc(entry.question)}</p>` : '') +
        (entry.shots.length ? `<h4>Screenshots</h4>${entry.shots.map(() => '<img alt="Screenshot" />').join('')}` : '');
      const imgs = side.querySelectorAll('img');
      entry.shots.forEach(async (m, i) => {
        try {
          imgs[i].src = await tg.getShotUrl(m);
        } catch (e) {
          imgs[i].alt = 'Could not load this image';
        }
      });
    };
    if (entry.question && window.innerWidth > 900) sideBtn.click();
  }

  $('[data-copyall]', v).onclick = async () => {
    try {
      const ok = await copyText(tg.getCode(entry));
      toast(ok ? 'All code copied' : 'Could not copy. Press and hold on the code to select it.');
    } catch (err) {
      toast('Could not read this code. ' + tg.friendlyError(err));
    }
  };

  try {
    const code = await tg.getCode(entry);
    const lines = highlightLines(code, entry.lang);
    $('#vcode', v).innerHTML = lines
      .map((html, i) => `<div class="ln"><span class="no">${i + 1}</span><span class="tx">${html || ' '}</span></div>`)
      .join('');
  } catch (e) {
    $('#vcode', v).innerHTML = `<div class="loading" style="color:#f3b3ad">Could not load this code. ${esc(tg.friendlyError(e))}</div>`;
  }
}


/* ---------- subfolder select used by the New and Edit forms ---------- */

function subSelectHtml(fid, entries, selected) {
  const subs = tg.listSubs(fid, entries);
  if (selected && !subs.some((s) => s.toLowerCase() === selected.toLowerCase())) subs.push(selected);
  return `<option value="">No subfolder</option>${subs
    .map((s) => `<option value="${esc(s)}" ${s.toLowerCase() === (selected || '').toLowerCase() ? 'selected' : ''}>${esc(s)}</option>`)
    .join('')}<option value="${NEW_SUB}">+ New subfolder…</option>`;
}

function bindSubSelect(sel) {
  let last = sel.value;
  sel.onchange = async () => {
    if (sel.value !== NEW_SUB) {
      last = sel.value;
      return;
    }
    const name = tg.cleanSub(await modal({ title: 'New subfolder', input: true, placeholder: 'e.g. Lab 3', confirm: 'Create' }));
    if (!name) {
      sel.value = last;
      return;
    }
    let opt = [...sel.options].find((o) => o.value.toLowerCase() === name.toLowerCase());
    if (!opt) {
      opt = new Option(name, name);
      sel.insertBefore(opt, sel.options[sel.options.length - 1]);
    }
    sel.value = opt.value;
    last = sel.value;
  };
}

/* ================= NEW ENTRY ================= */

async function renderNew(fid) {
  await ensureFolders().catch(() => {});
  const folder = (S.folders || []).find((f) => f.id === fid);
  if (!folder) {
    location.hash = '#/';
    return;
  }
  const files = [];
  if (!S.entries[fid]) {
    try {
      S.entries[fid] = await tg.loadEntries(folder);
    } catch (e) {
      /* the subfolder list will just be empty */
    }
  }

  app.innerHTML = `<div class="shell narrow">${header()}
<a class="back" href="#/f/${fid}">${I.back}${esc(folder.name)}</a>
<h1 class="title" style="margin-top:0">New entry</h1>
<p class="sub">It will be saved in your ${esc(folder.name)} channel. The date and time are added for you.</p>
<form class="card form-card" id="form">
<div class="block"><label class="lbl" for="t">Title</label><input class="in" id="t" maxlength="120" placeholder="e.g. Check whether a number is prime" required /></div>
<div class="block"><label class="lbl" for="q">Question <span>(optional)</span></label><textarea class="ta" id="q" placeholder="Paste the full question from your lab sheet or assignment"></textarea></div>
<div class="block two">
<div><label class="lbl" for="l">Language</label><select class="sel" id="l">${tg.LANGUAGES.map((l) => `<option>${esc(l)}</option>`).join('')}</select></div>
<div><label class="lbl" for="g">Tags <span>(optional, separate with commas)</span></label><input class="in" id="g" placeholder="e.g. loops, week 3, lab 2" /></div>
</div>
<div class="block"><label class="lbl" for="sf">Subfolder <span>(optional)</span></label><select class="sel" id="sf">${subSelectHtml(fid, S.entries[fid], (S.curSub || {})[fid] || '')}</select></div>
<div class="block"><label class="lbl">Screenshots <span>(optional)</span></label>
<div class="drop" id="drop"><span class="ui">${I.up}</span>
<div class="txt"><b>Drop images here, or paste with Ctrl+V</b><small>Images are shrunk before they are sent to Telegram.</small></div>
<button type="button" class="btn btn-light btn-small" id="browse">Browse files</button>
<input type="file" id="file" accept="image/*" multiple hidden /></div>
<div class="thumbs" id="thumbs"></div></div>
<div class="block"><label class="lbl" for="c">Code</label>
<textarea class="code-in" id="c" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Paste your code here. Indentation is kept exactly as you paste it." required></textarea></div>
<div class="form-foot"><small>Saving sends the code and your screenshots to the channel as one entry.</small>
<div class="btns"><a class="btn btn-light" href="#/f/${fid}">Cancel</a><button class="btn" id="save">${I.check}Save to Telegram</button></div></div>
</form></div>`;

  const drawThumbs = () => {
    $('#thumbs').innerHTML = files
      .map((f, i) => `<div class="thumb"><img src="${f._url}" alt="" /><button type="button" data-rm="${i}" aria-label="Remove">×</button></div>`)
      .join('');
    $('#thumbs').querySelectorAll('[data-rm]').forEach((b) => {
      b.onclick = () => {
        URL.revokeObjectURL(files[+b.dataset.rm]._url);
        files.splice(+b.dataset.rm, 1);
        drawThumbs();
      };
    });
  };
  const addFiles = (list) => {
    for (const f of list) {
      if (!f.type.startsWith('image/')) continue;
      if (files.length >= 9) {
        toast('You can add up to 9 screenshots');
        break;
      }
      f._url = URL.createObjectURL(f);
      files.push(f);
    }
    drawThumbs();
  };

  bindSubSelect($('#sf'));
  $('#browse').onclick = () => $('#file').click();
  $('#file').onchange = (e) => {
    addFiles([...e.target.files]);
    e.target.value = '';
  };
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add('over');
    })
  );
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    addFiles([...e.dataTransfer.files]);
  });
  const onPaste = (e) => {
    const imgs = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (imgs.length) {
      e.preventDefault();
      addFiles(imgs);
    }
  };
  document.addEventListener('paste', onPaste);
  S.cleanup = () => {
    document.removeEventListener('paste', onPaste);
    files.forEach((f) => URL.revokeObjectURL(f._url));
  };

  $('#c').addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const t = e.target;
      const s = t.selectionStart;
      t.value = t.value.slice(0, s) + '    ' + t.value.slice(t.selectionEnd);
      t.selectionStart = t.selectionEnd = s + 4;
    }
  });

  $('#form').onsubmit = async (e) => {
    e.preventDefault();
    const code = $('#c').value.replace(/\r\n/g, '\n');
    const title = $('#t').value.trim();
    if (!title || !code.trim()) return toast('Add a title and some code first');
    const btn = $('#save');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      await tg.addEntry(folder, {
        title,
        question: $('#q').value,
        lang: $('#l').value,
        tags: $('#g').value.split(',').map((s) => s.trim()).filter(Boolean),
        files,
        code,
        sub: $('#sf').value,
      });
      if ($('#sf').value) tg.addLocalSub(fid, $('#sf').value);
      delete S.entries[fid];
      toast('Saved to Telegram');
      location.hash = `#/f/${fid}`;
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = `${I.check}Save to Telegram`;
      toast(tg.friendlyError(err));
    }
  };
}

/* ================= EDIT ENTRY ================= */

async function renderEdit(fid, entryId) {
  await ensureFolders().catch(() => {});
  const folder = (S.folders || []).find((f) => f.id === fid);
  if (!folder) {
    location.hash = '#/';
    return;
  }
  app.innerHTML = `<div class="shell narrow">${header()}<div class="loading">Loading entry…</div></div>`;

  let entry, oldCode;
  try {
    if (!S.entries[fid]) S.entries[fid] = await tg.loadEntries(folder);
    entry = S.entries[fid].find((e) => e.id === entryId);
    if (entry) oldCode = await tg.getCode(entry);
  } catch (e) {
    toast(tg.friendlyError(e));
  }
  if (!entry || oldCode === undefined) {
    location.hash = `#/f/${fid}`;
    return;
  }

  const files = []; // new screenshots
  const kept = entry.shots.map((m) => ({ m, url: '' })); // existing screenshots

  app.innerHTML = `<div class="shell narrow">${header()}
<a class="back" href="#/f/${fid}/e/${entryId}">${I.back}Back to entry</a>
<h1 class="title" style="margin-top:0">Edit entry</h1>
<p class="sub">Changes are saved to the same message in your ${esc(folder.name)} channel.</p>
<form class="card form-card" id="form">
<div class="block"><label class="lbl" for="t">Title</label><input class="in" id="t" maxlength="120" required /></div>
<div class="block"><label class="lbl" for="q">Question <span>(optional)</span></label><textarea class="ta" id="q"></textarea></div>
<div class="block two">
<div><label class="lbl" for="l">Language</label><select class="sel" id="l">${tg.LANGUAGES.map((l) => `<option ${l === entry.lang ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
<div><label class="lbl" for="g">Tags <span>(optional, separate with commas)</span></label><input class="in" id="g" /></div>
</div>
<div class="block"><label class="lbl" for="sf">Subfolder <span>(optional)</span></label><select class="sel" id="sf">${subSelectHtml(fid, S.entries[fid], entry.sub)}</select></div>
<div class="block"><label class="lbl">Screenshots <span>(tap × to remove, or add more)</span></label>
<div class="thumbs" id="thumbs"></div>
<div class="drop" id="drop" style="margin-top:10px"><span class="ui">${I.up}</span>
<div class="txt"><b>Add images</b><small>Images are shrunk before they are sent to Telegram.</small></div>
<button type="button" class="btn btn-light btn-small" id="browse">Browse files</button>
<input type="file" id="file" accept="image/*" multiple hidden /></div></div>
<div class="block"><label class="lbl" for="c">Code</label>
<textarea class="code-in" id="c" spellcheck="false" autocapitalize="off" autocomplete="off" required></textarea></div>
<div class="form-foot"><small>Saving updates this entry in Telegram.</small>
<div class="btns"><a class="btn btn-light" href="#/f/${fid}/e/${entryId}">Cancel</a><button class="btn" id="save">${I.check}Save changes</button></div></div>
</form></div>`;

  // fill values through JS so nothing gets mangled by HTML parsing
  $('#t').value = entry.title;
  $('#q').value = entry.question;
  $('#g').value = entry.tags.join(', ');
  $('#c').value = oldCode;

  const drawThumbs = () => {
    $('#thumbs').innerHTML =
      kept
        .map(
          (k, i) =>
            `<div class="thumb">${k.url ? `<img src="${k.url}" alt="" />` : '<div class="loading">…</div>'}<button type="button" data-rk="${i}" aria-label="Remove">×</button></div>`
        )
        .join('') +
      files
        .map((f, i) => `<div class="thumb"><img src="${f._url}" alt="" /><button type="button" data-rn="${i}" aria-label="Remove">×</button></div>`)
        .join('');
    $('#thumbs').querySelectorAll('[data-rk]').forEach((b) => {
      b.onclick = () => {
        kept.splice(+b.dataset.rk, 1);
        drawThumbs();
      };
    });
    $('#thumbs').querySelectorAll('[data-rn]').forEach((b) => {
      b.onclick = () => {
        URL.revokeObjectURL(files[+b.dataset.rn]._url);
        files.splice(+b.dataset.rn, 1);
        drawThumbs();
      };
    });
  };
  drawThumbs();
  kept.forEach(async (k) => {
    try {
      k.url = await tg.getShotUrl(k.m);
    } catch (e) {
      /* leave blank */
    }
    if ($('#thumbs')) drawThumbs();
  });

  const addFiles = (list) => {
    for (const f of list) {
      if (!f.type.startsWith('image/')) continue;
      if (files.length + kept.length >= 9) {
        toast('You can have up to 9 screenshots');
        break;
      }
      f._url = URL.createObjectURL(f);
      files.push(f);
    }
    drawThumbs();
  };
  bindSubSelect($('#sf'));
  $('#browse').onclick = () => $('#file').click();
  $('#file').onchange = (e) => {
    addFiles([...e.target.files]);
    e.target.value = '';
  };
  const onPaste = (e) => {
    const imgs = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (imgs.length) {
      e.preventDefault();
      addFiles(imgs);
    }
  };
  document.addEventListener('paste', onPaste);
  S.cleanup = () => {
    document.removeEventListener('paste', onPaste);
    files.forEach((f) => URL.revokeObjectURL(f._url));
    kept.forEach((k) => k.url && URL.revokeObjectURL(k.url));
  };

  $('#c').addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const t = e.target;
      const s = t.selectionStart;
      t.value = t.value.slice(0, s) + '    ' + t.value.slice(t.selectionEnd);
      t.selectionStart = t.selectionEnd = s + 4;
    }
  });

  $('#form').onsubmit = async (e) => {
    e.preventDefault();
    const code = $('#c').value.replace(/\r\n/g, '\n');
    const title = $('#t').value.trim();
    if (!title || !code.trim()) return toast('Add a title and some code first');
    const btn = $('#save');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      await tg.editEntry(folder, entry, {
        title,
        question: $('#q').value,
        lang: $('#l').value,
        tags: $('#g').value.split(',').map((s) => s.trim()).filter(Boolean),
        code,
        newFiles: files,
        keepShotIds: kept.map((k) => k.m.id),
        sub: $('#sf').value,
      });
      if ($('#sf').value) tg.addLocalSub(fid, $('#sf').value);
      delete S.entries[fid];
      toast('Changes saved to Telegram');
      location.hash = `#/f/${fid}/e/${entryId}`;
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = `${I.check}Save changes`;
      toast(tg.friendlyError(err));
    }
  };
}

/* ================= PIN LOCK ================= */

function pinShell(icon, title, lead, body, error, cta, busy, extra = '') {
  app.innerHTML = `<div class="login-wrap">
<span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span>
<form class="login-card" id="pin-form" autocomplete="off">
<div class="login-top brand"><span class="logo">${I.logo}</span>Telecloud</div>
<div class="login-icon">${icon}</div>
<h1>${title}</h1><p class="lead">${lead}</p>
${body}
<div class="err" id="pin-err" ${error ? '' : 'hidden'}>${esc(error)}</div>
<button class="btn btn-full" id="go" ${busy ? 'disabled' : ''} style="height:54px;border-radius:18px">${busy ? 'Please wait…' : cta}</button>
${extra}
</form></div>`;
  // digits only, and show or hide the PIN
  app.querySelectorAll('input').forEach((inp) => {
    inp.oninput = () => (inp.value = inp.value.replace(/\D/g, '').slice(0, 6));
  });
  const eye = $('[data-eye]', app);
  if (eye)
    eye.onclick = () => {
      app.querySelectorAll('input').forEach((inp) => (inp.type = inp.type === 'password' ? 'text' : 'password'));
    };
}

const pinField = (id, placeholder, eye = false, ac = 'off') =>
  `<label class="field">${I.lock}<input id="${id}" type="password" inputmode="numeric" maxlength="6" placeholder="${placeholder}" autocomplete="${ac}" />${
    eye ? `<button type="button" class="eye" data-eye aria-label="Show or hide">${I.eye}</button>` : ''
  }</label>`;

// Asks for a new 6-digit PIN. `save(pin)` stores it; if it throws, the error is shown and the person can retry.
function askNewPin(save) {
  return new Promise((resolve) => {
    const draw = (error = '', busy = false) => {
      pinShell(
        I.lock,
        'Create a 6-digit PIN',
        'The PIN is saved, scrambled, in a private channel in your own Telegram, so the same PIN works on all your devices. It also locks Telecloud on this device. It cannot be recovered, but you can reset it with a Telegram login code.',
        pinField('p1', 'New PIN', true, 'new-password') + pinField('p2', 'Repeat PIN', false, 'new-password'),
        error,
        'Save PIN',
        busy
      );
      if (!busy) $('#p1').focus();
      $('#pin-form').onsubmit = async (e) => {
        e.preventDefault();
        if (busy) return;
        const a = $('#p1').value;
        const b = $('#p2').value;
        if (!/^\d{6}$/.test(a)) return draw('The PIN must be exactly 6 digits.');
        if (a !== b) return draw('The two PINs do not match.');
        draw('', true);
        try {
          await save(a);
          resolve(true);
        } catch (err) {
          console.error('saving the PIN failed', err);
          draw('Could not save the PIN. ' + tg.friendlyError(err));
        }
      };
    };
    draw();
  });
}

const fmtWait = (ms) => {
  const s = Math.ceil(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`;
};

// Generic "enter your PIN" screen with the wrong-PIN limit.
// Resolves { ok: true, pin } | { wiped: true } | { forgot: true }
function askPinScreen({ lead, status, check, forgot }) {
  return new Promise((resolve) => {
    let timer = null;
    const finish = (v) => {
      clearInterval(timer);
      resolve(v);
    };
    const draw = (error = '', busy = false) => {
      clearInterval(timer);
      const st = status();
      const waitMs = Math.max(0, st.until - Date.now());
      const waiting = waitMs > 0;
      pinShell(
        I.lock,
        'Enter your PIN',
        lead,
        pinField('p1', '6-digit PIN', true, 'current-password'),
        waiting ? '' : error || (st.fails ? `Wrong PIN tries so far: ${st.fails}. After ${st.left} more you are signed out.` : ''),
        waiting ? 'Locked' : 'Unlock',
        busy,
        `<div style="margin-top:12px"><button type="button" class="link-btn" data-forgot>Forgot PIN?</button></div>`
      );
      const err = $('#pin-err');
      const go = $('#go');
      const input = $('#p1');
      if (waiting) {
        input.disabled = true;
        go.disabled = true;
        const tick = () => {
          const left = st.until - Date.now();
          if (left <= 0) return draw();
          err.hidden = false;
          err.textContent = `Too many wrong tries. Try again in ${fmtWait(left)}. ${st.left} tries left before you are signed out.`;
        };
        tick();
        timer = setInterval(tick, 1000);
      } else if (!busy) input.focus();

      $('[data-forgot]').onclick = async () => {
        const ok = await modal({ title: forgot.title, text: forgot.text, confirm: forgot.confirm });
        if (ok) finish({ forgot: true });
      };

      $('#pin-form').onsubmit = async (e) => {
        e.preventDefault();
        if (busy || waiting) return;
        const pin = input.value;
        if (!/^\d{6}$/.test(pin)) return draw('Enter all 6 digits.');
        draw('', true);
        const r = await check(pin);
        if (r.ok) return finish({ ok: true, pin });
        if (r.wiped) return finish({ wiped: true });
        draw('Wrong PIN.');
      };
    };
    draw();
  });
}

// Opening the app: the PIN unlocks the login saved on this device.
// Resolves true when unlocked, false when the saved login was removed (forgot PIN or too many tries).
async function askUnlock() {
  const r = await askPinScreen({
    lead: 'Telecloud is locked. Type your 6-digit PIN to continue.',
    status: () => tg.lockStatus('local'),
    check: (pin) => tg.unlock(pin),
    forgot: {
      title: 'Forgot your PIN?',
      text: 'The PIN cannot be recovered. This removes the saved login from this device. Telegram then sends you a login code, and after you enter it you create a new PIN. Your folders and code stay safe in Telegram.',
      confirm: 'Continue',
    },
  });
  if (r.ok) return true;
  if (r.wiped) L.error = 'Too many wrong PINs. For your safety the saved login was removed. Please sign in again.';
  else {
    tg.resetLock();
    S.forgot = true; // after the login code, ask for a NEW pin
  }
  return false;
}

// Right after a Telegram login: check the PIN saved in your Telegram, or create it.
// Returns true when done, false when the person was signed out (L.error says why).
async function ensurePin() {
  try {
    if (tg.isUnlocked()) {
      await tg.saveLogin(); // the PIN was entered earlier in this session (login had expired)
      return true;
    }
    app.innerHTML = `<div class="login-wrap"><div class="loading">Checking your PIN…</div></div>`;
    let remote;
    for (;;) {
      try {
        remote = await tg.getRemotePin();
        break;
      } catch (e) {
        await modal({ title: 'Could not check your PIN', text: tg.friendlyError(e), confirm: 'Try again', noCancel: true });
        app.innerHTML = `<div class="login-wrap"><div class="loading">Checking your PIN…</div></div>`;
      }
    }

    const forgot = S.forgot;
    S.forgot = false;
    if (remote.rec && !forgot) {
      const r = await askPinScreen({
        lead: 'Enter the PIN saved in your Telegram to finish signing in.',
        status: () => tg.lockStatus('remote'),
        check: (pin) => tg.verifyRemotePin(pin, remote.rec),
        forgot: {
          title: 'Forgot your PIN?',
          text: 'You just signed in with a Telegram login code, so you can create a new PIN now. It replaces the old PIN on all your devices.',
          confirm: 'Create new PIN',
        },
      });
      if (r.wiped) {
        L.error = 'Too many wrong PINs. You were signed out. Please sign in again.';
        await tg.signOut();
        return false;
      }
      if (r.ok) {
        await tg.setPin(r.pin); // encrypt the login on this device with the same PIN
        return true;
      }
      // r.forgot: fall through and create a new PIN
    }

    await askNewPin(async (pin) => {
      await tg.saveRemotePin(pin, remote); // creates the private channel the first time
      await tg.setPin(pin);
    });
    return true;
  } catch (e) {
    console.error('ensurePin failed', e);
    L.error = tg.friendlyError(e);
    await tg.signOut().catch(() => {});
    return false;
  }
}

/* ================= ROUTER ================= */

function route() {
  document.querySelectorAll('.viewer').forEach((v) => {
    v.cleanup?.();
    v.remove();
  });
  document.body.style.overflow = '';
  if (S.cleanup) {
    S.cleanup();
    S.cleanup = null;
  }
  if (!S.authed) return renderLogin();
  const p = location.hash.replace(/^#\/?/, '').split('/');
  if (p[0] === 'profile') return renderProfile();
  if (p[0] === 'f' && p[1]) {
    if (p[2] === 'new') return renderNew(p[1]);
    if (p[2] === 'edit' && p[3]) return renderEdit(p[1], p[3]);
    return renderFolder(p[1], p[2] === 'e' ? p[3] : null);
  }
  renderHome();
}

window.addEventListener('hashchange', route);

(async function start() {
  if (tg.hasSession()) {
    if (tg.hasLockedLogin()) {
      // a refresh keeps this tab unlocked; opening the app again asks for the PIN
      if (!(await tg.autoUnlock()) && !(await askUnlock())) return route(); // login was removed, show the sign-in screen
      app.innerHTML = `<div class="login-wrap"><div class="loading">Connecting to Telegram…</div></div>`;
      S.authed = await tg.restore();
    } else {
      // a login saved before the PIN lock existed: connect, then create or check the PIN
      app.innerHTML = `<div class="login-wrap"><div class="loading">Connecting to Telegram…</div></div>`;
      S.authed = await tg.restore();
      if (S.authed && !(await ensurePin())) S.authed = false;
    }
  }
  else tg.wipePlainKeys(); // no login saved: do not leave keys from an older version lying around
  route();
})();

// Offline-friendly shell and installable app (needed for the Android APK)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
