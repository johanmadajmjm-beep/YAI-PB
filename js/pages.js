/* ═══════════════════════════════════════════════
   pages.js — Wilayah + Analitik pages
═══════════════════════════════════════════════ */

/* ══════════════════ WILAYAH ══════════════════ */
function buildWilayahPage(){refreshWilayahFilters(null);['wf-proyek','wf-tahun'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('change',function(){refreshWilayahFilters(id);applyWilayahFilter();});});var rb=document.getElementById('wf-reset');if(rb)rb.addEventListener('click',function(){['wf-proyek','wf-tahun'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});refreshWilayahFilters(null);applyWilayahFilter();});applyWilayahFilter();}
function getFilteredWilayah(sf){var B=window.B,p=sf!=='proyek'?v('wf-proyek'):'',t=sf!=='tahun'?v('wf-tahun'):'';return window.rawBenef.filter(function(r){if(p&&r[B.proyek]!==p)return false;var tv=validTgl(r[B.tgl]);if(t==='__blank__'&&tv)return false;if(t&&t!=='__blank__'&&(!tv||!tv.startsWith(t)))return false;return true;});}
function refreshWilayahFilters(si){var B=window.B;if(si!=='wf-proyek'){var c=v('wf-proyek');populateSel('wf-proyek',uniqArr(getFilteredWilayah('proyek').map(function(r){return r[B.proyek];})));document.getElementById('wf-proyek').value=c;}if(si!=='wf-tahun'){var c2=v('wf-tahun'),d2=getFilteredWilayah('tahun'),ts={},hb=false;d2.forEach(function(r){var t=validTgl(r[B.tgl]);if(t)ts[t.slice(0,4)]=1;else hb=true;});var at=Object.keys(ts).sort().reverse();if(hb)at.push('__blank__');populateSel('wf-tahun',at,function(v){return v==='__blank__'?'(Tanggal Kosong)':v;});document.getElementById('wf-tahun').value=c2;}}
function applyWilayahFilter(){var B=window.B,p=v('wf-proyek'),t=v('wf-tahun');window.APP.wilayah.filtered=window.rawBenef.filter(function(r){if(p&&r[B.proyek]!==p)return false;var tv=validTgl(r[B.tgl]);if(t==='__blank__'&&tv)return false;if(t&&t!=='__blank__'&&(!tv||!tv.startsWith(t)))return false;return true;});window.APP.wilayah.page=0;renderWilayahAll();}
function renderWilayahAll(){var B=window.B,d=window.APP.wilayah.filtered;var kabS={},kecS={},desaS={};d.forEach(function(r){if(r[B.kab])kabS[r[B.kab]]=1;if(r[B.kec])kecS[r[B.kec]]=1;if(r[B.desa])desaS[r[B.desa]]=1;});var ut=countUniqBenef(d);setEl('wstat-kab',Object.keys(kabS).length.toLocaleString());setEl('wstat-kec',Object.keys(kecS).length.toLocaleString());setEl('wstat-desa',Object.keys(desaS).length.toLocaleString());setEl('wstat-tot',ut.toLocaleString());
var bk=topN(groupCountUniq(d,function(r){return r[B.kab];}),15);mkBarH('wch-kab',bk.map(function(x){return x[0];}),bk.map(function(x){return x[1];}),bk.map(function(_,i){return PALETTE[i%PALETTE.length];}),{label:'Benef Unik'});
var bc=topN(groupCountUniq(d,function(r){return r[B.kec];}),15);mkBarH('wch-kec',bc.map(function(x){return x[0];}),bc.map(function(x){return x[1];}),'#F97316',{label:'Benef Unik'});
var bd=topN(groupCountUniq(d,function(r){return r[B.desa];}),15);mkBarH('wch-desa',bd.map(function(x){return x[0];}),bd.map(function(x){return x[1];}),'#8B5CF6',{label:'Benef Unik'});
var bp=topN(groupCountUniq(d,function(r){return r[B.proyek];}),10);mkBarH('wch-prog',bp.map(function(x){return x[0];}),bp.map(function(x){return x[1];}),'#22C55E',{label:'Benef Unik'});
var gM={'L':'Laki-laki','P':'Perempuan','—':'Lainnya'},byG=groupCountUniq(d,function(r){return gM[r[B.gender]]||'Lainnya';}),gK=Object.keys(byG),gC={'Laki-laki':'#4F8EF7','Perempuan':'#EF4444','Lainnya':'#8A96B8'};mkDonut('wch-gender',gK,gK.map(function(k){return byG[k];}),gK.map(function(k){return gC[k]||'#8A96B8';}));
var wg=document.getElementById('wch-gender-legend');if(wg)wg.innerHTML=gK.map(function(k,i){return '<div class="dl-item"><div class="dl-dot" style="background:'+(gC[k]||PALETTE[i])+'"></div><div class="dl-name">'+k+'</div><div class="dl-pct">'+(ut?(byG[k]/ut*100).toFixed(1):0)+'%</div></div>';}).join('');
renderWilayahTable();}
function renderWilayahTable(){var B=window.B,d=window.APP.wilayah.filtered;var bd=topN(groupCountUniq(d,function(r){return r[B.desa];}),200),dt=bd.reduce(function(s,x){return s+x[1];},0)||1,st=window.APP.wilayah.page*20,sl=bd.slice(st,st+20),lu={};d.forEach(function(r){if(r[B.desa]&&!lu[r[B.desa]])lu[r[B.desa]]={kec:r[B.kec],kab:r[B.kab]};});var tb=document.getElementById('wilayah-tbl-body');if(!tb)return;tb.innerHTML=sl.length?sl.map(function(x,i){var inf=lu[x[0]]||{},pc=bd[0]?x[1]/bd[0][1]*100:0;return '<tr><td>'+(st+i+1)+'</td><td><strong>'+x[0]+'</strong></td><td>'+(inf.kec||'—')+'</td><td>'+(inf.kab||'—')+'</td><td class="num">'+x[1].toLocaleString()+'</td><td class="num">'+(x[1]/dt*100).toFixed(1)+'%</td><td><div class="rank-bar" style="width:100px"><div class="rank-bar-fill" style="width:'+pc+'%"></div></div></td></tr>';}).join(''):'<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text3)">Tidak ada data</td></tr>';setEl('wilayah-pg-info',(st+1)+'–'+Math.min(st+20,bd.length)+' dari '+bd.length+' desa');var pb=document.getElementById('wilayah-pg-prev'),nb=document.getElementById('wilayah-pg-next');if(pb)pb.disabled=window.APP.wilayah.page===0;if(nb)nb.disabled=st+20>=bd.length;}
window.changeWilayahPage=function(dir){window.APP.wilayah.page=Math.max(0,window.APP.wilayah.page+dir);renderWilayahTable();};

