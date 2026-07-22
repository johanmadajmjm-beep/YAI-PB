/* ═══════════════════════════════════════════════
   pages.js — Wilayah + Analitik pages
═══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   WILAYAH
══════════════════════════════════════════════ */
function buildWilayahPage() {
  refreshWilayahFilters(null);
  var fids = ['wf-proyek','wf-tahun'];
  fids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', function() {
      refreshWilayahFilters(id);
      applyWilayahFilter();
    });
  });
  var rb = document.getElementById('wf-reset');
  if (rb) rb.addEventListener('click', function() {
    fids.forEach(function(id) { var el = document.getElementById(id); if(el) el.value = ''; });
    refreshWilayahFilters(null);
    applyWilayahFilter();
  });
  applyWilayahFilter();
}

function getFilteredWilayah(skipField) {
  var B = window.B;
  var proyek = skipField !== 'proyek' ? v('wf-proyek') : '';
  var tahun  = skipField !== 'tahun'  ? v('wf-tahun')  : '';
  return window.rawBenef.filter(function(r) {
    if (proyek && r[B.proyek] !== proyek) return false;
    var tglValid = validTgl(r[B.tgl]);
    if (tahun === '__blank__' && tglValid) return false;
    if (tahun && tahun !== '__blank__' && (!tglValid || !tglValid.startsWith(tahun))) return false;
    return true;
  });
}

function refreshWilayahFilters(skipId) {
  var B = window.B;
  if (skipId !== 'wf-proyek') {
    var cur = v('wf-proyek');
    populateSel('wf-proyek', uniqArr(getFilteredWilayah('proyek').map(function(r){return r[B.proyek];})));
    document.getElementById('wf-proyek').value = cur;
  }
  if (skipId !== 'wf-tahun') {
    var cur2 = v('wf-tahun');
    var d2 = getFilteredWilayah('tahun');
    var tahunSet = {}, hasBlanks = false;
    d2.forEach(function(r) { var t = validTgl(r[B.tgl]); if (t) tahunSet[t.slice(0,4)] = 1; else hasBlanks = true; });
    var allTahun = Object.keys(tahunSet).sort().reverse();
    if (hasBlanks) allTahun.push('__blank__');
    populateSel('wf-tahun', allTahun, function(val) { return val === '__blank__' ? '(Tanggal Kosong)' : val; });
    document.getElementById('wf-tahun').value = cur2;
  }
}

function applyWilayahFilter() {
  var B = window.B;
  var proyek = v('wf-proyek'), tahun = v('wf-tahun');
  window.APP.wilayah.filtered = window.rawBenef.filter(function(r) {
    if (proyek && r[B.proyek] !== proyek) return false;
    var tglValid = validTgl(r[B.tgl]);
    if (tahun === '__blank__' && tglValid) return false;
    if (tahun && tahun !== '__blank__' && (!tglValid || !tglValid.startsWith(tahun))) return false;
    return true;
  });
  window.APP.wilayah.page = 0;
  renderWilayahAll();
}

