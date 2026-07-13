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
    var c = document.getElementById('bf-cari'); if(c) c.value = '';
    populateBenefFilters(null);
    applyBenefFilter();
  });

  applyBenefFilter();
}

/* ── filterBenefRow: satu fungsi filter baris, konsisten di mana saja ── */
function filterBenefRow(r, opts) {
  var B = window.B;
  var proyekKey = opts.proyek ? normKey(opts.proyek) : '';
  var stafKey   = opts.staf   ? normStafKey(opts.staf) : '';

  if (proyekKey && normKey(r[B.proyek])   !== proyekKey) return false;
  if (stafKey   && normStafKey(r[B.staf]) !== stafKey)   return false;
  if (opts.kategori && r[B.kategori] !== opts.kategori) return false;
  if (opts.kab      && r[B.kab]      !== opts.kab)      return false;
  if (opts.kec      && r[B.kec]      !== opts.kec)      return false;
  if (opts.disab    && r[B.disab]    !== opts.disab)    return false;
  if (opts.gender   && r[B.gender]   !== opts.gender)   return false;

  /* Tanggal — semua data masuk (point 5), hanya filter jika dipilih */
  if (opts.tahun || opts.bulan) {
    var tgl = validTgl(r[B.tgl]);
    if (opts.tahun === '__blank__') {
      if (tgl) return false; // hanya tampilkan yang blank
    } else if (opts.tahun) {
      if (!tgl || !tgl.startsWith(opts.tahun)) return false;
    }
    if (opts.bulan === '__blank__') {
      if (tgl) return false;
    } else if (opts.bulan) {
      if (!tgl || tgl.slice(5,7) !== opts.bulan) return false;
    }
  }

  if (opts.cari) {
    var q = opts.cari;
    if ((r[B.nama]    ||'').toLowerCase().indexOf(q) < 0 &&
        (r[B.desa]    ||'').toLowerCase().indexOf(q) < 0 &&
        (r[B.kegiatan]||'').toLowerCase().indexOf(q) < 0 &&
        (r[B.kab]     ||'').toLowerCase().indexOf(q) < 0) return false;
  }
  return true;
}

/* ── getCurrentBenefOpts: ambil semua nilai filter sekarang ── */
function getCurrentBenefOpts(skipField) {
  return {
    proyek:   skipField === 'proyek'   ? '' : v('bf-proyek'),
    staf:     skipField === 'staf'     ? '' : v('bf-staf'),
    kategori: skipField === 'kategori' ? '' : v('bf-kategori'),
    kab:      skipField === 'kab'      ? '' : v('bf-kab'),
    kec:      skipField === 'kec'      ? '' : v('bf-kec'),
    disab:    skipField === 'disab'    ? '' : v('bf-disab'),
    gender:   skipField === 'gender'   ? '' : v('bf-gender'),
    tahun:    skipField === 'tahun'    ? '' : v('bf-tahun'),
    bulan:    skipField === 'bulan'    ? '' : v('bf-bulan'),
    cari:     ''
  };
}

/* ── getFilteredBenef: filter pakai satu fungsi yang konsisten ── */
function getFilteredBenef(skipField) {
  var opts = getCurrentBenefOpts(skipField);
  return window.rawBenef.filter(function(r) { return filterBenefRow(r, opts); });
}

