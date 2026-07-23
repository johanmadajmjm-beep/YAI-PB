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
    wilayah:     'Sebaran — Wilayah, Paroki & Instansi',
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

/* Laporan page — now with filters */
function buildLaporanPage() {
  /* Populate filters (once) */
  if (!window._laporanFilterAttached) {
    var B = window.B, P = window.P;
    var rawProgs = dedupProgram(
      window.rawPjum.map(function(r){return r[P.proyek];})
        .concat(window.rawBenef.map(function(r){return r[B.proyek];}))
    );
    populateSel('lf-proyek', rawProgs);
    populateSel('lf-staf', dedupStaf(
      window.rawPjum.map(function(r){return r[P.staf];})
        .concat(window.rawBenef.map(function(r){return r[B.staf];}))
    ));
    var tahunSet = {};
    window.rawPjum.forEach(function(r){var t=validTgl(r[P.tgl]);if(t)tahunSet[t.slice(0,4)]=1;});
    window.rawBenef.forEach(function(r){var t=validTgl(r[B.tgl]);if(t)tahunSet[t.slice(0,4)]=1;});
    populateSel('lf-tahun', Object.keys(tahunSet).sort().reverse());
    populateSel('lf-bulan', ['01','02','03','04','05','06','07','08','09','10','11','12'], bulanName);

    ['lf-proyek','lf-staf','lf-tahun','lf-bulan'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', renderLaporanContent);
    });
    var rb = document.getElementById('lf-reset');
    if (rb) rb.addEventListener('click', function() {
      ['lf-proyek','lf-staf','lf-tahun','lf-bulan'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
      renderLaporanContent();
    });
    window._laporanFilterAttached = true;
  }
  renderLaporanContent();
}

function getLaporanFiltered() {
  var P = window.P, B = window.B;
  var proyek = v('lf-proyek'), staf = v('lf-staf'), tahun = v('lf-tahun'), bulan = v('lf-bulan');
  var proyekKey = proyek ? normKey(proyek) : '';
  var stafKey   = staf   ? normStafKey(staf) : '';

  function matchDate(tgl) {
    if (!tahun && !bulan) return true;
    var t = validTgl(tgl);
    if (tahun && (!t || !t.startsWith(tahun))) return false;
    if (bulan && (!t || t.slice(5,7) !== bulan)) return false;
    return true;
  }

  var fb = window.rawBenef.filter(function(r) {
    if (proyekKey && normKey(r[B.proyek]) !== proyekKey) return false;
    if (stafKey && normStafKey(r[B.staf]) !== stafKey) return false;
    return matchDate(r[B.tgl]);
  });
  var fp = window.rawPjum.filter(function(r) {
    if (proyekKey && normKey(r[P.proyek]) !== proyekKey) return false;
    if (stafKey && normStafKey(r[P.staf]) !== stafKey) return false;
    return matchDate(r[P.tgl]);
  });
  return { benef: fb, pjum: fp };
}

