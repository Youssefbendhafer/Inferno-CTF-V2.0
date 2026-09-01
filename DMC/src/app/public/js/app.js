// ── THE QLIPHOTH — CTF Challenge SPA ─────────────────────────────────────────

const app = document.getElementById('app');

function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Rebellion skull SVG (drawn inline — real DMC asset shape) ─────────────────
const SKULL_SVG = `
<svg class="skull-mark" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Skull dome -->
  <ellipse cx="50" cy="44" rx="32" ry="30" fill="#e8000a" opacity="0.95"/>
  <!-- Eye sockets -->
  <ellipse cx="37" cy="42" rx="8" ry="9" fill="#080808"/>
  <ellipse cx="63" cy="42" rx="8" ry="9" fill="#080808"/>
  <!-- Eye glows -->
  <ellipse cx="37" cy="42" rx="4" ry="4.5" fill="#ff1515" opacity="0.6"/>
  <ellipse cx="63" cy="42" rx="4" ry="4.5" fill="#ff1515" opacity="0.6"/>
  <!-- Nasal cavity -->
  <path d="M46 55 L50 50 L54 55 L52 62 L48 62 Z" fill="#080808"/>
  <!-- Jaw -->
  <rect x="22" y="70" width="56" height="20" rx="3" fill="#c00008"/>
  <!-- Teeth -->
  <rect x="27" y="70" width="7" height="12" rx="1" fill="#080808"/>
  <rect x="37" y="70" width="7" height="14" rx="1" fill="#080808"/>
  <rect x="47" y="70" width="7" height="14" rx="1" fill="#080808"/>
  <rect x="57" y="70" width="7" height="14" rx="1" fill="#080808"/>
  <rect x="67" y="70" width="6" height="12" rx="1" fill="#080808"/>
  <!-- Cheekbones -->
  <path d="M18 52 Q14 58 16 68 L22 70 Q20 60 22 54 Z" fill="#c00008"/>
  <path d="M82 52 Q86 58 84 68 L78 70 Q80 60 78 54 Z" fill="#c00008"/>
  <!-- Crown horns — DMC devil trigger aesthetic -->
  <path d="M32 18 L28 2 L38 14 Z" fill="#e8000a"/>
  <path d="M50 14 L50 0 L56 14 Z" fill="#e8000a"/>
  <path d="M68 18 L72 2 L62 14 Z" fill="#e8000a"/>
  <!-- Chin detail -->
  <rect x="44" y="88" width="12" height="6" rx="2" fill="#8a0006"/>
</svg>`;

// ── Header ────────────────────────────────────────────────────────────────────
function header() {
  return `
  <header class="site-header">
    <div class="header-bg-slash"></div>
    <div class="header-inner">
      ${SKULL_SVG}
      <div class="header-text">
        <div class="site-eyebrow">// INFERNO CTF &nbsp;·&nbsp; QLIPHOTH ARCHIVE SYSTEM &nbsp;·&nbsp; LEVEL: DEMON HUNTER</div>
        <h1 class="site-title" data-text="THE QLIPHOTH">THE <span style="color:var(--red)">QLIPHOTH</span></h1>
        <div class="site-subtitle">Temen-ni-gru · Order of the Sword · Demon World Archive</div>
        <div class="header-rule">
          <div class="header-rule-line"></div>
          <div class="header-rule-dot"></div>
          <div class="header-rule-line" style="width:24px"></div>
        </div>
      </div>
    </div>
  </header>`;
}

