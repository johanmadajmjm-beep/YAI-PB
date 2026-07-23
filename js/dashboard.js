/* ═══════════════════════════════════════════════
   dashboard.js — Executive Dashboard
   BUILD: 2026-07-23-r3
═══════════════════════════════════════════════ */
console.log('[YAI] dashboard.js BUILD 2026-07-23-r3 dimuat');

/* ── Render helper: donut legend ── */
function renderDonutLegend(id, entries, total) {
  var el = document.getElementById(id); if (!el) return;
  el.innerHTML = entries.map(function(x, i) {
    return '<div class="dl-item"><div class="dl-dot" style="background:'+PALETTE[i%PALETTE.length]+'"></div>' +
      '<div class="dl-name">'+x[0]+'</div><div class="dl-pct">'+(total?(x[1]/total*100).toFixed(1):0)+'%</div></div>';
  }).join('');
}
window.renderDonutLegend = renderDonutLegend;

/* ── Render helper: ranked list ── */
function renderRankList(id, entries, max, valFmt, showBar) {
  var el = document.getElementById(id); if (!el) return;
  el.innerHTML = entries.map(function(x, i) {
    var bar = showBar ? '<div class="rank-bar"><div class="rank-bar-fill" style="width:'+(max?x[1]/max*100:0)+'%"></div></div>' : '';
    return '<div class="rank-item cols3"><div class="rank-num '+(i<3?'top':'')+'">'+(i+1)+'</div>' +
      '<div><div class="rank-name">'+x[0]+'</div>'+bar+'</div><div class="rank-val">'+valFmt(x[1])+'</div></div>';
  }).join('');
}
window.renderRankList = renderRankList;

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

var NOTIF_SNAP_KEY = 'yai_notif_snap_v1';

/* Cari info staf & program dari row pertama yang memakai file tsb */
function _notifFileInfo(rows, fileIdx, stafIdx, progIdx, fname) {
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][fileIdx] === fname) {
      return { staf: rows[i][stafIdx] || '—', prog: rows[i][progIdx] || '—' };
    }
  }
  return { staf: '—', prog: '—' };
}