/* ── Wilayah PDF Export — Narrative ── */
window.exportWilayahPDF=function(){var B=window.B,d=window.APP.wilayah.filtered,ut=countUniqBenef(d);var kabS={},kecS={},desaS={};d.forEach(function(r){if(r[B.kab])kabS[r[B.kab]]=1;if(r[B.kec])kecS[r[B.kec]]=1;if(r[B.desa])desaS[r[B.desa]]=1;});var ft=getFilterSummary([{label:'Program',val:v('wf-proyek')},{label:'Tahun',val:v('wf-tahun')}]);var bd=topN(groupCountUniq(d,function(r){return r[B.desa];}),30);var lu={};d.forEach(function(r){if(r[B.desa]&&!lu[r[B.desa]])lu[r[B.desa]]={kec:r[B.kec],kab:r[B.kab]};});var td=bd[0]||['—',0];
buildPDF({title:'Laporan Sebaran Wilayah',subtitle:'Yayasan Ayo Indonesia',filterText:ft,filename:'Wilayah_Report.pdf',
narrative:[{heading:'Ringkasan Sebaran'},{text:'Berdasarkan data yang tersedia, program telah menjangkau '+ut.toLocaleString()+' penerima manfaat unik yang tersebar di '+Object.keys(desaS).length+' desa/kelurahan, '+Object.keys(kecS).length+' kecamatan, dan '+Object.keys(kabS).length+' kabupaten/kota.'},{heading:'Konsentrasi Wilayah'},{text:'Desa dengan penerima manfaat terbanyak adalah '+td[0]+' dengan '+td[1].toLocaleString()+' orang ('+(ut?(td[1]/ut*100).toFixed(1):0)+'% dari total). '+bd.slice(1,4).map(function(x){return x[0]+' ('+x[1]+')';}).join(', ')+' menempati posisi berikutnya.'},{text:'Distribusi ini menunjukkan '+(bd[0]&&bd[0][1]>ut*0.3?'konsentrasi yang cukup tinggi pada satu wilayah':'penyebaran yang relatif merata antar wilayah')+'. Rincian lengkap per desa tersedia pada lampiran.'}],
lampiran:[{heading:'Tabel A1: Rekap per Desa'},{table:{head:['#','Desa','Kecamatan','Kabupaten','Benef Unik','%'],body:bd.map(function(x,i){var inf=lu[x[0]]||{};return [i+1,x[0],inf.kec||'—',inf.kab||'—',x[1].toLocaleString(),(ut?(x[1]/ut*100).toFixed(1):0)+'%'];})}},{heading:'Grafik B1: Per Kabupaten'},{chart:{canvasId:'wch-kab',height:55}}]});};