function renderWilayahAll() {
  var B = window.B, d = window.APP.wilayah.filtered;
  var kabS={}, kecS={}, desaS={};
  d.forEach(function(r) {
    if(r[B.kab])kabS[r[B.kab]]=1; if(r[B.kec])kecS[r[B.kec]]=1; if(r[B.desa])desaS[r[B.desa]]=1;
  });
  var uniqTotal = countUniqBenef(d);
  setEl('wstat-kab', Object.keys(kabS).length.toLocaleString());
  setEl('wstat-kec', Object.keys(kecS).length.toLocaleString());
  setEl('wstat-desa', Object.keys(desaS).length.toLocaleString());
  setEl('wstat-tot', uniqTotal.toLocaleString());

  var byKab = topN(groupCountUniq(d, function(r){return r[B.kab];}), 15);
  mkBarH('wch-kab', byKab.map(function(x){return x[0];}), byKab.map(function(x){return x[1];}),
    byKab.map(function(_,i){return PALETTE[i%PALETTE.length];}), {label:'Benef Unik'});
  var byKec = topN(groupCountUniq(d, function(r){return r[B.kec];}), 15);
  mkBarH('wch-kec', byKec.map(function(x){return x[0];}), byKec.map(function(x){return x[1];}), '#F97316', {label:'Benef Unik'});
  var byDesa = topN(groupCountUniq(d, function(r){return r[B.desa];}), 15);
  mkBarH('wch-desa', byDesa.map(function(x){return x[0];}), byDesa.map(function(x){return x[1];}), '#8B5CF6', {label:'Benef Unik'});
  var byProg = topN(groupCountUniq(d, function(r){return r[B.proyek];}), 10);
  mkBarH('wch-prog', byProg.map(function(x){return x[0];}), byProg.map(function(x){return x[1];}), '#22C55E', {label:'Benef Unik'});

  var gMap = {'L':'Laki-laki','P':'Perempuan','—':'Lainnya'};
  var byG  = groupCountUniq(d, function(r){return gMap[r[B.gender]]||'Lainnya';});
  var gKeys = Object.keys(byG);
  var gCol  = {'Laki-laki':'#4F8EF7','Perempuan':'#EF4444','Lainnya':'#8A96B8'};
  mkDonut('wch-gender', gKeys, gKeys.map(function(k){return byG[k];}), gKeys.map(function(k){return gCol[k]||'#8A96B8';}));
  var wgLeg = document.getElementById('wch-gender-legend');
  if (wgLeg) wgLeg.innerHTML = gKeys.map(function(k,i) {
    return '<div class="dl-item"><div class="dl-dot" style="background:'+(gCol[k]||PALETTE[i])+'"></div>' +
      '<div class="dl-name">'+k+'</div><div class="dl-pct">'+(uniqTotal?(byG[k]/uniqTotal*100).toFixed(1):0)+'%</div></div>';
  }).join('');

  renderWilayahTable();
}

function renderWilayahTable() {
  var B = window.B, d = window.APP.wilayah.filtered;
  var byDesa = topN(groupCountUniq(d, function(r){return r[B.desa];}), 200);
  var desaTotal = byDesa.reduce(function(s,x){return s+x[1];},0)||1;
  var start = window.APP.wilayah.page * 20;
  var slice = byDesa.slice(start, start+20);
  var lookup = {};
  d.forEach(function(r) { if (r[B.desa] && !lookup[r[B.desa]]) lookup[r[B.desa]] = {kec:r[B.kec], kab:r[B.kab]}; });
  var tbody = document.getElementById('wilayah-tbl-body'); if (!tbody) return;
  tbody.innerHTML = slice.length ? slice.map(function(x, i) {
    var info = lookup[x[0]] || {};
    var pct  = byDesa[0] ? x[1]/byDesa[0][1]*100 : 0;
    return '<tr><td>'+(start+i+1)+'</td><td><strong>'+x[0]+'</strong></td><td>'+(info.kec||'—')+'</td><td>'+(info.kab||'—')+'</td>' +
      '<td class="num">'+x[1].toLocaleString()+'</td><td class="num">'+(x[1]/desaTotal*100).toFixed(1)+'%</td>' +
      '<td><div class="rank-bar" style="width:100px"><div class="rank-bar-fill" style="width:'+pct+'%"></div></div></td></tr>';
  }).join('') : '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text3)">Tidak ada data</td></tr>';
  setEl('wilayah-pg-info', (start+1)+'–'+Math.min(start+20,byDesa.length)+' dari '+byDesa.length+' desa');
  var pb=document.getElementById('wilayah-pg-prev'),nb=document.getElementById('wilayah-pg-next');
  if(pb)pb.disabled=window.APP.wilayah.page===0; if(nb)nb.disabled=start+20>=byDesa.length;
}
window.changeWilayahPage = function(dir) { window.APP.wilayah.page=Math.max(0,window.APP.wilayah.page+dir); renderWilayahTable(); };