/* ── refreshBenefFilters: update semua dropdown kecuali yang baru diubah ── */
function refreshBenefFilters(skipId) {
  var B = window.B;

  /* Program */
  if (skipId !== 'bf-proyek') {
    var cur = v('bf-proyek');
    var d = getFilteredBenef('proyek');
    populateSel('bf-proyek', dedupProgram(d.map(function(r){return r[B.proyek];})));
    document.getElementById('bf-proyek').value = cur;
  }

  /* Staf */
  if (skipId !== 'bf-staf') {
    var curS = v('bf-staf');
    var dS = getFilteredBenef('staf');
    var sm = {};
    dS.forEach(function(r) {
      var k = normStafKey(r[B.staf]); if(!k) return;
      if (!sm[k]) sm[k] = getStafDisplay(r[B.staf]);
    });
    populateSel('bf-staf', Object.values(sm).filter(Boolean).sort(function(a,b){return a.localeCompare(b);}));
    document.getElementById('bf-staf').value = curS;
  }

  /* Kategori, Kab, Kec, Disab — uniqArr biasa */
  var simpleFields = [
    {id:'bf-kategori', skip:'kategori', fn:function(r){return r[B.kategori];}},
    {id:'bf-kab',      skip:'kab',      fn:function(r){return r[B.kab];}},
    {id:'bf-kec',      skip:'kec',      fn:function(r){return r[B.kec];}},
    {id:'bf-disab',    skip:'disab',    fn:function(r){return r[B.disab];}},
  ];
  simpleFields.forEach(function(f) {
    if (skipId === f.id) return;
    var cur = v(f.id);
    populateSel(f.id, uniqArr(getFilteredBenef(f.skip).map(f.fn)));
    document.getElementById(f.id).value = cur;
  });

  /* Tahun */
  if (skipId !== 'bf-tahun') {
    var curT = v('bf-tahun');
    var dT = getFilteredBenef('tahun');
    var tahunSet = {}, hasBlank = false;
    dT.forEach(function(r) {
      var t = validTgl(r[B.tgl]);
      if (t) tahunSet[t.slice(0,4)] = 1; else hasBlank = true;
    });
    var allT = Object.keys(tahunSet).sort().reverse();
    if (hasBlank) allT.push('__blank__');
    populateSel('bf-tahun', allT, function(x){ return x==='__blank__'?'(Tanggal Kosong)':x; });
    document.getElementById('bf-tahun').value = curT;
  }

  /* Bulan */
  if (skipId !== 'bf-bulan') {
    var curB = v('bf-bulan');
    var dB = getFilteredBenef('bulan');
    var bulanSet = {}, hasBlankB = false;
    dB.forEach(function(r) {
      var t = validTgl(r[B.tgl]);
      if (t) bulanSet[t.slice(5,7)] = 1; else hasBlankB = true;
    });
    var allB = Object.keys(bulanSet).sort();
    if (hasBlankB) allB.push('__blank__');
    populateSel('bf-bulan', allB, function(x){ return x==='__blank__'?'(Tanggal Kosong)':bulanName(x); });
    document.getElementById('bf-bulan').value = curB;
  }
}

function populateBenefFilters(skipId) { refreshBenefFilters(skipId); }

