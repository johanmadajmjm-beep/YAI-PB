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
    // Dashboard: hanya re-render, TIDAK reset/repopulate filter
    // Filter sudah di-attach saat buildAll pertama kali
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

/* ── ALIAS MAP: program berbeda nama tapi sama secara organisasi ──
   key   = normKey dari nama APAPUN dalam grup
   value = normKey canonical (yang akan ditampilkan di dropdown)
── */
var PROGRAM_ALIAS = {
  // Ayo - JPM group
  'ayo-bersahaja':  'ayo-jpm',
  'ayo-odgj':       'ayo-jpm',
  'ayo-svd(odgj)':  'ayo-jpm',

  // Ayo - VCA group
  'vca':            'ayo-vca',

  // Ayo - NLR (KUBIK) group
  'nlr-kubik':      'ayo-nlr(kubik)',

  // Ayo - NLR group
  'nlr':            'ayo-nlr',
  // 'ayo-nlr(ben)' → grup tersendiri, tidak di-alias
};

/* ── normKey: key untuk deduplikasi program
   "Ayo - JPM", "AYO-JPM", "AYO - JPM" → semua jadi "ayo-jpm"
   "Ayo - NLR (KUBIK)", "Ayo - NLR(KUBIK)" → "ayo-nlr(kubik)"
── */
function normKey(s) {
  if (!s) return '';
  var k = String(s).trim()
    .toLowerCase()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
  // Cek alias — kalau ada, kembalikan canonical key
  return PROGRAM_ALIAS[k] || k;
}

/* ── ALIAS MAP STAF: nama berbeda tapi orang sama ── */
var STAF_ALIAS = {
  'gens': 'gen',   // Gens = Gen
};

/* ── normStafKey: lowercase + trim + alias ── */
function normStafKey(s) {
  if (!s) return '';
  var k = String(s).trim().toLowerCase().replace(/\s+/g, ' ');
  return STAF_ALIAS[k] || k;
}

/* ── bestStafName: pilih nama tampilan terbaik (Title Case) ── */
function bestStafName(name) {
  if (!name) return '';
  var s = String(name).trim();
  // Jika semua huruf sama (semua caps atau semua lower), Title Case
  if (s === s.toUpperCase() || s === s.toLowerCase()) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }
  return s; // sudah mixed case, pakai apa adanya
}

/* ── dedupProgram: deduplikasi program
   - normKey sudah include PROGRAM_ALIAS, jadi alias otomatis digabung ke canonical
   - yang tampil di dropdown = canonical key, dicari nama terbaik dari data
── */
function dedupProgram(arr) {
  // map: canonicalKey → nama terbaik untuk ditampilkan
  var map = {};

  arr.forEach(function(val) {
    if (!val || !String(val).trim()) return;
    var canonicalKey = normKey(val); // sudah include alias resolution
    if (!canonicalKey) return;

    if (!map[canonicalKey]) {
      map[canonicalKey] = val;
    } else {
      // Prefer format "Ayo - XXX" (ada spasi di sekitar -)
      var cur = map[canonicalKey];
      var valHasSpace  = /\w\s+-\s+\w/.test(val);
      var curHasSpace  = /\w\s+-\s+\w/.test(cur);
      var valTitleCase = val === val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
      var curTitleCase = cur === cur.charAt(0).toUpperCase() + cur.slice(1).toLowerCase();
      if (!curHasSpace && valHasSpace) map[canonicalKey] = val;
      else if (curHasSpace && valHasSpace && !curTitleCase && valTitleCase) map[canonicalKey] = val;
    }
  });

  return Object.values(map)
    .filter(Boolean)
    .sort(function(a,b) { return a.localeCompare(b); });
}