/* ── Wilayah PDF Export ── */
window.exportWilayahPDF = function() {
  var B = window.B, d = window.APP.wilayah.filtered;
  var uniq = countUniqBenef(d);
  var kabS={},kecS={},desaS={}; d.forEach(function(r){if(r[B.kab])kabS[r[B.kab]]=1;if(r[B.kec])kecS[r[B.kec]]=1;if(r[B.desa])desaS[r[B.desa]]=1;});
  var filterText = getFilterSummary([{label:'Program',val:v('wf-proyek')},{label:'Tahun',val:v('wf-tahun')}]);
  var byDesa = topN(groupCountUniq(d,function(r){return r[B.desa];}),30);
  var lookup = {}; d.forEach(function(r){if(r[B.desa]&&!lookup[r[B.desa]])lookup[r[B.desa]]={kec:r[B.kec],kab:r[B.kab]};});
  buildPDF({
    title:'Laporan Sebaran Wilayah', subtitle:'Yayasan Ayo Indonesia', filterText:filterText, filename:'Wilayah_Report.pdf',
    kpis:[{label:'Benef Unik',value:uniq},{label:'Kabupaten',value:Object.keys(kabS).length},{label:'Kecamatan',value:Object.keys(kecS).length},{label:'Desa',value:Object.keys(desaS).length}],
    sections:[
      {type:'heading',text:'Distribusi per Kabupaten'},{type:'chart',canvasId:'wch-kab',height:55},
      {type:'heading',text:'Rekap per Desa (Top '+byDesa.length+')'},
      {type:'table',head:['#','Desa','Kecamatan','Kabupaten','Benef Unik','%'],
        body:byDesa.map(function(x,i){var inf=lookup[x[0]]||{};return [i+1,x[0],inf.kec||'—',inf.kab||'—',x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(1):0)+'%'];})}
    ]
  });
};


/* ══════════════════════════════════════════════
   ANALITIK — Descriptive Analysis + Charts
══════════════════════════════════════════════ */
function buildAnalitikPage() {
  renderAnalitikCharts();
}