/* ── applyBenefFilter ── */
function applyBenefFilter() {
  var opts = getCurrentBenefOpts(null);
  opts.cari = v('bf-cari').toLowerCase().trim();

  window.APP.benef.filtered = window.rawBenef.filter(function(r) {
    return filterBenefRow(r, opts);
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
  var gL    = d.filter(function(r){return r[B.gender]==='L';}).length;
  var gP    = d.filter(function(r){return r[B.gender]==='P';}).length;
  var desaS = {}; d.forEach(function(r){if(r[B.desa]) desaS[r[B.desa]]=1;});
  var progS = {}; d.forEach(function(r){if(r[B.proyek]) progS[r[B.proyek]]=1;});

  setCard('bstat-total', total.toLocaleString('id-ID'), Object.keys(uniqSet).length.toLocaleString()+' unik (nama+desa)');
  setCard('bstat-lp',    gL.toLocaleString()+' / '+gP.toLocaleString(), (total?(gP/total*100).toFixed(1):0)+'% perempuan');
  setCard('bstat-desa',  Object.keys(desaS).length.toLocaleString(), 'desa/kelurahan tercakup');
  setCard('bstat-prog',  Object.keys(progS).length.toLocaleString(), 'program aktif');
}

function renderBenefCharts() {
  var B = window.B;
  var d = window.APP.benef.filtered;

  var byBulan = sortedBulan(groupCount(d,function(r){return validTgl(r[B.tgl]);}));
  mkLine('bch-trend',
    byBulan.map(function(x){var p=x[0].split('-');return bulanName(p[1])+"'"+p[0].slice(2);}),
    byBulan.map(function(x){return x[1];}), '#F97316', {label:'Benef',noLegend:true});

  var gMap={'L':'Laki-laki','P':'Perempuan','—':'Tidak Diisi'};
  var byG = groupCount(d,function(r){return gMap[r[B.gender]]||'Tidak Diisi';});
  var gKeys=Object.keys(byG);
  var gCol={'Laki-laki':'#4F8EF7','Perempuan':'#EF4444','Tidak Diisi':'#8A96B8'};
  var gColArr=gKeys.map(function(k){return gCol[k]||'#8A96B8';});
  mkDonut('bch-gender',gKeys,gKeys.map(function(k){return byG[k];}),gColArr);
  var gTotal=d.length||1;
  var gLeg=document.getElementById('bch-gender-legend');
  if(gLeg) gLeg.innerHTML=gKeys.map(function(k,i){
    return '<div class="dl-item"><div class="dl-dot" style="background:'+gColArr[i]+'"></div>'+
      '<div class="dl-name">'+k+'</div>'+
      '<div class="dl-pct">'+(byG[k]/gTotal*100).toFixed(1)+'% ('+byG[k].toLocaleString()+')</div></div>';
  }).join('');

  var byKat=topN(groupCount(d,function(r){return r[B.kategori];}),10);
  mkBarH('bch-kategori',byKat.map(function(x){return x[0];}),byKat.map(function(x){return x[1];}),
    byKat.map(function(_,i){return PALETTE[i%PALETTE.length];}),{label:'Benef'});

  var byUsia=topN(groupCount(d,function(r){return r[B.katUsia]||r[B.usia]||'—';}),8);
  mkBarH('bch-usia',byUsia.map(function(x){return x[0];}),byUsia.map(function(x){return x[1];}),
    '#F59E0B',{label:'Benef'});

  var byProg=topN(groupCount(d,function(r){return r[B.proyek];}),8);
  mkBarH('bch-proyek',byProg.map(function(x){return x[0];}),byProg.map(function(x){return x[1];}),
    '#22C55E',{label:'Benef'});

  var byDesa=topN(groupCount(d,function(r){return r[B.desa];}),10);
  mkBarH('bch-desa',byDesa.map(function(x){return x[0];}),byDesa.map(function(x){return x[1];}),
    '#8B5CF6',{label:'Benef'});

  var byStaf=topN(groupCount(d,function(r){return r[B.staf];}),10);
  mkBarH('bch-staf',byStaf.map(function(x){return x[0];}),byStaf.map(function(x){return x[1];}),
    '#14B8A6',{label:'Benef'});

  var byDisab=topN(groupCount(d,function(r){return r[B.disab]||'—';}),8);
  mkBarH('bch-disab',byDisab.map(function(x){return x[0];}),byDisab.map(function(x){return x[1];}),
    byDisab.map(function(_,i){return PALETTE[i%PALETTE.length];}),{label:'Benef'});
}

function renderBenefTable() {
  var B = window.B;
  var q = (document.getElementById('benef-tbl-search')?document.getElementById('benef-tbl-search').value:'').toLowerCase().trim();
  var rows = window.APP.benef.filtered;
  if(q) rows=rows.filter(function(r){
    return (r[B.nama]||'').toLowerCase().indexOf(q)>-1||
           (r[B.desa]||'').toLowerCase().indexOf(q)>-1||
           (r[B.kegiatan]||'').toLowerCase().indexOf(q)>-1||
           (r[B.kab]||'').toLowerCase().indexOf(q)>-1;
  });
  var total=rows.length, start=window.APP.benef.page*window.APP.PG_SIZE;
  var slice=rows.slice(start,start+window.APP.PG_SIZE);
  setEl('benef-tbl-count',total.toLocaleString()+' baris');
  setEl('benef-pg-info',(start+1).toLocaleString()+'–'+Math.min(start+window.APP.PG_SIZE,total).toLocaleString()+' dari '+total.toLocaleString());
  var pb=document.getElementById('benef-pg-prev'), nb=document.getElementById('benef-pg-next');
  if(pb) pb.disabled=window.APP.benef.page===0;
  if(nb) nb.disabled=start+window.APP.PG_SIZE>=total;
  var tbody=document.getElementById('benef-tbl-body');
  if(!tbody) return;
  tbody.innerHTML=slice.length?slice.map(function(r){
    return '<tr>'+
      '<td>'+(r[B.nama]||'—')+'</td>'+
      '<td><span class="badge badge-'+r[B.gender]+'">'+(r[B.gender]||'—')+'</span></td>'+
      '<td>'+(r[B.katUsia]||r[B.usia]||'—')+'</td>'+
      '<td>'+(r[B.kategori]||'—')+'</td>'+
      '<td>'+(r[B.disab]||'—')+'</td>'+
      '<td>'+(r[B.desa]||'—')+'</td>'+
      '<td>'+(r[B.kec]||'—')+'</td>'+
      '<td>'+(r[B.kab]||'—')+'</td>'+
      '<td>'+(r[B.proyek]||'—')+'</td>'+
      '<td>'+(r[B.kegiatan]||'—')+'</td>'+
      '<td>'+(r[B.benefit]||'—')+'</td>'+
      '<td>'+(r[B.staf]||'—')+'</td>'+
      '<td class="mono">'+(r[B.tgl]||'—')+'</td>'+
      '<td class="mono">'+(r[B.kode]||'—')+'</td>'+
    '</tr>';
  }).join(''):'<tr><td colspan="14" style="text-align:center;padding:24px;color:var(--text3)">Tidak ada data</td></tr>';
}

window.changeBenefPage=function(dir){
  window.APP.benef.page=Math.max(0,window.APP.benef.page+dir);
  renderBenefTable();
};
