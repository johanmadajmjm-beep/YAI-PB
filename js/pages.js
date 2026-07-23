/* ═══════════════════════════════════════════════
   pages.js — Wilayah + Analitik pages
═══════════════════════════════════════════════ */

/* ══════════════════ WILAYAH ══════════════════ */
function buildWilayahPage(){refreshWilayahFilters(null);['wf-proyek','wf-tahun'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('change',function(){refreshWilayahFilters(id);applyWilayahFilter();});});var rb=document.getElementById('wf-reset');if(rb)rb.addEventListener('click',function(){['wf-proyek','wf-tahun'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});refreshWilayahFilters(null);applyWilayahFilter();});applyWilayahFilter();}
function getFilteredWilayah(sf){var B=window.B,p=sf!=='proyek'?v('wf-proyek'):'',t=sf!=='tahun'?v('wf-tahun'):'';return window.rawBenef.filter(function(r){if(p&&r[B.proyek]!==p)return false;var tv=validTgl(r[B.tgl]);if(t==='__blank__'&&tv)return false;if(t&&t!=='__blank__'&&(!tv||!tv.startsWith(t)))return false;return true;});}
function refreshWilayahFilters(si){var B=window.B;if(si!=='wf-proyek'){var c=v('wf-proyek');populateSel('wf-proyek',uniqArr(getFilteredWilayah('proyek').map(function(r){return r[B.proyek];})));document.getElementById('wf-proyek').value=c;}if(si!=='wf-tahun'){var c2=v('wf-tahun'),d2=getFilteredWilayah('tahun'),ts={},hb=false;d2.forEach(function(r){var t=validTgl(r[B.tgl]);if(t)ts[t.slice(0,4)]=1;else hb=true;});var at=Object.keys(ts).sort().reverse();if(hb)at.push('__blank__');populateSel('wf-tahun',at,function(v){return v==='__blank__'?'(Tanggal Kosong)':v;});document.getElementById('wf-tahun').value=c2;}}
function applyWilayahFilter(){var B=window.B,p=v('wf-proyek'),t=v('wf-tahun');window.APP.wilayah.filtered=window.rawBenef.filter(function(r){if(p&&r[B.proyek]!==p)return false;var tv=validTgl(r[B.tgl]);if(t==='__blank__'&&tv)return false;if(t&&t!=='__blank__'&&(!tv||!tv.startsWith(t)))return false;return true;});window.APP.wilayah.page=0;renderWilayahAll();}
function renderWilayahAll(){var B=window.B,d=window.APP.wilayah.filtered;var kabS={},kecS={},desaS={};d.forEach(function(r){if(r[B.kab])kabS[r[B.kab]]=1;if(r[B.kec])kecS[r[B.kec]]=1;if(r[B.desa])desaS[r[B.desa]]=1;});var ut=countUniqBenef(d);setEl('wstat-kab',Object.keys(kabS).length.toLocaleString());setEl('wstat-kec',Object.keys(kecS).length.toLocaleString());setEl('wstat-desa',Object.keys(desaS).length.toLocaleString());setEl('wstat-tot',ut.toLocaleString());
var parokiS={},instansiS={};d.forEach(function(r){if(r[B.paroki])parokiS[r[B.paroki]]=1;if(r[B.instansi])instansiS[r[B.instansi]]=1;});
setEl('wstat-paroki',Object.keys(parokiS).length.toLocaleString());setEl('wstat-instansi',Object.keys(instansiS).length.toLocaleString());
var bpk=topN(groupCountUniq(d.filter(function(r){return r[B.paroki];}),function(r){return r[B.paroki];}),15);mkBarH('wch-paroki',bpk.map(function(x){return x[0];}),bpk.map(function(x){return x[1];}),'#14B8A6',{label:'Benef Unik'});
var bin=topN(groupCountUniq(d.filter(function(r){return r[B.instansi];}),function(r){return r[B.instansi];}),15);mkBarH('wch-instansi',bin.map(function(x){return x[0];}),bin.map(function(x){return x[1];}),'#F59E0B',{label:'Benef Unik'});
var bk=topN(groupCountUniq(d,function(r){return r[B.kab];}),15);mkBarH('wch-kab',bk.map(function(x){return x[0];}),bk.map(function(x){return x[1];}),bk.map(function(_,i){return PALETTE[i%PALETTE.length];}),{label:'Benef Unik'});
var bc=topN(groupCountUniq(d,function(r){return r[B.kec];}),15);mkBarH('wch-kec',bc.map(function(x){return x[0];}),bc.map(function(x){return x[1];}),'#F97316',{label:'Benef Unik'});
var bd=topN(groupCountUniq(d,function(r){return r[B.desa];}),15);mkBarH('wch-desa',bd.map(function(x){return x[0];}),bd.map(function(x){return x[1];}),'#8B5CF6',{label:'Benef Unik'});
var bp=topN(groupCountUniq(d,function(r){return r[B.proyek];}),10);mkBarH('wch-prog',bp.map(function(x){return x[0];}),bp.map(function(x){return x[1];}),'#22C55E',{label:'Benef Unik'});
var gM={'L':'Laki-laki','P':'Perempuan','—':'Lainnya'},byG=groupCountUniq(d,function(r){return gM[r[B.gender]]||'Lainnya';}),gK=Object.keys(byG),gC={'Laki-laki':'#4F8EF7','Perempuan':'#EF4444','Lainnya':'#8A96B8'};mkDonut('wch-gender',gK,gK.map(function(k){return byG[k];}),gK.map(function(k){return gC[k]||'#8A96B8';}));
var wg=document.getElementById('wch-gender-legend');if(wg)wg.innerHTML=gK.map(function(k,i){return '<div class="dl-item"><div class="dl-dot" style="background:'+(gC[k]||PALETTE[i])+'"></div><div class="dl-name">'+k+'</div><div class="dl-pct">'+(ut?(byG[k]/ut*100).toFixed(1):0)+'%</div></div>';}).join('');
renderWilayahTable();}
function renderWilayahTable(){
  var B=window.B,d=window.APP.wilayah.filtered;
  var bd=topN(groupCountUniq(d,function(r){return r[B.desa];}),200);
  var dt=bd.reduce(function(s,x){return s+x[1];},0)||1;
  var maxN=bd[0]?bd[0][1]:1;
  var lu={};d.forEach(function(r){if(r[B.desa]&&!lu[r[B.desa]])lu[r[B.desa]]={kec:r[B.kec],kab:r[B.kab]};});
  var list=bd.map(function(x){var inf=lu[x[0]]||{};return {desa:x[0],kec:inf.kec||'\u2014',kab:inf.kab||'\u2014',n:x[1]};});
  /* Sort seluruh daftar sebelum paginasi */
  var wst=window.SORT['wilayah'];
  if(wst&&wst.col>=1){
    var WG=[null,function(o){return o.desa;},function(o){return o.kec;},function(o){return o.kab;},function(o){return o.n;}];
    var wg=WG[wst.col];
    if(wg) list=list.slice().sort(function(a,b){return cmpVals(wg(a),wg(b))*wst.dir;});
  }
  var st=window.APP.wilayah.page*20, sl=list.slice(st,st+20);
  var tb=document.getElementById('wilayah-tbl-body');if(!tb)return;
  tb.innerHTML=sl.length?sl.map(function(o,i){
    var pc=o.n/maxN*100;
    return '<tr><td>'+(st+i+1)+'</td><td><strong>'+o.desa+'</strong></td><td>'+o.kec+'</td><td>'+o.kab+'</td><td class="num">'+o.n.toLocaleString()+'</td><td class="num">'+(o.n/dt*100).toFixed(1)+'%</td><td><div class="rank-bar" style="width:100px"><div class="rank-bar-fill" style="width:'+pc+'%"></div></div></td></tr>';
  }).join(''):'<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text3)">Tidak ada data</td></tr>';
  setEl('wilayah-pg-info',(st+1)+'\u2013'+Math.min(st+20,list.length)+' dari '+list.length+' desa');
  var pb=document.getElementById('wilayah-pg-prev'),nb=document.getElementById('wilayah-pg-next');
  if(pb)pb.disabled=window.APP.wilayah.page===0;
  if(nb)nb.disabled=st+20>=list.length;
}
window._sortHandlers['wilayah']=function(){window.APP.wilayah.page=0;renderWilayahTable();};
window.changeWilayahPage=function(dir){window.APP.wilayah.page=Math.max(0,window.APP.wilayah.page+dir);renderWilayahTable();};


