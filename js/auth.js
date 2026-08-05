/* ═══════════════════════════════════════════════════════════════
   auth.js — Sistem Login YAI-PB v1.1
   Build: 2026-08-05

   Perbaikan v1.1:
   • window.AUTH_READY = false diset SEBELUM app.js jalan,
     sehingga buildAll() tidak membuka app-layout sebelum login selesai
   • Avatar lama (topbar-avatar hardcoded "A/Admin") diganti
     kontennya dengan nama & inisial koordinator yang login —
     tidak ada elemen ganda
   • setDefaultProgramFilter dikosongkan — dropdown tetap "Semua",
     koordinator bebas memilih program miliknya
═══════════════════════════════════════════════════════════════ */

/* ── Blok app-layout SEBELUM apapun berjalan ──
   Diset false dulu agar buildAll() di app.js tidak membuka
   app-layout sebelum login selesai. */
window.AUTH_READY = false;

/* ══════════════════════════════════════════════════
   1. DATA KOORDINATOR & PROGRAM
══════════════════════════════════════════════════ */
var COORD_DATA = {
  yos: {
    display: 'Yos',
    initial: 'Y',
    programs: [
      'Ayo - AOI',
      'Ayo - KEHATI',
      'Ayo - PolishAid',
      'Ayo - Transfair',
      'Ayo - TF',
      'Ayo - VA',
      'Ayo - VA (Sorgum)'
    ]
  },
  nerdi: {
    display: 'Nerdi',
    initial: 'N',
    programs: [
      'Ayo - IrishAid',
      'Ayo - NLR (BEN)',
      'Ayo - NLR (PADI)',
      'Ayo - NLR',
      'Ayo - SVD (Dis)',
      'Ayo - Swiss Embassy',
      'Ayo - Disabilitas'
    ]
  },
  jeri: {
    display: 'Jeri',
    initial: 'J',
    programs: [
      'Ayo - JPM',
      'Ayo - NLR (KUBIK)',
      'Ayo - Sch/SVD',
      'Ayo - Sch (Stunting)',
      'Ayo - SVD (Keswa)',
      'Ayo - SVD (Keswa Matim)'
    ]
  },
  flory: {
    display: 'Flory',
    initial: 'F',
    programs: [
      'Ayo - MPIG',
      'Ayo - BV'
    ]
  },
  eni: {
    display: 'Eni',
    initial: 'E',
    programs: [
      'Ayo - Schmitz (Stunting)',
      'Ayo - SVD (Keswa Matim)',
      'Ayo - VCA',
      'Ayo - Keswa Matim',
      'Ayo - Lembaga'
    ]
  },
  rich: {
    display: 'Rich',
    initial: 'R',
    programs: [
      'Ayo - PSE',
      'Ayo - PSE KR',
      'Ayo - SVD/SDW',
      'Ayo - SDW',
      'Ayo - VICRA'
    ]
  },
  admin: {
    display: 'Admin',
    initial: 'A',
    programs: null   /* null = akses semua */
  }
};

/* ══════════════════════════════════════════════════
   2. CREDENTIALS
   Format: nama + 2026 (yos2026, nerdi2026, dst)
   Untuk ganti password: ubah nilai di sini.
══════════════════════════════════════════════════ */
var CREDENTIALS = {
  yos:   'yos2026',
  nerdi: 'nerdi2026',
  jeri:  'jeri2026',
  flory: 'flory2026',
  eni:   'eni2026',
  rich:  'rich2026',
  admin: 'admin2026'
};

/* ══════════════════════════════════════════════════
   3. SESSION MANAGEMENT
══════════════════════════════════════════════════ */
var SESSION_KEY = 'yai_auth_v1';

function getSession() {
  try {
    var s = sessionStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch(e) { return null; }
}

function setSession(username) {
  var coord = COORD_DATA[username];
  if (!coord) return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    username: username,
    display:  coord.display,
    initial:  coord.initial,
    programs: coord.programs,
    isAdmin:  username === 'admin',
    loginAt:  Date.now()
  }));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

