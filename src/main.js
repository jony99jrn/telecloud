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
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 015.5 5H9l2 2.5h7.5A2.5 2.5 0 0121 10v7.5a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5z"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/></svg>',
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

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
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
const S = { authed: false, folders: null, entries: {}, cleanup: null };

function header(extra = '') {
  return `<div class="topbar"><a class="brand" href="#/"><span class="logo">${I.logo}</span>Code Vault</a>
    <div class="top-actions"><span class="pill"><span class="dot"></span><span class="long">Connected to Telegram</span><span class="short">Connected</span></span>${extra}</div></div>`;
}
function topActions() {
  return `<button class="pill-btn so" data-signout>Sign out</button>`;
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
      S.folders = null;
      S.entries = {};
      location.hash = '';
      L.step = 1;
      renderLogin();
    };
}

/* ================= LOGIN ================= */
const L = { step: 1, phone: '', error: '' };

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
    <div class="login-top brand"><span class="logo">${I.logo}</span>Code Vault</div>
    <span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span>
    <form class="login-card" id="login-form">
      <div class="login-icon">${I.enter}</div>
      <h1>${title}</h1><p class="lead">${lead}</p>
      ${body}
      ${L.error ? `<div class="err">${esc(L.error)}</div>` : ''}
      <button class="btn btn-full" id="go" ${busy ? 'disabled' : ''} style="height:54px;border-radius:18px">${busy ? 'Please wait…' : cta}</button>
      ${
        L.step === 1
          ? `<div class="divider">Where do I find these?</div>
             <a class="ext" href="https://my.telegram.org" target="_blank" rel="noopener">${I.ext}Open my.telegram.org</a>`
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
  S.authed = true;
  L.step = 1;
  L.error = '';
  location.hash = '#/';
  route();
}

/* ================= HOME ================= */
async function renderHome() {
  app.innerHTML = `<div class="shell">${header(topActions())}
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

/* ================= FOLDER ================= */
async function renderFolder(fid, entryId) {
  await ensureFolders().catch(() => {});
  const folder = (S.folders || []).find((f) => f.id === fid);
  if (!folder) {
    location.hash = '#/';
    return;
  }
  app.innerHTML = `<div class="shell">${header(topActions())}
    <a class="back" href="#/">${I.back}All folders</a>
    <div class="head-row"><div class="folder-head"><span class="ficon big">${I.folder}</span>
    <div><h1>${esc(folder.name)}</h1><p id="count">Stored in a private Telegram channel.</p></div></div>
    <a class="btn" href="#/f/${fid}/new">${I.plus}Add entry</a></div>
    <label class="searchbar">${I.search}<input id="q" placeholder="Search by title, question, tag or code" autocomplete="off" /></label>
    <div id="out"><div class="loading">Loading entries…</div></div>
    <div class="footer-actions"><button class="link-btn danger" id="delfolder">Delete this folder</button></div></div>`;
  bindShared(app);

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
  $('#count').textContent = `${plural(entries.length, 'entry').replace('entrys', 'entries')}. Stored in a private Telegram channel.`;

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

  const draw = () => {
    const q = $('#q').value.trim().toLowerCase();
    const list = entries.filter((e) => !q || matches(e, q));
    if (!entries.length) {
      $('#out').innerHTML = `<div class="empty">Nothing here yet. Tap “Add entry” to save your first code.</div>`;
      return;
    }
    if (!list.length) {
      $('#out').innerHTML = `<div class="empty">No entries match “${esc(q)}”.</div>`;
      return;
    }
    $('#out').innerHTML = `<div class="grid">${list
      .map(
        (e) => `<div class="card entry" data-id="${e.id}">
        <div class="row"><span class="badge">${esc(BADGE[e.lang] || 'Txt')}</span><span class="date">${fmtDate(e.ts)}</span></div>
        <h3>${esc(e.title)}</h3>
        <div class="meta">${plural(e.lines, 'line')}${e.shotCount ? ' · ' + plural(e.shotCount, 'screenshot') : ''}</div>
        ${e.tags.length ? `<div class="tags">${e.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
        <div class="actions"><a class="btn btn-light btn-small" href="#/f/${fid}/e/${e.id}">Open</a>
        <button class="btn btn-small" data-copy="${e.id}">${I.copy}Copy code</button></div></div>`
      )
      .join('')}</div>`;
    $('#out').querySelectorAll('[data-copy]').forEach((b) => {
      b.onclick = async () => {
        const e = entries.find((x) => x.id === b.dataset.copy);
        try {
          await copyText(await tg.getCode(e));
          toast('Code copied');
        } catch (err) {
          toast('Could not read this code. ' + tg.friendlyError(err));
        }
      };
    });
  };
  $('#q').oninput = () => {
    loadCodes().then(draw);
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
      <button class="vbtn" data-minus aria-label="Smaller text">A−</button>
      <button class="vbtn" data-plus aria-label="Bigger text">A+</button>
      <button class="vbtn primary" data-copyall>${I.copy}Copy all code</button>
      <button class="vbtn" data-del aria-label="Delete entry">${I.trash}</button>
      <button class="vbtn" data-close>${I.x}Close</button></div></div>
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

  try {
    const code = await tg.getCode(entry);
    $('[data-copyall]', v).onclick = async () => {
      await copyText(code);
      toast('All code copied');
    };
    const lines = highlightLines(code, entry.lang);
    $('#vcode', v).innerHTML = lines
      .map((html, i) => `<div class="ln"><span class="no">${i + 1}</span><span class="tx">${html || ' '}</span></div>`)
      .join('');
  } catch (e) {
    $('#vcode', v).innerHTML = `<div class="loading" style="color:#f3b3ad">Could not load this code. ${esc(tg.friendlyError(e))}</div>`;
  }
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
      });
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
  if (p[0] === 'f' && p[1]) {
    if (p[2] === 'new') return renderNew(p[1]);
    return renderFolder(p[1], p[2] === 'e' ? p[3] : null);
  }
  renderHome();
}

window.addEventListener('hashchange', route);

(async function start() {
  if (tg.hasSession()) {
    app.innerHTML = `<div class="login-wrap"><div class="loading">Connecting to Telegram…</div></div>`;
    S.authed = await tg.restore();
  }
  route();
})();