/* ══════════════════════════════════════════════════
   Wilayah PDF — Laporan Sebaran Lengkap
══════════════════════════════════════════════════ */
window.exportWilayahPDF = function() {
  var B = window.B;
  var d = window.APP.wilayah.filtered;
  var uniq = countUniqBenef(d);
  var per = dataPeriod(d, B.tgl);
  var hier = wilayahHierarchy(d);
  var desaMap = desaProgramMap(d);
  var g = genderBreakdown(d);
  var disab = disabilityBreakdown(d);

  var kabS={},kecS={},desaS={},progS={};
  d.forEach(function(r){ if(r[B.kab])kabS[r[B.kab]]=1; if(r[B.kec])kecS[r[B.kec]]=1; if(r[B.desa])desaS[r[B.desa]]=1; if(r[B.proyek])progS[r[B.proyek]]=1; });

  var byDesa = topN(groupCountUniq(d,function(r){return r[B.desa];}),40);
  var byKec  = topN(groupCountUniq(d,function(r){return r[B.kec];}),30);
  var lu={}; d.forEach(function(r){ if(r[B.desa]&&!lu[r[B.desa]]) lu[r[B.desa]]={kec:r[B.kec],kab:r[B.kab]}; });
  var luKec={}; d.forEach(function(r){ if(r[B.kec]&&!luKec[r[B.kec]]) luKec[r[B.kec]]=r[B.kab]; });

  var underServed = desaMap.filter(function(x){return x.n===1;});
  var wellServed  = desaMap.filter(function(x){return x.n>=3;});
  var concDesa = concentrationIndex(byDesa.map(function(x){return x[1];}));
  var concKab  = concentrationIndex(hier.map(function(x){return x.uniq;}));

  /* Gender per kabupaten */
  var genderKab = hier.map(function(h){
    var rows = d.filter(function(r){return (r[B.kab]||'(Tidak Diisi)')===h.kab;});
    var gg = genderBreakdown(rows);
    return {kab:h.kab, L:gg.L, P:gg.P, total:gg.total, rasio:gg.rasio};
  });

  /* Rekap tahunan wilayah */
  var years = getYears(d, B.tgl);
  var yearly = calcGrowth(years.map(function(y){
    var rows = d.filter(function(r){var t=validTgl(r[B.tgl]);return t&&t.slice(0,4)===y;});
    var ds={},kc={},kb={};
    rows.forEach(function(r){if(r[B.desa])ds[r[B.desa]]=1;if(r[B.kec])kc[r[B.kec]]=1;if(r[B.kab])kb[r[B.kab]]=1;});
    return {tahun:y, uniq:countUniqBenef(rows), desa:Object.keys(ds).length,
      kec:Object.keys(kc).length, kab:Object.keys(kb).length};
  }),'desa');

  var ft = getFilterSummary([{label:'Program',val:v('wf-proyek')},{label:'Tahun',val:v('wf-tahun')}]);
  var topDesa = byDesa[0]||['—',0];
  var topKab = hier[0]||{kab:'—',uniq:0,desa:0,kec:0};

  buildPDF({
    title:'Laporan Sebaran Wilayah', subtitle:'Yayasan Ayo Indonesia',
    filterText:ft, filename:'Laporan_Wilayah.pdf',
    meta:{ periode: per?fmtPeriod(per.start)+' – '+fmtPeriod(per.end):'Tidak tersedia',
           sumber:'Google Sheets YAI — Sheet Beneficiary' },
    body:[
      {section:'I. Ringkasan Eksekutif'},
      {text:'Laporan ini menganalisis sebaran geografis penerima manfaat program Yayasan Ayo Indonesia'+(per?' pada periode '+fmtPeriod(per.start)+' hingga '+fmtPeriod(per.end):'')+'.'},
      {text:'Program menjangkau '+uniq.toLocaleString()+' penerima manfaat unik yang tersebar di '+Object.keys(desaS).length+' desa/kelurahan, '+Object.keys(kecS).length+' kecamatan, dan '+Object.keys(kabS).length+' kabupaten/kota melalui '+Object.keys(progS).length+' program.'},
      {kv:[
        ['Penerima Manfaat Unik', uniq.toLocaleString()+' orang'],
        ['Kabupaten/Kota', Object.keys(kabS).length.toString()],
        ['Kecamatan', Object.keys(kecS).length.toString()],
        ['Desa/Kelurahan', Object.keys(desaS).length.toString()],
        ['Rata-rata per Desa', Object.keys(desaS).length>0?Math.round(uniq/Object.keys(desaS).length)+' orang':'—'],
        ['Desa Under-Served', underServed.length+' desa (1 program saja)'],
        ['Desa Terlayani Baik', wellServed.length+' desa (3+ program)'],
        ['Indeks Konsentrasi Desa', concDesa.toFixed(1)+' / 100']
      ]},
      {callout:'Indeks konsentrasi '+concDesa.toFixed(1)+'/100 menunjukkan sebaran '+(concDesa>50?'terkonsentrasi pada sedikit desa — perlu perluasan jangkauan':concDesa>25?'cukup merata dengan beberapa desa dominan':'sangat merata antar desa')+'.'},

      {section:'II. Hierarki Wilayah'},
      {text:'Bagian ini menyajikan sebaran bertingkat dari kabupaten hingga desa. Kabupaten dengan jangkauan terbesar adalah '+topKab.kab+' dengan '+topKab.uniq.toLocaleString()+' penerima manfaat ('+(uniq?(topKab.uniq/uniq*100).toFixed(1):0)+'%) yang tersebar di '+topKab.desa+' desa pada '+topKab.kec+' kecamatan.'},
      {table:{title:'Tabel 2.1 — Rekap per Kabupaten/Kota',
        head:['#','Kabupaten/Kota','Kecamatan','Desa','Benef Unik','% Total','Rata-rata/Desa'],
        body:hier.map(function(h,i){return [i+1,h.kab,h.kec,h.desa,h.uniq.toLocaleString(),
          (uniq?(h.uniq/uniq*100).toFixed(1):0)+'%', h.desa>0?Math.round(h.uniq/h.desa):'—'];})}},
      {text:'Indeks konsentrasi antar kabupaten adalah '+concKab.toFixed(1)+'/100. '+(concKab>50?'Sebagian besar penerima manfaat terpusat di sedikit kabupaten.':'Sebaran antar kabupaten relatif berimbang.')},
      {chart:{canvasId:'wch-kab', height:55, title:'Grafik 2.1 — Sebaran per Kabupaten'}},
      {table:{title:'Tabel 2.2 — Rekap per Kecamatan (30 Terbesar)',
        head:['#','Kecamatan','Kabupaten','Benef Unik','% Total'],
        body:byKec.map(function(x,i){return [i+1,x[0],luKec[x[0]]||'—',x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {chart:{canvasId:'wch-kec', height:55, title:'Grafik 2.2 — Sebaran per Kecamatan'}},

      {section:'III. Analisis Tingkat Desa'},
      {text:'Desa dengan jangkauan terbesar adalah '+topDesa[0]+' dengan '+topDesa[1].toLocaleString()+' penerima manfaat ('+(uniq?(topDesa[1]/uniq*100).toFixed(2):0)+'% dari total). Rata-rata setiap desa menjangkau '+(Object.keys(desaS).length>0?Math.round(uniq/Object.keys(desaS).length):0)+' orang.'},
      {chart:{canvasId:'wch-desa', height:55, title:'Grafik 3.1 — Sebaran per Desa'}},

      {section:'IV. Cakupan Layanan'},
      {text:'Bagian ini menilai seberapa terintegrasi layanan di setiap desa, diukur dari berapa banyak program yang beroperasi di desa tersebut.'},
      {kv:[
        ['Total Desa Terjangkau', desaMap.length.toString()],
        ['Dilayani 1 Program', underServed.length+' desa ('+(desaMap.length?(underServed.length/desaMap.length*100).toFixed(1):0)+'%)'],
        ['Dilayani 2 Program', desaMap.filter(function(x){return x.n===2;}).length+' desa'],
        ['Dilayani 3+ Program', wellServed.length+' desa ('+(desaMap.length?(wellServed.length/desaMap.length*100).toFixed(1):0)+'%)'],
        ['Cakupan Tertinggi', desaMap.length?desaMap[0].desa+' ('+desaMap[0].n+' program)':'—']
      ]},
      {text:'Sebanyak '+underServed.length+' desa ('+(desaMap.length?(underServed.length/desaMap.length*100).toFixed(1):0)+'%) hanya dilayani oleh satu program. Desa-desa ini berpotensi menjadi prioritas untuk perluasan layanan agar intervensi lebih terintegrasi dan berdampak.'},
      {text: wellServed.length ? 'Di sisi lain, '+wellServed.length+' desa sudah dilayani oleh 3 program atau lebih, menunjukkan konsentrasi intervensi yang baik di wilayah tersebut.' : ''},

      {section:'V. Profil Demografis per Wilayah'},
      {text:'Komposisi gender penerima manfaat di setiap kabupaten. Rasio P:L mendekati 1,00 menunjukkan keseimbangan gender yang baik.'},
      {table:{title:'Tabel 5.1 — Komposisi Gender per Kabupaten',
        head:['#','Kabupaten','Laki-laki','Perempuan','Total','Rasio P:L'],
        body:genderKab.map(function(x,i){return [i+1,x.kab,x.L.toLocaleString(),x.P.toLocaleString(),
          x.total.toLocaleString(), x.rasio!==null?x.rasio.toFixed(2):'—'];})}},
      {chart:{canvasId:'wch-gender', height:48, title:'Grafik 5.1 — Distribusi Gender Keseluruhan'}},
      {text:'Secara keseluruhan, rasio perempuan terhadap laki-laki adalah '+(g.rasio!==null?g.rasio.toFixed(2):'—')+' dengan '+g.P.toLocaleString()+' perempuan dan '+g.L.toLocaleString()+' laki-laki. Penyandang disabilitas berjumlah '+disab.adaDisab.toLocaleString()+' orang ('+(disab.total?(disab.adaDisab/disab.total*100).toFixed(1):0)+'%).'},

      {section:'VI. Perkembangan Cakupan'},
      {text: yearly.length ? 'Perkembangan cakupan wilayah dari tahun ke tahun. '+describeTrend(yearly,'desa') : 'Data temporal tidak tersedia.'},
      yearly.length ? {table:{title:'Tabel 6.1 — Perkembangan Cakupan per Tahun',
        head:['Tahun','Benef Unik','Desa','Δ% Desa','Kecamatan','Kabupaten'],
        body:yearly.map(function(r){return [r.tahun,r.uniq.toLocaleString(),r.desa,
          r.growth===null?'—':(r.growth>=0?'+':'')+r.growth.toFixed(1)+'%', r.kec, r.kab];})}} : {spacer:0},

      {section:'VII. Kesimpulan'},
      {text:'Program menjangkau '+Object.keys(desaS).length+' desa di '+Object.keys(kabS).length+' kabupaten dengan total '+uniq.toLocaleString()+' penerima manfaat unik.'},
      {bullet:'Konsentrasi desa: '+concDesa.toFixed(0)+'/100 — '+(concDesa>50?'perlu perluasan ke desa lain':'sebaran sudah merata')},
      {bullet:'Konsentrasi kabupaten: '+concKab.toFixed(0)+'/100 — '+(concKab>50?'terpusat pada sedikit kabupaten':'berimbang antar kabupaten')},
      {bullet:'Desa under-served: '+underServed.length+' dari '+desaMap.length+' desa ('+(desaMap.length?(underServed.length/desaMap.length*100).toFixed(1):0)+'%) — prioritas perluasan'},
      {bullet:'Rata-rata jangkauan: '+(Object.keys(desaS).length>0?Math.round(uniq/Object.keys(desaS).length):0)+' orang per desa'}
    ],
    lampiran:[
      {table:{title:'Tabel A1 — Rekap Lengkap per Desa (40 Terbesar)',
        head:['#','Desa','Kecamatan','Kabupaten','Benef Unik','% Total'],
        body:byDesa.map(function(x,i){var inf=lu[x[0]]||{};return [i+1,x[0],inf.kec||'—',inf.kab||'—',
          x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {table:{title:'Tabel A2 — Desa Under-Served (Hanya 1 Program)',
        head:['#','Desa','Kecamatan','Kabupaten','Program'],
        body:underServed.slice(0,40).map(function(x,i){var inf=lu[x.desa]||{};
          return [i+1,x.desa,inf.kec||'—',inf.kab||'—',x.programs[0]||'—'];})}},
      {table:{title:'Tabel A3 — Desa dengan Cakupan Terbaik (3+ Program)',
        head:['#','Desa','Kecamatan','Jumlah Program'],
        body:wellServed.slice(0,30).map(function(x,i){var inf=lu[x.desa]||{};
          return [i+1,x.desa,inf.kec||'—',x.n];})}},
      {chart:{canvasId:'wch-prog', height:55, title:'Grafik A1 — Sebaran per Program'}}
    ],
    metodologi: stdMetodologi([
      'Indeks konsentrasi menggunakan HHI ternormalisasi (0–100). Nilai mendekati 0 berarti sebaran sangat merata, mendekati 100 berarti terpusat pada sedikit wilayah.',
      'Desa "under-served" adalah desa yang hanya dijangkau satu program dalam periode data.',
      'Desa dengan data kosong dikelompokkan sebagai "(Tidak Diisi)" dan tetap dihitung dalam total keseluruhan.'
    ])
  });
};
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

  /* ── 1b. Overlap benef antar program ── */
  var personProgs={};
  benef.forEach(function(r){var k=benefKey(r);if(!personProgs[k])personProgs[k]={};if(r[B.proyek])personProgs[k][r[B.proyek]]=1;});
  var ov1=0,ov2=0,ov3=0;
  Object.keys(personProgs).forEach(function(k){var n=Object.keys(personProgs[k]).length;if(n<=1)ov1++;else if(n===2)ov2++;else ov3++;});
  var ovTotal=ov1+ov2+ov3;
  var OV_COLORS=['#F97316','#4F8EF7','#8B5CF6'];
  mkDonut('ach-overlap',['1 Program','2 Program','3+ Program'],[ov1,ov2,ov3],OV_COLORS);
  setEl('ach-overlap-total',ovTotal.toLocaleString());
  var ovLg=document.getElementById('ach-overlap-legend');
  if(ovLg) ovLg.innerHTML=[['1 Program',ov1],['2 Program',ov2],['3+ Program',ov3]].map(function(x,i){
    return '<div class="dl-item"><div class="dl-dot" style="background:'+OV_COLORS[i]+'"></div><div class="dl-name">'+x[0]+'</div><div class="dl-pct">'+x[1].toLocaleString()+' ('+(ovTotal?(x[1]/ovTotal*100).toFixed(1):0)+'%)</div></div>';
  }).join('');

  /* ── 1c. Kuadran program: benef unik (x) vs biaya (y) ── */
  var scData=Object.keys(progBenef).map(function(p){return {x:progBenef[p], y:progCost[p]||0, label:p};});
  var kdCh=mkChart('ach-kuadran','scatter',[],[{label:'Program',data:scData,backgroundColor:'rgba(249,115,22,.75)',borderColor:'#EA6C0A',borderWidth:1,pointRadius:5,pointHoverRadius:7}],
    {noLegend:true,extra:{scales:{
      x:{title:{display:true,text:'Benef Unik',color:'#918C81',font:{size:10}},ticks:{color:'#918C81',font:{size:10}},grid:{color:'#F1EEE7'}},
      y:{title:{display:true,text:'Biaya PJUM',color:'#918C81',font:{size:10}},ticks:{color:'#918C81',font:{size:10},callback:fmtShort},grid:{color:'#F1EEE7'}}
    }}});
  if(kdCh){kdCh.options.plugins.tooltip.callbacks={label:function(ctx){var d=ctx.raw;return d.label+': '+d.x.toLocaleString()+' benef · '+fmtShort(d.y);}};kdCh.update();}

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
  var maxCT=1, maxCTKat='—', maxCTKab='—';
  katList.forEach(function(kat){kabList.forEach(function(kab){var c=ctData[kat+'||'+kab]?Object.keys(ctData[kat+'||'+kab]).length:0;if(c>maxCT){maxCT=c;maxCTKat=kat;maxCTKab=kab;}});});
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

  /* ── 9. INSIGHT RAIL — semua temuan otomatis di panel kanan ── */
  var railEl=document.getElementById('analitik-rail');
  if(railEl){
    function insItem(dot,html){return '<div class="ins-item"><div class="ins-dot d-'+dot+'"></div><div class="ins-text">'+html+'</div></div>';}
    function insGroup(t){return '<div class="ins-group-title">'+t+'</div>';}
    var rail='';

    if(ut===0){
      railEl.innerHTML=insItem('yellow','Data belum cukup untuk menghasilkan insight.');
    } else {
      /* Efisiensi */
      rail+=insGroup('Efisiensi');
      if(efisi.length){
        rail+=insItem('green','Paling efisien: <strong>'+cheapest.p+'</strong> ('+fmtShort(cheapest.r)+'/benef). Termahal: <strong>'+priciest.p+'</strong> ('+fmtShort(priciest.r)+'/benef).');
        if(cheapest.r>0&&efisi.length>1) rail+=insItem('orange','Gap efisiensi <strong>'+(priciest.r/cheapest.r).toFixed(1)+'× lipat</strong> antara program termahal dan termurah.');
      }
      rail+=insItem('blue','Rata-rata biaya <strong>'+fmtShort(ut>0?tc/ut:0)+'</strong> per benef unik (total '+fmtShort(tc)+').');

      /* Jangkauan & Overlap */
      rail+=insGroup('Jangkauan &amp; Overlap');
      var ovMulti=ov2+ov3;
      rail+=insItem(ovMulti>0?'purple':'blue','<strong>'+ovMulti.toLocaleString()+' orang</strong> ('+(ovTotal?(ovMulti/ovTotal*100).toFixed(1):0)+'%) menerima lebih dari 1 program'+(ov3>0?' — '+ov3.toLocaleString()+' di antaranya 3+ program':'')+'.');
      var progSorted=topN(progBenef,999), progSum=progSorted.reduce(function(s,x){return s+x[1];},0)||1;
      var cum=0,n80=0;
      for(var pi=0;pi<progSorted.length;pi++){cum+=progSorted[pi][1];n80++;if(cum/progSum>=0.8)break;}
      rail+=insItem('orange','<strong>80% jangkauan</strong> terkonsentrasi di '+n80+' dari '+progSorted.length+' program (Pareto). Terbesar: <strong>'+(progSorted[0]?progSorted[0][0]:'—')+'</strong>.');

      /* Gender */
      rail+=insGroup('Gender');
      rail+=insItem('blue','Rasio keseluruhan P:L = <strong>'+(gL>0?(gP/gL).toFixed(2):'—')+'</strong> ('+gP.toLocaleString()+' P / '+gL.toLocaleString()+' L).');
      if(topImb.p!=='—') rail+=insItem(topImb.ratio>0.5?'red':'yellow','Paling timpang: <strong>'+topImb.p+'</strong> (L '+topImb.l+' / P '+topImb.pp+').');

      /* Wilayah */
      rail+=insGroup('Wilayah');
      var totDesaN=Object.keys(desaProgs).length||1;
      rail+=insItem(underServed.length>0?'red':'green','<strong>'+underServed.length+'</strong> dari '+totDesaN+' desa ('+(underServed.length/totDesaN*100).toFixed(0)+'%) hanya dilayani <strong>1 program</strong>.');
      if(maxCTKat!=='—') rail+=insItem('teal','Sel terpadat: <strong>'+maxCTKat+' × '+maxCTKab+'</strong> ('+maxCT.toLocaleString()+' benef unik).');

      /* Staf */
      rail+=insGroup('Staf');
      if(topSB.length){
        rail+=insItem('orange','Beban tertinggi: <strong>'+topSB[0][0]+'</strong> ('+topSB[0][1].toLocaleString()+' benef unik).');
        var stafRasio=sn.map(function(s,i){return {s:s,r:topSB[i][1]>0?spd[i]/topSB[i][1]:0};}).filter(function(x){return x.r>0;}).sort(function(a,b){return b.r-a.r;});
        if(stafRasio.length>=3){
          var med=stafRasio[Math.floor(stafRasio.length/2)].r;
          if(med>0&&stafRasio[0].r>=2*med){
            rail+=insItem('red','Anomali: <strong>'+stafRasio[0].s+'</strong> Rp/benef '+fmtShort(stafRasio[0].r)+' — <strong>'+(stafRasio[0].r/med).toFixed(1)+'× median</strong>, perlu dicek.');
          } else {
            rail+=insItem('green','Tidak ada anomali biaya per staf yang menonjol (semua < 2× median).');
          }
        }
      }

      /* Trend */
      rail+=insGroup('Trend');
      if(allBln.length>=2){
        var mUniq=allBln.map(function(bln){return countUniqBenef(benef.filter(function(r){return validTgl(r[B.tgl])===bln;}));});
        var last=mUniq[mUniq.length-1], prev=mUniq[mUniq.length-2];
        var delta=prev>0?((last-prev)/prev*100):0;
        rail+=insItem(delta>=0?'green':'red','Bulan terakhir ('+blnLbl[blnLbl.length-1]+') <strong>'+(delta>=0?'naik':'turun')+' '+Math.abs(delta).toFixed(1)+'%</strong> vs bulan sebelumnya ('+last.toLocaleString()+' benef).');
        var pkIdx=mUniq.indexOf(Math.max.apply(null,mUniq));
        rail+=insItem('purple','Puncak jangkauan: <strong>'+blnLbl[pkIdx]+'</strong> ('+mUniq[pkIdx].toLocaleString()+' benef unik).');
      } else {
        rail+=insItem('yellow','Data bertanggal belum cukup untuk analisis trend bulanan.');
      }

      /* Kualitas Data — hanya jika ada masalah */
      if(noTgl+noGender+noDesa>0){
        rail+=insGroup('Kualitas Data');
        var worst=[['Tanggal',noTgl],['Gender',noGender],['Desa',noDesa]].sort(function(a,b){return b[1]-a[1];})[0];
        rail+=insItem('yellow','Kelengkapan terendah: <strong>'+worst[0]+'</strong> ('+((total-worst[1])/total*100).toFixed(1)+'% terisi, '+worst[1].toLocaleString()+' record kosong).');
      }

      railEl.innerHTML=rail;
    }
  }
}

/* ── Analitik PDF Export — Narrative ── */

/* ══════════════════════════════════════════════════
   Analitik PDF — Laporan Cross-Analysis Lengkap
══════════════════════════════════════════════════ */
window.exportAnalitikPDF = function() {
  var benef = window.rawBenef, pjum = window.rawPjum;
  var B = window.B, P = window.P;

  var uniq = countUniqBenef(benef);
  var cost = pjum.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
  var g = genderBreakdown(benef);
  var progs = allProgramList(benef, pjum);
  var perB = dataPeriod(benef, B.tgl), perP = dataPeriod(pjum, P.tgl);
  var reach = programReach(benef);
  var desaMap = desaProgramMap(benef);
  var disab = disabilityBreakdown(benef);
  var hier = wilayahHierarchy(benef);
  var anomali = detectAnomalies(benef, pjum);
  var yearly = calcGrowth(yearlyRecap(benef, pjum), 'uniq');

  /* Efisiensi lengkap */
  var progBenef = groupCountUniq(benef, function(r){return r[B.proyek];});
  var progCost  = groupSum(pjum, function(r){return r[P.proyek];}, function(r){return r[P.jumlah];});
  var reachMap = {}; reach.forEach(function(r){ reachMap[r.program]=r; });
  var efisi = progs.map(function(p){
    var b = progBenef[p]||0, c = progCost[p]||0, rc = reachMap[p]||{};
    return {p:p, b:b, c:c, r: b>0&&c>0 ? c/b : null,
      desa:rc.desa||0, kab:rc.kab||0, durasi:rc.durasi||0};
  }).filter(function(x){return x.r!==null;}).sort(function(a,b){return a.r-b.r;});

  var noCost = progs.filter(function(p){ return (progBenef[p]||0)>0 && !(progCost[p]>0); });
  var noBenef = progs.filter(function(p){ return (progCost[p]||0)>0 && !(progBenef[p]>0); });

  var cheapest = efisi[0]||{p:'—',r:0,b:0,c:0};
  var priciest = efisi[efisi.length-1]||{p:'—',r:0,b:0,c:0};
  var medEfisi = efisi.length ? efisi[Math.floor(efisi.length/2)].r : 0;

  /* Gender imbalance per program */
  var genderProg = progs.map(function(p){
    var rows = benef.filter(function(r){return r[B.proyek]===p;});
    var gg = genderBreakdown(rows);
    return {p:p, L:gg.L, P:gg.P, total:gg.total, rasio:gg.rasio,
      imbalance: gg.total>0 ? Math.abs(gg.P/gg.total - 0.5)*2 : 0};
  }).filter(function(x){return x.total>0;}).sort(function(a,b){return b.imbalance-a.imbalance;});

  /* Staf: benef vs biaya */
  var stafBenef = groupCountUniq(benef, function(r){return r[B.staf];});
  var stafCost  = groupSum(pjum, function(r){return r[P.staf];}, function(r){return r[P.jumlah];});
  var allStaf = {};
  Object.keys(stafBenef).forEach(function(s){allStaf[normStafKey(s)]=s;});
  Object.keys(stafCost).forEach(function(s){if(!allStaf[normStafKey(s)])allStaf[normStafKey(s)]=s;});
  var stafRows = Object.values(allStaf).map(function(s){
    var b = stafBenef[s]||0, c = stafCost[s]||0;
    return {s:s, b:b, c:c, r: b>0&&c>0 ? c/b : null};
  }).sort(function(a,b){return b.b-a.b;});

  /* Cross-tab kategori x kabupaten */
  var katSet={},kabSet={};
  benef.forEach(function(r){if(r[B.kategori])katSet[r[B.kategori]]=1;if(r[B.kab])kabSet[r[B.kab]]=1;});
  var katList=Object.keys(katSet).sort(), kabList=Object.keys(kabSet).sort();
  var ct={};
  benef.forEach(function(r){
    var k=r[B.kategori], kb=r[B.kab]; if(!k||!kb)return;
    var key=k+'||'+kb; if(!ct[key])ct[key]={};
    ct[key][benefKey(r)]=1;
  });
  var ctRows = katList.map(function(kat){
    var row=[kat], tot=0;
    kabList.forEach(function(kb){
      var c = ct[kat+'||'+kb] ? Object.keys(ct[kat+'||'+kb]).length : 0;
      row.push(c>0?c.toLocaleString():'–'); tot+=c;
    });
    row.push(tot.toLocaleString());
    return row;
  });

  var underServed = desaMap.filter(function(x){return x.n===1;});
  var wellServed = desaMap.filter(function(x){return x.n>=3;});
  var concDesa = concentrationIndex(topN(groupCountUniq(benef,function(r){return r[B.desa];}),100).map(function(x){return x[1];}));
  var avgPart = avgParticipation(benef);
  var rasioSpread = cheapest.r>0 && priciest.r>0 ? priciest.r/cheapest.r : 0;

  buildPDF({
    title:'Laporan Analitik Mendalam', subtitle:'Yayasan Ayo Indonesia — Cross-Analysis',
    filterText:'Seluruh Data (Tanpa Filter)', filename:'Laporan_Analitik.pdf',
    meta:{ periode: perB?fmtPeriod(perB.start)+' – '+fmtPeriod(perB.end):'Tidak tersedia',
           sumber:'Google Sheets YAI — Beneficiary & PJUM' },
    body:[
      {section:'I. Ringkasan Eksekutif'},
      {text:'Laporan ini menyajikan analisis silang antara data penerima manfaat dan data penggunaan dana. Tujuannya adalah menemukan pola yang tidak terlihat bila kedua data dianalisis secara terpisah, seperti efisiensi biaya per program, ketimpangan gender, dan kesenjangan cakupan wilayah.'},
      {text:'Secara keseluruhan, '+uniq.toLocaleString()+' penerima manfaat unik dilayani melalui '+progs.length+' program dengan total dana '+fmt(cost)+'. Biaya rata-rata per penerima manfaat adalah '+fmt(uniq>0?cost/uniq:0)+', dengan rentang efisiensi antar program mencapai '+(rasioSpread>0?rasioSpread.toFixed(1)+' kali lipat':'—')+'.'},
      {kv:[
        ['Penerima Manfaat Unik', uniq.toLocaleString()+' orang'],
        ['Total Dana', fmt(cost)],
        ['Biaya Rata-rata per Orang', uniq>0?fmt(cost/uniq):'—'],
        ['Biaya Median per Program', medEfisi>0?fmt(medEfisi):'—'],
        ['Jumlah Program', progs.length.toString()],
        ['Program dengan Data Lengkap', efisi.length+' program (ada benef & biaya)'],
        ['Rasio Gender P:L', g.rasio!==null?g.rasio.toFixed(2):'—'],
        ['Desa Under-Served', underServed.length+' dari '+desaMap.length+' desa'],
        ['Rata-rata Partisipasi', avgPart.toFixed(1)+' kegiatan/orang']
      ]},

      {section:'II. Temuan Utama'},
      {heading:'2.1 Efisiensi Biaya'},
      {text:'Program paling efisien adalah "'+cheapest.p+'" dengan biaya '+fmt(cheapest.r)+' per penerima manfaat, menjangkau '+cheapest.b.toLocaleString()+' orang dengan dana '+fmtShort(cheapest.c)+'. Sebaliknya, program paling mahal adalah "'+priciest.p+'" dengan '+fmt(priciest.r)+' per orang.'},
      {callout:'Selisih efisiensi antar program mencapai '+(rasioSpread>0?rasioSpread.toFixed(1)+' kali lipat':'—')+'. Perbedaan sebesar ini wajar bila jenis intervensi berbeda (misalnya pelatihan massal vs pendampingan intensif), namun perlu ditinjau bila jenis programnya serupa.'},
      {heading:'2.2 Ketimpangan Gender'},
      {text: genderProg.length ? 'Program dengan ketimpangan gender terbesar adalah "'+genderProg[0].p+'" (L: '+genderProg[0].L.toLocaleString()+', P: '+genderProg[0].P.toLocaleString()+', rasio '+(genderProg[0].rasio!==null?genderProg[0].rasio.toFixed(2):'—')+'). Secara keseluruhan rasio P:L adalah '+(g.rasio!==null?g.rasio.toFixed(2):'—')+'.' : ''},
      {heading:'2.3 Kesenjangan Cakupan'},
      {text:'Dari '+desaMap.length+' desa yang terjangkau, '+underServed.length+' desa ('+(desaMap.length?(underServed.length/desaMap.length*100).toFixed(1):0)+'%) hanya dilayani satu program, sementara '+wellServed.length+' desa sudah dilayani tiga program atau lebih. Ketimpangan ini menunjukkan peluang untuk pemerataan intervensi.'},

      {section:'III. Analisis Efisiensi Program'},
      {text:'Efisiensi dihitung sebagai total biaya PJUM dibagi jumlah penerima manfaat unik per program. Tabel berikut juga menyertakan cakupan wilayah dan durasi program agar perbandingan lebih adil — program dengan cakupan luas dan durasi panjang wajar memiliki biaya lebih besar.'},
      {table:{title:'Tabel 3.1 — Efisiensi dan Cakupan per Program',
        head:['#','Program','Benef Unik','Total Biaya','Rp/Benef','Desa','Kab','Durasi'],
        body:efisi.map(function(e,i){return [i+1,e.p,e.b.toLocaleString(),fmtShort(e.c),
          fmt(e.r),e.desa,e.kab,e.durasi>0?e.durasi+' bln':'—'];})}},
      {chart:{canvasId:'ach-efisiensi', height:55, title:'Grafik 3.1 — Efisiensi per Program'}},
      (noCost.length||noBenef.length) ? {heading:'3.1 Catatan Kelengkapan Data Program'} : {spacer:0},
      noCost.length ? {text:'Terdapat '+noCost.length+' program yang memiliki data penerima manfaat namun tidak memiliki catatan biaya PJUM: '+noCost.slice(0,8).join(', ')+(noCost.length>8?', dan lainnya':'')+'. Program ini tidak dapat dihitung efisiensinya.'} : {spacer:0},
      noBenef.length ? {text:'Sebaliknya, '+noBenef.length+' program memiliki catatan biaya namun belum ada data penerima manfaat: '+noBenef.slice(0,8).join(', ')+(noBenef.length>8?', dan lainnya':'')+'.'} : {spacer:0},

      {section:'IV. Analisis Kesetaraan Gender'},
      {text:'Bagian ini menilai keseimbangan gender di setiap program. Rasio P:L sebesar 1,00 berarti seimbang sempurna. Nilai di bawah 1 menunjukkan dominasi laki-laki, di atas 1 dominasi perempuan.'},
      {table:{title:'Tabel 4.1 — Komposisi Gender per Program',
        head:['#','Program','Laki-laki','Perempuan','Total','Rasio P:L','Status'],
        body:genderProg.map(function(x,i){
          var st = x.rasio===null?'—' : (x.rasio>=0.85&&x.rasio<=1.18)?'Seimbang' : x.rasio<0.85?'Dominan L':'Dominan P';
          return [i+1,x.p,x.L.toLocaleString(),x.P.toLocaleString(),x.total.toLocaleString(),
            x.rasio!==null?x.rasio.toFixed(2):'—',st];
        })}},
      {chart:{canvasId:'ach-gender-prog', height:55, title:'Grafik 4.1 — Rasio Gender per Program'}},
      {text:'Sebanyak '+genderProg.filter(function(x){return x.rasio!==null&&x.rasio>=0.85&&x.rasio<=1.18;}).length+' dari '+genderProg.length+' program berada dalam rentang seimbang. '+(g.konflik>0?'Catatan: '+g.konflik+' orang tercatat dengan gender berbeda pada baris berbeda dan telah direkonsiliasi.':'')},

      {section:'V. Cross-Tab: Kategori × Wilayah'},
      {text:'Tabel silang berikut menunjukkan sebaran kategori penerima manfaat di setiap kabupaten. Ini membantu mengidentifikasi apakah jenis intervensi tertentu hanya terkonsentrasi di wilayah tertentu.'},
      {table:{title:'Tabel 5.1 — Jumlah Benef Unik: Kategori × Kabupaten',
        head:['Kategori'].concat(kabList).concat(['Total']),
        body:ctRows}},
      {text:'Angka pada tabel adalah jumlah penerima manfaat unik. Tanda "–" berarti tidak ada penerima manfaat pada kombinasi kategori dan wilayah tersebut.'},

      {section:'VI. Analisis Beban Kerja Staf'},
      {text:'Perbandingan antara jumlah penerima manfaat yang dilayani dengan dana yang dikelola setiap staf. Rasio biaya per penerima manfaat membantu mengidentifikasi perbedaan pola kerja antar staf.'},
      {table:{title:'Tabel 6.1 — Beban Kerja dan Pengelolaan Dana per Staf',
        head:['#','Staf','Benef Unik','Dana Dikelola','Rp/Benef'],
        body:stafRows.slice(0,25).map(function(x,i){return [i+1,x.s,
          x.b>0?x.b.toLocaleString():'—', x.c>0?fmtShort(x.c):'—',
          x.r!==null?fmt(x.r):'—'];})}},
      {chart:{canvasId:'ach-staf-compare', height:55, title:'Grafik 6.1 — Benef vs Biaya per Staf'}},

      {section:'VII. Analisis Cakupan Wilayah'},
      {text:'Bagian ini menilai pemerataan layanan berdasarkan berapa banyak program yang beroperasi di setiap desa.'},
      {kv:[
        ['Total Desa Terjangkau', desaMap.length.toString()],
        ['Dilayani 1 Program', underServed.length+' desa ('+(desaMap.length?(underServed.length/desaMap.length*100).toFixed(1):0)+'%)'],
        ['Dilayani 2 Program', desaMap.filter(function(x){return x.n===2;}).length+' desa'],
        ['Dilayani 3+ Program', wellServed.length+' desa ('+(desaMap.length?(wellServed.length/desaMap.length*100).toFixed(1):0)+'%)'],
        ['Indeks Konsentrasi', concDesa.toFixed(1)+' / 100']
      ]},
      {table:{title:'Tabel 7.1 — Sebaran Kabupaten',
        head:['#','Kabupaten','Kecamatan','Desa','Benef Unik','% Total'],
        body:hier.map(function(h,i){return [i+1,h.kab,h.kec,h.desa,h.uniq.toLocaleString(),
          (uniq?(h.uniq/uniq*100).toFixed(1):0)+'%'];})}},

      {section:'VIII. Perkembangan Tahunan'},
      {text: yearly.length ? 'Perbandingan jangkauan dan biaya dari tahun ke tahun. '+describeTrend(yearly,'uniq') : 'Data temporal tidak tersedia.'},
      yearly.length ? {table:{title:'Tabel 8.1 — Rekap Tahunan',
        head:['Tahun','Benef Unik','Δ%','Biaya PJUM','Transaksi','Rp/Benef','Desa'],
        body:yearly.map(function(r){return [r.tahun,r.uniq.toLocaleString(),
          r.growth===null?'—':(r.growth>=0?'+':'')+r.growth.toFixed(1)+'%',
          fmtShort(r.biaya),r.trx.toLocaleString(),r.rpp>0?fmtShort(r.rpp):'—',r.desa];})}} : {spacer:0},
      {chart:{canvasId:'ach-trend-prog', height:52, title:'Grafik 8.1 — Tren Benef per Program (Top 4)'}},

      {section:'IX. Kualitas Data'},
      {text:'Analisis silang sangat bergantung pada kelengkapan kedua sumber data. Anomali berikut perlu diperhatikan karena dapat mempengaruhi akurasi kesimpulan.'},
      anomali.length ? {table:{title:'Tabel 9.1 — Anomali Terdeteksi',
        head:['Jenis Anomali','Jumlah','Dampak pada Analisis'],
        body:anomali.map(function(a){return [a.jenis,a.jml.toLocaleString(),a.ket];})}} : {text:'Tidak ditemukan anomali signifikan.'},
      (noCost.length||noBenef.length) ? {text:'Selain itu, '+noCost.length+' program tidak memiliki data biaya dan '+noBenef.length+' program tidak memiliki data penerima manfaat, sehingga tidak dapat dianalisis efisiensinya.'} : {spacer:0},

      {section:'X. Kesimpulan dan Rekomendasi'},
      {text:'Berdasarkan analisis silang di atas, berikut temuan utama dan hal yang dapat ditindaklanjuti:'},
      {bullet:'Efisiensi: rentang biaya per penerima manfaat berkisar '+fmtShort(cheapest.r)+' hingga '+fmtShort(priciest.r)+'. Tinjau program dengan biaya jauh di atas median ('+fmtShort(medEfisi)+') untuk memastikan kewajaran.'},
      {bullet:'Gender: '+genderProg.filter(function(x){return x.rasio!==null&&(x.rasio<0.85||x.rasio>1.18);}).length+' program memiliki ketimpangan gender di luar rentang seimbang. Pertimbangkan strategi penjangkauan khusus.'},
      {bullet:'Pemerataan: '+underServed.length+' desa hanya dilayani satu program. Prioritaskan integrasi layanan di desa-desa ini.'},
      {bullet:'Kelengkapan data: '+(noCost.length+noBenef.length)+' program memiliki data tidak lengkap. Lengkapi pencatatan agar analisis efisiensi mencakup seluruh program.'},
      {bullet:'Inklusi: '+(disab.total?(disab.adaDisab/disab.total*100).toFixed(1):0)+'% penerima manfaat adalah penyandang disabilitas dengan '+disab.jenis.length+' ragam berbeda.'}
    ],
    lampiran:[
      {table:{title:'Tabel A1 — Jangkauan dan Durasi Seluruh Program',
        head:['#','Program','Benef Unik','Desa','Kec','Kab','Mulai','Akhir','Durasi'],
        body:reach.map(function(r,i){return [i+1,r.program,r.uniq.toLocaleString(),r.desa,r.kec,r.kab,
          r.mulai?fmtPeriod(r.mulai):'—', r.akhir?fmtPeriod(r.akhir):'—',
          r.durasi>0?r.durasi+' bln':'—'];})}},
      {table:{title:'Tabel A2 — Desa Under-Served',
        head:['#','Desa','Program yang Melayani'],
        body:underServed.slice(0,40).map(function(x,i){return [i+1,x.desa,x.programs[0]||'—'];})}},
      {table:{title:'Tabel A3 — Desa dengan Cakupan Terbaik',
        head:['#','Desa','Jumlah Program','Daftar Program'],
        body:wellServed.slice(0,25).map(function(x,i){return [i+1,x.desa,x.n,
          x.programs.slice(0,3).join(', ')+(x.programs.length>3?', ...':'')];})}},
      {table:{title:'Tabel A4 — Ragam Disabilitas',
        head:['#','Ragam','Jumlah','% dari Penyandang'],
        body:disab.jenis.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),
          (disab.adaDisab?(x[1]/disab.adaDisab*100).toFixed(1):0)+'%'];})}}
    ],
    metodologi: stdMetodologi([
      'Efisiensi biaya dihitung sebagai total PJUM program dibagi jumlah penerima manfaat unik program tersebut. Program tanpa salah satu data tidak dimasukkan dalam perhitungan efisiensi.',
      'Perbandingan efisiensi antar program perlu mempertimbangkan jenis intervensi, cakupan wilayah, dan durasi. Program pendampingan intensif secara alami memiliki biaya per orang lebih tinggi daripada program penyuluhan massal.',
      'Rentang "seimbang" untuk rasio gender ditetapkan pada 0,85–1,18 (setara 46%–54% perempuan).',
      'Indeks konsentrasi menggunakan HHI ternormalisasi (0–100).'
    ])
  });
};
