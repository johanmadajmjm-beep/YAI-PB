/* ═══════════════════════════════════════════════
   pages.js — Wilayah + Analitik pages
═══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   WILAYAH
══════════════════════════════════════════════ */
function buildWilayahPage() {
  var benef = window.rawBenef;
  var B = window.B;
  populateSel('wf-proyek', uniqArr(benef.map(function(r) { return r[B.proyek]; })));
  populateSel('wf-tahun',  uniqArr(benef.map(function(r) { return r[B.tgl] ? r[B.tgl].slice(0,4) : null; }).filter(Boolean)).reverse());
  var fids = ['wf-proyek','wf-tahun'];
  fids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', applyWilayahFilter);
  });
  var rb = document.getElementById('wf-reset');
  if (rb) rb.addEventListener('click', function() {
    fids.forEach(function(id) { var el = document.getElementById(id); if(el) el.value = ''; });
    applyWilayahFilter();
  });
  applyWilayahFilter();
}

function applyWilayahFilter() {
  var B = window.B;
  var proyek = v('wf-proyek');
  var tahun  = v('wf-tahun');
  window.APP.wilayah.filtered = window.rawBenef.filter(function(r) {
    if (proyek && r[B.proyek] !== proyek) return false;
    if (tahun  && !(r[B.tgl]||'').startsWith(tahun)) return false;
    return true;
  });
  window.APP.wilayah.page = 0;
  renderWilayahAll();
}

function renderWilayahAll() {
  var B = window.B;
  var d = window.APP.wilayah.filtered;

  /* ─ KPI ─ */
  var kabS={}, kecS={}, desaS={};
  d.forEach(function(r) {
    if(r[B.kab])  kabS[r[B.kab]]  = 1;
    if(r[B.kec])  kecS[r[B.kec]]  = 1;
    if(r[B.desa]) desaS[r[B.desa]] = 1;
  });
  setEl('wstat-kab',  Object.keys(kabS).length.toLocaleString());
  setEl('wstat-kec',  Object.keys(kecS).length.toLocaleString());
  setEl('wstat-desa', Object.keys(desaS).length.toLocaleString());
  setEl('wstat-tot',  d.length.toLocaleString());

  /* ─ Charts ─ */
  var byKab = topN(groupCount(d, function(r){return r[B.kab];}), 15);
  mkBarH('wch-kab', byKab.map(function(x){return x[0];}), byKab.map(function(x){return x[1];}),
    byKab.map(function(_,i){return PALETTE[i%PALETTE.length];}), {label:'Benef'});

  var byKec = topN(groupCount(d, function(r){return r[B.kec];}), 15);
  mkBarH('wch-kec', byKec.map(function(x){return x[0];}), byKec.map(function(x){return x[1];}),
    '#F97316', {label:'Benef'});

  var byDesa = topN(groupCount(d, function(r){return r[B.desa];}), 15);
  mkBarH('wch-desa', byDesa.map(function(x){return x[0];}), byDesa.map(function(x){return x[1];}),
    '#8B5CF6', {label:'Benef'});

  /* ─ Tambahan: benef per program di wilayah ini ─ */
  var byProg = topN(groupCount(d, function(r){return r[B.proyek];}), 10);
  mkBarH('wch-prog', byProg.map(function(x){return x[0];}), byProg.map(function(x){return x[1];}),
    '#22C55E', {label:'Benef'});

  /* ─ Donut gender wilayah ─ */
  var gMap = {'L':'Laki-laki','P':'Perempuan','—':'Lainnya'};
  var byG  = groupCount(d, function(r){return gMap[r[B.gender]]||'Lainnya';});
  var gKeys = Object.keys(byG);
  var gCol  = {'Laki-laki':'#4F8EF7','Perempuan':'#EF4444','Lainnya':'#8A96B8'};
  mkDonut('wch-gender', gKeys, gKeys.map(function(k){return byG[k];}),
    gKeys.map(function(k){return gCol[k]||'#8A96B8';}));
  var gTotal = d.length || 1;
  var wgLeg = document.getElementById('wch-gender-legend');
  if (wgLeg) wgLeg.innerHTML = gKeys.map(function(k,i) {
    return '<div class="dl-item"><div class="dl-dot" style="background:'+(gCol[k]||PALETTE[i])+'"></div>' +
      '<div class="dl-name">'+k+'</div>' +
      '<div class="dl-pct">'+(byG[k]/gTotal*100).toFixed(1)+'%</div></div>';
  }).join('');

  /* ─ Tabel ─ */
  renderWilayahTable();
}

