/* ═══════════════════════════════════════════════
   benef.js — Beneficiary page + cascading filter
═══════════════════════════════════════════════ */

function buildBenefPage() {
  populateBenefFilters(null);

  var fids = ['bf-proyek','bf-staf','bf-kategori','bf-kab','bf-kec','bf-disab','bf-gender','bf-tahun','bf-bulan'];
  fids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', function() {
      refreshBenefFilters(id);
      applyBenefFilter();
    });
  });

  var cari = document.getElementById('bf-cari');
  if (cari) cari.addEventListener('input', applyBenefFilter);

  var rb = document.getElementById('bf-reset');
  if (rb) rb.addEventListener('click', function() {
    fids.forEach(function(id) { var el = document.getElementById(id); if(el) el.value = ''; });
    document.getElementById('bf-cari').value = '';
    populateBenefFilters(null);
    applyBenefFilter();
  });

  applyBenefFilter();
}

/* ── getFilteredBenef: filter rawBenef, skip satu field ── */
function getFilteredBenef(skipField) {
  var B = window.B;
  var proyek   = skipField !== 'proyek'   ? v('bf-proyek')   : '';
  var staf     = skipField !== 'staf'     ? v('bf-staf')     : '';
  var kategori = skipField !== 'kategori' ? v('bf-kategori') : '';
  var kab      = skipField !== 'kab'      ? v('bf-kab')      : '';
  var kec      = skipField !== 'kec'      ? v('bf-kec')      : '';
  var disab    = skipField !== 'disab'    ? v('bf-disab')    : '';
  var gender   = skipField !== 'gender'   ? v('bf-gender')   : '';
  var tahun    = skipField !== 'tahun'    ? v('bf-tahun')    : '';
  var bulan    = skipField !== 'bulan'    ? v('bf-bulan')    : '';

  return window.rawBenef.filter(function(r) {
    if (proyek   && r[B.proyek]   !== proyek)   return false;
    if (staf     && r[B.staf]     !== staf)     return false;
    if (kategori && r[B.kategori] !== kategori) return false;
    if (kab      && r[B.kab]      !== kab)      return false;
    if (kec      && r[B.kec]      !== kec)      return false;
    if (disab    && r[B.disab]    !== disab)    return false;
    if (gender   && r[B.gender]   !== gender)   return false;
    var tglValid = validTgl(r[B.tgl]);
    if (tahun === '__blank__' && tglValid)  return false;
    if (tahun && tahun !== '__blank__' && (!tglValid || !tglValid.startsWith(tahun))) return false;
    if (bulan === '__blank__' && tglValid)  return false;
    if (bulan && bulan !== '__blank__' && (!tglValid || tglValid.slice(5,7) !== bulan)) return false;
    return true;
  });
}

