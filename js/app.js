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

/* ═══════════════════════════════════════════════
   PROGRAM NORMALIZATION
   23 canonical programs + alias mapping
═══════════════════════════════════════════════ */

/* 23 program canonical — nama resmi yang tampil di dropdown */
window.CANONICAL_PROGRAMS = [
  'Ayo - AOI',
  'Ayo - BV',
  'Ayo - Disabilitas',
  'Ayo - IrishAid',
  'Ayo - JPM',
  'Ayo - KEHATI',
  'Ayo - Keswa Matim',
  'Ayo - Lembaga',
  'Ayo - MPIG',
  'Ayo - NLR',
  'Ayo - NLR (BEN)',
  'Ayo - NLR (KUBIK)',
  'Ayo - NLR (PADI)',
  'Ayo - NLR (Small Grant)',
  'Ayo - PolishAid',
  'Ayo - PSE KR',
  'Ayo - Sch (Stunting)',
  'Ayo - Sch/SVD',
  'Ayo - Schmitz (Stunting)',
  'Ayo - SDW',
  'Ayo - SVD (Dis)',
  'Ayo - SVD (Keswa Matim)',
  'Ayo - SVD (Keswa)',
  'Ayo - SVD/SDW',
  'Ayo - Swiss Embassy',
  'Ayo - TF',
  'Ayo - Transfair',
  'Ayo - VA',
  'Ayo - VA (Sorgum)',
  'Ayo - VCA',
  'Ayo - VICRA',
  'PSE Keuskupan'
];

/* Helper: normalisasi string jadi key pembanding */
function _nk(s) {
  if (!s) return '';
  return String(s).trim().toLowerCase()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
    .replace(/\s+/g, ' ').trim();
}

/* Map: normKey → canonical display name */
window.PROG_CANONICAL_MAP = {};
window.CANONICAL_PROGRAMS.forEach(function(p) {
  window.PROG_CANONICAL_MAP[_nk(p)] = p;
});

/* Alias: variasi nama → normKey canonical
   Semua variasi yang ada di data GSheet */
window.PROGRAM_ALIAS = {
  /* JPM group */
  'ayo-bersahaja':   'ayo-jpm',
  'ayo-odgj':        'ayo-jpm',
  'ayo-svd(odgj)':   'ayo-jpm',
  /* VCA group */
  'vca':             'ayo-vca',
  /* NLR group */
  'nlr':             'ayo-nlr',
  'ayo nlr':         'ayo-nlr',
  /* NLR KUBIK group */
  'nlr-kubik':       'ayo-nlr(kubik)',
  /* VA group — variasi penulisan */
  'ayo-va':          'ayo-va',
  'ayo-va':          'ayo-va',
  /* Transfair group */
  'ayo-transfair':   'ayo-transfair',
  /* SVD/SDW group */
  'ayo-svd/sdw':     'ayo-svd/sdw',
  /* KEHATI group */
  'ayo-kehati':      'ayo-kehati',
  /* Lembaga group */
  'ayo-lembaga':     'ayo-lembaga',
  /* Schmitz group */
  'ayo-schmitz(stunting)': 'ayo-schmitz(stunting)',
  'ayo-sch(stunting)':     'ayo-sch(stunting)',
};

/* normKey: kembalikan canonical normKey setelah alias resolution */
window.normKey = function(s) {
  if (!s) return '';
  var k = _nk(s);
  return window.PROGRAM_ALIAS[k] || k;
};

/* normKeyToDisplay: dari raw value → display name canonical */
window.normKeyToDisplay = function(s) {
  if (!s) return '';
  var k = window.normKey(s);
  return window.PROG_CANONICAL_MAP[k] || String(s).trim();
};

/* dedupProgram: dari array raw values → list canonical display name
   yang ada di data, urutan sesuai CANONICAL_PROGRAMS */
window.dedupProgram = function(arr) {
  /* Kumpul canonical keys yang ada di data */
  var found = {};
  arr.forEach(function(val) {
    if (!val || !String(val).trim()) return;
    var k = window.normKey(val);
    if (k) found[k] = 1;
  });

  /* Filter CANONICAL_PROGRAMS yang ada di data */
  var result = window.CANONICAL_PROGRAMS.filter(function(p) {
    return found[_nk(p)];
  });

  /* Tambah program yang ada di data tapi tidak di canonical list */
  Object.keys(found).forEach(function(k) {
    if (!window.PROG_CANONICAL_MAP[k]) {
      /* Tidak ada di canonical — tampilkan apa adanya dari data */
      arr.forEach(function(val) {
        if (window.normKey(val) === k && result.indexOf(val) < 0) {
          result.push(String(val).trim());
        }
      });
    }
  });

  return result;
};