function renderWilayahTable() {
  var B = window.B;
  var d = window.APP.wilayah.filtered;
  var byDesa    = topN(groupCount(d, function(r){return r[B.desa];}), 200);
  var desaTotal = byDesa.reduce(function(s,x){return s+x[1];},0)||1;
  var start = window.APP.wilayah.page * 20;
  var slice = byDesa.slice(start, start+20);

  // Build lookup: desa → {kec, kab}
  var lookup = {};
  d.forEach(function(r) {
    if (r[B.desa] && !lookup[r[B.desa]]) lookup[r[B.desa]] = {kec:r[B.kec], kab:r[B.kab]};
  });

  var tbody = document.getElementById('wilayah-tbl-body');
  if (!tbody) return;
  tbody.innerHTML = slice.length ? slice.map(function(x, i) {
    var info = lookup[x[0]] || {};
    var pct  = byDesa[0] ? x[1]/byDesa[0][1]*100 : 0;
    return '<tr>' +
      '<td>'+(start+i+1)+'</td>' +
      '<td><strong>'+x[0]+'</strong></td>' +
      '<td>'+(info.kec||'—')+'</td>' +
      '<td>'+(info.kab||'—')+'</td>' +
      '<td class="num">'+x[1].toLocaleString()+'</td>' +
      '<td class="num">'+(x[1]/desaTotal*100).toFixed(1)+'%</td>' +
      '<td><div class="rank-bar" style="width:100px"><div class="rank-bar-fill" style="width:'+pct+'%"></div></div></td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text3)">Tidak ada data</td></tr>';

  setEl('wilayah-pg-info', (start+1)+'–'+Math.min(start+20,byDesa.length)+' dari '+byDesa.length+' desa');
  var pb = document.getElementById('wilayah-pg-prev');
  var nb = document.getElementById('wilayah-pg-next');
  if (pb) pb.disabled = window.APP.wilayah.page === 0;
  if (nb) nb.disabled = start+20 >= byDesa.length;
}

window.changeWilayahPage = function(dir) {
  window.APP.wilayah.page = Math.max(0, window.APP.wilayah.page + dir);
  renderWilayahTable();
};


/* ══════════════════════════════════════════════
   ANALITIK
══════════════════════════════════════════════ */
function buildAnalitikPage() {
  renderAnalitikCharts();
}

function renderAnalitikCharts() {
  var pjum  = window.rawPjum;
  var benef = window.rawBenef;
  var P = window.P, B = window.B;

  /* 1. Stacked PJUM per program per bulan */
  var progSet = {};
  pjum.forEach(function(r){if(r[P.proyek]) progSet[r[P.proyek]]=1;});
  var programs = Object.keys(progSet).slice(0,8);
  var bulanSet = {};
  pjum.forEach(function(r){var bt=validTgl(r[P.tgl]); if(bt) bulanSet[bt]=1;});
  var allBulan = Object.keys(bulanSet).sort();
  var bLabels  = allBulan.map(function(k){var p=k.split('-');return bulanName(p[1])+"'"+p[0].slice(2);});
  var stackedDS = programs.map(function(prog,i){
    return {
      label: prog,
      data: allBulan.map(function(bln){
        return pjum.filter(function(r){return r[P.proyek]===prog && validTgl(r[P.tgl])===bln;})
                   .reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
      }),
      backgroundColor: PALETTE[i%PALETTE.length], borderRadius:2
    };
  });
  mkMultiBar('ach-pjum-stacked', bLabels, stackedDS, {yFmt:fmtShort, stacked:true});

  /* 2. Rasio gender per program */
  var bProgSet={};
  benef.forEach(function(r){if(r[B.proyek]) bProgSet[r[B.proyek]]=1;});
  var progList = Object.keys(bProgSet).slice(0,10);
  var lData = progList.map(function(p){return benef.filter(function(r){return r[B.proyek]===p&&r[B.gender]==='L';}).length;});
  var pData = progList.map(function(p){return benef.filter(function(r){return r[B.proyek]===p&&r[B.gender]==='P';}).length;});
  mkMultiBar('ach-gender-prog', progList, [
    {label:'Laki-laki', data:lData, backgroundColor:'#4F8EF7', borderRadius:3},
    {label:'Perempuan',  data:pData, backgroundColor:'#EF4444', borderRadius:3}
  ], {stacked:true});

  /* 3. Trend kategori benef per bulan (top 4) */
  var topKat = topN(groupCount(benef,function(r){return r[B.kategori];}),4).map(function(x){return x[0];});
  var bBulanSet={};
  benef.forEach(function(r){var bbt=validTgl(r[B.tgl]); if(bbt) bBulanSet[bbt]=1;});
  var benefBulan  = Object.keys(bBulanSet).sort();
  var bbLabels    = benefBulan.map(function(k){var p=k.split('-');return bulanName(p[1])+"'"+p[0].slice(2);});
  var katDS = topKat.map(function(kat,i){
    return {
      label:kat,
      data: benefBulan.map(function(bln){
        return benef.filter(function(r){return r[B.kategori]===kat&&validTgl(r[B.tgl])===bln;}).length;
      }),
      borderColor:PALETTE[i], backgroundColor:PALETTE[i]+'22',
      fill:false, tension:.35, pointRadius:3
    };
  });
  mkChart('ach-kategori-trend','line',bbLabels,katDS,{});

  /* 4. Staf compare: benef vs biaya PJUM */
  var topStafB = topN(groupCount(benef,function(r){return r[B.staf];}),10);
  var stafNames = topStafB.map(function(x){return x[0];});
  var stafPjumD = stafNames.map(function(s){
    return pjum.filter(function(r){return r[P.staf]===s;})
               .reduce(function(acc,r){return acc+(parseFloat(r[P.jumlah])||0);},0);
  });
  mkMultiBar('ach-staf-compare', stafNames, [
    {label:'Jml Benef', data:topStafB.map(function(x){return x[1];}), backgroundColor:'#F97316', borderRadius:3, yAxisID:'y'},
    {label:'Biaya PJUM', data:stafPjumD, backgroundColor:'#4F8EF7', borderRadius:3, yAxisID:'y1'}
  ], {
    extra:{
      scales:{
        x:  {ticks:{color:'#8A96B8',font:{size:11}},grid:{color:'#F0F2F8'}},
        y:  {type:'linear',position:'left',  ticks:{color:'#F97316',font:{size:11}},grid:{color:'#F0F2F8'}},
        y1: {type:'linear',position:'right', ticks:{color:'#4F8EF7',font:{size:11},callback:fmtShort},grid:{drawOnChartArea:false}}
      }
    }
  });

  /* 5. Komponen donut */
  var byKomp  = topN(groupSum(pjum,function(r){return classifyItem(r[P.item]);},function(r){return r[P.jumlah];}),9);
  var kompTot = byKomp.reduce(function(s,x){return s+x[1];},0)||1;
  mkDonut('ach-komponen', byKomp.map(function(x){return x[0];}), byKomp.map(function(x){return x[1];}));
  var achLeg = document.getElementById('ach-komponen-legend');
  if (achLeg) achLeg.innerHTML = byKomp.map(function(x,i){
    return '<div class="dl-item">' +
      '<div class="dl-dot" style="background:'+PALETTE[i%PALETTE.length]+'"></div>' +
      '<div class="dl-name">'+x[0]+'</div>' +
      '<div class="dl-pct">'+fmtShort(x[1])+' · '+(x[1]/kompTot*100).toFixed(1)+'%</div>' +
    '</div>';
  }).join('');

  /* 6. Efisiensi Rp/benef per program */
  var progBenef = groupCount(benef,function(r){return r[B.proyek];});
  var progCost  = groupSum(pjum,function(r){return r[P.proyek];},function(r){return r[P.jumlah];});
  var efisi = Object.keys(progBenef)
    .filter(function(p){return progCost[p];})
    .map(function(p){return {p:p, ratio:(progCost[p]||0)/(progBenef[p]||1)};})
    .sort(function(a,b){return a.ratio-b.ratio;}).slice(0,10);
  mkBarH('ach-efisiensi', efisi.map(function(e){return e.p;}), efisi.map(function(e){return e.ratio;}),
    efisi.map(function(_,i){return PALETTE[i%PALETTE.length];}), {label:'Rp/Benef', yFmt:fmtShort});

  /* 7. Top kategori benef bar */
  var byKatAll = topN(groupCount(benef,function(r){return r[B.kategori];}),12);
  mkBarH('ach-top-kategori', byKatAll.map(function(x){return x[0];}), byKatAll.map(function(x){return x[1];}),
    byKatAll.map(function(_,i){return PALETTE[i%PALETTE.length];}), {label:'Benef'});

  /* 8. Benef per kabupaten (analitik) */
  var byKabA = topN(groupCount(benef,function(r){return r[B.kab];}),12);
  mkBarH('ach-kab', byKabA.map(function(x){return x[0];}), byKabA.map(function(x){return x[1];}),
    '#14B8A6', {label:'Benef'});
}
