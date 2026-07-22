/* ═══════════════════════════════════════════════
   dashboard.js — Executive Dashboard page
═══════════════════════════════════════════════ */

function buildDashboard() {
  /* Ambil data yang sudah difilter */
  var filtered = getDashFiltered();
  var pjum  = filtered.pjum;
  var benef = filtered.benef;
  var P = window.P, B = window.B;

  /* ── KPI Cards ── */
  var uniqBenef = countUniqBenef(benef);
  var totalRows = benef.length;

  /* PJUM: unique file names */
  var fileSet = {};
  pjum.forEach(function(r) { if(r[P.file]) fileSet[r[P.file]] = 1; });
  var totalPjum = Object.keys(fileSet).length;

  /* Benef: unique file names */
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

  /* Dynamic subtitles for file counts */
  var tahunF = v('dash-tahun'), bulanF = v('dash-bulan');
  var periodLabel = '';
  if (tahunF && tahunF !== '__blank__') {
    periodLabel = bulanF && bulanF !== '__blank__'
      ? bulanName(bulanF) + ' ' + tahunF
      : 'Tahun ' + tahunF;
  } else if (bulanF && bulanF !== '__blank__') {
    periodLabel = 'Bulan ' + bulanName(bulanF);
  }
  setEl('kpi-pjum-sub', periodLabel ? 'file · ' + periodLabel : 'file terupload');
  setEl('kpi-benef-file-sub', periodLabel ? 'file · ' + periodLabel : 'file terupload');

  /* ── Trend Benef per Bulan (unique per bulan) ── */
  var benefByBulan = sortedBulan(groupCountUniq(benef, function(r) { return validTgl(r[B.tgl]); }));

  var noTglEl = document.getElementById('ch-dash-benef-trend-notgl');
  var wrapEl  = document.getElementById('ch-dash-benef-trend') ? document.getElementById('ch-dash-benef-trend').parentElement : null;
  if (benefByBulan.length === 0) {
    var cv = document.getElementById('ch-dash-benef-trend'); if(cv) cv.style.display='none';
    if (!noTglEl && wrapEl) {
      var msg=document.createElement('div');
      msg.id='ch-dash-benef-trend-notgl';
      msg.style.cssText='display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:12px;flex-direction:column;gap:6px';
      msg.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>Data tanggal tidak tersedia untuk filter ini</span>';
      wrapEl.appendChild(msg);
    } else if(noTglEl) { noTglEl.style.display='flex'; }
  } else {
    var cv2=document.getElementById('ch-dash-benef-trend'); if(cv2) cv2.style.display='';
    if(noTglEl) noTglEl.style.display='none';
    mkLine('ch-dash-benef-trend',
      benefByBulan.map(function(x){var p=x[0].split('-');return bulanName(p[1])+"'"+p[0].slice(2);}),
      benefByBulan.map(function(x){return x[1];}),
      '#F97316',{label:'Beneficiary',noLegend:true});
  }

  /* ── Distribusi Jenis Benef (donut) — unique per kategori ── */
  var katData  = topN(groupCountUniq(benef, function(r) { return r[B.kategori]; }), 6);
  var katTotal = katData.reduce(function(s, x) { return s + x[1]; }, 0);
  mkDonut('ch-dash-benef-donut',
    katData.map(function(x) { return x[0]; }),
    katData.map(function(x) { return x[1]; }));
  setEl('donut-center-val', uniqBenef.toLocaleString());
  setEl('donut-center-lbl', 'Unik');
  renderDonutLegend('donut-legend', katData, katTotal);

  /* ── Benef per Desa (changed from Kabupaten) — unique per desa ── */
  var desaData = topN(groupCountUniq(benef, function(r) { return r[B.desa]; }), 10);
  var desaMax  = desaData[0] ? desaData[0][1] : 1;
  renderRankList('rank-desa', desaData, desaMax, function(v) { return v.toLocaleString(); }, false);

  /* ── Pengeluaran PJUM per Bulan ── */
  var pjumByBulan = sortedBulan(groupSum(pjum,
    function(r) { return validTgl(r[P.tgl]); },
    function(r) { return r[P.jumlah]; }
  ));

  var noTglEl2 = document.getElementById('ch-dash-pjum-trend-notgl');
  var wrapEl2  = document.getElementById('ch-dash-pjum-trend') ? document.getElementById('ch-dash-pjum-trend').parentElement : null;
  if (pjumByBulan.length === 0) {
    var cv3 = document.getElementById('ch-dash-pjum-trend'); if(cv3) cv3.style.display='none';
    if (!noTglEl2 && wrapEl2) {
      var msg2=document.createElement('div');
      msg2.id='ch-dash-pjum-trend-notgl';
      msg2.style.cssText='display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:12px;flex-direction:column;gap:6px';
      msg2.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>Data tanggal tidak tersedia untuk filter ini</span>';
      wrapEl2.appendChild(msg2);
    } else if(noTglEl2) { noTglEl2.style.display='flex'; }
  } else {
    var cv4=document.getElementById('ch-dash-pjum-trend'); if(cv4) cv4.style.display='';
    if(noTglEl2) noTglEl2.style.display='none';
    mkBar('ch-dash-pjum-trend',
      pjumByBulan.map(function(x){var p=x[0].split('-');return bulanName(p[1])+"'"+p[0].slice(2);}),
      pjumByBulan.map(function(x){return x[1];}),
      '#F97316',{label:'Pengeluaran',yFmt:fmtShort,noLegend:true});
  }

  /* ── Top Jenis Kegiatan — unique per kegiatan ── */
  var kegData  = topN(groupCountUniq(benef, function(r) { return r[B.kegiatan]; }), 5);
  var kegMax   = kegData[0] ? kegData[0][1] : 1;
  renderRankList('rank-kegiatan', kegData, kegMax, function(v) {
    return v.toLocaleString() + ' (' + (uniqBenef?(v/uniqBenef*100).toFixed(1):0) + '%)';
  }, true);

  /* ── Top Benefit Diterima — unique per benefit ── */
  var benData = topN(groupCountUniq(benef, function(r) { return r[B.benefit] || r[B.kegiatan]; }), 5);
  var benMax  = benData[0] ? benData[0][1] : 1;
  renderRankList('rank-benefit', benData, benMax, function(v) {
    return v.toLocaleString() + ' (' + (uniqBenef?(v/uniqBenef*100).toFixed(1):0) + '%)';
  }, true);

  /* ── AI Insight ── */
  buildAiInsight(benef, pjum);

  /* ── Notifikasi ── */
  buildNotifications(benef, pjum);
}

