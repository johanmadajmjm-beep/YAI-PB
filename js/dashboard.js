/* ═══════════════════════════════════════════════
   dashboard.js — Executive Dashboard page
═══════════════════════════════════════════════ */

function buildDashboard() {
  var filtered = getDashFiltered();
  var pjum  = filtered.pjum;
  var benef = filtered.benef;
  var P = window.P, B = window.B;

  /* ── KPI Cards ── */
  var uniqBenef = countUniqBenef(benef);
  var totalRows = benef.length;
  var fileSet = {};
  pjum.forEach(function(r) { if(r[P.file]) fileSet[r[P.file]] = 1; });
  var totalPjum = Object.keys(fileSet).length;
  var benefFileSet = {};
  benef.forEach(function(r) { if(r[B.file]) benefFileSet[r[B.file]] = 1; });
  var totalBenefFile = Object.keys(benefFileSet).length;
  var totalCost = pjum.reduce(function(s, r) { return s + (parseFloat(r[P.jumlah]) || 0); }, 0);
  var desaSet = {};
  benef.forEach(function(r) { if(r[B.desa]) desaSet[r[B.desa]] = 1; });
  var totalDesa = Object.keys(desaSet).length;
  var kabSet = {};
  benef.forEach(function(r) { if(r[B.kab]) kabSet[r[B.kab]] = 1; });
  var totalKab = Object.keys(kabSet).length;

  setEl('kpi-benef', uniqBenef.toLocaleString('id-ID'));
  setEl('kpi-pjum',  totalPjum.toLocaleString('id-ID'));
  setEl('kpi-benef-file', totalBenefFile.toLocaleString('id-ID'));
  setEl('kpi-desa',  totalDesa.toLocaleString('id-ID'));
  setEl('kpi-kab',   totalKab + ' Kabupaten');
  setEl('kpi-biaya', fmtShort(totalCost));
  setEl('kpi-uniq',  totalRows.toLocaleString('id-ID') + ' total records');

  var tahunF = v('dash-tahun'), bulanF = v('dash-bulan');
  var periodLabel = '';
  if (tahunF && tahunF !== '__blank__') {
    periodLabel = bulanF && bulanF !== '__blank__' ? bulanName(bulanF) + ' ' + tahunF : 'Tahun ' + tahunF;
  } else if (bulanF && bulanF !== '__blank__') {
    periodLabel = 'Bulan ' + bulanName(bulanF);
  }
  setEl('kpi-pjum-sub', periodLabel ? 'file · ' + periodLabel : 'file terupload');
  setEl('kpi-benef-file-sub', periodLabel ? 'file · ' + periodLabel : 'file terupload');

  /* ── Trend Benef per Bulan ── */
  var benefByBulan = sortedBulan(groupCountUniq(benef, function(r) { return validTgl(r[B.tgl]); }));
  renderTrendOrMsg('ch-dash-benef-trend', benefByBulan, function() {
    mkLine('ch-dash-benef-trend',
      benefByBulan.map(function(x){var p=x[0].split('-');return bulanName(p[1])+"'"+p[0].slice(2);}),
      benefByBulan.map(function(x){return x[1];}),
      '#F97316',{label:'Beneficiary',noLegend:true});
  });

  /* ── Distribusi Jenis Benef (donut) ── */
  var katData  = topN(groupCountUniq(benef, function(r) { return r[B.kategori]; }), 6);
  var katTotal = katData.reduce(function(s, x) { return s + x[1]; }, 0);
  mkDonut('ch-dash-benef-donut',
    katData.map(function(x) { return x[0]; }),
    katData.map(function(x) { return x[1]; }));
  setEl('donut-center-val', uniqBenef.toLocaleString());
  setEl('donut-center-lbl', 'Unik');
  renderDonutLegend('donut-legend', katData, katTotal);

  /* ── Benef per Desa ── */
  var desaData = topN(groupCountUniq(benef, function(r) { return r[B.desa]; }), 10);
  var desaMax  = desaData[0] ? desaData[0][1] : 1;
  renderRankList('rank-desa', desaData, desaMax, function(v) { return v.toLocaleString(); }, false);

  /* ── Pengeluaran PJUM per Bulan ── */
  var pjumByBulan = sortedBulan(groupSum(pjum,
    function(r) { return validTgl(r[P.tgl]); },
    function(r) { return r[P.jumlah]; }
  ));
  renderTrendOrMsg('ch-dash-pjum-trend', pjumByBulan, function() {
    mkBar('ch-dash-pjum-trend',
      pjumByBulan.map(function(x){var p=x[0].split('-');return bulanName(p[1])+"'"+p[0].slice(2);}),
      pjumByBulan.map(function(x){return x[1];}),
      '#F97316',{label:'Pengeluaran',yFmt:fmtShort,noLegend:true});
  });

  /* ── Top Jenis Kegiatan ── */
  var kegData = topN(groupCountUniq(benef, function(r) { return r[B.kegiatan]; }), 5);
  renderRankList('rank-kegiatan', kegData, kegData[0]?kegData[0][1]:1, function(v) {
    return v.toLocaleString() + ' (' + (uniqBenef?(v/uniqBenef*100).toFixed(1):0) + '%)';
  }, true);

  /* ── Top Benefit Diterima ── */
  var benData = topN(groupCountUniq(benef, function(r) { return r[B.benefit] || r[B.kegiatan]; }), 5);
  renderRankList('rank-benefit', benData, benData[0]?benData[0][1]:1, function(v) {
    return v.toLocaleString() + ' (' + (uniqBenef?(v/uniqBenef*100).toFixed(1):0) + '%)';
  }, true);

  /* ── AI Insight ── */
  buildAiInsight(benef, pjum);
  /* ── Notifikasi ── */
  buildNotifications(benef, pjum);
}