function buildNotifications(benef, pjum) {
  /* Notifikasi selalu berbasis data mentah penuh (bukan hasil filter dashboard),
     supaya deteksi "data baru" konsisten */
  var B = window.B, P = window.P;
  var benefAll = window.rawBenef || benef, pjumAll = window.rawPjum || pjum;

  var snap = null;
  try { snap = JSON.parse(localStorage.getItem(NOTIF_SNAP_KEY) || 'null'); } catch(e) {}

  var curFP = {}, curFB = {};
  pjumAll.forEach(function(r) { if (r[P.file]) curFP[r[P.file]] = 1; });
  benefAll.forEach(function(r) { if (r[B.file]) curFB[r[B.file]] = 1; });

  var items = [], newCount = 0;

  if (snap) {
    var dB = benefAll.length - (snap.b || 0);
    if (dB > 0) { items.push({type:'ok', title:'+' + dB.toLocaleString() + ' record beneficiary baru', desc:'Masuk sejak kunjungan terakhir'}); newCount++; }
    var dP = pjumAll.length - (snap.p || 0);
    if (dP > 0) { items.push({type:'ok', title:'+' + dP.toLocaleString() + ' transaksi PJUM baru', desc:'Masuk sejak kunjungan terakhir'}); newCount++; }

    var oldFP = {}, oldFB = {};
    (snap.fp || []).forEach(function(f) { oldFP[f] = 1; });
    (snap.fb || []).forEach(function(f) { oldFB[f] = 1; });
    var newFP = Object.keys(curFP).filter(function(f) { return !oldFP[f]; });
    var newFB = Object.keys(curFB).filter(function(f) { return !oldFB[f]; });

    newFP.slice(0, 4).forEach(function(f) {
      var info = _notifFileInfo(pjumAll, P.file, P.staf, P.proyek, f);
      items.push({type:'info', title:'File PJUM baru: ' + f, desc:info.staf + ' · ' + info.prog});
      newCount++;
    });
    if (newFP.length > 4) { items.push({type:'info', title:'+' + (newFP.length - 4) + ' file PJUM baru lainnya', desc:'Lihat detail di halaman PJUM'}); newCount++; }
    newFB.slice(0, 4).forEach(function(f) {
      var info = _notifFileInfo(benefAll, B.file, B.staf, B.proyek, f);
      items.push({type:'info', title:'File Benef baru: ' + f, desc:info.staf + ' · ' + info.prog});
      newCount++;
    });
    if (newFB.length > 4) { items.push({type:'info', title:'+' + (newFB.length - 4) + ' file benef baru lainnya', desc:'Lihat detail di halaman Beneficiary'}); newCount++; }

    if (newCount === 0) {
      items.push({type:'ok', title:'Tidak ada data baru', desc:benefAll.length.toLocaleString() + ' record benef · ' + pjumAll.length.toLocaleString() + ' transaksi PJUM'});
    }
  } else {
    items.push({type:'info', title:'Pemantauan data masuk aktif', desc:'Data baru akan muncul di sini pada kunjungan berikutnya'});
  }

  /* Kualitas data — info sekunder, satu baris ringkas */
  var noTgl = benefAll.filter(function(r) { return !validTgl(r[B.tgl]); }).length;
  var pjumNoTgl = pjumAll.filter(function(r) { return !validTgl(r[P.tgl]); }).length;
  if (noTgl + pjumNoTgl > 0) {
    items.push({type:'warn', title:(noTgl + pjumNoTgl).toLocaleString() + ' record tanpa tanggal',
      desc:'Kualitas data: ' + noTgl.toLocaleString() + ' benef · ' + pjumNoTgl.toLocaleString() + ' PJUM (tidak muncul di grafik trend)'});
  }

  /* Snapshot pending — disimpan saat panel dibuka (tandai terbaca) */
  window._notifPending = { b: benefAll.length, p: pjumAll.length, fp: Object.keys(curFP), fb: Object.keys(curFB) };

  var badge = document.getElementById('notif-badge');
  var list  = document.getElementById('notif-list');
  if (!badge || !list) return;
  badge.textContent = newCount;
  badge.style.display = newCount > 0 ? 'flex' : 'none';
  var iconMap={warn:'⚠️',info:'📥',ok:'✅'}, classMap={warn:'ni-warn',info:'ni-info',ok:'ni-ok'};
  list.innerHTML = items.map(function(it) {
    return '<div class="notif-item"><div class="ni-icon '+classMap[it.type]+'">'+iconMap[it.type]+'</div>' +
      '<div class="ni-body"><div class="ni-title">'+it.title+'</div><div>'+it.desc+'</div></div></div>';
  }).join('');
}

/* Tandai terbaca: simpan snapshot & sembunyikan badge */
window.markNotifRead = function() {
  if (window._notifPending) {
    try { localStorage.setItem(NOTIF_SNAP_KEY, JSON.stringify(window._notifPending)); } catch(e) {}
  }
  var badge = document.getElementById('notif-badge');
  if (badge) badge.style.display = 'none';
};

/* ── Notif toggle — self-attaching, retries until DOM ready ── */
(function _attachNotif() {
  var btn = document.getElementById('btn-notif');
  var panel = document.getElementById('notif-panel');
  if (!btn || !panel) { setTimeout(_attachNotif, 200); return; }
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    var opening = panel.style.display === 'none';
    panel.style.display = opening ? 'block' : 'none';
    if (opening && window.markNotifRead) window.markNotifRead();
  });
  document.addEventListener('click', function(e) {
    if (!btn.contains(e.target)) panel.style.display = 'none';
  });
})();