function buildAiInsight(benef, pjum) {
  var B = window.B, P = window.P;
  var uniqTotal = countUniqBenef(benef);
  var kabData   = topN(groupCountUniq(benef, function(r) { return r[B.kab]; }), 1);
  var topKab    = kabData[0] ? kabData[0][0] : '—';
  var topKabPct = uniqTotal ? ((kabData[0]?kabData[0][1]:0) / uniqTotal * 100).toFixed(1) : '0';
  var pjumBulan = sortedBulan(groupSum(pjum,
    function(r) { return validTgl(r[P.tgl]); },
    function(r) { return r[P.jumlah]; }
  ));
  var topBulanCost = pjumBulan.reduce(function(best, cur) {
    return cur[1] > (best[1]||0) ? cur : best;
  }, ['—', 0]);
  var tbp      = (topBulanCost[0]||'-').split('-');
  var topBulan = tbp[1] ? bulanFull(tbp[1]) + ' ' + tbp[0] : '—';
  var kegData  = topN(groupCountUniq(benef, function(r) { return r[B.kegiatan]; }), 1);
  var topKeg   = kegData[0] ? kegData[0][0] : '—';

  setEl('ai-insight-text',
    'Kabupaten <strong>' + topKab + '</strong> berkontribusi ' + topKabPct + '% dari seluruh penerima manfaat. ' +
    'Kegiatan terbanyak adalah <strong>' + topKeg + '</strong>. ' +
    'Pengeluaran PJUM tertinggi pada <strong>' + topBulan + '</strong> senilai <strong>' + fmtShort(topBulanCost[1]) + '</strong>.'
  );
}