/* ══════════════════ ANALITIK ══════════════════ */
function buildAnalitikPage(){ renderAnalitikContent(); }

function renderAnalitikContent(){
  var benef=window.rawBenef, pjum=window.rawPjum, B=window.B, P=window.P;
  var ut=countUniqBenef(benef), tc=pjum.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
  var gL=countUniqByGender(benef,'L'), gP=countUniqByGender(benef,'P');

  /* ── 1. Temuan Utama (insight cards) ── */
  var progBenef=groupCountUniq(benef,function(r){return r[B.proyek];});
  var progCost=groupSum(pjum,function(r){return r[P.proyek];},function(r){return r[P.jumlah];});
  var efisi=Object.keys(progBenef).filter(function(p){return progCost[p]&&progBenef[p];}).map(function(p){return{p:p,b:progBenef[p],c:progCost[p],r:progCost[p]/progBenef[p]};}).sort(function(a,b){return a.r-b.r;});
  var cheapest=efisi[0]||{p:'—',r:0}, priciest=efisi[efisi.length-1]||{p:'—',r:0};

  /* Gender imbalance per program */
  var progList=Object.keys(progBenef);
  var genderImb=progList.map(function(p){
    var rows=benef.filter(function(r){return r[B.proyek]===p;});
    var l=countUniqByGender(rows,'L'),pp=countUniqByGender(rows,'P');
    return{p:p,l:l,pp:pp,ratio:l+pp>0?Math.abs(pp/(l+pp)-0.5)*2:0};
  }).sort(function(a,b){return b.ratio-a.ratio;});
  var topImb=genderImb[0]||{p:'—',l:0,pp:0};

  /* Under-served desa (only 1 program) */
  var desaProgs={};
  benef.forEach(function(r){if(r[B.desa]&&r[B.proyek]){if(!desaProgs[r[B.desa]])desaProgs[r[B.desa]]={};desaProgs[r[B.desa]][r[B.proyek]]=1;}});
  var underServed=Object.keys(desaProgs).filter(function(d){return Object.keys(desaProgs[d]).length===1;});

  var insEl=document.getElementById('analitik-insights');
  if(insEl) insEl.innerHTML=
    '<div class="insight-card"><div class="ic-title">Program Paling Efisien</div><div class="ic-stat">'+cheapest.p+'</div><div class="ic-body">'+fmtShort(cheapest.r)+' per orang — biaya terendah per beneficiary unik</div></div>'+
    '<div class="insight-card"><div class="ic-title">Program Paling Mahal</div><div class="ic-stat">'+priciest.p+'</div><div class="ic-body">'+fmtShort(priciest.r)+' per orang — biaya tertinggi per beneficiary unik</div></div>'+
    '<div class="insight-card"><div class="ic-title">Ketimpangan Gender Terbesar</div><div class="ic-stat">'+topImb.p+'</div><div class="ic-body">L: '+topImb.l+' / P: '+topImb.pp+' — rasio paling tidak seimbang</div></div>'+
    '<div class="insight-card"><div class="ic-title">Desa Under-Served</div><div class="ic-stat">'+underServed.length+'</div><div class="ic-body">dari '+Object.keys(desaProgs).length+' desa hanya dilayani 1 program</div></div>'+
    '<div class="insight-card"><div class="ic-title">Rasio Gender Keseluruhan</div><div class="ic-stat">'+(gL>0?(gP/gL).toFixed(2):'—')+'</div><div class="ic-body">P:L — '+gP.toLocaleString()+' perempuan / '+gL.toLocaleString()+' laki-laki</div></div>'+
    '<div class="insight-card"><div class="ic-title">Biaya per Beneficiary</div><div class="ic-stat">'+fmtShort(ut>0?tc/ut:0)+'</div><div class="ic-body">Total '+fmtShort(tc)+' / '+ut.toLocaleString()+' orang unik</div></div>';

  /* ── 2. Efisiensi Program (bar) ── */
  mkBarH('ach-efisiensi', efisi.map(function(e){return e.p;}), efisi.map(function(e){return e.r;}),
    efisi.map(function(_,i){return PALETTE[i%PALETTE.length];}), {label:'Rp/Benef Unik', yFmt:fmtShort});

  /* ── 3. Cross-Tab: Kategori × Kabupaten ── */
  var katSet={},kabSet2={};
  benef.forEach(function(r){if(r[B.kategori])katSet[r[B.kategori]]=1;if(r[B.kab])kabSet2[r[B.kab]]=1;});
  var katList=Object.keys(katSet).sort(), kabList=Object.keys(kabSet2).sort();
  var ctData={};
  benef.forEach(function(r){
    var kat=r[B.kategori],kab=r[B.kab];if(!kat||!kab)return;
    var key=kat+'||'+kab;if(!ctData[key])ctData[key]={};
    ctData[key][benefKey(r)]=1;
  });
  var maxCT=1;
  katList.forEach(function(kat){kabList.forEach(function(kab){var c=ctData[kat+'||'+kab]?Object.keys(ctData[kat+'||'+kab]).length:0;if(c>maxCT)maxCT=c;});});
  var ctEl=document.getElementById('ach-crosstab');
  if(ctEl){
    var html='<div class="tbl-scroll"><table class="data-table ct-table"><thead><tr><th>Kategori</th>';
    kabList.forEach(function(k){html+='<th class="num">'+k+'</th>';});
    html+='<th class="num" style="font-weight:700">Total</th></tr></thead><tbody>';
    katList.forEach(function(kat){
      html+='<tr><td><strong>'+kat+'</strong></td>';
      var rowTotal=0;
      kabList.forEach(function(kab){
        var c=ctData[kat+'||'+kab]?Object.keys(ctData[kat+'||'+kab]).length:0;
        rowTotal+=c;
        var op=c>0?Math.max(0.15,c/maxCT):0;
        html+='<td class="num" style="background:rgba(249,115,22,'+op.toFixed(2)+')">'+(c>0?c:'')+'</td>';
      });
      html+='<td class="num" style="font-weight:700">'+rowTotal+'</td></tr>';
    });
    html+='</tbody></table></div>';
    ctEl.innerHTML=html;
  }

  /* ── 4. Rasio Gender per Program (stacked bar) ── */
  var pl2=progList.slice(0,10);
  mkMultiBar('ach-gender-prog',pl2,[
    {label:'Laki-laki',data:pl2.map(function(p){return countUniqBenef(benef.filter(function(r){return r[B.proyek]===p&&r[B.gender]==='L';}));}),backgroundColor:'#4F8EF7',borderRadius:3},
    {label:'Perempuan',data:pl2.map(function(p){return countUniqBenef(benef.filter(function(r){return r[B.proyek]===p&&r[B.gender]==='P';}));}),backgroundColor:'#EF4444',borderRadius:3}
  ],{stacked:true});

  /* ── 5. Cakupan Wilayah — desa + jumlah program ── */
  var covEl=document.getElementById('ach-coverage');
  if(covEl){
    var covData=Object.keys(desaProgs).map(function(d){return{desa:d,n:Object.keys(desaProgs[d]).length};}).sort(function(a,b){return a.n-b.n;});
    var covTop=covData.slice(0,15);
    var htm='<div class="tbl-scroll"><table class="data-table"><thead><tr><th>#</th><th>Desa</th><th class="num">Jumlah Program</th><th>Status</th></tr></thead><tbody>';
    covTop.forEach(function(c,i){
      var badge=c.n===1?'<span style="color:#EF4444;font-weight:700">Under-served</span>':'<span style="color:#22C55E">'+c.n+' program</span>';
      htm+='<tr><td>'+(i+1)+'</td><td>'+c.desa+'</td><td class="num">'+c.n+'</td><td>'+badge+'</td></tr>';
    });
    htm+='</tbody></table></div>';
    covEl.innerHTML=htm;
  }

  /* ── 6. Perbandingan Staf (dual-axis) ── */
  var topSB=topN(groupCountUniq(benef,function(r){return r[B.staf];}),10);
  var sn=topSB.map(function(x){return x[0];});
  var spd=sn.map(function(s){return pjum.filter(function(r){return r[P.staf]===s;}).reduce(function(a,r){return a+(parseFloat(r[P.jumlah])||0);},0);});
  mkMultiBar('ach-staf-compare',sn,[
    {label:'Benef Unik',data:topSB.map(function(x){return x[1];}),backgroundColor:'#F97316',borderRadius:3,yAxisID:'y'},
    {label:'Biaya PJUM',data:spd,backgroundColor:'#4F8EF7',borderRadius:3,yAxisID:'y1'}
  ],{extra:{scales:{x:{ticks:{color:'#8A96B8',font:{size:11}},grid:{color:'#F0F2F8'}},y:{type:'linear',position:'left',ticks:{color:'#F97316',font:{size:11}},grid:{color:'#F0F2F8'}},y1:{type:'linear',position:'right',ticks:{color:'#4F8EF7',font:{size:11},callback:fmtShort},grid:{drawOnChartArea:false}}}}});

  /* ── 7. Trend Multi-Program (top 4) ── */
  var top4=topN(progBenef,4).map(function(x){return x[0];});
  var blnSet={};benef.forEach(function(r){var bt=validTgl(r[B.tgl]);if(bt)blnSet[bt]=1;});
  var allBln=Object.keys(blnSet).sort();
  var blnLbl=allBln.map(function(k){var p=k.split('-');return bulanName(p[1])+"'"+p[0].slice(2);});
  var tDS=top4.map(function(pr,i){return{label:pr,data:allBln.map(function(bln){return countUniqBenef(benef.filter(function(r){return r[B.proyek]===pr&&validTgl(r[B.tgl])===bln;}));}),borderColor:PALETTE[i],backgroundColor:PALETTE[i]+'22',fill:false,tension:.35,pointRadius:3};});
  mkChart('ach-trend-prog','line',blnLbl,tDS,{});

  /* ── 8. Kualitas Data ── */
  var noTgl=benef.filter(function(r){return !validTgl(r[B.tgl]);}).length;
  var noGender=benef.filter(function(r){return r[B.gender]==='—';}).length;
  var noDesa=benef.filter(function(r){return !r[B.desa]||r[B.desa]==='—';}).length;
  var total=benef.length||1;
  var dqEl=document.getElementById('ach-dataquality');
  if(dqEl){
    var tglColor=noTgl>0?' style="color:#EF4444"':'';
    var gColor=noGender>0?' style="color:#F59E0B"':'';
    var dColor=noDesa>0?' style="color:#F59E0B"':'';
    dqEl.innerHTML=
    '<div class="insight-card"><div class="ic-title">Kelengkapan Tanggal</div><div class="ic-stat"'+tglColor+'>'+((total-noTgl)/total*100).toFixed(1)+'%</div><div class="ic-body">'+noTgl.toLocaleString()+' dari '+total.toLocaleString()+' record tanpa tanggal</div></div>'+
    '<div class="insight-card"><div class="ic-title">Kelengkapan Gender</div><div class="ic-stat"'+gColor+'>'+((total-noGender)/total*100).toFixed(1)+'%</div><div class="ic-body">'+noGender.toLocaleString()+' record tanpa data L/P</div></div>'+
    '<div class="insight-card"><div class="ic-title">Kelengkapan Wilayah</div><div class="ic-stat"'+dColor+'>'+((total-noDesa)/total*100).toFixed(1)+'%</div><div class="ic-body">'+noDesa.toLocaleString()+' record tanpa data desa</div></div>';
  }
}

