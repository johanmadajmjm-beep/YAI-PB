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
    populateSel('bf-staf', dedupStaf(dS.map(function(r){return r[B.staf];})));
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
  var uniq  = countUniqBenef(d);
  var gL    = countUniqByGender(d, 'L');
  var gP    = countUniqByGender(d, 'P');
  var desaS = {}; d.forEach(function(r){if(r[B.desa]) desaS[r[B.desa]]=1;});
  var progS = {}; d.forEach(function(r){if(r[B.proyek]) progS[r[B.proyek]]=1;});

  setCard('bstat-total', uniq.toLocaleString(), total.toLocaleString('id-ID')+' total records');
  setCard('bstat-lp',    gL.toLocaleString()+' / '+gP.toLocaleString(), (uniq?(gP/uniq*100).toFixed(1):0)+'% perempuan');
  setCard('bstat-desa',  Object.keys(desaS).length.toLocaleString(), 'desa/kelurahan tercakup');
  setCard('bstat-prog',  Object.keys(progS).length.toLocaleString(), 'program aktif');
}

function renderBenefCharts() {
  var B = window.B;
  var d = window.APP.benef.filtered;
  var uniqTotal = countUniqBenef(d);

  /* Trend unique benef per bulan */
  var byBulan = sortedBulan(groupCountUniq(d,function(r){return validTgl(r[B.tgl]);}));
  var trendEl = document.getElementById('bch-trend');
  var trendWrap = trendEl ? trendEl.parentElement : null;
  var noTglMsg = document.getElementById('bch-trend-notgl');

  if (byBulan.length === 0) {
    if (trendEl) trendEl.style.display = 'none';
    if (!noTglMsg && trendWrap) {
      var msg = document.createElement('div');
      msg.id = 'bch-trend-notgl';
      msg.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:12px;flex-direction:column;gap:6px';
      msg.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>Data tanggal tidak tersedia untuk filter ini</span>';
      trendWrap.appendChild(msg);
    } else if (noTglMsg) {
      noTglMsg.style.display = 'flex';
    }
  } else {
    if (trendEl) trendEl.style.display = '';
    if (noTglMsg) noTglMsg.style.display = 'none';
    mkLine('bch-trend',
      byBulan.map(function(x){var p=x[0].split('-');return bulanName(p[1])+"'"+p[0].slice(2);}),
      byBulan.map(function(x){return x[1];}), '#F97316', {label:'Benef Unik',noLegend:true});
  }

  /* Gender donut — unique */
  var gMap={'L':'Laki-laki','P':'Perempuan','—':'Tidak Diisi'};
  var byG = groupCountUniq(d,function(r){return gMap[r[B.gender]]||'Tidak Diisi';});
  var gKeys=Object.keys(byG);
  var gCol={'Laki-laki':'#4F8EF7','Perempuan':'#EF4444','Tidak Diisi':'#8A96B8'};
  var gColArr=gKeys.map(function(k){return gCol[k]||'#8A96B8';});
  mkDonut('bch-gender',gKeys,gKeys.map(function(k){return byG[k];}),gColArr);
  var gLeg=document.getElementById('bch-gender-legend');
  if(gLeg) gLeg.innerHTML=gKeys.map(function(k,i){
    return '<div class="dl-item"><div class="dl-dot" style="background:'+gColArr[i]+'"></div>'+
      '<div class="dl-name">'+k+'</div>'+
      '<div class="dl-pct">'+(uniqTotal?(byG[k]/uniqTotal*100).toFixed(1):0)+'% ('+byG[k].toLocaleString()+')</div></div>';
  }).join('');

  /* Kategori — unique per kategori */
  var byKat=topN(groupCountUniq(d,function(r){return r[B.kategori];}),10);
  mkBarH('bch-kategori',byKat.map(function(x){return x[0];}),byKat.map(function(x){return x[1];}),
    byKat.map(function(_,i){return PALETTE[i%PALETTE.length];}),{label:'Benef Unik'});

  /* Usia — unique per kategori usia */
  var byUsia=topN(groupCountUniq(d,function(r){return r[B.katUsia]||r[B.usia]||'—';}),8);
  mkBarH('bch-usia',byUsia.map(function(x){return x[0];}),byUsia.map(function(x){return x[1];}),
    '#F59E0B',{label:'Benef Unik'});

  /* Proyek — unique per program */
  var byProg=topN(groupCountUniq(d,function(r){return r[B.proyek];}),8);
  mkBarH('bch-proyek',byProg.map(function(x){return x[0];}),byProg.map(function(x){return x[1];}),
    '#22C55E',{label:'Benef Unik'});

  /* Desa — unique per desa */
  var byDesa=topN(groupCountUniq(d,function(r){return r[B.desa];}),10);
  mkBarH('bch-desa',byDesa.map(function(x){return x[0];}),byDesa.map(function(x){return x[1];}),
    '#8B5CF6',{label:'Benef Unik'});

  /* Staf — unique per staf */
  var byStaf=topN(groupCountUniq(d,function(r){return r[B.staf];}),10);
  mkBarH('bch-staf',byStaf.map(function(x){return x[0];}),byStaf.map(function(x){return x[1];}),
    '#14B8A6',{label:'Benef Unik'});

  /* Disabilitas — Ya vs Tidak (donut comparison) */
  var disabYa = 0, disabTidak = 0;
  var disabSeen = {};
  d.forEach(function(r) {
    var key = benefKey(r);
    if (disabSeen[key]) return;
    disabSeen[key] = 1;
    var val = (r[B.disab] || '').trim().toLowerCase();
    if (val && val !== '—' && val !== 'tidak' && val !== 'tidak ada' && val !== 'none' && val !== 'no' && val !== '-') {
      disabYa++;
    } else {
      disabTidak++;
    }
  });
  var disabLabels = ['Disabilitas', 'Tidak/Kosong'];
  var disabValues = [disabYa, disabTidak];
  var disabColors = ['#F97316', '#CBD5E1'];
  mkDonut('bch-disab', disabLabels, disabValues, disabColors);
  setEl('disab-center-val', uniqTotal.toLocaleString());
  setEl('disab-center-lbl', 'Total');
  var disabLeg = document.getElementById('bch-disab-legend');
  if (disabLeg) {
    var disabTotal = disabYa + disabTidak || 1;
    disabLeg.innerHTML = disabLabels.map(function(label, i) {
      var val = disabValues[i];
      return '<div class="dl-item"><div class="dl-dot" style="background:' + disabColors[i] + '"></div>' +
        '<div class="dl-name">' + label + '</div>' +
        '<div class="dl-pct">' + (val/disabTotal*100).toFixed(1) + '% (' + val.toLocaleString() + ')</div></div>';
    }).join('');
  }
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
  /* Sort seluruh dataset terfilter (bukan hanya halaman aktif) */
  var bst=window.SORT['benef'];
  if(bst&&bst.col>=0){
    var BG=[
      function(r){return r[B.nama];},function(r){return r[B.gender];},
      function(r){return r[B.katUsia]||r[B.usia];},function(r){return r[B.kategori];},
      function(r){return r[B.disab];},function(r){return r[B.desa];},
      function(r){return r[B.kec];},function(r){return r[B.kab];},
      function(r){return r[B.proyek];},function(r){return r[B.kegiatan];},
      function(r){return r[B.benefit];},function(r){return r[B.staf];},
      function(r){return r[B.tgl];},function(r){return r[B.kode];}
    ];
    var bg=BG[bst.col];
    if(bg) rows=rows.slice().sort(function(a,b){return cmpVals(bg(a),bg(b))*bst.dir;});
  }
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

/* ══════════════════════════════════════════════════
   Beneficiary PDF — Laporan Lengkap
══════════════════════════════════════════════════ */
window.exportBenefPDF = function() {
  var B = window.B;
  var d = window.APP.benef.filtered;
  var uniq = countUniqBenef(d);
  var g = genderBreakdown(d);
  var per = dataPeriod(d, B.tgl);
  var disab = disabilityBreakdown(d);
  var hier = wilayahHierarchy(d);
  var desaMap = desaProgramMap(d);
  var avgPart = avgParticipation(d);

  var desaS={},kecS={},kabS={},progS={},stafS={};
  d.forEach(function(r){ if(r[B.desa])desaS[r[B.desa]]=1; if(r[B.kec])kecS[r[B.kec]]=1; if(r[B.kab])kabS[r[B.kab]]=1; if(r[B.proyek])progS[r[B.proyek]]=1; if(r[B.staf])stafS[r[B.staf]]=1; });

  var byKat = uniqGroupField(d, B.kategori);
  var byUsia = uniqGroupField(d, B.katUsia);
  var byDesa = topN(groupCountUniq(d,function(r){return r[B.desa];}),25);
  var byProg = topN(groupCountUniq(d,function(r){return r[B.proyek];}),20);
  var byKeg = topN(groupCountUniq(d,function(r){return r[B.kegiatan];}),15);
  var byBenefit = topN(groupCountUniq(d,function(r){return r[B.benefit];}),15);
  var byStaf = topN(groupCountUniq(d,function(r){return r[B.staf];}),15);
  var byInstansi = uniqGroupField(d, B.instansi);
  var byJabatan = uniqGroupField(d, B.jabatan);
  var peakB = peakMonths(d, B.tgl, 'uniq');

  /* rekap tahunan khusus benef */
  var years = getYears(d, B.tgl);
  var yearly = calcGrowth(years.map(function(y){
    var rows = d.filter(function(r){var t=validTgl(r[B.tgl]);return t&&t.slice(0,4)===y;});
    var ds={},kg={}; rows.forEach(function(r){if(r[B.desa])ds[r[B.desa]]=1;if(r[B.kegiatan])kg[r[B.kegiatan]]=1;});
    var gg = genderBreakdown(rows);
    return {tahun:y, uniq:countUniqBenef(rows), records:rows.length,
      desa:Object.keys(ds).length, kegiatan:Object.keys(kg).length, L:gg.L, P:gg.P};
  }),'uniq');

  var complete = columnCompleteness(d, [
    {idx:B.nama,label:'Nama'},{idx:B.gender,label:'Jenis Kelamin'},{idx:B.katUsia,label:'Kategori Usia'},
    {idx:B.kategori,label:'Kategori'},{idx:B.disab,label:'Disabilitas'},{idx:B.desa,label:'Desa'},
    {idx:B.kec,label:'Kecamatan'},{idx:B.kab,label:'Kabupaten'},{idx:B.proyek,label:'Program'},
    {idx:B.kegiatan,label:'Kegiatan'},{idx:B.benefit,label:'Benefit'},{idx:B.instansi,label:'Instansi'},
    {idx:B.jabatan,label:'Jabatan'},{idx:B.staf,label:'Staf'},{idx:B.tgl,label:'Tanggal',isDate:true}
  ]);

  var anomali = detectAnomalies(d, []);
  var filterText = getFilterSummary([
    {label:'Program',val:v('bf-proyek')},{label:'Staf',val:v('bf-staf')},
    {label:'Kategori',val:v('bf-kategori')},{label:'Kabupaten',val:v('bf-kab')},
    {label:'Kecamatan',val:v('bf-kec')},{label:'Disabilitas',val:v('bf-disab')},
    {label:'Gender',val:v('bf-gender')},{label:'Tahun',val:v('bf-tahun')},
    {label:'Bulan',val:v('bf-bulan')?bulanName(v('bf-bulan')):''}
  ]);

  var topKat=byKat[0]||['—',0], topDesa=byDesa[0]||['—',0], topKab=hier[0]||{kab:'—',uniq:0};
  var concIdx = concentrationIndex(byDesa.map(function(x){return x[1];}));

  buildPDF({
    title:'Laporan Penerima Manfaat', subtitle:'Yayasan Ayo Indonesia',
    filterText:filterText, filename:'Laporan_Beneficiary.pdf',
    meta:{ periode: per?fmtPeriod(per.start)+' – '+fmtPeriod(per.end):'Tidak tersedia',
           sumber:'Google Sheets YAI — Sheet Beneficiary' },
    body:[
      {section:'I. Ringkasan Eksekutif'},
      {text:'Laporan ini menganalisis profil dan sebaran penerima manfaat program Yayasan Ayo Indonesia'+(per?' pada periode '+fmtPeriod(per.start)+' hingga '+fmtPeriod(per.end):'')+'.'},
      {text:'Terdapat '+uniq.toLocaleString()+' penerima manfaat unik yang tercatat dari '+d.length.toLocaleString()+' catatan partisipasi kegiatan. Artinya, setiap penerima manfaat rata-rata mengikuti '+avgPart.toFixed(1)+' kegiatan. Mereka tersebar di '+Object.keys(desaS).length+' desa/kelurahan pada '+Object.keys(kabS).length+' kabupaten dan dilayani oleh '+Object.keys(progS).length+' program.'},
      {kv:[
        ['Penerima Manfaat Unik', uniq.toLocaleString()+' orang'],
        ['Total Catatan Partisipasi', d.length.toLocaleString()+' baris'],
        ['Rata-rata Partisipasi', avgPart.toFixed(1)+' kegiatan/orang'],
        ['Perempuan', g.P.toLocaleString()+' ('+g.pctP.toFixed(1)+'%)'],
        ['Laki-laki', g.L.toLocaleString()+' ('+g.pctL.toFixed(1)+'%)'],
        ['Penyandang Disabilitas', disab.adaDisab.toLocaleString()+' ('+(disab.total?(disab.adaDisab/disab.total*100).toFixed(1):0)+'%)'],
        ['Cakupan Wilayah', Object.keys(desaS).length+' desa / '+Object.keys(kecS).length+' kec / '+Object.keys(kabS).length+' kab'],
        ['Jumlah Program', Object.keys(progS).length.toString()],
        ['Jumlah Kategori', byKat.length.toString()]
      ]},

      {section:'II. Analisis Temporal'},
      {text: yearly.length ? 'Perkembangan jangkauan program dari tahun ke tahun ditunjukkan pada tabel berikut. '+describeTrend(yearly,'uniq') : 'Data temporal tidak tersedia untuk filter ini.'},
      yearly.length ? {table:{title:'Tabel 2.1 — Rekap Tahunan Penerima Manfaat',
        head:['Tahun','Benef Unik','Δ%','Records','Laki-laki','Perempuan','Desa','Kegiatan'],
        body:yearly.map(function(r){return [r.tahun,r.uniq.toLocaleString(),
          r.growth===null?'—':(r.growth>=0?'+':'')+r.growth.toFixed(1)+'%',
          r.records.toLocaleString(),r.L.toLocaleString(),r.P.toLocaleString(),r.desa,r.kegiatan];})}} : {spacer:0},
      peakB ? {text:'Bulan dengan jangkauan tertinggi adalah '+fmtPeriod(peakB.top[0])+' ('+peakB.top[1].toLocaleString()+' orang unik) dan terendah pada '+fmtPeriod(peakB.bottom[0])+' ('+peakB.bottom[1].toLocaleString()+' orang). Rata-rata bulanan '+Math.round(peakB.avg).toLocaleString()+' orang.'} : {spacer:0},
      {chart:{canvasId:'bch-trend', height:52, title:'Grafik 2.1 — Tren Penerima Manfaat per Bulan'}},

      {section:'III. Profil Demografis'},
      {heading:'3.1 Komposisi Gender'},
      {text:'Dari '+g.total.toLocaleString()+' penerima manfaat unik, '+g.P.toLocaleString()+' orang ('+g.pctP.toFixed(1)+'%) perempuan dan '+g.L.toLocaleString()+' orang ('+g.pctL.toFixed(1)+'%) laki-laki'+(g.X>0?'. Sebanyak '+g.X.toLocaleString()+' orang ('+g.pctX.toFixed(1)+'%) tidak memiliki catatan gender':'')+'. Rasio P:L = '+(g.rasio!==null?g.rasio.toFixed(2):'—')+'.'},
      g.konflik>0 ? {callout:'Catatan: '+g.konflik+' orang tercatat dengan gender berbeda pada baris yang berbeda. Sistem mengambil gender yang paling sering muncul. Data ini perlu diverifikasi di sumber.'} : {spacer:0},
      {chart:{canvasId:'bch-gender', height:48, title:'Grafik 3.1 — Distribusi Gender'}},
      {heading:'3.2 Kategori Usia'},
      {text: byUsia.length ? 'Kelompok usia terbesar adalah "'+byUsia[0][0]+'" ('+byUsia[0][1].toLocaleString()+' orang, '+(uniq?(byUsia[0][1]/uniq*100).toFixed(1):0)+'%)'+(byUsia.length>1?', diikuti "'+byUsia[1][0]+'" ('+byUsia[1][1].toLocaleString()+' orang)':'')+'. Terdapat '+byUsia.length+' kelompok usia berbeda. Rincian pada Lampiran Tabel A2.' : 'Data kategori usia belum tersedia.'},
      {heading:'3.3 Kategori Penerima Manfaat'},
      {text: byKat.length ? 'Terdapat '+byKat.length+' kategori penerima manfaat. Terbesar adalah "'+topKat[0]+'" dengan '+topKat[1].toLocaleString()+' orang ('+(uniq?(topKat[1]/uniq*100).toFixed(1):0)+'%)'+(byKat.length>1?', "'+byKat[1][0]+'" ('+byKat[1][1].toLocaleString()+')':'')+(byKat.length>2?', dan "'+byKat[2][0]+'" ('+byKat[2][1].toLocaleString()+')':'')+'.' : ''},
      {chart:{canvasId:'bch-kategori', height:55, title:'Grafik 3.2 — Distribusi per Kategori'}},
      {heading:'3.4 Inklusi Disabilitas'},
      {text:'Sebanyak '+disab.adaDisab.toLocaleString()+' orang ('+(disab.total?(disab.adaDisab/disab.total*100).toFixed(1):0)+'%) adalah penyandang disabilitas dengan '+disab.jenis.length+' ragam berbeda'+(disab.jenis.length?', terbanyak "'+disab.jenis[0][0]+'" ('+disab.jenis[0][1].toLocaleString()+' orang)':'')+'. Sisanya '+disab.tanpaDisab.toLocaleString()+' orang tanpa catatan disabilitas.'},
      byInstansi.length>1 ? {heading:'3.5 Afiliasi Instansi'} : {spacer:0},
      byInstansi.length>1 ? {text:'Instansi/lembaga asal terbanyak adalah "'+byInstansi[0][0]+'" dengan '+byInstansi[0][1].toLocaleString()+' orang. Total '+byInstansi.length+' instansi tercatat. Rincian pada Lampiran Tabel A6.'} : {spacer:0},

      {section:'IV. Analisis Wilayah'},
      {text:'Penerima manfaat tersebar di '+Object.keys(kabS).length+' kabupaten, '+Object.keys(kecS).length+' kecamatan, dan '+Object.keys(desaS).length+' desa. Kabupaten terbesar adalah '+topKab.kab+' dengan '+topKab.uniq.toLocaleString()+' orang ('+(uniq?(topKab.uniq/uniq*100).toFixed(1):0)+'%) yang mencakup '+topKab.desa+' desa.'},
      {table:{title:'Tabel 4.1 — Rekap per Kabupaten',
        head:['#','Kabupaten','Kecamatan','Desa','Benef Unik','%'],
        body:hier.map(function(h,i){return [i+1,h.kab,h.kec,h.desa,h.uniq.toLocaleString(),(uniq?(h.uniq/uniq*100).toFixed(1):0)+'%'];})}},
      {text:'Desa dengan jangkauan terbesar adalah '+topDesa[0]+' ('+topDesa[1].toLocaleString()+' orang). Indeks konsentrasi '+concIdx.toFixed(1)+'/100 menunjukkan sebaran '+(concIdx>50?'terkonsentrasi':concIdx>25?'cukup merata':'sangat merata')+'.'},
      {chart:{canvasId:'bch-desa', height:55, title:'Grafik 4.1 — Sebaran per Desa'}},

      {section:'V. Analisis Program & Kegiatan'},
      {text: byProg.length ? 'Program dengan jangkauan terbesar adalah "'+byProg[0][0]+'" dengan '+byProg[0][1].toLocaleString()+' penerima manfaat unik ('+(uniq?(byProg[0][1]/uniq*100).toFixed(1):0)+'%). Total '+Object.keys(progS).length+' program tercatat dalam data ini.' : ''},
      {table:{title:'Tabel 5.1 — Jangkauan per Program',
        head:['#','Program','Benef Unik','% Total'],
        body:byProg.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {text: byKeg.length ? 'Kegiatan dengan peserta terbanyak adalah "'+byKeg[0][0]+'" dengan '+byKeg[0][1].toLocaleString()+' orang unik. Rincian 15 kegiatan terbesar pada Lampiran Tabel A4.' : ''},
      {heading:'5.1 Kinerja Staf'},
      {text: byStaf.length ? 'Staf dengan jangkauan penerima manfaat terbesar adalah '+byStaf[0][0]+' dengan '+byStaf[0][1].toLocaleString()+' orang unik. Rincian pada Lampiran Tabel A5.' : ''},
      {chart:{canvasId:'bch-staf', height:55, title:'Grafik 5.1 — Jangkauan per Staf'}},

      {section:'VI. Kualitas Data'},
      {text:'Penilaian kelengkapan data yang menjadi dasar laporan ini. Kolom dengan kelengkapan rendah berpotensi mengurangi akurasi analisis pada bagian terkait.'},
      {table:{title:'Tabel 6.1 — Kelengkapan Kolom',
        head:['Kolom','Terisi','Kosong','% Lengkap'],
        body:complete.map(function(c){return [c.nama,c.terisi.toLocaleString(),c.kosong.toLocaleString(),c.pct.toFixed(1)+'%'];})}},
      anomali.length ? {table:{title:'Tabel 6.2 — Anomali Terdeteksi',
        head:['Jenis','Jumlah','Keterangan'],
        body:anomali.map(function(a){return [a.jenis,a.jml.toLocaleString(),a.ket];})}} : {text:'Tidak ditemukan anomali signifikan.'},

      {section:'VII. Kesimpulan'},
      {text:'Program menjangkau '+uniq.toLocaleString()+' penerima manfaat unik di '+Object.keys(desaS).length+' desa. '+(yearly.length?describeTrend(yearly,'uniq'):'')},
      {bullet:'Keseimbangan gender: rasio P:L '+(g.rasio!==null?g.rasio.toFixed(2):'—')+' — '+(g.rasio!==null&&g.rasio>=0.9&&g.rasio<=1.1?'sudah seimbang':'perlu perhatian pada kelompok yang kurang terjangkau')},
      {bullet:'Inklusi disabilitas: '+(disab.total?(disab.adaDisab/disab.total*100).toFixed(1):0)+'% dari total penerima manfaat'},
      {bullet:'Konsentrasi wilayah: '+concIdx.toFixed(0)+'/100 — '+(concIdx>50?'perlu perluasan ke wilayah lain':'sebaran sudah baik')},
      {bullet:'Intensitas partisipasi: rata-rata '+avgPart.toFixed(1)+' kegiatan per orang'}
    ],
    lampiran:[
      {table:{title:'Tabel A1 — Kategori Penerima Manfaat (Lengkap)',
        head:['#','Kategori','Benef Unik','% Total'],
        body:byKat.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {table:{title:'Tabel A2 — Kategori Usia',
        head:['#','Kategori Usia','Benef Unik','% Total'],
        body:byUsia.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {table:{title:'Tabel A3 — Sebaran per Desa (25 Terbesar)',
        head:['#','Desa','Benef Unik','% Total'],
        body:byDesa.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {table:{title:'Tabel A4 — Kegiatan Terbesar',
        head:['#','Kegiatan','Benef Unik','% Total'],
        body:byKeg.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {table:{title:'Tabel A5 — Jangkauan per Staf',
        head:['#','Staf','Benef Unik','% Total'],
        body:byStaf.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      byInstansi.length>1 ? {table:{title:'Tabel A6 — Afiliasi Instansi',
        head:['#','Instansi','Jumlah','% Total'],
        body:byInstansi.slice(0,25).map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}} : {spacer:0},
      byJabatan.length>1 ? {table:{title:'Tabel A7 — Jabatan',
        head:['#','Jabatan','Jumlah','% Total'],
        body:byJabatan.slice(0,25).map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}} : {spacer:0},
      {table:{title:'Tabel A8 — Ragam Disabilitas',
        head:['#','Ragam','Jumlah','% dari Penyandang'],
        body:disab.jenis.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(disab.adaDisab?(x[1]/disab.adaDisab*100).toFixed(1):0)+'%'];})}},
      {table:{title:'Tabel A9 — Jenis Benefit Diterima',
        head:['#','Benefit','Benef Unik','% Total'],
        body:byBenefit.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}}
    ],
    metodologi: stdMetodologi([
      'Indeks konsentrasi wilayah menggunakan HHI ternormalisasi (0–100). Nilai rendah berarti sebaran merata.',
      'Kategori usia, instansi, dan jabatan dihitung per orang unik, bukan per baris partisipasi.'
    ])
  });
};

/* Sort handler: kembali ke halaman 1 lalu render ulang */
window._sortHandlers['benef'] = function(){ window.APP.benef.page = 0; renderBenefTable(); };