/* ── Notifikasi: auto-detect data issues ── */
function buildNotifications(benef, pjum) {
  var B = window.B, P = window.P;
  var items = [];

  /* 1. Benef tanpa tanggal */
  var noTgl = benef.filter(function(r) { return !validTgl(r[B.tgl]); }).length;
  if (noTgl > 0) {
    items.push({ type:'warn', title: noTgl.toLocaleString() + ' record benef tanpa tanggal',
      desc: 'Data tanpa tanggal tidak muncul di grafik trend' });
  }

  /* 2. Benef tanpa desa */
  var noDesa = benef.filter(function(r) { return !r[B.desa] || r[B.desa] === '—'; }).length;
  if (noDesa > 0) {
    items.push({ type:'warn', title: noDesa.toLocaleString() + ' record benef tanpa desa',
      desc: 'Sebaran wilayah mungkin tidak akurat' });
  }

  /* 3. Benef tanpa gender */
  var noGender = benef.filter(function(r) { return r[B.gender] === '—'; }).length;
  if (noGender > 0) {
    items.push({ type:'info', title: noGender.toLocaleString() + ' record benef tanpa gender',
      desc: 'Gender tidak terisi (L/P)' });
  }

  /* 4. PJUM tanpa tanggal */
  var pjumNoTgl = pjum.filter(function(r) { return !validTgl(r[P.tgl]); }).length;
  if (pjumNoTgl > 0) {
    items.push({ type:'warn', title: pjumNoTgl.toLocaleString() + ' item PJUM tanpa tanggal',
      desc: 'Tidak muncul di grafik pengeluaran per bulan' });
  }

  /* 5. Summary OK if no issues */
  if (items.length === 0) {
    items.push({ type:'ok', title: 'Semua data terlihat baik',
      desc: countUniqBenef(benef).toLocaleString() + ' benef unik, ' + pjum.length.toLocaleString() + ' transaksi PJUM' });
  }

  /* Render */
  var badge = document.getElementById('notif-badge');
  var list  = document.getElementById('notif-list');
  if (!badge || !list) return;

  var warnCount = items.filter(function(i) { return i.type === 'warn'; }).length;
  if (warnCount > 0) {
    badge.textContent = warnCount;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }

  var iconMap = { warn: '⚠️', info: 'ℹ️', ok: '✅' };
  var classMap = { warn: 'ni-warn', info: 'ni-info', ok: 'ni-ok' };
  list.innerHTML = items.map(function(it) {
    return '<div class="notif-item">' +
      '<div class="ni-icon ' + classMap[it.type] + '">' + iconMap[it.type] + '</div>' +
      '<div class="ni-body"><div class="ni-title">' + it.title + '</div>' +
      '<div>' + it.desc + '</div></div></div>';
  }).join('');
}

/* ── Toggle notif panel on click ── */
(function() {
  var btn = document.getElementById('btn-notif');
  var panel = document.getElementById('notif-panel');
  if (!btn || !panel) return;
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', function(e) {
    if (!btn.contains(e.target)) panel.style.display = 'none';
  });
})();

function renderDonutLegend(id, entries, total) {
  var el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = entries.map(function(x, i) {
    return '<div class="dl-item">' +
      '<div class="dl-dot" style="background:' + PALETTE[i%PALETTE.length] + '"></div>' +
      '<div class="dl-name">' + x[0] + '</div>' +
      '<div class="dl-pct">' + (total ? (x[1]/total*100).toFixed(1) : 0) + '%</div>' +
    '</div>';
  }).join('');
}

function renderRankList(id, entries, max, valFmt, showBar) {
  var el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = entries.map(function(x, i) {
    var bar = showBar
      ? '<div class="rank-bar"><div class="rank-bar-fill" style="width:' + (max?x[1]/max*100:0) + '%"></div></div>'
      : '';
    return '<div class="rank-item cols3">' +
      '<div class="rank-num ' + (i<3?'top':'') + '">' + (i+1) + '</div>' +
      '<div><div class="rank-name">' + x[0] + '</div>' + bar + '</div>' +
      '<div class="rank-val">' + valFmt(x[1]) + '</div>' +
    '</div>';
  }).join('');
}