/* ── Reusable: render chart or show "no date" message ── */
function renderTrendOrMsg(canvasId, data, renderFn) {
  var el = document.getElementById(canvasId);
  var wrap = el ? el.parentElement : null;
  var msgId = canvasId + '-notgl';
  var msgEl = document.getElementById(msgId);
  if (data.length === 0) {
    if (el) el.style.display = 'none';
    if (!msgEl && wrap) {
      var msg = document.createElement('div'); msg.id = msgId;
      msg.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:12px;flex-direction:column;gap:6px';
      msg.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>Data tanggal tidak tersedia untuk filter ini</span>';
      wrap.appendChild(msg);
    } else if (msgEl) msgEl.style.display = 'flex';
  } else {
    if (el) el.style.display = '';
    if (msgEl) msgEl.style.display = 'none';
    renderFn();
  }
}

function buildAiInsight(benef, pjum) {
  var B = window.B, P = window.P;
  var uniqTotal = countUniqBenef(benef);
  var kabData   = topN(groupCountUniq(benef, function(r) { return r[B.kab]; }), 1);
  var topKab    = kabData[0] ? kabData[0][0] : '—';
  var topKabPct = uniqTotal ? ((kabData[0]?kabData[0][1]:0) / uniqTotal * 100).toFixed(1) : '0';
  var pjumBulan = sortedBulan(groupSum(pjum, function(r) { return validTgl(r[P.tgl]); }, function(r) { return r[P.jumlah]; }));
  var topBulanCost = pjumBulan.reduce(function(b, c) { return c[1] > (b[1]||0) ? c : b; }, ['—', 0]);
  var tbp = (topBulanCost[0]||'-').split('-');
  var topBulan = tbp[1] ? bulanFull(tbp[1]) + ' ' + tbp[0] : '—';
  var kegData  = topN(groupCountUniq(benef, function(r) { return r[B.kegiatan]; }), 1);
  var topKeg   = kegData[0] ? kegData[0][0] : '—';
  setEl('ai-insight-text',
    'Kabupaten <strong>' + topKab + '</strong> berkontribusi ' + topKabPct + '% dari seluruh penerima manfaat. ' +
    'Kegiatan terbanyak adalah <strong>' + topKeg + '</strong>. ' +
    'Pengeluaran PJUM tertinggi pada <strong>' + topBulan + '</strong> senilai <strong>' + fmtShort(topBulanCost[1]) + '</strong>.');
}