/* ── Analitik PDF Export — Narrative ── */
window.exportAnalitikPDF=function(){
  var benef=window.rawBenef,pjum=window.rawPjum,B=window.B,P=window.P;
  var ut=countUniqBenef(benef),tc=pjum.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
  var gL=countUniqByGender(benef,'L'),gP=countUniqByGender(benef,'P');
  var progBenef=groupCountUniq(benef,function(r){return r[B.proyek];});
  var progCost=groupSum(pjum,function(r){return r[P.proyek];},function(r){return r[P.jumlah];});
  var efisi=Object.keys(progBenef).filter(function(p){return progCost[p]&&progBenef[p];}).map(function(p){return{p:p,b:progBenef[p],c:progCost[p],r:progCost[p]/progBenef[p]};}).sort(function(a,b){return a.r-b.r;});
  var cheapest=efisi[0]||{p:'—',r:0},priciest=efisi[efisi.length-1]||{p:'—',r:0};
  var desaProgs={};benef.forEach(function(r){if(r[B.desa]&&r[B.proyek]){if(!desaProgs[r[B.desa]])desaProgs[r[B.desa]]={};desaProgs[r[B.desa]][r[B.proyek]]=1;}});
  var underServed=Object.keys(desaProgs).filter(function(d){return Object.keys(desaProgs[d]).length===1;});

  buildPDF({
    title:'Laporan Analitik Mendalam',subtitle:'Yayasan Ayo Indonesia — Cross-Analysis',filterText:'Semua Data',filename:'Analitik_Report.pdf',
    narrative:[
      {heading:'Ringkasan Analitik'},
      {text:'Laporan ini menyajikan analisis silang (cross-analysis) antara data penerima manfaat dan penggunaan dana PJUM. Secara keseluruhan, '+ut.toLocaleString()+' penerima manfaat unik dilayani oleh '+Object.keys(progBenef).length+' program dengan total biaya '+fmt(tc)+'. Rata-rata biaya per penerima manfaat adalah '+fmtShort(ut>0?tc/ut:0)+'.'},
      {heading:'Efisiensi Program'},
      {text:'Program paling efisien dari segi biaya per orang adalah "'+cheapest.p+'" dengan '+fmtShort(cheapest.r)+' per beneficiary unik, sedangkan yang paling mahal adalah "'+priciest.p+'" dengan '+fmtShort(priciest.r)+' per orang. Selisih efisiensi antar program mencapai '+(priciest.r>0&&cheapest.r>0?(priciest.r/cheapest.r).toFixed(1):'—')+'x lipat.'},
      {bullet:'Program termurah: '+cheapest.p+' — '+fmtShort(cheapest.r)+'/orang ('+cheapest.b+' benef unik, biaya '+fmtShort(cheapest.c)+')'},
      {bullet:'Program termahal: '+priciest.p+' — '+fmtShort(priciest.r)+'/orang'},
      {heading:'Kesetaraan Gender'},
      {text:'Secara keseluruhan, rasio perempuan terhadap laki-laki adalah '+(gL>0?(gP/gL).toFixed(2):'—')+' ('+gP.toLocaleString()+' perempuan, '+gL.toLocaleString()+' laki-laki). Rasio ini menunjukkan '+(gL>0&&gP/gL>0.8&&gP/gL<1.2?'keseimbangan gender yang cukup baik':'ketidakseimbangan gender yang perlu diperhatikan')+'.'},
      {heading:'Cakupan Wilayah'},
      {text:'Dari '+Object.keys(desaProgs).length+' desa yang terjangkau, sebanyak '+underServed.length+' desa ('+(Object.keys(desaProgs).length?(underServed.length/Object.keys(desaProgs).length*100).toFixed(1):0)+'%) hanya dilayani oleh 1 program. Desa-desa ini dapat menjadi prioritas untuk perluasan cakupan program.'},
      {heading:'Kualitas Data'},
      {text:'Dari total '+benef.length.toLocaleString()+' catatan partisipasi, sebanyak '+benef.filter(function(r){return !validTgl(r[B.tgl]);}).length+' record tidak memiliki tanggal dan '+benef.filter(function(r){return r[B.gender]==='—';}).length+' record tidak memiliki data gender. Perbaikan kelengkapan data akan meningkatkan akurasi analisis.'}
    ],
    lampiran:[
      {heading:'Tabel A1: Efisiensi Biaya per Program'},
      {table:{head:['#','Program','Benef Unik','Total Biaya','Rp/Benef'],body:efisi.map(function(e,i){return [i+1,e.p,e.b.toLocaleString(),fmtShort(e.c),fmtShort(e.r)];})}},
      {heading:'Grafik B1: Efisiensi per Program'},{chart:{canvasId:'ach-efisiensi',height:55}},
      {heading:'Grafik B2: Rasio Gender per Program'},{chart:{canvasId:'ach-gender-prog',height:55}},
      {heading:'Grafik B3: Perbandingan Staf'},{chart:{canvasId:'ach-staf-compare',height:55}}
    ]
  });
};