/* ── refreshBenefFilters: update semua dropdown kecuali yang baru diubah ── */
function refreshBenefFilters(skipId) {
  var B = window.B;
  /* Program — pakai dedupProgram agar alias berlaku */
  if (skipId !== 'bf-proyek') {
    var cur = v('bf-proyek');
    var d = getFilteredBenef('proyek');
    var allProg = dedupProgram(d.map(function(r){return r[B.proyek];}));
    populateSel('bf-proyek', allProg);
    document.getElementById('bf-proyek').value = cur;
  }

  /* Staf — pakai normStafKey + STAF_ALIAS agar alias berlaku */
  if (skipId !== 'bf-staf') {
    var curS = v('bf-staf');
    var dS = getFilteredBenef('staf');
    var stafMap = {};
    dS.forEach(function(r) {
      var k = normStafKey(r[B.staf]);
      if (!k) return;
      if (!stafMap[k]) stafMap[k] = getStafDisplay(r[B.staf]);
    });
    var allStaf = Object.values(stafMap).filter(Boolean).sort(function(a,b){return a.localeCompare(b);});
    populateSel('bf-staf', allStaf);
    document.getElementById('bf-staf').value = curS;
  }

  /* Field lain — tetap uniqArr */
  var fields = {
    'bf-kategori': { skip:'kategori', fn: function(d){ return uniqArr(d.map(function(r){return r[B.kategori];})); } },
    'bf-kab':      { skip:'kab',      fn: function(d){ return uniqArr(d.map(function(r){return r[B.kab];})); } },
    'bf-kec':      { skip:'kec',      fn: function(d){ return uniqArr(d.map(function(r){return r[B.kec];})); } },
    'bf-disab':    { skip:'disab',    fn: function(d){ return uniqArr(d.map(function(r){return r[B.disab];})); } },
  };

  Object.keys(fields).forEach(function(id) {
    if (id === skipId) return;
    var cur = v(id);
    var d = getFilteredBenef(fields[id].skip);
    populateSel(id, fields[id].fn(d));
    document.getElementById(id).value = cur;
  });

  /* Tahun */
  if (skipId !== 'bf-tahun') {
    var cur = v('bf-tahun');
    var d = getFilteredBenef('tahun');
    var tahunSet = {}, hasBlanks = false;
    d.forEach(function(r) {
      var t = validTgl(r[B.tgl]);
      if (t) tahunSet[t.slice(0,4)] = 1; else hasBlanks = true;
    });
    var allTahun = Object.keys(tahunSet).sort().reverse();
    if (hasBlanks) allTahun.push('__blank__');
    populateSel('bf-tahun', allTahun, function(val) {
      return val === '__blank__' ? '(Tanggal Kosong)' : val;
    });
    document.getElementById('bf-tahun').value = cur;
  }

  /* Bulan */
  if (skipId !== 'bf-bulan') {
    var cur2 = v('bf-bulan');
    var d2 = getFilteredBenef('bulan');
    var bulanSet = {}, hasBlanks2 = false;
    d2.forEach(function(r) {
      var t = validTgl(r[B.tgl]);
      if (t) bulanSet[t.slice(5,7)] = 1; else hasBlanks2 = true;
    });
    var allBulan = Object.keys(bulanSet).sort();
    if (hasBlanks2) allBulan.push('__blank__');
    populateSel('bf-bulan', allBulan, function(val) {
      return val === '__blank__' ? '(Tanggal Kosong)' : bulanName(val);
    });
    document.getElementById('bf-bulan').value = cur2;
  }
}

/* ── populateBenefFilters: isi awal semua filter ── */
function populateBenefFilters(skipId) {
  refreshBenefFilters(skipId);
  /* Gender tidak cascading — selalu L/P/Semua */
}

/* ── applyBenefFilter: filter + render ── */
function applyBenefFilter() {
  var B = window.B;
  var proyek   = v('bf-proyek');
  var staf     = v('bf-staf');
  var kategori = v('bf-kategori');
  var kab      = v('bf-kab');
  var kec      = v('bf-kec');
  var disab    = v('bf-disab');
  var gender   = v('bf-gender');
  var tahun    = v('bf-tahun');
  var bulan    = v('bf-bulan');
  var cari     = v('bf-cari').toLowerCase();

  var proyekKey = proyek ? normKey(proyek) : '';
  var stafKey   = staf   ? normStafKey(staf) : '';

  window.APP.benef.filtered = window.rawBenef.filter(function(r) {
    if (proyekKey && normKey(r[B.proyek])   !== proyekKey) return false;
    if (stafKey   && normStafKey(r[B.staf]) !== stafKey)   return false;
    if (kategori && r[B.kategori] !== kategori) return false;
    if (kab      && r[B.kab]      !== kab)      return false;
    if (kec      && r[B.kec]      !== kec)      return false;
    if (disab    && r[B.disab]    !== disab)    return false;
    if (gender   && r[B.gender]   !== gender)   return false;
    var tglValid = validTgl(r[B.tgl]);
    if (tahun === '__blank__' && tglValid)  return false;
    if (tahun && tahun !== '__blank__' && (!tglValid || !tglValid.startsWith(tahun))) return false;
    if (bulan === '__blank__' && tglValid)  return false;
    if (bulan && bulan !== '__blank__' && (!tglValid || tglValid.slice(5,7) !== bulan)) return false;
    if (cari && (r[B.nama]||'').toLowerCase().indexOf(cari) < 0 &&
               (r[B.desa]||'').toLowerCase().indexOf(cari) < 0 &&
               (r[B.kegiatan]||'').toLowerCase().indexOf(cari) < 0) return false;
    return true;
  });

  window.APP.benef.page = 0;
  renderBenefStats();
  renderBenefCharts();
  renderBenefTable();
}