function renderLaporanContent() {
  var filtered = getLaporanFiltered();
  var pjum = filtered.pjum, benef = filtered.benef;
  var P = window.P, B = window.B;

  var totalCost = pjum.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
  var fileS={},progPS={},stafPS={},kodeS={};
  pjum.forEach(function(r){if(r[P.file])fileS[r[P.file]]=1;if(r[P.proyek])progPS[r[P.proyek]]=1;if(r[P.staf])stafPS[r[P.staf]]=1;if(r[P.kode])kodeS[r[P.kode]]=1;});
  var rekap = [
    ['Total Biaya', fmtShort(totalCost)],['Total Transaksi', pjum.length.toLocaleString()],
    ['Total File Upload', Object.keys(fileS).length.toLocaleString()],['Total Program', Object.keys(progPS).length.toLocaleString()],
    ['Total Staf', Object.keys(stafPS).length.toLocaleString()],['Total Kode Kegiatan', Object.keys(kodeS).length.toLocaleString()],
  ];
  var pRekEl = document.getElementById('laporan-pjum-rekap');
  if (pRekEl) pRekEl.innerHTML = rekap.map(function(x) {
    return '<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)">' +
      '<span style="color:var(--text2);font-size:13px">'+x[0]+'</span><span style="font-weight:700;font-size:13px">'+x[1]+'</span></div>';
  }).join('');

  var uniqBenef = countUniqBenef(benef);
  var progBS={},desaS={},kabS={};
  benef.forEach(function(r){if(r[B.proyek])progBS[r[B.proyek]]=1;if(r[B.desa])desaS[r[B.desa]]=1;if(r[B.kab])kabS[r[B.kab]]=1;});
  var rekapB = [
    ['Total Baris', benef.length.toLocaleString()],['Benef Unik', uniqBenef.toLocaleString()],
    ['Total Program', Object.keys(progBS).length.toLocaleString()],['Total Desa', Object.keys(desaS).length.toLocaleString()],
    ['Total Kabupaten', Object.keys(kabS).length.toLocaleString()],
    ['L / P', countUniqByGender(benef,'L')+' / '+countUniqByGender(benef,'P')],
  ];
  var bRekEl = document.getElementById('laporan-benef-rekap');
  if (bRekEl) bRekEl.innerHTML = rekapB.map(function(x) {
    return '<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)">' +
      '<span style="color:var(--text2);font-size:13px">'+x[0]+'</span><span style="font-weight:700;font-size:13px">'+x[1]+'</span></div>';
  }).join('');

  /* KPI Summary */
  var kpiEl = document.getElementById('laporan-kpi-grid');
  if (kpiEl) {
    var kpis = [
      {icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',label:'Total Biaya PJUM',val:fmtShort(totalCost),col:'sc-purple'},
      {icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',label:'Total Transaksi',val:pjum.length.toLocaleString(),col:'sc-orange'},
      {icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',label:'Benef Unik',val:uniqBenef.toLocaleString(),col:'sc-green'},
      {icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',label:'Total Records',val:benef.length.toLocaleString(),col:'sc-blue'},
    ];
    kpiEl.innerHTML = kpis.map(function(k){
      return '<div class="stat-card '+k.col+'"><div class="stat-icon-wrap">'+k.icon+'</div>' +
        '<div class="stat-body"><div class="stat-label">'+k.label+'</div><div class="stat-value">'+k.val+'</div></div></div>';
    }).join('');
  }

  /* Tables use filtered data */
  var allProgMap = {};
  pjum.forEach(function(r){if(r[P.proyek]) allProgMap[r[P.proyek].trim().toLowerCase()]=r[P.proyek].trim();});
  benef.forEach(function(r){if(r[B.proyek]) allProgMap[r[B.proyek].trim().toLowerCase()]=r[B.proyek].trim();});
  var allProg = Object.values(allProgMap).sort();
  window._lapProgList = allProg;
  var tbody = document.getElementById('laporan-prog-body');
  if (tbody) tbody.innerHTML = allProg.map(function(prog, i) {
    var pRows=pjum.filter(function(r){return (r[P.proyek]||'').trim().toLowerCase()===prog.trim().toLowerCase();});
    var bRows=benef.filter(function(r){return (r[B.proyek]||'').trim().toLowerCase()===prog.trim().toLowerCase();});
    var cost=pRows.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
    var bTotal=bRows.length, bUniq=countUniqBenef(bRows);
    var rpp=bUniq>0&&cost>0?fmtShort(cost/bUniq):'—';
    return '<tr><td>'+(i+1)+'</td><td><span class="tbl-link" onclick="showProgDetail(window._lapProgList['+i+'])" title="Klik untuk detail"><strong>'+prog+'</strong></span></td>' +
      '<td class="num">'+(cost>0?fmtShort(cost):'—')+'</td><td class="num">'+(pRows.length>0?pRows.length.toLocaleString():'—')+'</td>' +
      '<td class="num">'+(bTotal>0?bTotal.toLocaleString():'—')+'</td><td class="num">'+(bUniq>0?bUniq.toLocaleString():'—')+'</td>' +
      '<td class="num">'+rpp+'</td></tr>';
  }).join('');
  setEl('laporan-prog-count', allProg.length+' program');

  var allStafMap = {};
  pjum.forEach(function(r){if(r[P.staf]) allStafMap[r[P.staf].trim().toLowerCase()]=r[P.staf].trim();});
  benef.forEach(function(r){if(r[B.staf]) allStafMap[r[B.staf].trim().toLowerCase()]=r[B.staf].trim();});
  var allStaf = Object.values(allStafMap).sort();
  window._lapStafList = allStaf;
  var stafTbody = document.getElementById('laporan-staf-body');
  if (stafTbody) stafTbody.innerHTML = allStaf.map(function(staf, i) {
    var k=staf.trim().toLowerCase();
    var pRowsS=pjum.filter(function(r){return (r[P.staf]||'').trim().toLowerCase()===k;});
    var bRowsS=benef.filter(function(r){return (r[B.staf]||'').trim().toLowerCase()===k;});
    var costS=pRowsS.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
    var bUniqS=countUniqBenef(bRowsS);
    return '<tr><td>'+(i+1)+'</td><td><span class="tbl-link" onclick="showStafDetail(window._lapStafList['+i+'])" title="Klik untuk detail"><strong>'+staf+'</strong></span></td>' +
      '<td class="num">'+(costS>0?fmtShort(costS):'—')+'</td><td class="num">'+(pRowsS.length>0?pRowsS.length.toLocaleString():'—')+'</td>' +
      '<td class="num">'+(bUniqS>0?bUniqS.toLocaleString():'—')+'</td></tr>';
  }).join('');
}

/* ══════════════════════════════════════════════════
   Laporan PDF — Laporan Komprehensif Gabungan
══════════════════════════════════════════════════ */
window.exportLaporanPDF = function() {
  var f = getLaporanFiltered();
  var pjum = f.pjum, benef = f.benef;
  var P = window.P, B = window.B;

  var cost = pjum.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
  var uniq = countUniqBenef(benef);
  var g = genderBreakdown(benef);
  var progs = allProgramList(benef, pjum);
  var perB = dataPeriod(benef, B.tgl), perP = dataPeriod(pjum, P.tgl);
  var yearly = calcGrowth(yearlyRecap(benef, pjum), 'uniq');
  var yearlyC = calcGrowth(yearlyRecap(benef, pjum), 'biaya');
  var hier = wilayahHierarchy(benef);
  var disab = disabilityBreakdown(benef);
  var reach = programReach(benef);
  var desaMap = desaProgramMap(benef);
  var anomali = detectAnomalies(benef, pjum);
  var avgPart = avgParticipation(benef);

  var desaS={},kecS={},kabS={},stafS={},fileS={};
  benef.forEach(function(r){ if(r[B.desa])desaS[r[B.desa]]=1; if(r[B.kec])kecS[r[B.kec]]=1; if(r[B.kab])kabS[r[B.kab]]=1; });
  pjum.forEach(function(r){ if(r[P.staf])stafS[r[P.staf]]=1; if(r[P.file])fileS[r[P.file]]=1; });

  /* Rekap gabungan per program */
  var progBenef = groupCountUniq(benef, function(r){return r[B.proyek];});
  var progCost  = groupSum(pjum, function(r){return r[P.proyek];}, function(r){return r[P.jumlah];});
  var reachMap={}; reach.forEach(function(r){reachMap[r.program]=r;});
  var progRows = progs.map(function(p){
    var pR = pjum.filter(function(r){return normKey(r[P.proyek])===normKey(p);});
    var bR = benef.filter(function(r){return normKey(r[B.proyek])===normKey(p);});
    var c = pR.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
    var bu = countUniqBenef(bR);
    var rc = reachMap[p]||{};
    return {prog:p, cost:c, trx:pR.length, rec:bR.length, uniq:bu,
      rpp: bu>0&&c>0 ? c/bu : 0, desa:rc.desa||0, kab:rc.kab||0};
  }).sort(function(a,b){return b.cost-a.cost;});

  /* Rekap gabungan per staf */
  var stafBenef = groupCountUniq(benef, function(r){return r[B.staf];});
  var stafCost  = groupSum(pjum, function(r){return r[P.staf];}, function(r){return r[P.jumlah];});
  var allStafMap = {};
  Object.keys(stafBenef).forEach(function(s){allStafMap[normStafKey(s)]=s;});
  Object.keys(stafCost).forEach(function(s){if(!allStafMap[normStafKey(s)])allStafMap[normStafKey(s)]=s;});
  var stafRows = Object.values(allStafMap).map(function(s){
    var pR = pjum.filter(function(r){return normStafKey(r[P.staf])===normStafKey(s);});
    var c = pR.reduce(function(a,r){return a+(parseFloat(r[P.jumlah])||0);},0);
    var b = stafBenef[s]||0;
    return {staf:s, cost:c, trx:pR.length, uniq:b, rpp: b>0&&c>0 ? c/b : 0};
  }).sort(function(a,b){return b.cost-a.cost;});

  var byKomp = topN(groupSum(pjum,function(r){return classifyItem(r[P.item]);},function(r){return r[P.jumlah];}),12);
  var byKat = uniqGroupField(benef, B.kategori);
  var byUsia = uniqGroupField(benef, B.katUsia);
  var byDesa = topN(groupCountUniq(benef,function(r){return r[B.desa];}),25);
  var byKeg = topN(groupCountUniq(benef,function(r){return r[B.kegiatan];}),15);
  var peakB = peakMonths(benef, B.tgl, 'uniq');
  var peakP = peakMonths(pjum, P.tgl, 'sum', P.jumlah);
  var underServed = desaMap.filter(function(x){return x.n===1;});
  var concDesa = concentrationIndex(byDesa.map(function(x){return x[1];}));

  var complete = columnCompleteness(benef, [
    {idx:B.nama,label:'Nama'},{idx:B.gender,label:'Jenis Kelamin'},{idx:B.katUsia,label:'Kategori Usia'},
    {idx:B.kategori,label:'Kategori'},{idx:B.disab,label:'Disabilitas'},{idx:B.desa,label:'Desa'},
    {idx:B.kec,label:'Kecamatan'},{idx:B.kab,label:'Kabupaten'},{idx:B.proyek,label:'Program'},
    {idx:B.kegiatan,label:'Kegiatan'},{idx:B.staf,label:'Staf'},{idx:B.tgl,label:'Tanggal',isDate:true}
  ]);
  var completeP = columnCompleteness(pjum, [
    {idx:P.tgl,label:'Tanggal',isDate:true},{idx:P.staf,label:'Staf'},{idx:P.proyek,label:'Program'},
    {idx:P.kode,label:'Kode Kegiatan'},{idx:P.kegiatan,label:'Kegiatan'},{idx:P.item,label:'Item'},
    {idx:P.jumlah,label:'Jumlah'},{idx:P.file,label:'File Sumber'}
  ]);

  var filterText = getFilterSummary([
    {label:'Program',val:v('lf-proyek')},{label:'Staf',val:v('lf-staf')},
    {label:'Tahun',val:v('lf-tahun')},{label:'Bulan',val:v('lf-bulan')?bulanName(v('lf-bulan')):''}
  ]);

  var topProg = progRows[0]||{prog:'—',cost:0};
  var topKab = hier[0]||{kab:'—',uniq:0};
  var topKomp = byKomp[0]||['—',0];
  var efisiSorted = progRows.filter(function(x){return x.rpp>0;}).sort(function(a,b){return a.rpp-b.rpp;});

  buildPDF({
    title:'Laporan Komprehensif Program', subtitle:'Yayasan Ayo Indonesia',
    filterText:filterText, filename:'Laporan_Komprehensif.pdf',
    meta:{ periode: perB?fmtPeriod(perB.start)+' – '+fmtPeriod(perB.end):'Tidak tersedia',
           sumber:'Google Sheets YAI — Beneficiary & PJUM' },
    body:[
      {section:'I. Ringkasan Eksekutif'},
      {text:'Laporan ini merangkum kinerja program Yayasan Ayo Indonesia dari dua sisi: capaian penjangkauan penerima manfaat dan realisasi penggunaan dana'+(perB?', mencakup periode '+fmtPeriod(perB.start)+' hingga '+fmtPeriod(perB.end):'')+'.'},
      {text:'Selama periode tersebut, '+progs.length+' program telah menjangkau '+uniq.toLocaleString()+' penerima manfaat unik di '+Object.keys(desaS).length+' desa/kelurahan pada '+Object.keys(kabS).length+' kabupaten/kota. Total dana yang tersalurkan mencapai '+fmt(cost)+' melalui '+pjum.length.toLocaleString()+' transaksi yang tercatat dalam '+Object.keys(fileS).length+' dokumen PJUM.'},
      {kv:[
        ['Penerima Manfaat Unik', uniq.toLocaleString()+' orang'],
        ['Total Catatan Partisipasi', benef.length.toLocaleString()+' baris'],
        ['Rata-rata Partisipasi', avgPart.toFixed(1)+' kegiatan/orang'],
        ['Total Dana Tersalurkan', fmt(cost)],
        ['Jumlah Transaksi', pjum.length.toLocaleString()],
        ['Dokumen PJUM', Object.keys(fileS).length.toLocaleString()+' file'],
        ['Biaya per Penerima Manfaat', uniq>0?fmt(cost/uniq):'—'],
        ['Jumlah Program', progs.length.toString()],
        ['Cakupan Wilayah', Object.keys(desaS).length+' desa / '+Object.keys(kecS).length+' kec / '+Object.keys(kabS).length+' kab'],
        ['Komposisi Gender', g.P.toLocaleString()+' P ('+g.pctP.toFixed(1)+'%) / '+g.L.toLocaleString()+' L ('+g.pctL.toFixed(1)+'%)'],
        ['Penyandang Disabilitas', disab.adaDisab.toLocaleString()+' orang ('+(disab.total?(disab.adaDisab/disab.total*100).toFixed(1):0)+'%)']
      ]},
      {callout:'Dengan investasi '+fmtShort(cost)+', program menjangkau '+uniq.toLocaleString()+' orang di '+Object.keys(desaS).length+' desa — setara '+(uniq>0?fmt(cost/uniq):'—')+' per penerima manfaat.'},

      {section:'II. Perkembangan Tahunan'},
      {text: yearly.length ? 'Bagian ini membandingkan capaian dari tahun ke tahun, baik dari sisi penjangkauan maupun realisasi anggaran. '+describeTrend(yearly,'uniq') : 'Data temporal tidak tersedia untuk filter ini.'},
      yearly.length ? {table:{title:'Tabel 2.1 — Rekap Tahunan Terpadu',
        head:['Tahun','Benef Unik','Δ%','Records','Desa','Kegiatan','Biaya PJUM','Transaksi','Rp/Benef'],
        body:yearly.map(function(r){return [r.tahun,r.uniq.toLocaleString(),
          r.growth===null?'—':(r.growth>=0?'+':'')+r.growth.toFixed(1)+'%',
          r.records.toLocaleString(),r.desa,r.kegiatan,fmtShort(r.biaya),
          r.trx.toLocaleString(),r.rpp>0?fmtShort(r.rpp):'—'];})}} : {spacer:0},
      peakB ? {text:'Jangkauan tertinggi tercatat pada '+fmtPeriod(peakB.top[0])+' dengan '+peakB.top[1].toLocaleString()+' orang unik, terendah pada '+fmtPeriod(peakB.bottom[0])+' ('+peakB.bottom[1].toLocaleString()+' orang). Rata-rata bulanan '+Math.round(peakB.avg).toLocaleString()+' orang.'} : {spacer:0},
      peakP ? {text:'Realisasi anggaran tertinggi pada '+fmtPeriod(peakP.top[0])+' sebesar '+fmt(peakP.top[1])+', terendah pada '+fmtPeriod(peakP.bottom[0])+' ('+fmt(peakP.bottom[1])+'). Rata-rata bulanan '+fmt(peakP.avg)+'.'} : {spacer:0},

      {section:'III. Kinerja per Program'},
      {text:'Tabel berikut menggabungkan data penjangkauan dan pembiayaan untuk setiap program. Program dengan realisasi terbesar adalah "'+topProg.prog+'" sebesar '+fmt(topProg.cost)+' ('+(cost?(topProg.cost/cost*100).toFixed(1):0)+'% dari total).'},
      {table:{title:'Tabel 3.1 — Rekap Terpadu per Program',
        head:['#','Program','Biaya PJUM','% Dana','Trx','Records','Benef Unik','Rp/Benef','Desa'],
        body:progRows.map(function(r,i){return [i+1,r.prog,
          r.cost>0?fmtShort(r.cost):'—', (cost?(r.cost/cost*100).toFixed(1):0)+'%',
          r.trx||'—', r.rec||'—', r.uniq||'—',
          r.rpp>0?fmtShort(r.rpp):'—', r.desa||'—'];})}},
      efisiSorted.length ? {heading:'3.1 Efisiensi Biaya'} : {spacer:0},
      efisiSorted.length ? {text:'Program paling efisien adalah "'+efisiSorted[0].prog+'" dengan '+fmt(efisiSorted[0].rpp)+' per penerima manfaat, sedangkan yang tertinggi adalah "'+efisiSorted[efisiSorted.length-1].prog+'" dengan '+fmt(efisiSorted[efisiSorted.length-1].rpp)+'. Perbedaan ini wajar bila jenis intervensinya berbeda, namun perlu ditinjau bila programnya serupa.'} : {spacer:0},

      {section:'IV. Kinerja per Staf'},
      {text:'Perbandingan beban penjangkauan dan pengelolaan dana untuk setiap staf.'},
      {table:{title:'Tabel 4.1 — Rekap Terpadu per Staf',
        head:['#','Staf','Dana Dikelola','% Dana','Transaksi','Benef Unik','Rp/Benef'],
        body:stafRows.map(function(r,i){return [i+1,r.staf,
          r.cost>0?fmtShort(r.cost):'—',(cost?(r.cost/cost*100).toFixed(1):0)+'%',
          r.trx||'—', r.uniq||'—', r.rpp>0?fmtShort(r.rpp):'—'];})}},

      {section:'V. Profil Penerima Manfaat'},
      {heading:'5.1 Gender'},
      {text:'Dari '+g.total.toLocaleString()+' penerima manfaat unik, '+g.P.toLocaleString()+' orang ('+g.pctP.toFixed(1)+'%) perempuan dan '+g.L.toLocaleString()+' orang ('+g.pctL.toFixed(1)+'%) laki-laki'+(g.X>0?', serta '+g.X.toLocaleString()+' orang tanpa catatan gender':'')+'. Rasio P:L = '+(g.rasio!==null?g.rasio.toFixed(2):'—')+' — '+(g.rasio!==null&&g.rasio>=0.85&&g.rasio<=1.18?'tergolong seimbang':'perlu perhatian untuk pemerataan')+'.'},
      {heading:'5.2 Kategori dan Usia'},
      {text: byKat.length ? 'Terdapat '+byKat.length+' kategori penerima manfaat, terbesar "'+byKat[0][0]+'" ('+byKat[0][1].toLocaleString()+' orang, '+(uniq?(byKat[0][1]/uniq*100).toFixed(1):0)+'%).' : ''},
      {text: byUsia.length ? 'Dari sisi usia, kelompok terbesar adalah "'+byUsia[0][0]+'" dengan '+byUsia[0][1].toLocaleString()+' orang. Rincian pada Lampiran.' : ''},
      {heading:'5.3 Inklusi Disabilitas'},
      {text:'Sebanyak '+disab.adaDisab.toLocaleString()+' orang ('+(disab.total?(disab.adaDisab/disab.total*100).toFixed(1):0)+'%) adalah penyandang disabilitas dengan '+disab.jenis.length+' ragam berbeda'+(disab.jenis.length?', terbanyak "'+disab.jenis[0][0]+'"':'')+'.'},

      {section:'VI. Sebaran Wilayah'},
      {text:'Program menjangkau '+Object.keys(kabS).length+' kabupaten, '+Object.keys(kecS).length+' kecamatan, dan '+Object.keys(desaS).length+' desa. Kabupaten terbesar adalah '+topKab.kab+' dengan '+topKab.uniq.toLocaleString()+' orang ('+(uniq?(topKab.uniq/uniq*100).toFixed(1):0)+'%).'},
      {table:{title:'Tabel 6.1 — Rekap per Kabupaten',
        head:['#','Kabupaten','Kecamatan','Desa','Benef Unik','% Total'],
        body:hier.map(function(h,i){return [i+1,h.kab,h.kec,h.desa,h.uniq.toLocaleString(),
          (uniq?(h.uniq/uniq*100).toFixed(1):0)+'%'];})}},
      {text:'Indeks konsentrasi desa '+concDesa.toFixed(1)+'/100 menunjukkan sebaran '+(concDesa>50?'terkonsentrasi':concDesa>25?'cukup merata':'sangat merata')+'. Sebanyak '+underServed.length+' dari '+desaMap.length+' desa ('+(desaMap.length?(underServed.length/desaMap.length*100).toFixed(1):0)+'%) hanya dilayani satu program.'},

      {section:'VII. Struktur Pembiayaan'},
      {text: byKomp.length ? 'Komponen pengeluaran terbesar adalah "'+topKomp[0]+'" sebesar '+fmt(topKomp[1])+' ('+(cost?(topKomp[1]/cost*100).toFixed(1):0)+'% dari total).' : ''},
      {table:{title:'Tabel 7.1 — Komponen Biaya',
        head:['#','Komponen','Total Biaya','% Total'],
        body:byKomp.map(function(x,i){return [i+1,x[0],fmt(x[1]),(cost?(x[1]/cost*100).toFixed(1):0)+'%'];})}},

      {section:'VIII. Kualitas Data'},
      {text:'Penilaian kelengkapan data yang mendasari laporan ini.'},
      {table:{title:'Tabel 8.1 — Kelengkapan Data Beneficiary',
        head:['Kolom','Terisi','Kosong','% Lengkap'],
        body:complete.map(function(c){return [c.nama,c.terisi.toLocaleString(),c.kosong.toLocaleString(),c.pct.toFixed(1)+'%'];})}},
      {table:{title:'Tabel 8.2 — Kelengkapan Data PJUM',
        head:['Kolom','Terisi','Kosong','% Lengkap'],
        body:completeP.map(function(c){return [c.nama,c.terisi.toLocaleString(),c.kosong.toLocaleString(),c.pct.toFixed(1)+'%'];})}},
      anomali.length ? {table:{title:'Tabel 8.3 — Anomali Terdeteksi',
        head:['Jenis','Jumlah','Keterangan'],
        body:anomali.map(function(a){return [a.jenis,a.jml.toLocaleString(),a.ket];})}} : {text:'Tidak ditemukan anomali signifikan.'},

      {section:'IX. Kesimpulan'},
      {text:'Program telah menjangkau '+uniq.toLocaleString()+' penerima manfaat unik dengan total investasi '+fmt(cost)+'. '+(yearly.length?describeTrend(yearly,'uniq'):'')},
      {bullet:'Efisiensi: biaya rata-rata '+(uniq>0?fmt(cost/uniq):'—')+' per penerima manfaat'},
      {bullet:'Keseimbangan gender: rasio P:L '+(g.rasio!==null?g.rasio.toFixed(2):'—')+' — '+(g.rasio!==null&&g.rasio>=0.85&&g.rasio<=1.18?'seimbang':'perlu perhatian')},
      {bullet:'Pemerataan wilayah: '+underServed.length+' dari '+desaMap.length+' desa hanya dilayani 1 program'},
      {bullet:'Inklusi disabilitas: '+(disab.total?(disab.adaDisab/disab.total*100).toFixed(1):0)+'% dari total penerima manfaat'},
      {bullet:'Intensitas program: rata-rata '+avgPart.toFixed(1)+' kegiatan per orang'}
    ],
    lampiran:[
      {table:{title:'Tabel A1 — Sebaran per Desa (25 Terbesar)',
        head:['#','Desa','Benef Unik','% Total'],
        body:byDesa.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {table:{title:'Tabel A2 — Kegiatan Terbesar',
        head:['#','Kegiatan','Benef Unik','% Total'],
        body:byKeg.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {table:{title:'Tabel A3 — Kategori Penerima Manfaat',
        head:['#','Kategori','Benef Unik','% Total'],
        body:byKat.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {table:{title:'Tabel A4 — Kategori Usia',
        head:['#','Kategori Usia','Benef Unik','% Total'],
        body:byUsia.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {table:{title:'Tabel A5 — Ragam Disabilitas',
        head:['#','Ragam','Jumlah','% dari Penyandang'],
        body:disab.jenis.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),
          (disab.adaDisab?(x[1]/disab.adaDisab*100).toFixed(1):0)+'%'];})}},
      {table:{title:'Tabel A6 — Jangkauan dan Durasi Program',
        head:['#','Program','Benef Unik','Desa','Kec','Kab','Mulai','Akhir','Durasi'],
        body:reach.map(function(r,i){return [i+1,r.program,r.uniq.toLocaleString(),r.desa,r.kec,r.kab,
          r.mulai?fmtPeriod(r.mulai):'—',r.akhir?fmtPeriod(r.akhir):'—',r.durasi>0?r.durasi+' bln':'—'];})}},
      {table:{title:'Tabel A7 — Desa Under-Served',
        head:['#','Desa','Program yang Melayani'],
        body:underServed.slice(0,40).map(function(x,i){return [i+1,x.desa,x.programs[0]||'—'];})}}
    ],
    metodologi: stdMetodologi([
      'Laporan ini menggabungkan dua sumber data yang berbeda. Program yang muncul di salah satu sumber saja tetap ditampilkan, dengan kolom yang kosong ditandai "—".',
      'Indeks konsentrasi wilayah menggunakan HHI ternormalisasi (0–100).',
      'Rentang "seimbang" untuk rasio gender ditetapkan pada 0,85–1,18.'
    ])
  });
};

/* ── Excel Export ── */
window.exportLaporanExcel = function() {
  var filtered = getLaporanFiltered();
  exportExcelLaporan(filtered.benef, filtered.pjum);
};

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

/* ══════════════════════════════════════════════════
   DETAIL MODAL — Laporan (klik nama program / staf)
   Data mengikuti filter laporan yang sedang aktif
══════════════════════════════════════════════════ */
function _dmEsc(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* Periode aktivitas: bulan pertama — bulan terakhir dari gabungan data */
function _dmPeriode(bRows, pRows) {
  var B = window.B, P = window.P, months = {};
  bRows.forEach(function(r) { var t = validTgl(r[B.tgl]); if (t) months[t.slice(0,7)] = 1; });
  pRows.forEach(function(r) { var t = validTgl(r[P.tgl]); if (t) months[t.slice(0,7)] = 1; });
  var keys = Object.keys(months).sort();
  if (!keys.length) return '—';
  function lbl(k) { var p = k.split('-'); return bulanName(p[1]) + ' ' + p[0]; }
  return keys.length === 1 ? lbl(keys[0]) : lbl(keys[0]) + ' — ' + lbl(keys[keys.length-1]);
}

/* Group gabungan benef+pjum by kolom: {name, uniq, rec, cost, trx} */
function _dmGroupBy(bRows, pRows, bIdx, pIdx) {
  var map = {};
  bRows.forEach(function(r) {
    var name = (r[bIdx] || '').trim(); if (!name) return;
    var k = name.toLowerCase();
    if (!map[k]) map[k] = { name: name, set: {}, rec: 0, cost: 0, trx: 0 };
    map[k].set[benefKey(r)] = 1; map[k].rec++;
  });
  pRows.forEach(function(r) {
    var name = (r[pIdx] || '').trim(); if (!name) return;
    var k = name.toLowerCase();
    if (!map[k]) map[k] = { name: name, set: {}, rec: 0, cost: 0, trx: 0 };
    map[k].cost += parseFloat(r[window.P.jumlah]) || 0; map[k].trx++;
  });
  return Object.keys(map).map(function(k) {
    var o = map[k];
    return { name: o.name, uniq: Object.keys(o.set).length, rec: o.rec, cost: o.cost, trx: o.trx };
  }).sort(function(a, b) { return b.uniq - a.uniq || b.cost - a.cost; });
}

function _dmFilterLabel() {
  return getFilterSummary([
    {label:'Program', val:v('lf-proyek')}, {label:'Staf', val:v('lf-staf')},
    {label:'Tahun', val:v('lf-tahun')}, {label:'Bulan', val:v('lf-bulan') ? bulanName(v('lf-bulan')) : ''}
  ]);
}

window._dmCurrent = null;

function _dmOpen(model) {
  window._dmCurrent = model;
  setEl('dm-kicker', model.kicker);
  setEl('dm-title', _dmEsc(model.title));
  setEl('dm-sub', _dmEsc(model.sub));
  var html = '<div class="mstat-grid">' + model.stats.map(function(s) {
    return '<div class="mstat"><div class="ms-lbl">' + s[0] + '</div><div class="ms-val" title="' + _dmEsc(s[1]) + '">' + _dmEsc(s[1]) + '</div></div>';
  }).join('') + '</div>';
  model.sections.forEach(function(sec) {
    html += '<div class="msection-title">' + _dmEsc(sec.title) + '</div>';
    html += '<div class="mtbl-wrap"><table class="data-table"><thead><tr>' +
      sec.head.map(function(h) { return '<th' + (h.num ? ' class="num"' : '') + '>' + h.t + '</th>'; }).join('') +
      '</tr></thead><tbody>';
    if (!sec.rows.length) {
      html += '<tr><td colspan="' + sec.head.length + '" style="text-align:center;color:var(--text3);padding:16px">Tidak ada data</td></tr>';
    } else {
      html += sec.rows.map(function(row) {
        return '<tr>' + row.map(function(c, ci) {
          return '<td' + (sec.head[ci].num ? ' class="num"' : '') + '>' + c + '</td>';
        }).join('') + '</tr>';
      }).join('');
    }
    html += '</tbody></table></div>';
  });
  setEl('dm-body', html);
  var bd = document.getElementById('detail-modal');
  if (bd) bd.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

window.closeDetailModal = function() {
  var bd = document.getElementById('detail-modal');
  if (bd) bd.style.display = 'none';
  document.body.style.overflow = '';
};

/* ── Modal: Detail Program ── */
window.showProgDetail = function(prog) {
  if (!prog) return;
  var f = getLaporanFiltered(), B = window.B, P = window.P;
  var k = prog.trim().toLowerCase();
  var bRows = f.benef.filter(function(r) { return (r[B.proyek] || '').trim().toLowerCase() === k; });
  var pRows = f.pjum.filter(function(r) { return (r[P.proyek] || '').trim().toLowerCase() === k; });

  var cost = pRows.reduce(function(s, r) { return s + (parseFloat(r[P.jumlah]) || 0); }, 0);
  var uniq = countUniqBenef(bRows);
  var stafList = _dmGroupBy(bRows, pRows, B.staf, P.staf);
  var kegList  = _dmGroupBy(bRows, pRows, B.kegiatan, P.kegiatan);
  var desaS = {}, fileS = {};
  bRows.forEach(function(r) { if (r[B.desa]) desaS[r[B.desa]] = 1; if (r[B.file]) fileS[r[B.file]] = 1; });
  pRows.forEach(function(r) { if (r[P.file]) fileS[r[P.file]] = 1; });
  var gL = countUniqByGender(bRows, 'L'), gP = countUniqByGender(bRows, 'P');

  _dmOpen({
    kicker: 'Detail Program',
    title: prog,
    sub: 'Periode: ' + _dmPeriode(bRows, pRows) + '  ·  Filter: ' + _dmFilterLabel(),
    pdfName: 'Detail_Program_' + prog.replace(/[^a-z0-9]+/gi, '_'),
    stats: [
      ['Staf Terlibat (Unik)', stafList.length.toLocaleString()],
      ['Kegiatan (Unik)', kegList.length.toLocaleString()],
      ['Benef Unik', uniq.toLocaleString()],
      ['Total Record Benef', bRows.length.toLocaleString()],
      ['Total Biaya PJUM', cost > 0 ? fmtShort(cost) : '—'],
      ['Transaksi PJUM', pRows.length.toLocaleString()],
      ['Rp / Benef Unik', uniq > 0 && cost > 0 ? fmtShort(cost / uniq) : '—'],
      ['L / P (Unik)', gL + ' / ' + gP],
      ['Desa Terjangkau', Object.keys(desaS).length.toLocaleString()],
      ['File Sumber Data', Object.keys(fileS).length.toLocaleString()]
    ],
    sections: [
      { title: 'Staf Terlibat',
        head: [{t:'Staf'}, {t:'Benef Unik', num:1}, {t:'Record', num:1}, {t:'Biaya PJUM', num:1}, {t:'Transaksi', num:1}],
        rows: stafList.map(function(s) {
          return [_dmEsc(s.name), s.uniq > 0 ? s.uniq.toLocaleString() : '—', s.rec > 0 ? s.rec.toLocaleString() : '—',
                  s.cost > 0 ? fmtShort(s.cost) : '—', s.trx > 0 ? s.trx.toLocaleString() : '—'];
        }) },
      { title: 'Kegiatan',
        head: [{t:'Kegiatan'}, {t:'Benef Unik', num:1}, {t:'Biaya PJUM', num:1}, {t:'Transaksi', num:1}],
        rows: kegList.map(function(g) {
          return [_dmEsc(g.name), g.uniq > 0 ? g.uniq.toLocaleString() : '—',
                  g.cost > 0 ? fmtShort(g.cost) : '—', g.trx > 0 ? g.trx.toLocaleString() : '—'];
        }) }
    ]
  });
};

/* ── Modal: Detail Staf ── */
window.showStafDetail = function(staf) {
  if (!staf) return;
  var f = getLaporanFiltered(), B = window.B, P = window.P;
  var k = staf.trim().toLowerCase();
  var bRows = f.benef.filter(function(r) { return (r[B.staf] || '').trim().toLowerCase() === k; });
  var pRows = f.pjum.filter(function(r) { return (r[P.staf] || '').trim().toLowerCase() === k; });

  var cost = pRows.reduce(function(s, r) { return s + (parseFloat(r[P.jumlah]) || 0); }, 0);
  var uniq = countUniqBenef(bRows);
  var progList = _dmGroupBy(bRows, pRows, B.proyek, P.proyek);
  var kegList  = _dmGroupBy(bRows, pRows, B.kegiatan, P.kegiatan);
  var desaS = {}, fileS = {};
  bRows.forEach(function(r) { if (r[B.desa]) desaS[r[B.desa]] = 1; if (r[B.file]) fileS[r[B.file]] = 1; });
  pRows.forEach(function(r) { if (r[P.file]) fileS[r[P.file]] = 1; });
  var gL = countUniqByGender(bRows, 'L'), gP = countUniqByGender(bRows, 'P');

  _dmOpen({
    kicker: 'Detail Staf',
    title: staf,
    sub: 'Periode aktif: ' + _dmPeriode(bRows, pRows) + '  ·  Filter: ' + _dmFilterLabel(),
    pdfName: 'Detail_Staf_' + staf.replace(/[^a-z0-9]+/gi, '_'),
    stats: [
      ['Program Diikuti', progList.length.toLocaleString()],
      ['Benef Unik', uniq.toLocaleString()],
      ['Total Record Benef', bRows.length.toLocaleString()],
      ['Total Pengeluaran', cost > 0 ? fmtShort(cost) : '—'],
      ['Transaksi PJUM', pRows.length.toLocaleString()],
      ['Kegiatan (Unik)', kegList.length.toLocaleString()],
      ['Rp / Benef Unik', uniq > 0 && cost > 0 ? fmtShort(cost / uniq) : '—'],
      ['L / P (Unik)', gL + ' / ' + gP],
      ['Desa Terjangkau', Object.keys(desaS).length.toLocaleString()],
      ['File Diupload', Object.keys(fileS).length.toLocaleString()]
    ],
    sections: [
      { title: 'Program yang Diikuti',
        head: [{t:'Program'}, {t:'Benef Unik', num:1}, {t:'Record', num:1}, {t:'Pengeluaran', num:1}, {t:'Transaksi', num:1}],
        rows: progList.map(function(p) {
          return [_dmEsc(p.name), p.uniq > 0 ? p.uniq.toLocaleString() : '—', p.rec > 0 ? p.rec.toLocaleString() : '—',
                  p.cost > 0 ? fmtShort(p.cost) : '—', p.trx > 0 ? p.trx.toLocaleString() : '—'];
        }) },
      { title: 'Kegiatan yang Dikerjakan',
        head: [{t:'Kegiatan'}, {t:'Benef Unik', num:1}, {t:'Pengeluaran', num:1}, {t:'Transaksi', num:1}],
        rows: kegList.map(function(g) {
          return [_dmEsc(g.name), g.uniq > 0 ? g.uniq.toLocaleString() : '—',
                  g.cost > 0 ? fmtShort(g.cost) : '—', g.trx > 0 ? g.trx.toLocaleString() : '—'];
        }) }
    ]
  });
};

/* ── Export PDF isi modal — reuse buildPDF (format konsisten) ── */
window.exportDetailPDF = function() {
  var m = window._dmCurrent;
  if (!m) return;
  function strip(s) { return String(s).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'); }
  var body = [
    { section: 'I. Ringkasan' },
    { kv: m.stats.map(function(s) { return [s[0], String(s[1])]; }) }
  ];
  var romawi = ['II', 'III', 'IV', 'V'];
  m.sections.forEach(function(sec, i) {
    body.push({ section: (romawi[i] || 'X') + '. ' + sec.title });
    body.push({ table: {
      head: sec.head.map(function(h) { return h.t; }),
      body: sec.rows.map(function(r) { return r.map(strip); })
    } });
  });
  buildPDF({
    title: m.kicker + ': ' + m.title,
    subtitle: 'YAI Executive Dashboard',
    filterText: m.sub.replace(/&[a-z]+;/g, ''),
    filename: (m.pdfName || 'Detail') + '.pdf',
    meta: { periode: m.sub.split('·')[0].replace(/Periode( aktif)?:/, '').trim() },
    body: body
  });
};

/* ── Self-attach: tombol modal, backdrop, Esc ── */
(function _attachDetailModal() {
  var bd = document.getElementById('detail-modal');
  var btnClose = document.getElementById('dm-close');
  var btnPdf = document.getElementById('dm-pdf');
  if (!bd || !btnClose || !btnPdf) { setTimeout(_attachDetailModal, 200); return; }
  btnClose.addEventListener('click', closeDetailModal);
  btnPdf.addEventListener('click', function() { exportDetailPDF(); });
  bd.addEventListener('click', function(e) { if (e.target === bd) closeDetailModal(); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && bd.style.display !== 'none') closeDetailModal();
  });
})();
