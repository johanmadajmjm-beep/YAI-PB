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

/* ── PJUM PDF Export ── */
window.exportPjumPDF = function() {
  var P = window.P;
  var d = window.APP.pjum.filtered;
  var total = d.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
  var progsS={},stafS={},kodeS={};
  d.forEach(function(r){
    if(r[P.proyek])progsS[r[P.proyek]]=1;
    if(r[P.staf])stafS[r[P.staf]]=1;
    if(r[P.kode])kodeS[r[P.kode]]=1;
  });

  var filterText = getFilterSummary([
    {label:'Program',val:v('pf-proyek')},{label:'Staf',val:v('pf-staf')},
    {label:'Kode',val:v('pf-kode')},{label:'Tahun',val:v('pf-tahun')},
    {label:'Bulan',val:v('pf-bulan')?bulanName(v('pf-bulan')):''}
  ]);

  var byProg = topN(groupSum(d,function(r){return r[P.proyek];},function(r){return r[P.jumlah];}),10);
  var byStaf = topN(groupSum(d,function(r){return r[P.staf];},function(r){return r[P.jumlah];}),10);
  var byKomp = topN(groupSum(d,function(r){return classifyItem(r[P.item]);},function(r){return r[P.jumlah];}),10);
  var topProg=byProg[0]||['—',0], topStaf=byStaf[0]||['—',0], topKomp=byKomp[0]||['—',0];
  var avgTrx = d.length > 0 ? total/d.length : 0;

  buildPDF({
    title:'Laporan Penggunaan Dana (PJUM)', subtitle:'Yayasan Ayo Indonesia', filterText:filterText, filename:'PJUM_Report.pdf',
    narrative:[
      {heading:'Ringkasan Penggunaan Dana'},
      {text:'Total pengeluaran PJUM yang tercatat dalam periode ini adalah '+fmt(total)+' dari '+d.length.toLocaleString()+' transaksi. Dana tersebut dikelola oleh '+Object.keys(stafS).length+' staf untuk '+Object.keys(progsS).length+' program. Rata-rata nilai per transaksi adalah '+fmtShort(avgTrx)+'.'},
      {heading:'Distribusi per Program'},
      {text:'Program dengan pengeluaran terbesar adalah "'+topProg[0]+'" sebesar '+fmt(topProg[1])+' ('+(total?(topProg[1]/total*100).toFixed(1):0)+'% dari total). '+byProg.slice(1,3).map(function(x){return '"'+x[0]+'" ('+fmtShort(x[1])+')';}).join(' dan ')+' menempati posisi berikutnya.'},
      {heading:'Distribusi per Staf'},
      {text:'Staf dengan total pengeluaran terbesar adalah '+topStaf[0]+' dengan '+fmt(topStaf[1])+' ('+(total?(topStaf[1]/total*100).toFixed(1):0)+'%). Rincian lengkap per staf tersedia pada lampiran.'},
      {heading:'Komponen Biaya'},
      {text:'Komponen pengeluaran terbesar adalah "'+topKomp[0]+'" sebesar '+fmt(topKomp[1])+' ('+(total?(topKomp[1]/total*100).toFixed(1):0)+'%). Hal ini menunjukkan bahwa sebagian besar dana digunakan untuk keperluan '+topKomp[0].toLowerCase()+'.'}
    ],
    lampiran:[
      {heading:'Tabel A1: Per Program'},{table:{head:['#','Program','Total Biaya','%'],body:byProg.map(function(x,i){return [i+1,x[0],fmt(x[1]),(total?(x[1]/total*100).toFixed(1):0)+'%'];})}},
      {heading:'Tabel A2: Per Staf'},{table:{head:['#','Staf','Total Biaya','%'],body:byStaf.map(function(x,i){return [i+1,x[0],fmt(x[1]),(total?(x[1]/total*100).toFixed(1):0)+'%'];})}},
      {heading:'Tabel A3: Per Komponen'},{table:{head:['#','Komponen','Total Biaya','%'],body:byKomp.map(function(x,i){return [i+1,x[0],fmt(x[1]),(total?(x[1]/total*100).toFixed(1):0)+'%'];})}},
      {heading:'Grafik B1: Trend Pengeluaran'},{chart:{canvasId:'pch-trend',height:55}},
      {heading:'Grafik B2: Per Program'},{chart:{canvasId:'pch-proyek',height:55}}
    ]
  });
};