function buildNotifications(benef, pjum) {
  var B = window.B, P = window.P;
  var items = [];
  var noTgl = benef.filter(function(r) { return !validTgl(r[B.tgl]); }).length;
  if (noTgl > 0) items.push({type:'warn', title:noTgl.toLocaleString()+' record benef tanpa tanggal', desc:'Tidak muncul di grafik trend'});
  var noDesa = benef.filter(function(r) { return !r[B.desa] || r[B.desa]==='—'; }).length;
  if (noDesa > 0) items.push({type:'warn', title:noDesa.toLocaleString()+' record benef tanpa desa', desc:'Sebaran wilayah mungkin tidak akurat'});
  var noGender = benef.filter(function(r) { return r[B.gender]==='—'; }).length;
  if (noGender > 0) items.push({type:'info', title:noGender.toLocaleString()+' record tanpa gender', desc:'Gender tidak terisi (L/P)'});
  var pjumNoTgl = pjum.filter(function(r) { return !validTgl(r[P.tgl]); }).length;
  if (pjumNoTgl > 0) items.push({type:'warn', title:pjumNoTgl.toLocaleString()+' PJUM tanpa tanggal', desc:'Tidak muncul di grafik'});
  if (items.length === 0) items.push({type:'ok', title:'Semua data terlihat baik', desc:countUniqBenef(benef).toLocaleString()+' benef unik'});

  var badge = document.getElementById('notif-badge');
  var list  = document.getElementById('notif-list');
  if (!badge || !list) return;
  var wc = items.filter(function(i){return i.type==='warn';}).length;
  badge.textContent = wc; badge.style.display = wc > 0 ? 'flex' : 'none';
  var iconMap={warn:'⚠️',info:'ℹ️',ok:'✅'}, classMap={warn:'ni-warn',info:'ni-info',ok:'ni-ok'};
  list.innerHTML = items.map(function(it) {
    return '<div class="notif-item"><div class="ni-icon '+classMap[it.type]+'">'+iconMap[it.type]+'</div>' +
      '<div class="ni-body"><div class="ni-title">'+it.title+'</div><div>'+it.desc+'</div></div></div>';
  }).join('');
}

/* ── Notif toggle — self-attaching, retries until DOM ready ── */
(function _attachNotif() {
  var btn = document.getElementById('btn-notif');
  var panel = document.getElementById('notif-panel');
  if (!btn || !panel) { setTimeout(_attachNotif, 200); return; }
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', function(e) {
    if (!btn.contains(e.target)) panel.style.display = 'none';
  });
})();