window.AUTH = {
  getSession:  getSession,
  clearSession: clearSession,
  isLoggedIn:  function() { return !!getSession(); },
  isAdmin:     function() { var s = getSession(); return s && s.isAdmin; },
  getPrograms: function() { var s = getSession(); return s ? s.programs : null; },
  getDisplay:  function() { var s = getSession(); return s ? s.display : ''; }
};

/* ══════════════════════════════════════════════════
   4. FILTER LOCK
   Cara kerja:
   Wrap window.populateSel sehingga setiap kali
   dropdown proyek diisi ulang oleh cascading filter,
   opsi yang bukan milik koordinator otomatis
   dibuang dari daftar. Filter lain (staf, desa, dll)
   tidak disentuh sama sekali — berjalan normal.
══════════════════════════════════════════════════ */

/* Programs yang diizinkan untuk sesi ini (null = admin/semua) */
var _allowedPrograms = null;

function buildAllowedMap(programs) {
  var map = {};
  programs.forEach(function(p) { map[p.trim().toLowerCase()] = true; });
  return map;
}

/* ID dropdown proyek di semua halaman */
var PROYEK_FILTER_IDS = [
  'dash-proyek',
  'bf-proyek',
  'pf-proyek',
  'wf-proyek',
  'lf-proyek'
];

function lockProgramFilters(programs) {
  if (!programs) return;  /* admin: tidak dikunci */
  _allowedPrograms = buildAllowedMap(programs);

  /* Wrap populateSel — setiap kali dipanggil untuk dropdown proyek,
     filter values-nya dulu sebelum dirender ke DOM */
  window._origPopulateSel = window.populateSel;
  window.populateSel = function(id, values, labelFn) {
    if (_allowedPrograms && PROYEK_FILTER_IDS.indexOf(id) > -1) {
      /* Hanya loloskan program milik koordinator */
      values = values.filter(function(v) {
        return _allowedPrograms[String(v).trim().toLowerCase()];
      });
    }
    window._origPopulateSel(id, values, labelFn);
  };

  /* Terapkan ke dropdown yang sudah ada di DOM saat ini */
  PROYEK_FILTER_IDS.forEach(function(id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    /* Hapus opsi yang tidak termasuk program koordinator */
    Array.from(sel.options).forEach(function(opt) {
      if (!opt.value) return;  /* biarkan "Semua" */
      if (!_allowedPrograms[opt.value.trim().toLowerCase()]) {
        opt.parentNode.removeChild(opt);
      }
    });
  });
}

function unlockProgramFilters() {
  _allowedPrograms = null;
  /* Kembalikan populateSel asli jika sudah di-wrap */
  if (window._origPopulateSel) {
    window.populateSel = window._origPopulateSel;
  }
}

/* ══════════════════════════════════════════════════
   5. PLACEHOLDER
══════════════════════════════════════════════════ */
function setDefaultProgramFilter(programs) { /* tidak diperlukan */ }

/* ══════════════════════════════════════════════════
   6. UPDATE AVATAR TOPBAR
   Ganti konten .topbar-avatar yang sudah ada
   (av-circle dan av-name) — bukan tambah elemen baru
══════════════════════════════════════════════════ */
function updateTopbarAvatar(session) {
  var circle = document.querySelector('.topbar-avatar .av-circle');
  var name   = document.querySelector('.topbar-avatar .av-name');
  var avatar = document.querySelector('.topbar-avatar');

  if (circle) circle.textContent = session.initial;
  if (name)   name.textContent   = session.display;

  /* Tambah tombol logout di dalam avatar yang sudah ada */
  if (avatar && !document.getElementById('yai-logout-btn')) {
    /* Style tambahan untuk logout */
    var style = document.createElement('style');
    style.textContent =
      '#yai-logout-btn{background:none;border:none;cursor:pointer;' +
      'font-size:10px;color:var(--text2,#6b7280);padding:0 2px;' +
      'line-height:1;transition:color .15s;}' +
      '#yai-logout-btn:hover{color:#ea580c;}' +
      '.coord-role-badge{font-size:9px;background:#FFF7ED;color:#ea580c;' +
      'border:1px solid #fed7aa;border-radius:20px;' +
      'padding:1px 6px;white-space:nowrap;margin-left:2px;}';
    document.head.appendChild(style);

    /* Tambah badge role dan tombol logout setelah av-name */
    var roleSpan = document.createElement('span');
    roleSpan.className   = 'coord-role-badge';
    roleSpan.textContent = session.isAdmin ? 'Admin' : 'Koordinator';
    avatar.appendChild(roleSpan);

    var logoutBtn = document.createElement('button');
    logoutBtn.id          = 'yai-logout-btn';
    logoutBtn.title       = 'Keluar';
    logoutBtn.textContent = '✕';
    logoutBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (confirm('Yakin ingin keluar dari dashboard?')) {
        clearSession();
        unlockProgramFilters();
        window.location.reload();
      }
    });
    avatar.appendChild(logoutBtn);
  }
}