/* ══════════════════════════════════════════════════
   Dashboard PDF — Laporan Lengkap 8 Bagian
══════════════════════════════════════════════════ */
window.exportDashPDF = function() {
  var f = getDashFiltered();
  var benef = f.benef, pjum = f.pjum;
  var B = window.B, P = window.P;

  var uniq = countUniqBenef(benef);
  var cost = pjum.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
  var g = genderBreakdown(benef);
  var progs = allProgramList(benef, pjum);
  var per = dataPeriod(benef, B.tgl);
  var perP = dataPeriod(pjum, P.tgl);
  var yearly = calcGrowth(yearlyRecap(benef, pjum), 'uniq');
  var yearlyCost = calcGrowth(yearlyRecap(benef, pjum), 'biaya');
  var hier = wilayahHierarchy(benef);
  var disab = disabilityBreakdown(benef);
  var reach = programReach(benef);
  var desaMap = desaProgramMap(benef);
  var anomali = detectAnomalies(benef, pjum);
  var avgPart = avgParticipation(benef);

  var desaS={}, kecS={}, kabS={}, stafS={};
  benef.forEach(function(r){ if(r[B.desa])desaS[r[B.desa]]=1; if(r[B.kec])kecS[r[B.kec]]=1; if(r[B.kab])kabS[r[B.kab]]=1; if(r[B.staf])stafS[r[B.staf]]=1; });

  var byDesa = topN(groupCountUniq(benef, function(r){return r[B.desa];}), 25);
  var byKeg  = topN(groupCountUniq(benef, function(r){return r[B.kegiatan];}), 15);
  var byKat  = uniqGroupField(benef, B.kategori);
  var byUsia = uniqGroupField(benef, B.katUsia);
  var byBenefit = topN(groupCountUniq(benef, function(r){return r[B.benefit];}), 12);
  var byKomp = topN(groupSum(pjum, function(r){return classifyItem(r[P.item]);}, function(r){return r[P.jumlah];}), 12);
  var byStafCost = topN(groupSum(pjum, function(r){return r[P.staf];}, function(r){return r[P.jumlah];}), 15);
  var peakB = peakMonths(benef, B.tgl, 'uniq');
  var peakP = peakMonths(pjum, P.tgl, 'sum', P.jumlah);
  var underServed = desaMap.filter(function(d){return d.n===1;});
  var concIdx = concentrationIndex(byDesa.map(function(x){return x[1];}));

  var complete = columnCompleteness(benef, [
    {idx:B.nama,label:'Nama'},{idx:B.gender,label:'Jenis Kelamin'},{idx:B.katUsia,label:'Kategori Usia'},
    {idx:B.kategori,label:'Kategori Benef'},{idx:B.disab,label:'Disabilitas'},{idx:B.desa,label:'Desa'},
    {idx:B.kec,label:'Kecamatan'},{idx:B.kab,label:'Kabupaten'},{idx:B.proyek,label:'Program'},
    {idx:B.kegiatan,label:'Kegiatan'},{idx:B.benefit,label:'Benefit'},{idx:B.staf,label:'Staf'},
    {idx:B.tgl,label:'Tanggal',isDate:true}
  ]);

  var filterText = getFilterSummary([
    {label:'Program',val:v('dash-proyek')},{label:'Staf',val:v('dash-staf')},
    {label:'Tahun',val:v('dash-tahun')},{label:'Bulan',val:v('dash-bulan')?bulanName(v('dash-bulan')):''}
  ]);

  var topDesa = byDesa[0]||['—',0], topKeg = byKeg[0]||['—',0];
  var topKab = hier[0]||{kab:'—',uniq:0};
  var topKomp = byKomp[0]||['—',0];

  buildPDF({
    title:'Laporan Kinerja Program', subtitle:'Yayasan Ayo Indonesia',
    filterText:filterText, filename:'Laporan_Kinerja_Program.pdf',
    meta:{ periode: per ? fmtPeriod(per.start)+' – '+fmtPeriod(per.end) : 'Tidak tersedia',
           sumber:'Google Sheets YAI (Beneficiary & PJUM)' },
    body:[
      {section:'I. Ringkasan Eksekutif'},
      {text:'Laporan ini menyajikan kinerja program Yayasan Ayo Indonesia berdasarkan data penerima manfaat (beneficiary) dan pertanggungjawaban uang muka (PJUM). Data mencakup periode '+(per?fmtPeriod(per.start)+' hingga '+fmtPeriod(per.end):'yang tersedia')+'.'},
      {text:'Selama periode tersebut, program telah menjangkau '+uniq.toLocaleString()+' penerima manfaat unik melalui '+progs.length+' program yang dijalankan oleh '+Object.keys(stafS).length+' staf. Cakupan wilayah meliputi '+Object.keys(desaS).length+' desa/kelurahan pada '+Object.keys(kecS).length+' kecamatan di '+Object.keys(kabS).length+' kabupaten/kota. Total dana yang tersalurkan mencapai '+fmt(cost)+' melalui '+pjum.length.toLocaleString()+' transaksi.'},
      {kv:[
        ['Penerima Manfaat Unik', uniq.toLocaleString()+' orang'],
        ['Total Catatan Partisipasi', benef.length.toLocaleString()+' baris'],
        ['Rata-rata Partisipasi', avgPart.toFixed(1)+' kegiatan per orang'],
        ['Total Dana PJUM', fmt(cost)],
        ['Jumlah Transaksi', pjum.length.toLocaleString()],
        ['Biaya per Penerima Manfaat', uniq>0?fmt(cost/uniq):'—'],
        ['Jumlah Program', progs.length.toString()],
        ['Cakupan Wilayah', Object.keys(desaS).length+' desa / '+Object.keys(kecS).length+' kec / '+Object.keys(kabS).length+' kab']
      ]},
      {callout:'Setiap penerima manfaat rata-rata mengikuti '+avgPart.toFixed(1)+' kegiatan, dengan biaya rata-rata '+(uniq>0?fmtShort(cost/uniq):'—')+' per orang.'},

      {section:'II. Analisis Temporal'},
      {text:'Bagian ini menganalisis perkembangan program dari tahun ke tahun. '+describeTrend(yearly,'uniq')},
      {table:{title:'Tabel 2.1 — Rekap Tahunan',
        head:['Tahun','Benef Unik','Δ%','Records','Desa','Kegiatan','Biaya PJUM','Transaksi','Rp/Benef'],
        body:yearly.map(function(r,i){
          return [r.tahun, r.uniq.toLocaleString(),
            r.growth===null?'—':(r.growth>=0?'+':'')+r.growth.toFixed(1)+'%',
            r.records.toLocaleString(), r.desa, r.kegiatan,
            fmtShort(r.biaya), r.trx.toLocaleString(), r.rpp>0?fmtShort(r.rpp):'—'];
        })}},
      {text: peakB ? 'Bulan dengan jangkauan penerima manfaat tertinggi adalah '+fmtPeriod(peakB.top[0])+' dengan '+peakB.top[1].toLocaleString()+' orang unik, sedangkan yang terendah adalah '+fmtPeriod(peakB.bottom[0])+' dengan '+peakB.bottom[1].toLocaleString()+' orang. Rata-rata per bulan adalah '+Math.round(peakB.avg).toLocaleString()+' orang.' : 'Data temporal beneficiary tidak tersedia.'},
      {text: peakP ? 'Dari sisi pengeluaran, bulan dengan realisasi tertinggi adalah '+fmtPeriod(peakP.top[0])+' sebesar '+fmt(peakP.top[1])+', dan terendah pada '+fmtPeriod(peakP.bottom[0])+' sebesar '+fmt(peakP.bottom[1])+'. Rata-rata pengeluaran bulanan mencapai '+fmt(peakP.avg)+'.' : 'Data temporal PJUM tidak tersedia.'},
      {chart:{canvasId:'ch-dash-benef-trend', height:52, title:'Grafik 2.1 — Tren Penerima Manfaat per Bulan'}},
      {chart:{canvasId:'ch-dash-pjum-trend', height:52, title:'Grafik 2.2 — Tren Pengeluaran PJUM per Bulan'}},

      {section:'III. Profil Penerima Manfaat'},
      {heading:'3.1 Komposisi Gender'},
      {text:'Dari '+g.total.toLocaleString()+' penerima manfaat unik, sebanyak '+g.P.toLocaleString()+' orang ('+g.pctP.toFixed(1)+'%) adalah perempuan dan '+g.L.toLocaleString()+' orang ('+g.pctL.toFixed(1)+'%) adalah laki-laki'+(g.X>0?', serta '+g.X.toLocaleString()+' orang ('+g.pctX.toFixed(1)+'%) tidak memiliki catatan gender':'')+'. Rasio perempuan terhadap laki-laki adalah '+(g.rasio!==null?g.rasio.toFixed(2):'—')+'.'},
      {text: g.rasio===null ? '' : (g.rasio>=0.9&&g.rasio<=1.1 ? 'Rasio ini menunjukkan keseimbangan gender yang baik dalam penjangkauan program.' : g.rasio<0.9 ? 'Rasio ini menunjukkan penjangkauan yang lebih dominan pada laki-laki. Perlu strategi khusus untuk meningkatkan partisipasi perempuan.' : 'Rasio ini menunjukkan penjangkauan yang lebih dominan pada perempuan.')},
      {heading:'3.2 Kategori Usia'},
      {text: byUsia.length ? 'Kelompok usia terbesar adalah "'+byUsia[0][0]+'" dengan '+byUsia[0][1].toLocaleString()+' orang ('+(uniq?(byUsia[0][1]/uniq*100).toFixed(1):0)+'%). Rincian lengkap tersedia pada Lampiran Tabel A3.' : 'Data kategori usia belum tersedia.'},
      {heading:'3.3 Kategori Penerima Manfaat'},
      {text: byKat.length ? 'Kategori terbesar adalah "'+byKat[0][0]+'" dengan '+byKat[0][1].toLocaleString()+' orang ('+(uniq?(byKat[0][1]/uniq*100).toFixed(1):0)+'%)'+(byKat.length>1?', diikuti "'+byKat[1][0]+'" ('+byKat[1][1].toLocaleString()+' orang)':'')+(byKat.length>2?' dan "'+byKat[2][0]+'" ('+byKat[2][1].toLocaleString()+' orang)':'')+'. Total terdapat '+byKat.length+' kategori berbeda.' : 'Data kategori belum tersedia.'},
      {heading:'3.4 Penyandang Disabilitas'},
      {text:'Sebanyak '+disab.adaDisab.toLocaleString()+' orang ('+(disab.total?(disab.adaDisab/disab.total*100).toFixed(1):0)+'%) teridentifikasi sebagai penyandang disabilitas, tersebar dalam '+disab.jenis.length+' ragam disabilitas. Sisanya '+disab.tanpaDisab.toLocaleString()+' orang tidak memiliki catatan disabilitas atau datanya kosong.'},
      {text: disab.jenis.length ? 'Ragam disabilitas terbanyak adalah "'+disab.jenis[0][0]+'" dengan '+disab.jenis[0][1].toLocaleString()+' orang. Rincian per ragam tersedia pada Lampiran Tabel A4.' : ''},

      {section:'IV. Analisis Wilayah'},
      {text:'Program menjangkau '+Object.keys(kabS).length+' kabupaten/kota, '+Object.keys(kecS).length+' kecamatan, dan '+Object.keys(desaS).length+' desa/kelurahan. Kabupaten dengan penerima manfaat terbanyak adalah '+topKab.kab+' dengan '+topKab.uniq.toLocaleString()+' orang ('+(uniq?(topKab.uniq/uniq*100).toFixed(1):0)+'% dari total), mencakup '+topKab.desa+' desa.'},
      {table:{title:'Tabel 4.1 — Rekap per Kabupaten',
        head:['#','Kabupaten','Kecamatan','Desa','Benef Unik','%'],
        body:hier.map(function(h,i){return [i+1,h.kab,h.kec,h.desa,h.uniq.toLocaleString(),(uniq?(h.uniq/uniq*100).toFixed(1):0)+'%'];})}},
      {text:'Desa dengan jangkauan terbesar adalah '+topDesa[0]+' ('+topDesa[1].toLocaleString()+' orang). Indeks konsentrasi wilayah berada pada '+concIdx.toFixed(1)+' dari 100, yang menunjukkan distribusi '+(concIdx>50?'terkonsentrasi pada sedikit wilayah':concIdx>25?'cukup merata dengan beberapa wilayah dominan':'relatif merata antar wilayah')+'.'},
      {heading:'4.1 Desa Under-Served'},
      {text:'Dari '+desaMap.length+' desa yang terjangkau, sebanyak '+underServed.length+' desa ('+(desaMap.length?(underServed.length/desaMap.length*100).toFixed(1):0)+'%) hanya dilayani oleh satu program. Desa-desa ini berpotensi menjadi prioritas untuk perluasan cakupan program agar layanan lebih terintegrasi.'},

      {section:'V. Analisis Program'},
      {text:'Terdapat '+progs.length+' program yang tercatat. Program dengan jangkauan terluas dari sisi jumlah penerima manfaat maupun cakupan wilayah dirinci pada tabel berikut.'},
      {table:{title:'Tabel 5.1 — Jangkauan dan Durasi Program',
        head:['#','Program','Benef Unik','Desa','Kec','Kab','Mulai','Akhir','Durasi'],
        body:reach.slice(0,20).map(function(r,i){
          return [i+1, r.program, r.uniq.toLocaleString(), r.desa, r.kec, r.kab,
            r.mulai?fmtPeriod(r.mulai).replace(/ (\d{4})/," '$1").slice(0,9):'—',
            r.akhir?fmtPeriod(r.akhir).replace(/ (\d{4})/," '$1").slice(0,9):'—',
            r.durasi>0?r.durasi+' bln':'—'];
        })}},
      {heading:'5.1 Kegiatan Terbesar'},
      {text:'Kegiatan yang paling banyak menjangkau penerima manfaat adalah "'+topKeg[0]+'" dengan '+topKeg[1].toLocaleString()+' orang unik. Rincian 15 kegiatan terbesar tersedia pada Lampiran Tabel A2.'},

      {section:'VI. Analisis Keuangan'},
      {text:'Total dana PJUM yang tersalurkan sebesar '+fmt(cost)+' melalui '+pjum.length.toLocaleString()+' transaksi, dengan rata-rata '+fmt(pjum.length>0?cost/pjum.length:0)+' per transaksi. Dana ini digunakan untuk melayani '+uniq.toLocaleString()+' penerima manfaat unik, menghasilkan biaya rata-rata '+fmt(uniq>0?cost/uniq:0)+' per orang.'},
      {heading:'6.1 Komponen Biaya'},
      {text: byKomp.length ? 'Komponen pengeluaran terbesar adalah "'+topKomp[0]+'" sebesar '+fmt(topKomp[1])+' ('+(cost?(topKomp[1]/cost*100).toFixed(1):0)+'% dari total). Struktur ini menunjukkan bahwa sebagian besar dana dialokasikan untuk '+topKomp[0].toLowerCase()+'.' : ''},
      {table:{title:'Tabel 6.1 — Komponen Biaya',
        head:['#','Komponen','Total Biaya','% Total'],
        body:byKomp.map(function(x,i){return [i+1,x[0],fmt(x[1]),(cost?(x[1]/cost*100).toFixed(1):0)+'%'];})}},
      {heading:'6.2 Distribusi per Staf'},
      {text: byStafCost.length ? 'Staf dengan total pengelolaan dana terbesar adalah '+byStafCost[0][0]+' sebesar '+fmt(byStafCost[0][1])+' ('+(cost?(byStafCost[0][1]/cost*100).toFixed(1):0)+'%). Rincian lengkap tersedia pada Lampiran Tabel A6.' : ''},

      {section:'VII. Kualitas Data'},
      {text:'Bagian ini menilai kelengkapan dan konsistensi data yang menjadi dasar laporan. Semakin tinggi persentase kelengkapan, semakin akurat hasil analisis.'},
      {table:{title:'Tabel 7.1 — Kelengkapan Kolom Data Beneficiary',
        head:['Kolom','Terisi','Kosong','% Lengkap'],
        body:complete.map(function(c){return [c.nama,c.terisi.toLocaleString(),c.kosong.toLocaleString(),c.pct.toFixed(1)+'%'];})}},
      anomali.length ? {heading:'7.1 Anomali Terdeteksi'} : {spacer:0},
      anomali.length ? {table:{head:['Jenis Anomali','Jumlah','Keterangan'],
        body:anomali.map(function(a){return [a.jenis,a.jml.toLocaleString(),a.ket];})}} : {spacer:0},
      anomali.length ? {text:'Anomali di atas tidak menghentikan analisis, namun perlu diperbaiki pada sumber data agar akurasi laporan meningkat.'} : {text:'Tidak ditemukan anomali signifikan pada data.'},

      {section:'VIII. Kesimpulan'},
      {text:'Berdasarkan analisis di atas, program telah menjangkau '+uniq.toLocaleString()+' penerima manfaat unik di '+Object.keys(desaS).length+' desa dengan total investasi '+fmt(cost)+'. '+describeTrend(yearly,'uniq')},
      {bullet:'Konsentrasi wilayah: '+concIdx.toFixed(0)+'/100 — '+(concIdx>50?'perlu diversifikasi wilayah':'sebaran sudah cukup baik')},
      {bullet:'Keseimbangan gender: rasio P:L '+(g.rasio!==null?g.rasio.toFixed(2):'—')+' — '+(g.rasio!==null&&g.rasio>=0.9&&g.rasio<=1.1?'seimbang':'perlu perhatian')},
      {bullet:'Desa under-served: '+underServed.length+' dari '+desaMap.length+' desa hanya dilayani 1 program'},
      {bullet:'Inklusi disabilitas: '+(disab.total?(disab.adaDisab/disab.total*100).toFixed(1):0)+'% penerima manfaat adalah penyandang disabilitas'}
    ],
    lampiran:[
      {table:{title:'Tabel A1 — Sebaran per Desa (25 Terbesar)',
        head:['#','Desa','Benef Unik','% Total'],
        body:byDesa.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {table:{title:'Tabel A2 — Kegiatan Terbesar',
        head:['#','Kegiatan','Benef Unik','% Total'],
        body:byKeg.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {table:{title:'Tabel A3 — Kategori Usia',
        head:['#','Kategori Usia','Benef Unik','% Total'],
        body:byUsia.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {table:{title:'Tabel A4 — Ragam Disabilitas',
        head:['#','Ragam Disabilitas','Jumlah','% dari Penyandang'],
        body:disab.jenis.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(disab.adaDisab?(x[1]/disab.adaDisab*100).toFixed(1):0)+'%'];})}},
      {table:{title:'Tabel A5 — Kategori Penerima Manfaat',
        head:['#','Kategori','Benef Unik','% Total'],
        body:byKat.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {table:{title:'Tabel A6 — Pengeluaran per Staf',
        head:['#','Staf','Total Biaya','% Total'],
        body:byStafCost.map(function(x,i){return [i+1,x[0],fmt(x[1]),(cost?(x[1]/cost*100).toFixed(1):0)+'%'];})}},
      {table:{title:'Tabel A7 — Jenis Benefit Diterima',
        head:['#','Benefit','Benef Unik','% Total'],
        body:byBenefit.map(function(x,i){return [i+1,x[0],x[1].toLocaleString(),(uniq?(x[1]/uniq*100).toFixed(2):0)+'%'];})}},
      {table:{title:'Tabel A8 — Desa Under-Served (Hanya 1 Program)',
        head:['#','Desa','Program yang Melayani'],
        body:underServed.slice(0,30).map(function(d,i){return [i+1,d.desa,d.programs[0]||'—'];})}}
    ],
    metodologi: stdMetodologi([
      'Indeks konsentrasi wilayah dihitung menggunakan Herfindahl-Hirschman Index (HHI) yang dinormalisasi ke skala 0–100. Nilai mendekati 0 berarti sebaran merata, mendekati 100 berarti terkonsentrasi pada sedikit wilayah.',
      'Desa "under-served" didefinisikan sebagai desa yang hanya dilayani oleh satu program dalam periode data.'
    ])
  });
};