/* ── Dashboard PDF Export — Narrative ── */
window.exportDashPDF = function() {
  var filtered = getDashFiltered();
  var benef = filtered.benef, pjum = filtered.pjum;
  var B = window.B, P = window.P;
  var uniq = countUniqBenef(benef);
  var cost = pjum.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
  var desaS={}; benef.forEach(function(r){if(r[B.desa])desaS[r[B.desa]]=1;});
  var kabS={}; benef.forEach(function(r){if(r[B.kab])kabS[r[B.kab]]=1;});
  var gL=countUniqByGender(benef,'L'), gP=countUniqByGender(benef,'P');
  var filterText = getFilterSummary([
    {label:'Program',val:v('dash-proyek')},{label:'Staf',val:v('dash-staf')},
    {label:'Tahun',val:v('dash-tahun')},{label:'Bulan',val:v('dash-bulan')?bulanName(v('dash-bulan')):''}
  ]);
  var desaData = topN(groupCountUniq(benef, function(r){return r[B.desa];}), 15);
  var kegData = topN(groupCountUniq(benef, function(r){return r[B.kegiatan];}), 10);
  var topDesa = desaData[0]||['—',0];
  var topKeg = kegData[0]||['—',0];
  var rppAvg = uniq > 0 ? cost/uniq : 0;

  buildPDF({
    title: 'Ringkasan Eksekutif', subtitle: 'Yayasan Ayo Indonesia', filterText: filterText, filename: 'Dashboard_Report.pdf',
    narrative: [
      {heading: 'Ringkasan Eksekutif'},
      {text: 'Laporan ini menyajikan ringkasan kinerja program Yayasan Ayo Indonesia berdasarkan data yang tersedia. Secara keseluruhan, program telah menjangkau '+uniq.toLocaleString()+' penerima manfaat unik yang tersebar di '+Object.keys(desaS).length+' desa/kelurahan pada '+Object.keys(kabS).length+' kabupaten/kota. Total biaya PJUM yang tercatat sebesar '+fmt(cost)+' dari '+pjum.length.toLocaleString()+' transaksi.'},
      {heading: 'Profil Penerima Manfaat'},
      {text: 'Dari total '+uniq.toLocaleString()+' penerima manfaat unik, sebanyak '+gL.toLocaleString()+' orang berjenis kelamin laki-laki dan '+gP.toLocaleString()+' orang perempuan'+(uniq>0?' (rasio P:L = '+(gL>0?(gP/gL).toFixed(2):'—')+')':'')+'. Data ini berasal dari '+benef.length.toLocaleString()+' total catatan partisipasi kegiatan.'},
      {text: 'Desa dengan penerima manfaat terbanyak adalah '+topDesa[0]+' dengan '+topDesa[1].toLocaleString()+' orang'+(uniq>0?' ('+(topDesa[1]/uniq*100).toFixed(1)+'% dari total)':'')+'. Kegiatan yang paling banyak menjangkau penerima manfaat adalah "'+topKeg[0]+'" dengan '+topKeg[1].toLocaleString()+' orang unik.'},
      {heading: 'Penggunaan Dana'},
      {text: 'Total pengeluaran PJUM mencapai '+fmt(cost)+' untuk melayani '+uniq.toLocaleString()+' penerima manfaat, sehingga rata-rata biaya per orang adalah '+fmtShort(rppAvg)+'. Rincian pengeluaran per program dan per staf dapat dilihat pada lampiran.'}
    ],
    lampiran: [
      {heading:'Tabel A1: Distribusi per Desa (Top '+desaData.length+')'},
      {table:{head:['#','Desa','Benef Unik','%'], body:desaData.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(1):0)+'%'];})}},
      {heading:'Tabel A2: Top Kegiatan'},
      {table:{head:['#','Kegiatan','Benef Unik','%'], body:kegData.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(1):0)+'%'];})}},
      {heading:'Grafik B1: Trend Beneficiary per Bulan'},
      {chart:{canvasId:'ch-dash-benef-trend',height:55}},
      {heading:'Grafik B2: Pengeluaran PJUM per Bulan'},
      {chart:{canvasId:'ch-dash-pjum-trend',height:55}}
    ]
  });
};

function renderDonutLegend(id, entries, total) {
  var el = document.getElementById(id); if (!el) return;
  el.innerHTML = entries.map(function(x, i) {
    return '<div class="dl-item"><div class="dl-dot" style="background:'+PALETTE[i%PALETTE.length]+'"></div>' +
      '<div class="dl-name">'+x[0]+'</div><div class="dl-pct">'+(total?(x[1]/total*100).toFixed(1):0)+'%</div></div>';
  }).join('');
}

function renderRankList(id, entries, max, valFmt, showBar) {
  var el = document.getElementById(id); if (!el) return;
  el.innerHTML = entries.map(function(x, i) {
    var bar = showBar ? '<div class="rank-bar"><div class="rank-bar-fill" style="width:'+(max?x[1]/max*100:0)+'%"></div></div>' : '';
    return '<div class="rank-item cols3"><div class="rank-num '+(i<3?'top':'')+'">'+(i+1)+'</div>' +
      '<div><div class="rank-name">'+x[0]+'</div>'+bar+'</div><div class="rank-val">'+valFmt(x[1])+'</div></div>';
  }).join('');
}
