/* ═══════════════════════════════════════════════
   app.js — Router + shared state + boot
═══════════════════════════════════════════════ */

window.APP = {
  loaded: false,
  currentPage: 'dashboard',
  pjum:    { page: 0, filtered: [] },
  benef:   { page: 0, filtered: [] },
  wilayah: { page: 0, filtered: [] },
  PG_SIZE: 50
};

function navigate(page) {
  APP.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(function(el) {
    el.classList.toggle('active', el.id === 'page-' + page);
  });
  var titles = {
    dashboard:   'Executive Dashboard',
    beneficiary: 'Data Beneficiary',
    pjum:        'Data PJUM',
    wilayah:     'Sebaran Wilayah',
    analitik:    'Analitik Mendalam',
    laporan:     'Laporan & Export'
  };
  var titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = titles[page] || page;

  if (APP.loaded) {
    if (page === 'laporan')  buildLaporanPage();
    if (page === 'dashboard') populateDashFilters();
  }
}

document.querySelectorAll('.nav-item').forEach(function(el) {
  el.addEventListener('click', function() {
    navigate(el.dataset.page);
  });
});

var refreshBtn = document.getElementById('btn-refresh');
if (refreshBtn) refreshBtn.addEventListener('click', async function() {
  refreshBtn.classList.add('spin');
  try {
    await fetchRawData(true);
    buildAll();
  } catch(e) { console.error(e); }
  refreshBtn.classList.remove('spin');
});

function updateTopbarDate() {
  var now = new Date();
  var el  = document.getElementById('topbar-date-val');
  if (el) el.textContent = now.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
}

function buildAll() {
  buildDashboard();
  buildBenefPage();
  buildPjumPage();
  buildWilayahPage();
  buildAnalitikPage();
  buildLaporanPage();
  populateDashFilters();
  APP.loaded = true;
  var lo = document.getElementById('loading-overlay');
  var al = document.getElementById('app-layout');
  if (lo) lo.style.display = 'none';
  if (al) al.style.display = 'flex';
}

/* Dashboard filter helpers (defined here so they're global) */
function populateDashFilters() {
  var benef = window.rawBenef;
  var B = window.B;
  populateSel('dash-kab',   uniqArr(benef.map(function(r){return r[B.kab];})));
  populateSel('dash-kec',   uniqArr(benef.map(function(r){return r[B.kec];})));
  populateSel('dash-desa',  uniqArr(benef.map(function(r){return r[B.desa];})));
  populateSel('dash-jenis', uniqArr(benef.map(function(r){return r[B.kategori];})));
  populateSel('dash-tahun', uniqArr(benef.map(function(r){return r[B.tgl]?r[B.tgl].slice(0,4):null;}).filter(Boolean)).reverse());
}

function applyDashFilter() { buildDashboard(); }
function resetDashFilter() {
  ['dash-tahun','dash-kab','dash-kec','dash-desa','dash-jenis'].forEach(function(id) {
    var el = document.getElementById(id); if(el) el.value = '';
  });
  buildDashboard();
}