/* ══════════════════════════════════════════════════
   7. LOGIN UI
══════════════════════════════════════════════════ */
function injectLoginUI() {
  var style = document.createElement('style');
  style.textContent = [
    '#yai-login-overlay{position:fixed;inset:0;z-index:99999;',
    'background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#ea580c 100%);',
    'display:flex;align-items:center;justify-content:center;font-family:inherit;}',

    '#yai-login-card{background:#fff;border-radius:20px;padding:40px 36px;',
    'width:100%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,.35);}',

    '#yai-login-logo{text-align:center;margin-bottom:28px;}',
    '#yai-login-logo .logo-circle{width:64px;height:64px;border-radius:50%;',
    'background:linear-gradient(135deg,#F97316,#ea580c);',
    'display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;}',
    '#yai-login-logo .logo-circle svg{width:32px;height:32px;stroke:#fff;fill:none;}',
    '#yai-login-logo h1{font-size:20px;font-weight:700;color:#111;margin:0 0 4px;}',
    '#yai-login-logo p{font-size:13px;color:#6b7280;margin:0;}',

    '#yai-login-card .field{margin-bottom:16px;}',
    '#yai-login-card label{display:block;font-size:12px;font-weight:600;',
    'color:#374151;margin-bottom:6px;letter-spacing:.3px;}',
    '#yai-login-card input{width:100%;box-sizing:border-box;',
    'border:1.5px solid #e5e7eb;border-radius:10px;',
    'padding:11px 14px;font-size:14px;font-family:inherit;',
    'color:#111;background:#fafafa;outline:none;transition:border .15s,background .15s;}',
    '#yai-login-card input:focus{border-color:#F97316;background:#fff;}',

    '#yai-login-btn{width:100%;padding:12px;border-radius:10px;border:none;',
    'background:linear-gradient(135deg,#F97316,#ea580c);',
    'color:#fff;font-size:15px;font-weight:700;cursor:pointer;',
    'margin-top:8px;transition:opacity .15s;}',
    '#yai-login-btn:hover{opacity:.9;}',
    '#yai-login-btn:disabled{opacity:.6;cursor:not-allowed;}',

    '#yai-login-err{background:#fef2f2;border:1px solid #fecaca;',
    'color:#dc2626;border-radius:8px;padding:10px 13px;font-size:13px;',
    'margin-top:14px;display:none;}'
  ].join('');
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.id  = 'yai-login-overlay';
  overlay.innerHTML = [
    '<div id="yai-login-card">',
    '  <div id="yai-login-logo">',
    '    <div class="logo-circle">',
    '      <svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
    '        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    '        <polyline points="9 22 9 12 15 12 15 22"/>',
    '      </svg>',
    '    </div>',
    '    <h1>YAI-PB Dashboard</h1>',
    '    <p>Yayasan Ayo Indonesia — Program BEN</p>',
    '  </div>',
    '  <div class="field">',
    '    <label for="yai-username">Username</label>',
    '    <input type="text" id="yai-username" placeholder="contoh: yos"',
    '           autocomplete="username" autocapitalize="none" spellcheck="false">',
    '  </div>',
    '  <div class="field">',
    '    <label for="yai-password">Password</label>',
    '    <input type="password" id="yai-password" placeholder="password"',
    '           autocomplete="current-password">',
    '  </div>',
    '  <button id="yai-login-btn">Masuk</button>',
    '  <div id="yai-login-err"></div>',
    '</div>'
  ].join('\n');
  document.body.appendChild(overlay);
}

