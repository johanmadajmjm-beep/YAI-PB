/* ═══════════════════════════════════════════════
   app.js — Router + shared state + boot
═══════════════════════════════════════════════ */

/* ── state ── */
window.APP = {
  loaded: false,
  currentPage: 'dashboard',
  pjum: { page: 0, filtered: [] },
  benef: { page: 0, filtered: [] },
  wilayah: { page: 0, filtered: [] },
  PG_SIZE: 50
};

/* ── navigation ── */
function navigate(page) {
  APP.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('active', el.id === 'page-' + page);
  });
  document.getElementById('topbar-title').textContent = {
    dashboard:   'Executive Dashboard',
    beneficiary: 'Data Beneficiary',
    pjum:        'Data PJUM',
    wilayah:     'Sebaran Wilayah',
    analitik:    'Analitik Mendalam',
    laporan:     'Laporan & Export'
  }[page] || page;
}

/* ── sidebar nav ── */
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => {
    if (!APP.loaded) return;
    navigate(el.dataset.page);
  });
});

/* ── refresh ── */
document.getElementById('btn-refresh').addEventListener('click', async () => {
  const btn = document.getElementById('btn-refresh');
  btn.classList.add('spin');
  try {
    await fetchRawData(true);
    buildAll();
  } catch (e) {
    console.error(e);
  }
  btn.classList.remove('spin');
});

/* ── topbar date ── */
function updateTopbarDate() {
  const now = new Date();
  const opts = { day:'2-digit', month:'short', year:'numeric' };
  document.getElementById('topbar-date-val').textContent =
    now.toLocaleDateString('id-ID', opts);
}

/* ── build all pages ── */
function buildAll() {
  buildDashboard();
  buildBenefPage();
  buildPjumPage();
  buildWilayahPage();
  buildAnalitikPage();
  APP.loaded = true;
  document.getElementById('loading-overlay').style.display = 'none';
  document.getElementById('app-layout').style.display = 'flex';
}

/* ── boot ── */
async function boot() {
  updateTopbarDate();
  try {
    await fetchRawData();
    buildAll();
  } catch (e) {
    console.error('Boot error:', e);
    document.getElementById('loading-overlay').innerHTML = `
      <div style="text-align:center;color:#EF4444">
        <div style="font-size:32px;margin-bottom:12px">⚠️</div>
        <div style="font-size:15px;font-weight:700">Gagal memuat data</div>
        <div style="font-size:13px;color:#8A96B8;margin-top:8px">Cek koneksi atau GAS endpoint</div>
        <button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;border-radius:8px;background:#F97316;color:#fff;border:none;cursor:pointer;font-size:13px;font-weight:700">Coba Lagi</button>
      </div>`;
  }
}

boot();
