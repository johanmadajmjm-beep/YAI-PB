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

/* ── normKey: key untuk deduplikasi (lowercase, spasi di sekitar - dihapus) ──
   "Ayo - JPM" → "ayo-jpm"
   "AYO-JPM"   → "ayo-jpm"
   "Ayo  -  JPM" → "ayo-jpm"
── */
function normKey(s) {
  if (!s) return '';
  return String(s).trim()
    .replace(/\s*-\s*/g, '-')   // "Ayo - JPM" → "Ayo-JPM"
    .replace(/\s+/g, ' ')        // collapse spaces
    .toLowerCase();
}

/* ── normStafKey: untuk staf — hanya lowercase + trim ── */
function normStafKey(s) {
  if (!s) return '';
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

/* ── dedup: deduplikasi array string berdasarkan normKey, pilih versi terbaik ──
   "terbaik" = yang paling banyak muncul, atau kalau sama, yang Title Case
── */
function dedupByNormKey(arr, keyFn) {
  var map = {};   // normKey → {best, count}
  arr.forEach(function(val) {
    if (!val || !String(val).trim()) return;
    var k = keyFn(val);
    if (!k) return;
    if (!map[k]) {
      map[k] = { best: val, count: 1 };
    } else {
      map[k].count++;
      // Prefer Title Case version (first char uppercase, rest mixed)
      var cur = map[k].best;
      var isCurTitle  = cur  === cur.charAt(0).toUpperCase() + cur.slice(1);
      var isValTitle  = val  === val.charAt(0).toUpperCase() + val.slice(1);
      if (!isCurTitle && isValTitle) map[k].best = val;
    }
  });
  return Object.values(map)
    .map(function(x) { return x.best; })
    .filter(Boolean)
    .sort(function(a,b) { return a.localeCompare(b); });
}

/* Dashboard filter helpers */
function populateDashFilters() {
  var pjum  = window.rawPjum;
  var benef = window.rawBenef;
  var P = window.P, B = window.B;

  // 1. Program: kolom proyek (PJUM) + kolom program pendukung (Benef)
  //    deduplikasi berdasarkan normKey agar "Ayo - JPM" = "AYO-JPM"
  var rawProg = pjum.map(function(r){return r[P.proyek];})
    .concat(benef.map(function(r){return r[B.proyek];}));
  var allProg = dedupByNormKey(rawProg, normKey);
  populateSel('dash-proyek', allProg);

  // 2. Staf: kolom staf (PJUM) + kolom nama staf (Benef)
  var rawStaf = pjum.map(function(r){return r[P.staf];})
    .concat(benef.map(function(r){return r[B.staf];}));
  var allStaf = dedupByNormKey(rawStaf, normStafKey);
  populateSel('dash-staf', allStaf);

  // 3. Tahun: dari tgl PJUM + tanggal kegiatan Benef, ambil tahun saja
  var tahunSet = {};
  pjum.forEach(function(r) {
    var t = r[P.tgl] ? String(r[P.tgl]).slice(0,4) : null;
    if (t && t.match(/^20\d{2}$/)) tahunSet[t] = 1;
  });
  benef.forEach(function(r) {
    var t = r[B.tgl] ? String(r[B.tgl]).slice(0,4) : null;
    if (t && t.match(/^20\d{2}$/)) tahunSet[t] = 1;
  });
  var allTahun = Object.keys(tahunSet).sort().reverse();
  populateSel('dash-tahun', allTahun);

  // 4. Bulan: dari tgl PJUM + tanggal kegiatan Benef, ambil bulan yang benar-benar ada
  var bulanSet = {};
  pjum.forEach(function(r) {
    var m = r[P.tgl] ? String(r[P.tgl]).slice(5,7) : null;
    if (m && m.match(/^(0[1-9]|1[0-2])$/)) bulanSet[m] = 1;
  });
  benef.forEach(function(r) {
    var m = r[B.tgl] ? String(r[B.tgl]).slice(5,7) : null;
    if (m && m.match(/^(0[1-9]|1[0-2])$/)) bulanSet[m] = 1;
  });
  var allBulan = Object.keys(bulanSet).sort();
  populateSel('dash-bulan', allBulan, bulanName);

  // Attach listener sekali saja
  if (!window._dashFilterAttached) {
    ['dash-proyek','dash-staf','dash-tahun','dash-bulan'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', applyDashFilter);
    });
    window._dashFilterAttached = true;
  }
}