function renderBenefStats() {
  var B = window.B;
  var d = window.APP.benef.filtered;
  var total = d.length;
  var uniqSet = {};
  d.forEach(function(r) { uniqSet[(r[B.nama]||'').toLowerCase()+'|'+(r[B.desa]||'')] = 1; });
  var gL    = d.filter(function(r) { return r[B.gender] === 'L'; }).length;
  var gP    = d.filter(function(r) { return r[B.gender] === 'P'; }).length;
  var desaS = {}; d.forEach(function(r) { if(r[B.desa]) desaS[r[B.desa]] = 1; });
  var progS = {}; d.forEach(function(r) { if(r[B.proyek]) progS[r[B.proyek]] = 1; });

  setCard('bstat-total', total.toLocaleString('id-ID'), Object.keys(uniqSet).length.toLocaleString() + ' unik (nama+desa)');
  setCard('bstat-lp',    gL.toLocaleString() + ' / ' + gP.toLocaleString(), (total ? (gP/total*100).toFixed(1) : 0) + '% perempuan');
  setCard('bstat-desa',  Object.keys(desaS).length.toLocaleString(), 'desa/kelurahan tercakup');
  setCard('bstat-prog',  Object.keys(progS).length.toLocaleString(), 'program aktif');
}

function renderBenefCharts() {
  var B = window.B;
  var d = window.APP.benef.filtered;

  var byBulan = sortedBulan(groupCount(d, function(r) { return validTgl(r[B.tgl]); }));
  mkLine('bch-trend',
    byBulan.map(function(x) { var p=x[0].split('-'); return bulanName(p[1])+"'"+p[0].slice(2); }),
    byBulan.map(function(x) { return x[1]; }), '#F97316', { label:'Benef', noLegend:true });

  var gMap = { 'L':'Laki-laki', 'P':'Perempuan', '—':'Tidak Diisi' };
  var byGender = groupCount(d, function(r) { return gMap[r[B.gender]] || 'Tidak Diisi'; });
  var gKeys = Object.keys(byGender);
  var gColors = { 'Laki-laki':'#4F8EF7', 'Perempuan':'#EF4444', 'Tidak Diisi':'#8A96B8' };
  var gColArr = gKeys.map(function(k) { return gColors[k] || '#8A96B8'; });
  mkDonut('bch-gender', gKeys, gKeys.map(function(k) { return byGender[k]; }), gColArr);
  var gTotal = d.length || 1;
  var gLegEl = document.getElementById('bch-gender-legend');
  if (gLegEl) gLegEl.innerHTML = gKeys.map(function(k,i) {
    return '<div class="dl-item"><div class="dl-dot" style="background:'+gColArr[i]+'"></div>' +
      '<div class="dl-name">'+k+'</div>' +
      '<div class="dl-pct">'+(byGender[k]/gTotal*100).toFixed(1)+'% ('+byGender[k].toLocaleString()+')</div></div>';
  }).join('');

  var byKat = topN(groupCount(d, function(r) { return r[B.kategori]; }), 10);
  mkBarH('bch-kategori', byKat.map(function(x){return x[0];}), byKat.map(function(x){return x[1];}),
    byKat.map(function(_,i){return PALETTE[i%PALETTE.length];}), { label:'Benef' });

  var byUsia = topN(groupCount(d, function(r) { return r[B.katUsia] || r[B.usia] || '—'; }), 8);
  mkBarH('bch-usia', byUsia.map(function(x){return x[0];}), byUsia.map(function(x){return x[1];}),
    '#F59E0B', { label:'Benef' });

  var byProg = topN(groupCount(d, function(r) { return r[B.proyek]; }), 8);
  mkBarH('bch-proyek', byProg.map(function(x){return x[0];}), byProg.map(function(x){return x[1];}),
    '#22C55E', { label:'Benef' });

  var byDesa = topN(groupCount(d, function(r) { return r[B.desa]; }), 10);
  mkBarH('bch-desa', byDesa.map(function(x){return x[0];}), byDesa.map(function(x){return x[1];}),
    '#8B5CF6', { label:'Benef' });

  var byStaf = topN(groupCount(d, function(r) { return r[B.staf]; }), 10);
  mkBarH('bch-staf', byStaf.map(function(x){return x[0];}), byStaf.map(function(x){return x[1];}),
    '#14B8A6', { label:'Benef' });

  var byDisab = topN(groupCount(d, function(r) { return r[B.disab] || '—'; }), 8);
  mkBarH('bch-disab', byDisab.map(function(x){return x[0];}), byDisab.map(function(x){return x[1];}),
    byDisab.map(function(_,i){return PALETTE[i%PALETTE.length];}), { label:'Benef' });
}

