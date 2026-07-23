/* ═══════════════════════════════════════════════
   pjum.js — PJUM page + cascading filter
═══════════════════════════════════════════════ */

function buildPjumPage() {
  populatePjumFilters(null);

  var fids = ['pf-proyek','pf-staf','pf-kode','pf-tahun','pf-bulan'];
  fids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', function() {
      refreshPjumFilters(id);
      applyPjumFilter();
    });
  });

  var cari = document.getElementById('pf-cari');
  if (cari) cari.addEventListener('input', applyPjumFilter);

  var rb = document.getElementById('pf-reset');
  if (rb) rb.addEventListener('click', function() {
    fids.forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
    var c=document.getElementById('pf-cari');if(c)c.value='';
    populatePjumFilters(null);
    applyPjumFilter();
  });

  applyPjumFilter();
}

/* ── filterPjumRow: satu fungsi filter konsisten ── */
function filterPjumRow(r, opts) {
  var P = window.P;
  var proyekKey = opts.proyek ? normKey(opts.proyek) : '';
  var stafKey   = opts.staf   ? normStafKey(opts.staf) : '';

  if (proyekKey && normKey(r[P.proyek])   !== proyekKey) return false;
  if (stafKey   && normStafKey(r[P.staf]) !== stafKey)   return false;
  if (opts.kode && r[P.kode] !== opts.kode) return false;

  if (opts.tahun || opts.bulan) {
    var tgl = validTgl(r[P.tgl]);
    if (opts.tahun === '__blank__') {
      if (tgl) return false;
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
    if ((r[P.kegiatan]||'').toLowerCase().indexOf(q)<0 &&
        (r[P.item]    ||'').toLowerCase().indexOf(q)<0 &&
        (r[P.staf]    ||'').toLowerCase().indexOf(q)<0 &&
        (r[P.proyek]  ||'').toLowerCase().indexOf(q)<0 &&
        (r[P.kode]    ||'').toLowerCase().indexOf(q)<0) return false;
  }
  return true;
}

function getCurrentPjumOpts(skipField) {
  return {
    proyek: skipField==='proyek' ? '' : v('pf-proyek'),
    staf:   skipField==='staf'   ? '' : v('pf-staf'),
    kode:   skipField==='kode'   ? '' : v('pf-kode'),
    tahun:  skipField==='tahun'  ? '' : v('pf-tahun'),
    bulan:  skipField==='bulan'  ? '' : v('pf-bulan'),
    cari:   ''
  };
}

function getFilteredPjum(skipField) {
  var opts = getCurrentPjumOpts(skipField);
  return window.rawPjum.filter(function(r){return filterPjumRow(r,opts);});
}

function refreshPjumFilters(skipId) {
  var P = window.P;

  /* Program */
  if (skipId !== 'pf-proyek') {
    var cur=v('pf-proyek');
    populateSel('pf-proyek', dedupProgram(getFilteredPjum('proyek').map(function(r){return r[P.proyek];})));
    document.getElementById('pf-proyek').value=cur;
  }

  /* Staf */
  if (skipId !== 'pf-staf') {
    var curS=v('pf-staf');
    populateSel('pf-staf', dedupStaf(getFilteredPjum('staf').map(function(r){return r[P.staf];})));
    document.getElementById('pf-staf').value=curS;
  }

  /* Kode */
  if (skipId !== 'pf-kode') {
    var curK=v('pf-kode');
    populateSel('pf-kode', uniqArr(getFilteredPjum('kode').map(function(r){return r[P.kode];})));
    document.getElementById('pf-kode').value=curK;
  }

  /* Tahun */
  if (skipId !== 'pf-tahun') {
    var curT=v('pf-tahun');
    var tahunSet={}, hasBlank=false;
    getFilteredPjum('tahun').forEach(function(r){
      var t=validTgl(r[P.tgl]);
      if(t) tahunSet[t.slice(0,4)]=1; else hasBlank=true;
    });
    var allT=Object.keys(tahunSet).sort().reverse();
    if(hasBlank) allT.push('__blank__');
    populateSel('pf-tahun',allT,function(x){return x==='__blank__'?'(Tanggal Kosong)':x;});
    document.getElementById('pf-tahun').value=curT;
  }

  /* Bulan */
  if (skipId !== 'pf-bulan') {
    var curB=v('pf-bulan');
    var bulanSet={}, hasBlankB=false;
    getFilteredPjum('bulan').forEach(function(r){
      var t=validTgl(r[P.tgl]);
      if(t) bulanSet[t.slice(5,7)]=1; else hasBlankB=true;
    });
    var allB=Object.keys(bulanSet).sort();
    if(hasBlankB) allB.push('__blank__');
    populateSel('pf-bulan',allB,function(x){return x==='__blank__'?'(Tanggal Kosong)':bulanName(x);});
    document.getElementById('pf-bulan').value=curB;
  }
}

function populatePjumFilters(skipId) { refreshPjumFilters(skipId); }

function applyPjumFilter() {
  var opts = getCurrentPjumOpts(null);
  opts.cari = v('pf-cari').toLowerCase().trim();

  window.APP.pjum.filtered = window.rawPjum.filter(function(r){return filterPjumRow(r,opts);});
  window.APP.pjum.page = 0;
  renderPjumStats();
  renderPjumCharts();
  renderPjumTable();
}

function renderPjumStats() {
  var P=window.P, d=window.APP.pjum.filtered;
  var total=d.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
  var progsS={},stafS={},kodeS={},fileS={};
  d.forEach(function(r){
    if(r[P.proyek]) progsS[r[P.proyek]]=1;
    if(r[P.staf])   stafS[r[P.staf]]=1;
    if(r[P.kode])   kodeS[r[P.kode]]=1;
    if(r[P.file])   fileS[r[P.file]]=1;
  });
  setCard('pstat-total',fmtShort(total),fmt(total));
  setCard('pstat-trx',d.length.toLocaleString(),'item pengeluaran');
  setCard('pstat-prog',Object.keys(progsS).length.toLocaleString(),Object.keys(kodeS).length+' kode kegiatan');
  setCard('pstat-staf',Object.keys(stafS).length.toLocaleString(),Object.keys(fileS).length+' file terupload');
}

function renderPjumCharts() {
  var P=window.P, d=window.APP.pjum.filtered;

  var byBulan=sortedBulan(groupSum(d,function(r){return validTgl(r[P.tgl]);},function(r){return r[P.jumlah];}));

  var noTglEl = document.getElementById('pch-trend-notgl');
  var wrapEl  = document.getElementById('pch-trend') ? document.getElementById('pch-trend').parentElement : null;
  if (byBulan.length === 0) {
    var cv = document.getElementById('pch-trend'); if(cv) cv.style.display='none';
    if (!noTglEl && wrapEl) {
      var msg=document.createElement('div');
      msg.id='pch-trend-notgl';
      msg.style.cssText='display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:12px;flex-direction:column;gap:6px';
      msg.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>Data tanggal tidak tersedia untuk filter ini</span>';
      wrapEl.appendChild(msg);
    } else if(noTglEl) { noTglEl.style.display='flex'; }
  } else {
    var cv2=document.getElementById('pch-trend'); if(cv2) cv2.style.display='';
    if(noTglEl) noTglEl.style.display='none';
    mkLine('pch-trend',
      byBulan.map(function(x){var p=x[0].split('-');return bulanName(p[1])+"'"+p[0].slice(2);}),
      byBulan.map(function(x){return x[1];}),
      '#F97316',{label:'Pengeluaran',yFmt:fmtShort,noLegend:true});
  }

  var byKomp=topN(groupSum(d,function(r){return classifyItem(r[P.item]);},function(r){return r[P.jumlah];}),9);
  var kompTotal=byKomp.reduce(function(s,x){return s+x[1];},0);
  mkDonut('pch-komponen',byKomp.map(function(x){return x[0];}),byKomp.map(function(x){return x[1];}));
  renderDonutLegendPjum('pch-komponen-legend',byKomp,kompTotal);

  var byP=topN(groupSum(d,function(r){return r[P.proyek];},function(r){return r[P.jumlah];}),10);
  mkBarH('pch-proyek',byP.map(function(x){return x[0];}),byP.map(function(x){return x[1];}),PALETTE[0],{label:'Biaya',yFmt:fmtShort});

  var byS=topN(groupSum(d,function(r){return r[P.staf];},function(r){return r[P.jumlah];}),10);
  mkBarH('pch-staf',byS.map(function(x){return x[0];}),byS.map(function(x){return x[1];}), '#22C55E',{label:'Biaya',yFmt:fmtShort});

  var byK=topN(groupSum(d,function(r){return r[P.kode];},function(r){return r[P.jumlah];}),10);
  mkBarH('pch-kode',byK.map(function(x){return x[0];}),byK.map(function(x){return x[1];}), '#8B5CF6',{label:'Biaya',yFmt:fmtShort});

  var byKeg=topN(groupSum(d,function(r){return r[P.kegiatan];},function(r){return r[P.jumlah];}),8);
  mkBarH('pch-kegiatan',byKeg.map(function(x){return x[0];}),byKeg.map(function(x){return x[1];}), '#14B8A6',{label:'Biaya',yFmt:fmtShort});

  var qs=document.getElementById('pjum-quick-stats');
  if(qs){
    var tot=d.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
    var items=[
      ['Rata-rata per Transaksi', d.length?fmtShort(tot/d.length):'—'],
      ['Transaksi Terbesar', d.length?fmtShort(Math.max.apply(null,d.map(function(r){return parseFloat(r[P.jumlah])||0;}))):'—'],
      ['Program Terbanyak Biaya', byP[0]?byP[0][0]:'—'],
      ['Staf Terbanyak Biaya',    byS[0]?byS[0][0]:'—'],
    ];
    qs.innerHTML=items.map(function(x){
      return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">'+
        '<span style="color:var(--text2);font-size:12px">'+x[0]+'</span>'+
        '<span style="font-weight:700;font-size:12px">'+x[1]+'</span></div>';
    }).join('');
  }
}

function renderDonutLegendPjum(id,entries,total){
  var el=document.getElementById(id); if(!el) return;
  el.innerHTML=entries.map(function(x,i){
    return '<div class="dl-item">'+
      '<div class="dl-dot" style="background:'+PALETTE[i%PALETTE.length]+'"></div>'+
      '<div class="dl-name">'+x[0]+'</div>'+
      '<div class="dl-pct">'+(total?(x[1]/total*100).toFixed(1):0)+'%</div></div>';
  }).join('');
}

function renderPjumTable() {
  var P=window.P;
  var q=(document.getElementById('pjum-tbl-search')?document.getElementById('pjum-tbl-search').value:'').toLowerCase().trim();
  var rows=window.APP.pjum.filtered;
  if(q) rows=rows.filter(function(r){
    return (r[P.kegiatan]||'').toLowerCase().indexOf(q)>-1||
           (r[P.item]    ||'').toLowerCase().indexOf(q)>-1||
           (r[P.staf]    ||'').toLowerCase().indexOf(q)>-1||
           (r[P.proyek]  ||'').toLowerCase().indexOf(q)>-1||
           (r[P.kode]    ||'').toLowerCase().indexOf(q)>-1;
  });
  var total=rows.length, start=window.APP.pjum.page*window.APP.PG_SIZE;
  var slice=rows.slice(start,start+window.APP.PG_SIZE);
  var totalBiaya=rows.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
  setEl('pjum-tbl-count',total.toLocaleString()+' baris · '+fmtShort(totalBiaya));
  setEl('pjum-pg-info',(start+1).toLocaleString()+'–'+Math.min(start+window.APP.PG_SIZE,total).toLocaleString()+' dari '+total.toLocaleString());
  var pb=document.getElementById('pjum-pg-prev'), nb=document.getElementById('pjum-pg-next');
  if(pb) pb.disabled=window.APP.pjum.page===0;
  if(nb) nb.disabled=start+window.APP.PG_SIZE>=total;
  var tbody=document.getElementById('pjum-tbl-body'); if(!tbody) return;
  tbody.innerHTML=slice.length?slice.map(function(r){
    return '<tr>'+
      '<td class="mono">'+(r[P.tgl]||'—')+'</td>'+
      '<td>'+(r[P.staf]||'—')+'</td>'+
      '<td>'+(r[P.proyek]||'—')+'</td>'+
      '<td class="mono">'+(r[P.kode]||'—')+'</td>'+
      '<td>'+(r[P.kegiatan]||'—')+'</td>'+
      '<td>'+(r[P.item]||'—')+'</td>'+
      '<td>'+classifyItem(r[P.item])+'</td>'+
      '<td class="num">'+fmt(parseFloat(r[P.jumlah])||0)+'</td>'+
      '<td class="mono" style="font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis" title="'+(r[P.file]||'')+'">'+(r[P.file]||'—')+'</td>'+
    '</tr>';
  }).join(''):'<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text3)">Tidak ada data</td></tr>';
}

window.changePjumPage=function(dir){
  window.APP.pjum.page=Math.max(0,window.APP.pjum.page+dir);
  renderPjumTable();
};

/* ══════════════════════════════════════════════════
   PJUM PDF — Laporan Keuangan Lengkap
══════════════════════════════════════════════════ */
window.exportPjumPDF = function() {
  var P = window.P;
  var d = window.APP.pjum.filtered;
  var total = d.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
  var per = dataPeriod(d, P.tgl);

  var progS={},stafS={},kodeS={},fileS={},kegS={};
  d.forEach(function(r){
    if(r[P.proyek])progS[r[P.proyek]]=1; if(r[P.staf])stafS[r[P.staf]]=1;
    if(r[P.kode])kodeS[r[P.kode]]=1; if(r[P.file])fileS[r[P.file]]=1;
    if(r[P.kegiatan])kegS[r[P.kegiatan]]=1;
  });

  var byProg = topN(groupSum(d,function(r){return r[P.proyek];},function(r){return r[P.jumlah];}),20);
  var byStaf = topN(groupSum(d,function(r){return r[P.staf];},function(r){return r[P.jumlah];}),20);
  var byKomp = topN(groupSum(d,function(r){return classifyItem(r[P.item]);},function(r){return r[P.jumlah];}),15);
  var byKode = topN(groupSum(d,function(r){return r[P.kode];},function(r){return r[P.jumlah];}),20);
  var byKeg  = topN(groupSum(d,function(r){return r[P.kegiatan];},function(r){return r[P.jumlah];}),20);
  var peakP = peakMonths(d, P.tgl, 'sum', P.jumlah);

  /* Rekap tahunan */
  var years = getYears(d, P.tgl);
  var yearly = calcGrowth(years.map(function(y){
    var rows = d.filter(function(r){var t=validTgl(r[P.tgl]);return t&&t.slice(0,4)===y;});
    var c = rows.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
    var pr={},st={},fl={};
    rows.forEach(function(r){if(r[P.proyek])pr[r[P.proyek]]=1;if(r[P.staf])st[r[P.staf]]=1;if(r[P.file])fl[r[P.file]]=1;});
    return {tahun:y, biaya:c, trx:rows.length, program:Object.keys(pr).length,
      staf:Object.keys(st).length, file:Object.keys(fl).length,
      avgTrx: rows.length>0?c/rows.length:0};
  }),'biaya');

  /* Komponen per tahun */
  var kompNames = byKomp.slice(0,6).map(function(x){return x[0];});
  var kompYear = years.map(function(y){
    var rows = d.filter(function(r){var t=validTgl(r[P.tgl]);return t&&t.slice(0,4)===y;});
    var row = {tahun:y};
    kompNames.forEach(function(k){
      row[k] = rows.filter(function(r){return classifyItem(r[P.item])===k;})
                   .reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
    });
    return row;
  });

  /* Statistik transaksi */
  var vals = d.map(function(r){return parseFloat(r[P.jumlah])||0;}).filter(function(x){return x>0;}).sort(function(a,b){return a-b;});
  var median = vals.length ? (vals.length%2 ? vals[(vals.length-1)/2] : (vals[vals.length/2-1]+vals[vals.length/2])/2) : 0;
  var maxTrx = vals.length ? vals[vals.length-1] : 0;
  var minTrx = vals.length ? vals[0] : 0;

  var completeP = columnCompleteness(d, [
    {idx:P.tgl,label:'Tanggal',isDate:true},{idx:P.staf,label:'Staf'},{idx:P.proyek,label:'Program'},
    {idx:P.kode,label:'Kode Kegiatan'},{idx:P.kegiatan,label:'Nama Kegiatan'},
    {idx:P.item,label:'Item Pengeluaran'},{idx:P.jumlah,label:'Jumlah'},{idx:P.file,label:'File Sumber'}
  ]);

  var anomali = detectAnomalies([], d);
  var filterText = getFilterSummary([
    {label:'Program',val:v('pf-proyek')},{label:'Staf',val:v('pf-staf')},
    {label:'Kode',val:v('pf-kode')},{label:'Tahun',val:v('pf-tahun')},
    {label:'Bulan',val:v('pf-bulan')?bulanName(v('pf-bulan')):''}
  ]);

  var topProg=byProg[0]||['—',0], topStaf=byStaf[0]||['—',0], topKomp=byKomp[0]||['—',0];
  var concProg = concentrationIndex(byProg.map(function(x){return x[1];}));
  var concStaf = concentrationIndex(byStaf.map(function(x){return x[1];}));
  var avgTrx = d.length>0 ? total/d.length : 0;

  buildPDF({
    title:'Laporan Penggunaan Dana', subtitle:'Yayasan Ayo Indonesia — PJUM',
    filterText:filterText, filename:'Laporan_PJUM.pdf',
    meta:{ periode: per?fmtPeriod(per.start)+' – '+fmtPeriod(per.end):'Tidak tersedia',
           sumber:'Google Sheets YAI — Sheet PJUM' },
    body:[
      {section:'I. Ringkasan Eksekutif'},
      {text:'Laporan ini menyajikan analisis penggunaan dana berdasarkan dokumen Pertanggungjawaban Uang Muka (PJUM)'+(per?' pada periode '+fmtPeriod(per.start)+' hingga '+fmtPeriod(per.end):'')+'.'},
      {text:'Total dana yang tersalurkan mencapai '+fmt(total)+' melalui '+d.length.toLocaleString()+' transaksi yang terekam dalam '+Object.keys(fileS).length+' dokumen PJUM. Dana dikelola oleh '+Object.keys(stafS).length+' staf untuk membiayai '+Object.keys(progS).length+' program dan '+Object.keys(kegS).length+' jenis kegiatan.'},
      {kv:[
        ['Total Dana Tersalurkan', fmt(total)],
        ['Jumlah Transaksi', d.length.toLocaleString()],
        ['Dokumen PJUM', Object.keys(fileS).length.toLocaleString()+' file'],
        ['Rata-rata per Transaksi', fmt(avgTrx)],
        ['Median Transaksi', fmt(median)],
        ['Transaksi Terbesar', fmt(maxTrx)],
        ['Transaksi Terkecil', fmt(minTrx)],
        ['Jumlah Program', Object.keys(progS).length.toString()],
        ['Jumlah Staf', Object.keys(stafS).length.toString()],
        ['Kode Kegiatan (RAB)', Object.keys(kodeS).length.toString()]
      ]},
      {callout:'Rata-rata nilai transaksi '+fmt(avgTrx)+' dengan median '+fmt(median)+'. '+(avgTrx>median*1.5?'Selisih yang cukup besar antara rata-rata dan median menunjukkan adanya beberapa transaksi bernilai sangat besar yang menarik rata-rata ke atas.':'Rata-rata dan median relatif berdekatan, menunjukkan distribusi nilai transaksi yang cukup merata.')},

      {section:'II. Analisis Temporal'},
      {text: yearly.length ? 'Realisasi anggaran dari tahun ke tahun. '+describeTrend(yearly,'biaya') : 'Data temporal tidak tersedia.'},
      yearly.length ? {table:{title:'Tabel 2.1 — Realisasi Anggaran per Tahun',
        head:['Tahun','Total Biaya','Δ%','Transaksi','Rata-rata/Trx','Program','Staf','File'],
        body:yearly.map(function(r){return [r.tahun,fmt(r.biaya),
          r.growth===null?'—':(r.growth>=0?'+':'')+r.growth.toFixed(1)+'%',
          r.trx.toLocaleString(),fmtShort(r.avgTrx),r.program,r.staf,r.file];})}} : {spacer:0},
      peakP ? {text:'Bulan dengan realisasi tertinggi adalah '+fmtPeriod(peakP.top[0])+' sebesar '+fmt(peakP.top[1])+', dan terendah pada '+fmtPeriod(peakP.bottom[0])+' sebesar '+fmt(peakP.bottom[1])+'. Rata-rata pengeluaran bulanan '+fmt(peakP.avg)+'.'} : {spacer:0},
      {chart:{canvasId:'pch-trend', height:52, title:'Grafik 2.1 — Tren Pengeluaran per Bulan'}},

      {section:'III. Analisis per Program'},
      {text: byProg.length ? 'Program dengan realisasi terbesar adalah "'+topProg[0]+'" sebesar '+fmt(topProg[1])+' ('+(total?(topProg[1]/total*100).toFixed(1):0)+'% dari total)'+(byProg.length>1?', diikuti "'+byProg[1][0]+'" ('+fmtShort(byProg[1][1])+')':'')+(byProg.length>2?' dan "'+byProg[2][0]+'" ('+fmtShort(byProg[2][1])+')':'')+'.' : ''},
      {text:'Indeks konsentrasi anggaran antar program adalah '+concProg.toFixed(1)+'/100, menunjukkan alokasi yang '+(concProg>50?'terkonsentrasi pada sedikit program':concProg>25?'cukup terdistribusi dengan beberapa program dominan':'tersebar merata antar program')+'.'},
      {table:{title:'Tabel 3.1 — Realisasi per Program',
        head:['#','Program','Total Biaya','% Total','Transaksi','Rata-rata/Trx'],
        body:byProg.map(function(x,i){
          var n=d.filter(function(r){return r[P.proyek]===x[0];}).length;
          return [i+1,x[0],fmt(x[1]),(total?(x[1]/total*100).toFixed(1):0)+'%',n,fmtShort(n>0?x[1]/n:0)];
        })}},
      {chart:{canvasId:'pch-proyek', height:55, title:'Grafik 3.1 — Realisasi per Program'}},

      {section:'IV. Struktur Komponen Biaya'},
      {text: byKomp.length ? 'Komponen pengeluaran terbesar adalah "'+topKomp[0]+'" sebesar '+fmt(topKomp[1])+' ('+(total?(topKomp[1]/total*100).toFixed(1):0)+'% dari total). Struktur ini menunjukkan bahwa alokasi terbesar diarahkan pada '+topKomp[0].toLowerCase()+'.' : ''},
      {table:{title:'Tabel 4.1 — Komponen Biaya',
        head:['#','Komponen','Total Biaya','% Total','Transaksi'],
        body:byKomp.map(function(x,i){
          var n=d.filter(function(r){return classifyItem(r[P.item])===x[0];}).length;
          return [i+1,x[0],fmt(x[1]),(total?(x[1]/total*100).toFixed(1):0)+'%',n.toLocaleString()];
        })}},
      kompYear.length>1 ? {heading:'4.1 Perkembangan Komponen per Tahun'} : {spacer:0},
      kompYear.length>1 ? {table:{title:'Tabel 4.2 — Komponen Biaya per Tahun',
        head:['Tahun'].concat(kompNames),
        body:kompYear.map(function(r){return [r.tahun].concat(kompNames.map(function(k){return fmtShort(r[k]||0);}));})}} : {spacer:0},

      {section:'V. Analisis per Staf'},
      {text: byStaf.length ? 'Staf dengan pengelolaan dana terbesar adalah '+topStaf[0]+' sebesar '+fmt(topStaf[1])+' ('+(total?(topStaf[1]/total*100).toFixed(1):0)+'%). Indeks konsentrasi antar staf '+concStaf.toFixed(1)+'/100, menunjukkan '+(concStaf>50?'beban pengelolaan terpusat pada sedikit staf':'beban pengelolaan cukup terdistribusi')+'.' : ''},
      {table:{title:'Tabel 5.1 — Realisasi per Staf',
        head:['#','Staf','Total Biaya','% Total','Transaksi','Rata-rata/Trx'],
        body:byStaf.map(function(x,i){
          var n=d.filter(function(r){return r[P.staf]===x[0];}).length;
          return [i+1,x[0],fmt(x[1]),(total?(x[1]/total*100).toFixed(1):0)+'%',n.toLocaleString(),fmtShort(n>0?x[1]/n:0)];
        })}},
      {chart:{canvasId:'pch-staf', height:55, title:'Grafik 5.1 — Realisasi per Staf'}},

      {section:'VI. Kode Kegiatan (RAB)'},
      {text: byKode.length ? 'Terdapat '+Object.keys(kodeS).length+' kode kegiatan berbeda. Kode dengan realisasi terbesar adalah "'+byKode[0][0]+'" sebesar '+fmt(byKode[0][1])+' ('+(total?(byKode[0][1]/total*100).toFixed(1):0)+'%). Rincian lengkap pada Lampiran Tabel A1.' : 'Data kode kegiatan belum tersedia.'},
      {chart:{canvasId:'pch-kode', height:55, title:'Grafik 6.1 — Realisasi per Kode Kegiatan'}},

      {section:'VII. Kualitas Data'},
      {text:'Penilaian kelengkapan data PJUM yang menjadi dasar laporan ini.'},
      {table:{title:'Tabel 7.1 — Kelengkapan Kolom',
        head:['Kolom','Terisi','Kosong','% Lengkap'],
        body:completeP.map(function(c){return [c.nama,c.terisi.toLocaleString(),c.kosong.toLocaleString(),c.pct.toFixed(1)+'%'];})}},
      anomali.length ? {table:{title:'Tabel 7.2 — Anomali Terdeteksi',
        head:['Jenis','Jumlah','Keterangan'],
        body:anomali.map(function(a){return [a.jenis,a.jml.toLocaleString(),a.ket];})}} : {text:'Tidak ditemukan anomali signifikan.'},

      {section:'VIII. Kesimpulan'},
      {text:'Total realisasi '+fmt(total)+' melalui '+d.length.toLocaleString()+' transaksi. '+(yearly.length?describeTrend(yearly,'biaya'):'')},
      {bullet:'Konsentrasi program: '+concProg.toFixed(0)+'/100 — '+(concProg>50?'alokasi terpusat, perlu evaluasi pemerataan':'alokasi sudah cukup terdistribusi')},
      {bullet:'Konsentrasi staf: '+concStaf.toFixed(0)+'/100 — '+(concStaf>50?'beban pengelolaan terpusat':'beban terdistribusi baik')},
      {bullet:'Komponen dominan: '+topKomp[0]+' ('+(total?(topKomp[1]/total*100).toFixed(1):0)+'% dari total)'},
      {bullet:'Rata-rata transaksi '+fmt(avgTrx)+', median '+fmt(median)}
    ],
    lampiran:[
      {table:{title:'Tabel A1 — Realisasi per Kode Kegiatan',
        head:['#','Kode','Total Biaya','% Total'],
        body:byKode.map(function(x,i){return [i+1,x[0],fmt(x[1]),(total?(x[1]/total*100).toFixed(2):0)+'%'];})}},
      {table:{title:'Tabel A2 — Realisasi per Nama Kegiatan',
        head:['#','Kegiatan','Total Biaya','% Total'],
        body:byKeg.map(function(x,i){return [i+1,x[0],fmt(x[1]),(total?(x[1]/total*100).toFixed(2):0)+'%'];})}},
      {chart:{canvasId:'pch-kegiatan', height:55, title:'Grafik A1 — Realisasi per Nama Kegiatan'}}
    ],
    metodologi: stdMetodologi([
      'Komponen biaya diklasifikasikan otomatis berdasarkan kata kunci pada kolom item pengeluaran. Item yang tidak cocok dengan kata kunci mana pun masuk kategori "Lainnya".',
      'Median transaksi dihitung dari transaksi bernilai lebih dari nol.',
      'Indeks konsentrasi menggunakan HHI ternormalisasi (0–100). Nilai tinggi berarti alokasi terpusat pada sedikit entitas.'
    ])
  });
};