/* ── dedupByNormKey: generik untuk staf dll ── */
function dedupByNormKey(arr, keyFn) {
  var map = {};
  arr.forEach(function(val) {
    if (!val || !String(val).trim()) return;
    var k = keyFn(val);
    if (!k) return;
    if (!map[k]) {
      map[k] = val;
    } else {
      var cur = map[k];
      var isCurTitle = cur === cur.charAt(0).toUpperCase() + cur.slice(1).toLowerCase();
      var isValTitle = val === val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
      if (!isCurTitle && isValTitle) map[k] = val;
    }
  });
  return Object.values(map).filter(Boolean).sort(function(a,b){return a.localeCompare(b);});
}

/* ── getStafDisplay: canonical display name untuk staf ── */
function getStafDisplay(val) {
  if (!val || !String(val).trim()) return null;
  var lower = String(val).trim().toLowerCase();
  if (STAF_ALIAS[lower]) return STAF_ALIAS[lower];
  var s = String(val).trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/* ── refreshDashFilters: update isi dropdown berdasarkan data yang sudah terfilter
   Cascading: tiap filter hanya tampilkan nilai yang ada di data hasil filter LAIN
   (filter sendiri tidak ikut memfilter dirinya sendiri)
── */
function refreshDashFilters(skipId) {
  var P = window.P, B = window.B;
  var curProyek = v('dash-proyek');
  var curStaf   = v('dash-staf');
  var curTahun  = v('dash-tahun');
  var curBulan  = v('dash-bulan');

  /* Helper: filter data tapi SKIP satu filter tertentu */
  function getFiltered(skipField) {
    var proyekKey = (skipField !== 'proyek' && curProyek) ? normKey(curProyek) : '';
    var stafKey   = (skipField !== 'staf'   && curStaf)   ? normStafKey(curStaf) : '';
    var tahun     = (skipField !== 'tahun'  && curTahun)  ? curTahun : '';
    var bulan     = (skipField !== 'bulan'  && curBulan)  ? curBulan : '';

    function filterRow(tgl, proyek, staf) {
      if (proyekKey && normKey(proyek)   !== proyekKey) return false;
      if (stafKey   && normStafKey(staf) !== stafKey)   return false;
      var tglValid = validTgl(tgl);
      if (tahun === '__blank__' && tglValid) return false;
      if (tahun && tahun !== '__blank__' && (!tglValid || !tglValid.startsWith(tahun))) return false;
      if (bulan === '__blank__' && tglValid) return false;
      if (bulan && bulan !== '__blank__' && (!tglValid || tglValid.slice(5,7) !== bulan)) return false;
      return true;
    }

    var fp = window.rawPjum.filter(function(r) {
      return filterRow(r[P.tgl], r[P.proyek], r[P.staf]);
    });
    var fb = window.rawBenef.filter(function(r) {
      return filterRow(r[B.tgl], r[B.proyek], r[B.staf]);
    });
    return { pjum: fp, benef: fb };
  }

  /* ── Update PROGRAM dropdown (skip filter proyek) ── */
  if (skipId !== 'dash-proyek') {
    var fd = getFiltered('proyek');
    var rawProg = fd.pjum.map(function(r){return r[P.proyek];})
      .concat(fd.benef.map(function(r){return r[B.proyek];}));
    var allProg = dedupProgram(rawProg);
    populateSel('dash-proyek', allProg);
    document.getElementById('dash-proyek').value = curProyek;
  }

  /* ── Update STAF dropdown (skip filter staf) ── */
  if (skipId !== 'dash-staf') {
    var fd2 = getFiltered('staf');
    var rawStaf = fd2.pjum.map(function(r){return r[P.staf];})
      .concat(fd2.benef.map(function(r){return r[B.staf];}));
    var stafMap = {};
    rawStaf.forEach(function(val) {
      var k = normStafKey(val);
      if (!k) return;
      if (!stafMap[k]) stafMap[k] = getStafDisplay(val);
    });
    var allStaf = Object.values(stafMap).filter(Boolean).sort(function(a,b){return a.localeCompare(b);});
    populateSel('dash-staf', allStaf);
    document.getElementById('dash-staf').value = curStaf;
  }

  /* ── Update TAHUN dropdown (skip filter tahun) ── */
  if (skipId !== 'dash-tahun') {
    var fd3 = getFiltered('tahun');
    var tahunSet = {}, hasBlanks = false;
    fd3.pjum.forEach(function(r) {
      var t = validTgl(r[P.tgl]);
      if (t) tahunSet[t.slice(0,4)] = 1; else hasBlanks = true;
    });
    fd3.benef.forEach(function(r) {
      var t = validTgl(r[B.tgl]);
      if (t) tahunSet[t.slice(0,4)] = 1; else hasBlanks = true;
    });
    var allTahun = Object.keys(tahunSet).sort().reverse();
    if (hasBlanks) allTahun.push('__blank__');
    populateSel('dash-tahun', allTahun, function(v) {
      return v === '__blank__' ? '(Tanggal Kosong)' : v;
    });
    document.getElementById('dash-tahun').value = curTahun;
  }

  /* ── Update BULAN dropdown (skip filter bulan) ── */
  if (skipId !== 'dash-bulan') {
    var fd4 = getFiltered('bulan');
    var bulanSet = {}, hasBlanks2 = false;
    fd4.pjum.forEach(function(r) {
      var t = validTgl(r[P.tgl]);
      if (t) bulanSet[t.slice(5,7)] = 1; else hasBlanks2 = true;
    });
    fd4.benef.forEach(function(r) {
      var t = validTgl(r[B.tgl]);
      if (t) bulanSet[t.slice(5,7)] = 1; else hasBlanks2 = true;
    });
    var allBulan = Object.keys(bulanSet).sort();
    if (hasBlanks2) allBulan.push('__blank__');
    populateSel('dash-bulan', allBulan, function(v) {
      return v === '__blank__' ? '(Tanggal Kosong)' : bulanName(v);
    });
    document.getElementById('dash-bulan').value = curBulan;
  }
}

/* Dashboard filter helpers */
function populateDashFilters() {
  if (!window._dashFilterAttached) {
    // Pertama kali: isi dropdown dari data lengkap
    refreshDashFilters(null);

    // Attach listener — tiap perubahan: refresh filter lain + render
    ['dash-proyek','dash-staf','dash-tahun','dash-bulan'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', function() {
        refreshDashFilters(id);
        applyDashFilter();
      });
    });
    window._dashFilterAttached = true;
  }
  // Navigasi kembali ke dashboard — TIDAK reset filter, hanya re-render
  // supaya filter yang sudah dipilih tetap aktif
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
    if (proyekKey && normKey(r[B.proyek])   !== proyekKey) return false;
    if (stafKey   && normStafKey(r[B.staf]) !== stafKey)   return false;
    var tglValid = validTgl(r[B.tgl]);
    if (tahun === '__blank__' && tglValid)  return false;  // hanya yang blank
    if (tahun && tahun !== '__blank__' && (!tglValid || !tglValid.startsWith(tahun))) return false;
    if (bulan === '__blank__' && tglValid)  return false;
    if (bulan && bulan !== '__blank__' && (!tglValid || tglValid.slice(5,7) !== bulan)) return false;
    return true;
  });

  var filteredPjum = window.rawPjum.filter(function(r) {
    if (proyekKey && normKey(r[P.proyek])   !== proyekKey) return false;
    if (stafKey   && normStafKey(r[P.staf]) !== stafKey)   return false;
    var tglValid = validTgl(r[P.tgl]);
    if (tahun === '__blank__' && tglValid)  return false;
    if (tahun && tahun !== '__blank__' && (!tglValid || !tglValid.startsWith(tahun))) return false;
    if (bulan === '__blank__' && tglValid)  return false;
    if (bulan && bulan !== '__blank__' && (!tglValid || tglValid.slice(5,7) !== bulan)) return false;
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