function renderAnalitikCharts() {
  var pjum  = window.rawPjum;
  var benef = window.rawBenef;
  var P = window.P, B = window.B;
  var uniqTotal = countUniqBenef(benef);
  var totalCost = pjum.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);

  /* ── Descriptive insight cards ── */
  var gL = countUniqByGender(benef,'L'), gP = countUniqByGender(benef,'P');
  var gRatio = gP && gL ? (gP/gL).toFixed(2) : '—';
  var costPerBenef = uniqTotal ? totalCost / uniqTotal : 0;
  var kabData = topN(groupCountUniq(benef,function(r){return r[B.kab];}),1);
  var topKab = kabData[0]||['—',0];
  var disabCount = 0; var disabSeen={};
  benef.forEach(function(r){var k=benefKey(r);if(disabSeen[k])return;disabSeen[k]=1;var val=(r[B.disab]||'').trim().toLowerCase();if(val&&val!=='—'&&val!=='tidak'&&val!=='tidak ada'&&val!=='none'&&val!=='no'&&val!=='-')disabCount++;});
  var progBenef = groupCountUniq(benef,function(r){return r[B.proyek];});
  var progCost = groupSum(pjum,function(r){return r[P.proyek];},function(r){return r[P.jumlah];});
  var topProgByBenef = topN(progBenef,1); var topProg = topProgByBenef[0]||['—',0];

  var el = document.getElementById('analitik-insights');
  if (el) el.innerHTML =
    '<div class="insight-card"><div class="ic-title">Rasio Gender (P:L)</div><div class="ic-stat">'+gRatio+'</div><div class="ic-body">'+gP.toLocaleString()+' perempuan dari '+uniqTotal.toLocaleString()+' benef unik ('+(uniqTotal?(gP/uniqTotal*100).toFixed(1):0)+'%)</div></div>' +
    '<div class="insight-card"><div class="ic-title">Biaya per Beneficiary</div><div class="ic-stat">'+fmtShort(costPerBenef)+'</div><div class="ic-body">Total '+fmtShort(totalCost)+' dibagi '+uniqTotal.toLocaleString()+' orang unik</div></div>' +
    '<div class="insight-card"><div class="ic-title">Konsentrasi Wilayah</div><div class="ic-stat">'+topKab[0]+'</div><div class="ic-body">'+topKab[1].toLocaleString()+' benef unik ('+(uniqTotal?(topKab[1]/uniqTotal*100).toFixed(1):0)+'% dari total)</div></div>' +
    '<div class="insight-card"><div class="ic-title">Penyandang Disabilitas</div><div class="ic-stat">'+disabCount.toLocaleString()+'</div><div class="ic-body">'+(uniqTotal?(disabCount/uniqTotal*100).toFixed(1):0)+'% dari total beneficiary memiliki disabilitas</div></div>' +
    '<div class="insight-card"><div class="ic-title">Program Terbesar</div><div class="ic-stat">'+topProg[0]+'</div><div class="ic-body">'+topProg[1].toLocaleString()+' benef unik, biaya '+fmtShort(progCost[topProg[0]]||0)+'</div></div>' +
    '<div class="insight-card"><div class="ic-title">Jumlah Program</div><div class="ic-stat">'+Object.keys(progBenef).length+'</div><div class="ic-body">'+pjum.length.toLocaleString()+' transaksi PJUM tercatat</div></div>';

  /* 1. Stacked PJUM per program per bulan */
  var progSet = {};
  pjum.forEach(function(r){if(r[P.proyek]) progSet[r[P.proyek]]=1;});
  var programs = Object.keys(progSet).slice(0,8);
  var bulanSet = {};
  pjum.forEach(function(r){var bt=validTgl(r[P.tgl]); if(bt) bulanSet[bt]=1;});
  var allBulan = Object.keys(bulanSet).sort();
  var bLabels  = allBulan.map(function(k){var p=k.split('-');return bulanName(p[1])+"'"+p[0].slice(2);});
  var stackedDS = programs.map(function(prog,i){
    return {label:prog,data:allBulan.map(function(bln){
      return pjum.filter(function(r){return r[P.proyek]===prog && validTgl(r[P.tgl])===bln;})
                 .reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
    }),backgroundColor:PALETTE[i%PALETTE.length],borderRadius:2};
  });
  mkMultiBar('ach-pjum-stacked', bLabels, stackedDS, {yFmt:fmtShort, stacked:true});

  /* 2. Rasio gender per program — unique */
  var bProgSet={};
  benef.forEach(function(r){if(r[B.proyek]) bProgSet[r[B.proyek]]=1;});
  var progList = Object.keys(bProgSet).slice(0,10);
  var lData = progList.map(function(p){return countUniqBenef(benef.filter(function(r){return r[B.proyek]===p&&r[B.gender]==='L';}));});
  var pData = progList.map(function(p){return countUniqBenef(benef.filter(function(r){return r[B.proyek]===p&&r[B.gender]==='P';}));});
  mkMultiBar('ach-gender-prog', progList, [
    {label:'Laki-laki', data:lData, backgroundColor:'#4F8EF7', borderRadius:3},
    {label:'Perempuan', data:pData, backgroundColor:'#EF4444', borderRadius:3}
  ], {stacked:true});

  /* 3. Trend kategori benef per bulan (top 4) */
  var topKat = topN(groupCountUniq(benef,function(r){return r[B.kategori];}),4).map(function(x){return x[0];});
  var bBulanSet={};
  benef.forEach(function(r){var bbt=validTgl(r[B.tgl]); if(bbt) bBulanSet[bbt]=1;});
  var benefBulan = Object.keys(bBulanSet).sort();
  var bbLabels   = benefBulan.map(function(k){var p=k.split('-');return bulanName(p[1])+"'"+p[0].slice(2);});
  var katDS = topKat.map(function(kat,i){
    return {label:kat, data:benefBulan.map(function(bln){
      return countUniqBenef(benef.filter(function(r){return r[B.kategori]===kat&&validTgl(r[B.tgl])===bln;}));
    }),borderColor:PALETTE[i],backgroundColor:PALETTE[i]+'22',fill:false,tension:.35,pointRadius:3};
  });
  mkChart('ach-kategori-trend','line',bbLabels,katDS,{});

  /* 4. Staf compare: benef unik vs biaya PJUM */
  var topStafB = topN(groupCountUniq(benef,function(r){return r[B.staf];}),10);
  var stafNames = topStafB.map(function(x){return x[0];});
  var stafPjumD = stafNames.map(function(s){
    return pjum.filter(function(r){return r[P.staf]===s;}).reduce(function(acc,r){return acc+(parseFloat(r[P.jumlah])||0);},0);
  });
  mkMultiBar('ach-staf-compare', stafNames, [
    {label:'Benef Unik', data:topStafB.map(function(x){return x[1];}), backgroundColor:'#F97316', borderRadius:3, yAxisID:'y'},
    {label:'Biaya PJUM', data:stafPjumD, backgroundColor:'#4F8EF7', borderRadius:3, yAxisID:'y1'}
  ], {extra:{scales:{
    x:{ticks:{color:'#8A96B8',font:{size:11}},grid:{color:'#F0F2F8'}},
    y:{type:'linear',position:'left',ticks:{color:'#F97316',font:{size:11}},grid:{color:'#F0F2F8'}},
    y1:{type:'linear',position:'right',ticks:{color:'#4F8EF7',font:{size:11},callback:fmtShort},grid:{drawOnChartArea:false}}
  }}});

  /* 5. Komponen donut */
  var byKomp = topN(groupSum(pjum,function(r){return classifyItem(r[P.item]);},function(r){return r[P.jumlah];}),9);
  var kompTot = byKomp.reduce(function(s,x){return s+x[1];},0)||1;
  mkDonut('ach-komponen', byKomp.map(function(x){return x[0];}), byKomp.map(function(x){return x[1];}));
  var achLeg = document.getElementById('ach-komponen-legend');
  if (achLeg) achLeg.innerHTML = byKomp.map(function(x,i){
    return '<div class="dl-item"><div class="dl-dot" style="background:'+PALETTE[i%PALETTE.length]+'"></div>' +
      '<div class="dl-name">'+x[0]+'</div><div class="dl-pct">'+fmtShort(x[1])+' · '+(x[1]/kompTot*100).toFixed(1)+'%</div></div>';
  }).join('');

  /* 6. Efisiensi Rp/benef — unique */
  var efisi = Object.keys(progBenef).filter(function(p){return progCost[p];})
    .map(function(p){return {p:p, ratio:(progCost[p]||0)/(progBenef[p]||1)};})
    .sort(function(a,b){return a.ratio-b.ratio;}).slice(0,10);
  mkBarH('ach-efisiensi', efisi.map(function(e){return e.p;}), efisi.map(function(e){return e.ratio;}),
    efisi.map(function(_,i){return PALETTE[i%PALETTE.length];}), {label:'Rp/Benef Unik', yFmt:fmtShort});

  /* 7. Top kategori */
  var byKatAll = topN(groupCountUniq(benef,function(r){return r[B.kategori];}),12);
  mkBarH('ach-top-kategori', byKatAll.map(function(x){return x[0];}), byKatAll.map(function(x){return x[1];}),
    byKatAll.map(function(_,i){return PALETTE[i%PALETTE.length];}), {label:'Benef Unik'});

  /* 8. Benef per kabupaten */
  var byKabA = topN(groupCountUniq(benef,function(r){return r[B.kab];}),12);
  mkBarH('ach-kab', byKabA.map(function(x){return x[0];}), byKabA.map(function(x){return x[1];}), '#14B8A6', {label:'Benef Unik'});
}