/* ══════════════════════════════════════════════════
   8. LOGIN HANDLER
══════════════════════════════════════════════════ */
function handleLogin() {
  var usrEl  = document.getElementById('yai-username');
  var pwdEl  = document.getElementById('yai-password');
  var errEl  = document.getElementById('yai-login-err');
  var btn    = document.getElementById('yai-login-btn');

  var username = (usrEl.value || '').trim().toLowerCase();
  var password = (pwdEl.value || '').trim();

  errEl.style.display = 'none';
  errEl.textContent   = '';

  if (!username || !password) {
    showErr('Username dan password wajib diisi.');
    return;
  }

  if (!COORD_DATA[username]) {
    showErr('Username tidak ditemukan.');
    return;
  }

  if (CREDENTIALS[username] !== password) {
    showErr('Password salah. Silakan coba lagi.');
    pwdEl.value = '';
    pwdEl.focus();
    return;
  }

  /* Login berhasil */
  btn.disabled    = true;
  btn.textContent = 'Masuk…';

  setSession(username);

  /* Izinkan app-layout tampil */
  window.AUTH_READY = true;

  /* Sembunyikan overlay */
  var overlay = document.getElementById('yai-login-overlay');
  overlay.style.transition = 'opacity .35s';
  overlay.style.opacity    = '0';
  setTimeout(function() { overlay.style.display = 'none'; }, 350);

  /* Terapkan auth ke dashboard */
  applyAuthAfterLoad();

  function showErr(msg) {
    errEl.textContent   = msg;
    errEl.style.display = 'block';
  }
}

/* ══════════════════════════════════════════════════
   9. TERAPKAN AUTH SETELAH DASHBOARD LOAD
══════════════════════════════════════════════════ */
function applyAuthAfterLoad() {
  var session = getSession();
  if (!session) return;

  function tryApply() {
    if (window.APP && window.APP.loaded) {

      /* Buka app-layout jika belum terbuka (kasus: session sudah ada saat reload) */
      var lo = document.getElementById('loading-overlay');
      var al = document.getElementById('app-layout');
      if (lo) lo.style.display = 'none';
      if (al) al.style.display = 'flex';

      /* Update avatar di topbar */
      updateTopbarAvatar(session);

      /* Kunci filter jika bukan admin */
      if (!session.isAdmin && session.programs) {
        lockProgramFilters(session.programs);
        setDefaultProgramFilter(session.programs);
      }

    } else {
      setTimeout(tryApply, 300);
    }
  }
  tryApply();
}

/* ══════════════════════════════════════════════════
   10. BOOT
══════════════════════════════════════════════════ */
(function bootAuth() {
  var session = getSession();

  if (session) {
    /* Session aktif: izinkan buildAll() membuka app-layout */
    window.AUTH_READY = true;
    /* Tunggu DOM siap lalu terapkan auth */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        applyAuthAfterLoad();
      });
    } else {
      applyAuthAfterLoad();
    }
  } else {
    /* Belum login: tampilkan overlay login */
    /* AUTH_READY tetap false → buildAll() tidak buka app-layout */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        injectLoginUI();
        attachLoginEvents();
      });
    } else {
      injectLoginUI();
      attachLoginEvents();
    }
  }
})();

function attachLoginEvents() {
  var btn    = document.getElementById('yai-login-btn');
  var pwdEl  = document.getElementById('yai-password');
  var usrEl  = document.getElementById('yai-username');

  if (btn)   btn.addEventListener('click', handleLogin);
  if (pwdEl) pwdEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleLogin();
  });
  if (usrEl) usrEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { document.getElementById('yai-password').focus(); }
  });

  setTimeout(function() { if (usrEl) usrEl.focus(); }, 150);
}