/* Laporan page */
function buildLaporanPage() {
  var pjum  = window.rawPjum;
  var benef = window.rawBenef;
  var P = window.P, B = window.B;

  var totalCost = pjum.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
  var fileS={},progPS={},stafPS={},kodeS={};
  pjum.forEach(function(r){
    if(r[P.file])   fileS[r[P.file]]=1;
    if(r[P.proyek]) progPS[r[P.proyek]]=1;
    if(r[P.staf])   stafPS[r[P.staf]]=1;
    if(r[P.kode])   kodeS[r[P.kode]]=1;
  });
  var rekap = [
    ['Total Biaya', fmtShort(totalCost)],
    ['Total Transaksi', pjum.length.toLocaleString()],
    ['Total File Upload', Object.keys(fileS).length.toLocaleString()],
    ['Total Program', Object.keys(progPS).length.toLocaleString()],
    ['Total Staf', Object.keys(stafPS).length.toLocaleString()],
    ['Total Kode Kegiatan', Object.keys(kodeS).length.toLocaleString()],
  ];
  var pRekEl = document.getElementById('laporan-pjum-rekap');
  if (pRekEl) pRekEl.innerHTML = rekap.map(function(x) {
    return '<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)">' +
      '<span style="color:var(--text2);font-size:13px">'+x[0]+'</span>' +
      '<span style="font-weight:700;font-size:13px">'+x[1]+'</span></div>';
  }).join('');

  var uniqBSet={};
  benef.forEach(function(r){uniqBSet[(r[B.nama]||'').toLowerCase()+'|'+(r[B.desa]||'')]=1;});
  var progBS={}, desaS={}, kabS={};
  benef.forEach(function(r){
    if(r[B.proyek]) progBS[r[B.proyek]]=1;
    if(r[B.desa])   desaS[r[B.desa]]=1;
    if(r[B.kab])    kabS[r[B.kab]]=1;
  });
  var rekapB = [
    ['Total Baris', benef.length.toLocaleString()],
    ['Benef Unik', Object.keys(uniqBSet).length.toLocaleString()],
    ['Total Program', Object.keys(progBS).length.toLocaleString()],
    ['Total Desa', Object.keys(desaS).length.toLocaleString()],
    ['Total Kabupaten', Object.keys(kabS).length.toLocaleString()],
    ['L / P', benef.filter(function(r){return r[B.gender]==='L';}).length +
      ' / ' + benef.filter(function(r){return r[B.gender]==='P';}).length],
  ];
  var bRekEl = document.getElementById('laporan-benef-rekap');
  if (bRekEl) bRekEl.innerHTML = rekapB.map(function(x) {
    return '<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)">' +
      '<span style="color:var(--text2);font-size:13px">'+x[0]+'</span>' +
      '<span style="font-weight:700;font-size:13px">'+x[1]+'</span></div>';
  }).join('');

  var allProgS = {};
  pjum.forEach(function(r){if(r[P.proyek])allProgS[r[P.proyek]]=1;});
  benef.forEach(function(r){if(r[B.proyek])allProgS[r[B.proyek]]=1;});
  var allProg = Object.keys(allProgS).sort();

  var tbody = document.getElementById('laporan-prog-body');
  if (tbody) tbody.innerHTML = allProg.map(function(prog, i) {
    var pRows  = pjum.filter(function(r){return r[P.proyek]===prog;});
    var bRows  = benef.filter(function(r){return r[B.proyek]===prog;});
    var cost   = pRows.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
    var bTotal = bRows.length;
    var bUniqS = {};
    bRows.forEach(function(r){bUniqS[(r[B.nama]||'').toLowerCase()+'|'+(r[B.desa]||'')]=1;});
    var bUniq = Object.keys(bUniqS).length;
    var rpp   = bTotal > 0 && cost > 0 ? fmtShort(cost/bTotal) : '—';
    return '<tr>' +
      '<td>'+(i+1)+'</td>' +
      '<td><strong>'+prog+'</strong></td>' +
      '<td class="num">'+(cost>0?fmtShort(cost):'—')+'</td>' +
      '<td class="num">'+(pRows.length>0?pRows.length.toLocaleString():'—')+'</td>' +
      '<td class="num">'+(bTotal>0?bTotal.toLocaleString():'—')+'</td>' +
      '<td class="num">'+(bUniq>0?bUniq.toLocaleString():'—')+'</td>' +
      '<td class="num">'+rpp+'</td>' +
    '</tr>';
  }).join('');
}

/* Boot */
async function boot() {
  updateTopbarDate();
  try {
    await fetchRawData();
    buildAll();
  } catch(e) {
    console.error('Boot error:', e);
    var lo = document.getElementById('loading-overlay');
    if (lo) lo.innerHTML =
      '<div style="text-align:center;color:#EF4444">' +
      '<div style="font-size:32px;margin-bottom:12px">⚠️</div>' +
      '<div style="font-size:15px;font-weight:700">Gagal memuat data</div>' +
      '<div style="font-size:13px;color:#8A96B8;margin-top:8px">Cek koneksi atau GAS endpoint</div>' +
      '<button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;border-radius:8px;background:#F97316;color:#fff;border:none;cursor:pointer;font-size:13px;font-weight:700">Coba Lagi</button>' +
      '</div>';
  }
}

boot();