function spinner() {
  return `<div class="state"><div class="spin"></div><p>// ACCESSING ARCHIVE...</p></div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// HOME
// ══════════════════════════════════════════════════════════════════════════════
async function renderHome() {
  app.innerHTML = header() + `
    <div class="page-body">
      <div class="sec-bar">
        <div class="sec-bar-fill"><span>Mission Files — Six Circles</span></div>
        <div class="sec-bar-line"></div>
      </div>
      <div class="sec-status">// 6 files declassified &nbsp;·&nbsp; Circle IX sealed &nbsp;·&nbsp; Forbidden Tome: access restricted</div>

      <ul class="mission-list" id="mission-list">${spinner()}</ul>

      <div class="artifact-panel">
        <div class="artifact-copy">
          <strong>Artifact Submission Portal</strong>
          <p>Upload image relics recovered from the Demon World.<br>
          PNG · JPG · GIF accepted. Each relic receives a unique registration seal.</p>
        </div>
        <button class="btn-upload" id="btn-upload">⚔ Submit Artifact</button>
      </div>
    </div>`;

  document.getElementById('btn-upload').addEventListener('click', showModal);
  loadMissions();
}

async function loadMissions() {
  const list = document.getElementById('mission-list');
  if (!list) return;
  try {
    const data = await fetch('/api/v2/codex/scrolls/all').then(r => r.json());
    if (!Array.isArray(data) || !data.length) {
      list.innerHTML = `<li class="state"><p>// ARCHIVE LOCKED — CLEARANCE DENIED</p></li>`;
      return;
    }
    // S rank letters cycling — DMC style
    const ranks = ['S','S','SS','S','SSS','S'];
    list.innerHTML = data.map((s, i) => `
      <li class="mission-entry">
        <a class="mission-link" href="#/scroll/${s.id}">
          <div class="m-num">
            <div class="m-num-n">${parseInt(s.circle)||i+1}</div>
            <div class="m-num-s">circle</div>
          </div>
          <div class="m-info">
            <div class="m-title">${esc(s.title)}</div>
            <div class="m-sub">Author: ${esc(s.author)} &nbsp;·&nbsp; ${esc(s.date)}</div>
          </div>
          <div class="m-rank">
            <span class="m-rank-letter">${ranks[i]||'S'}</span>
            <span class="m-rank-sub">cleared</span>
          </div>
        </a>
      </li>`).join('');
  } catch {
    if (list) list.innerHTML = `<li class="state"><h2>CONNECTION SEVERED</h2><p>// DEMON INTERFERENCE DETECTED</p></li>`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MISSION / SCROLL PAGE
// ══════════════════════════════════════════════════════════════════════════════
async function renderScroll(id) {
  app.innerHTML = header() + `
    <div class="page-body scroll-page">
      <a class="back-btn" href="#/">Mission Select</a>
      <div id="content">${spinner()}</div>
    </div>`;

  try {
    // ── CSPT sink ─────────────────────────────────────────────────────────────
    const res = await fetch(`/api/v2/codex/scrolls/${id}`);
    if (!res.ok) throw new Error(res.status);
    const s = await res.json();

    const el = document.getElementById('content');
    el.innerHTML = `
      <div class="mission-card">
        <div class="mc-label">Mission File · Circle ${parseInt(s.circle)||parseInt(s.id)||1} · Classified Intel</div>
        <h2 class="mc-title">${esc(s.title)}</h2>
        <div class="mc-meta">
          <span>${esc(s.author)}</span>
          <span>${esc(s.date)}</span>
          <span>Qliphoth Archive</span>
        </div>
      </div>
      <div class="file-body" id="file-body"></div>
      <div class="file-footer">
        <span>// INFERNO CTF · THE QLIPHOTH · CLASSIFIED</span>
        <span>${esc(s.date)}</span>
      </div>`;

    // ── XSS sink — raw innerHTML, no sanitization ──────────────────────────
    const body = document.getElementById('file-body');
    (s.content || '').split('\n\n').forEach(para => {
      if (!para.trim()) return;
      const p     = document.createElement('p');
      p.innerHTML = para;
      body.appendChild(p);
    });

  } catch {
    const el = document.getElementById('content');
    if (el) el.innerHTML = `
      <div class="state">
        <h2>File Corrupted</h2>
        <p>// Mission data destroyed or above your clearance level.</p>
      </div>`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════════════════════════════════════
function showModal() {
  const veil = document.createElement('div');
  veil.className = 'veil';
  veil.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <span class="modal-head-title">Artifact Registration</span>
        <button class="modal-head-close" id="btn-x">[ CLOSE ]</button>
      </div>
      <div class="modal-body">
        <p class="modal-desc">
          Submit image artifacts recovered from the Demon World.<br>
          Formats accepted: PNG · JPG · GIF<br>
          Each artifact is assigned a unique registration seal upon submission.
        </p>
        <input class="file-inp" type="file" id="relic-file" accept=".png,.jpg,.jpeg,.gif,image/*"/>
        <div class="modal-actions">
          <button class="btn-cancel-m" id="btn-cancel">Abort</button>
          <button class="btn-send" id="btn-send">Register</button>
        </div>
        <div class="upload-res" id="upload-res"></div>
      </div>
    </div>`;

  document.body.appendChild(veil);

  const close = () => veil.remove();
  document.getElementById('btn-x').onclick = close;
  document.getElementById('btn-cancel').onclick = close;
  veil.addEventListener('click', e => { if (e.target === veil) close(); });
  document.addEventListener('keydown', function k(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); }
  });

  document.getElementById('btn-send').onclick = async () => {
    const file = document.getElementById('relic-file').files[0];
    const res  = document.getElementById('upload-res');
    if (!file) {
      res.className = 'upload-res err';
      res.textContent = '// ERROR: No file selected.';
      return;
    }
    res.className = 'upload-res'; res.style.display = 'block';
    res.textContent = '// Transmitting to archive...';
    try {
      const form = new FormData();
      form.append('relic', file, file.name);
      const r    = await fetch('/api/v1/relic/upload', { method: 'POST', body: form });
      const data = await r.json();
      if (data.success) {
        res.className = 'upload-res ok';
        res.innerHTML = `// Artifact registered.<br>Seal: <strong>${esc(data.filename)}</strong>`;
      } else {
        res.className   = 'upload-res err';
        res.textContent = `// Rejected: ${data.error || 'Unknown error.'}`;
      }
    } catch {
      res.className   = 'upload-res err';
      res.textContent = '// Transmission failed. Demon interference.';
    }
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════════════════════════════════════
function route() {
  const hash  = location.hash || '#/';
  const match = hash.match(/^#\/scroll\/(.+)$/);
  if (match) renderScroll(decodeURIComponent(match[1]));
  else renderHome();
}

window.addEventListener('hashchange', route);
route();