function renderBenefTable() {
  var B = window.B;
  var q = (document.getElementById('benef-tbl-search') ? document.getElementById('benef-tbl-search').value : '').toLowerCase().trim();
  var rows = window.APP.benef.filtered;
  if (q) rows = rows.filter(function(r) {
    return (r[B.nama]||'').toLowerCase().indexOf(q) > -1 ||
           (r[B.desa]||'').toLowerCase().indexOf(q) > -1 ||
           (r[B.kegiatan]||'').toLowerCase().indexOf(q) > -1 ||
           (r[B.kab]||'').toLowerCase().indexOf(q) > -1;
  });

  var total = rows.length;
  var start = window.APP.benef.page * window.APP.PG_SIZE;
  var slice = rows.slice(start, start + window.APP.PG_SIZE);

  setEl('benef-tbl-count', total.toLocaleString() + ' baris');
  setEl('benef-pg-info', (start+1).toLocaleString() + '–' + Math.min(start+window.APP.PG_SIZE,total).toLocaleString() + ' dari ' + total.toLocaleString());
  var prevBtn = document.getElementById('benef-pg-prev');
  var nextBtn = document.getElementById('benef-pg-next');
  if (prevBtn) prevBtn.disabled = window.APP.benef.page === 0;
  if (nextBtn) nextBtn.disabled = start + window.APP.PG_SIZE >= total;

  var tbody = document.getElementById('benef-tbl-body');
  if (!tbody) return;
  tbody.innerHTML = slice.length ? slice.map(function(r) {
    return '<tr>' +
      '<td>' + (r[B.nama]||'—') + '</td>' +
      '<td><span class="badge badge-' + r[B.gender] + '">' + (r[B.gender]||'—') + '</span></td>' +
      '<td>' + (r[B.katUsia]||r[B.usia]||'—') + '</td>' +
      '<td>' + (r[B.kategori]||'—') + '</td>' +
      '<td>' + (r[B.disab]||'—') + '</td>' +
      '<td>' + (r[B.desa]||'—') + '</td>' +
      '<td>' + (r[B.kec]||'—') + '</td>' +
      '<td>' + (r[B.kab]||'—') + '</td>' +
      '<td>' + (r[B.proyek]||'—') + '</td>' +
      '<td>' + (r[B.kegiatan]||'—') + '</td>' +
      '<td>' + (r[B.benefit]||'—') + '</td>' +
      '<td>' + (r[B.staf]||'—') + '</td>' +
      '<td class="mono">' + (r[B.tgl]||'—') + '</td>' +
      '<td class="mono">' + (r[B.kode]||'—') + '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="14" style="text-align:center;padding:24px;color:var(--text3)">Tidak ada data</td></tr>';
}

window.changeBenefPage = function(dir) {
  window.APP.benef.page = Math.max(0, window.APP.benef.page + dir);
  renderBenefTable();
};