function getDashFiltered() {
  var proyek = v('dash-proyek');
  var staf   = v('dash-staf');
  var tahun  = v('dash-tahun');
  var bulan  = v('dash-bulan');
  var P = window.P, B = window.B;

  var proyekKey = proyek ? normKey(proyek) : '';
  var stafKey   = staf   ? normStafKey(staf) : '';

  var filteredBenef = window.rawBenef.filter(function(r) {
    if (proyekKey && normKey(r[B.proyek])     !== proyekKey) return false;
    if (stafKey   && normStafKey(r[B.staf])   !== stafKey)   return false;
    if (tahun     && !(r[B.tgl]||'').startsWith(tahun))      return false;
    if (bulan     && (r[B.tgl]||'').slice(5,7) !== bulan)    return false;
    return true;
  });

  var filteredPjum = window.rawPjum.filter(function(r) {
    if (proyekKey && normKey(r[P.proyek])     !== proyekKey) return false;
    if (stafKey   && normStafKey(r[P.staf])   !== stafKey)   return false;
    if (tahun     && !(r[P.tgl]||'').startsWith(tahun))      return false;
    if (bulan     && (r[P.tgl]||'').slice(5,7) !== bulan)    return false;
    return true;
  });

  return { benef: filteredBenef, pjum: filteredPjum };
}

function applyDashFilter() { buildDashboard(); }
function resetDashFilter() {
  ['dash-proyek','dash-staf','dash-tahun','dash-bulan'].forEach(function(id) {
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

  /* KPI Summary */
  var kpiEl = document.getElementById('laporan-kpi-grid');
  if (kpiEl) {
    var kpis = [
      {icon:'💵',label:'Total Biaya PJUM',   val:fmtShort(totalCost),                           col:'sc-purple'},
      {icon:'📋',label:'Total Transaksi',     val:pjum.length.toLocaleString(),                  col:'sc-orange'},
      {icon:'👥',label:'Total Benef',         val:benef.length.toLocaleString(),                 col:'sc-green'},
      {icon:'🆔',label:'Benef Unik',          val:Object.keys(uniqBSet).length.toLocaleString(), col:'sc-blue'},
    ];
    kpiEl.innerHTML = kpis.map(function(k){
      return '<div class="stat-card '+k.col+'"><div class="stat-icon-wrap">'+k.icon+'</div>'+
        '<div class="stat-body"><div class="stat-label">'+k.label+'</div>'+
        '<div class="stat-value">'+k.val+'</div></div></div>';
    }).join('');
  }

  /* Tabel per program */
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
  setEl('laporan-prog-count', allProg.length + ' program');

  /* Tabel per staf */
  var allStafS = {};
  pjum.forEach(function(r){if(r[P.staf]) allStafS[r[P.staf]]=1;});
  benef.forEach(function(r){if(r[B.staf]) allStafS[r[B.staf]]=1;});
  var allStaf = Object.keys(allStafS).sort();
  var stafTbody = document.getElementById('laporan-staf-body');
  if (stafTbody) stafTbody.innerHTML = allStaf.map(function(staf, i) {
    var pRowsS  = pjum.filter(function(r){return r[P.staf]===staf;});
    var bRowsS  = benef.filter(function(r){return r[B.staf]===staf;});
    var costS   = pRowsS.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
    return '<tr>' +
      '<td>'+(i+1)+'</td>' +
      '<td><strong>'+staf+'</strong></td>' +
      '<td class="num">'+(costS>0?fmtShort(costS):'—')+'</td>' +
      '<td class="num">'+(pRowsS.length>0?pRowsS.length.toLocaleString():'—')+'</td>' +
      '<td class="num">'+(bRowsS.length>0?bRowsS.length.toLocaleString():'—')+'</td>' +
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