/* ── Analitik PDF Export ── */
window.exportAnalitikPDF = function() {
  var benef = window.rawBenef, pjum = window.rawPjum;
  var B = window.B, P = window.P;
  var uniq = countUniqBenef(benef);
  var cost = pjum.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
  var gL = countUniqByGender(benef,'L'), gP = countUniqByGender(benef,'P');
  var progBenef = groupCountUniq(benef,function(r){return r[B.proyek];});
  var progCost = groupSum(pjum,function(r){return r[P.proyek];},function(r){return r[P.jumlah];});
  var efisiData = Object.keys(progBenef).filter(function(p){return progCost[p];})
    .map(function(p){return {p:p,b:progBenef[p],c:progCost[p]||0,r:(progCost[p]||0)/(progBenef[p]||1)};})
    .sort(function(a,b){return a.r-b.r;});

  buildPDF({
    title:'Laporan Analitik Mendalam', subtitle:'Yayasan Ayo Indonesia — Cross-Analysis', filterText:'Semua Data (Tanpa Filter)', filename:'Analitik_Report.pdf',
    kpis:[{label:'Benef Unik',value:uniq.toLocaleString()},{label:'L / P',value:gL+' / '+gP},{label:'Total PJUM',value:fmtShort(cost)},{label:'Rp/Benef',value:fmtShort(cost/uniq)}],
    sections:[
      {type:'heading',text:'Biaya PJUM per Program per Bulan'},{type:'chart',canvasId:'ach-pjum-stacked',height:55},
      {type:'heading',text:'Rasio Gender per Program'},{type:'chart',canvasId:'ach-gender-prog',height:55},
      {type:'heading',text:'Efisiensi Biaya per Program (Rp/Orang)'},
      {type:'table',head:['#','Program','Benef Unik','Total Biaya','Rp/Benef'],
        body:efisiData.map(function(e,i){return [i+1,e.p,e.b.toLocaleString(),fmtShort(e.c),fmtShort(e.r)];})},
      {type:'heading',text:'Perbandingan Staf: Benef vs Biaya'},{type:'chart',canvasId:'ach-staf-compare',height:55},
      {type:'heading',text:'Top Kategori Beneficiary'},{type:'chart',canvasId:'ach-top-kategori',height:55}
    ]
  });
};