/* ═══════════════════════════════════════════════
   STAF NORMALIZATION
   26 staf canonical + alias mapping
═══════════════════════════════════════════════ */

/* 26 staf canonical */
window.CANONICAL_STAF = [
  'Apri','Boy','Delvi','Didi','Eni','Epin','Erika','Flori',
  'Gen','Gusto','Jack','Jeri','Johan','Len','Misel','Nerdi',
  'Patris','Rfl','Rik','Simon','Stanis','Stef','Tetik',
  'Veli','Vino','Yos'
];

/* Alias staf: variasi penulisan → canonical lowercase key */
window.STAF_ALIAS = {
  'gens':  'gen',
  'gen':   'gen',
  'johan': 'johan',
  'len':   'len',
  'lEN':   'len',
  'stef':  'stef',
};

/* Map: lowercase canonical → display name */
window.STAF_CANONICAL_MAP = {};
window.CANONICAL_STAF.forEach(function(s) {
  window.STAF_CANONICAL_MAP[s.toLowerCase()] = s;
});

/* normStafKey: kembalikan lowercase canonical key */
window.normStafKey = function(s) {
  if (!s) return '';
  var k = String(s).trim().toLowerCase().replace(/\s+/g, ' ');
  return window.STAF_ALIAS[k] || k;
};

/* getStafDisplay: dari raw value → canonical display name */
window.getStafDisplay = function(val) {
  if (!val || !String(val).trim()) return null;
  var k = window.normStafKey(val);
  /* Cek canonical map */
  if (window.STAF_CANONICAL_MAP[k]) return window.STAF_CANONICAL_MAP[k];
  /* Fallback: Title Case */
  var s = String(val).trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

/* dedupStaf: dari array raw values → list canonical display name */
window.dedupStaf = function(arr) {
  var found = {};
  arr.forEach(function(val) {
    if (!val || !String(val).trim()) return;
    var k = window.normStafKey(val);
    if (k && !found[k]) found[k] = window.getStafDisplay(val);
  });

  /* Urut sesuai CANONICAL_STAF dulu, sisanya append */
  var result = window.CANONICAL_STAF.filter(function(s) {
    return found[s.toLowerCase()];
  });
  Object.keys(found).forEach(function(k) {
    if (!window.STAF_CANONICAL_MAP[k]) result.push(found[k]);
  });
  return result;
};

/* bestStafName: Title Case */
window.bestStafName = function(name) {
  if (!name) return '';
  var s = String(name).trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

/* dedupByNormKey: generik */
window.dedupByNormKey = function(arr, keyFn) {
  var map = {};
  arr.forEach(function(val) {
    if (!val || !String(val).trim()) return;
    var k = keyFn(val); if (!k) return;
    if (!map[k]) map[k] = val;
    else {
      var cur = map[k];
      var isCurTitle = cur === cur.charAt(0).toUpperCase() + cur.slice(1).toLowerCase();
      var isValTitle = val === val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
      if (!isCurTitle && isValTitle) map[k] = val;
    }
  });
  return Object.values(map).filter(Boolean).sort(function(a,b){return a.localeCompare(b);});
};

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
      if (proyekKey && normKey(proyek||'')   !== proyekKey) return false;
      if (stafKey   && normStafKey(staf||'') !== stafKey)   return false;
      /* Tanggal — semua data masuk, hanya filter jika ada pilihan */
      if (tahun || bulan) {
        var tglValid = validTgl(tgl);
        if (tahun === '__blank__') { if (tglValid) return false; }
        else if (tahun) { if (!tglValid || !tglValid.startsWith(tahun)) return false; }
        if (bulan === '__blank__') { if (tglValid) return false; }
        else if (bulan) { if (!tglValid || tglValid.slice(5,7) !== bulan) return false; }
      }
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
    populateSel('dash-staf', dedupStaf(rawStaf));
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
    ['L / P', countUniqByGender(benef,'L') +
      ' / ' + countUniqByGender(benef,'P')],
  ];
  var bRekEl = document.getElementById('laporan-benef-rekap');
  if (bRekEl) bRekEl.innerHTML = rekapB.map(function(x) {
    return '<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)">' +
      '<span style="color:var(--text2);font-size:13px">'+x[0]+'</span>' +
      '<span style="font-weight:700;font-size:13px">'+x[1]+'</span></div>';
  }).join('');

  var allProgMap = {};
  pjum.forEach(function(r){if(r[P.proyek]) allProgMap[r[P.proyek].trim().toLowerCase()] = r[P.proyek].trim();});
  benef.forEach(function(r){if(r[B.proyek]) allProgMap[r[B.proyek].trim().toLowerCase()] = r[B.proyek].trim();});
  var allProg = Object.values(allProgMap).sort();

  /* KPI Summary */
  var kpiEl = document.getElementById('laporan-kpi-grid');
  if (kpiEl) {
    var kpis = [
      {icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',label:'Total Biaya PJUM',   val:fmtShort(totalCost),                           col:'sc-purple'},
      {icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',label:'Total Transaksi',     val:pjum.length.toLocaleString(),                  col:'sc-orange'},
      {icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',label:'Benef Unik',          val:Object.keys(uniqBSet).length.toLocaleString(),  col:'sc-green'},
      {icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',label:'Total Records',       val:benef.length.toLocaleString(),                  col:'sc-blue'},
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
    var pRows  = pjum.filter(function(r){return (r[P.proyek]||'').trim().toLowerCase()===prog.trim().toLowerCase();});
    var bRows  = benef.filter(function(r){return (r[B.proyek]||'').trim().toLowerCase()===prog.trim().toLowerCase();});
    var cost   = pRows.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
    var bTotal = bRows.length;
    var bUniqS = {};
    bRows.forEach(function(r){bUniqS[(r[B.nama]||'').toLowerCase()+'|'+(r[B.desa]||'')]=1;});
    var bUniq = Object.keys(bUniqS).length;
    var rpp   = bUniq > 0 && cost > 0 ? fmtShort(cost/bUniq) : '—';
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

  /* Tabel per staf — group by lowercase supaya tidak double */
  var allStafMap = {};
  pjum.forEach(function(r){if(r[P.staf]) allStafMap[r[P.staf].trim().toLowerCase()] = r[P.staf].trim();});
  benef.forEach(function(r){if(r[B.staf]) allStafMap[r[B.staf].trim().toLowerCase()] = r[B.staf].trim();});
  var allStaf = Object.values(allStafMap).sort();
  var stafTbody = document.getElementById('laporan-staf-body');
  if (stafTbody) stafTbody.innerHTML = allStaf.map(function(staf, i) {
    var k = staf.trim().toLowerCase();
    var pRowsS  = pjum.filter(function(r){return (r[P.staf]||'').trim().toLowerCase()===k;});
    var bRowsS  = benef.filter(function(r){return (r[B.staf]||'').trim().toLowerCase()===k;});
    var costS   = pRowsS.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
    var bUniqS  = countUniqBenef(bRowsS);
    return '<tr>' +
      '<td>'+(i+1)+'</td>' +
      '<td><strong>'+staf+'</strong></td>' +
      '<td class="num">'+(costS>0?fmtShort(costS):'—')+'</td>' +
      '<td class="num">'+(pRowsS.length>0?pRowsS.length.toLocaleString():'—')+'</td>' +
      '<td class="num">'+(bUniqS>0?bUniqS.toLocaleString():'—')+'</td>' +
    '</tr>';
  }).join('');}

/* Boot */
async function boot() {
  updateTopbarDate();
  var maxRetry = 3;
  for (var i = 0; i < maxRetry; i++) {
    try {
      if (i > 0) {
        var lo = document.getElementById('loading-overlay');
        if (lo) lo.innerHTML =
          '<div style="text-align:center;color:var(--text2)">' +
          '<div style="font-size:28px;margin-bottom:12px">⏳</div>' +
          '<div style="font-size:15px;font-weight:700;color:var(--text1)">Memuat data...</div>' +
          '<div style="font-size:13px;color:var(--text2);margin-top:8px">Percobaan ' + (i+1) + ' dari ' + maxRetry + '</div>' +
          '</div>';
      }
      await fetchRawData();
      buildAll();
      return;
    } catch(e) {
      console.warn('Boot attempt ' + (i+1) + ' gagal:', e);
      if (i < maxRetry - 1) {
        await new Promise(function(r){ setTimeout(r, 3000); });
      }
    }
  }
  /* Semua retry gagal */
  var lo = document.getElementById('loading-overlay');
  if (lo) lo.innerHTML =
    '<div style="text-align:center;color:#EF4444">' +
    '<div style="font-size:32px;margin-bottom:12px">⚠️</div>' +
    '<div style="font-size:15px;font-weight:700">Gagal memuat data</div>' +
    '<div style="font-size:13px;color:#8A96B8;margin-top:8px">Cek koneksi atau GAS endpoint</div>' +
    '<button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;border-radius:8px;background:#F97316;color:#fff;border:none;cursor:pointer;font-size:13px;font-weight:700">Coba Lagi</button>' +
    '</div>';
}

boot();
