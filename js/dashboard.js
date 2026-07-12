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
  var totalBenef = benef.length;
  var fileSet = {};
  pjum.forEach(function(r) { if(r[P.file]) fileSet[r[P.file]] = 1; });
  var totalPjum = Object.keys(fileSet).length;
  var totalCost = pjum.reduce(function(s, r) { return s + (parseFloat(r[P.jumlah]) || 0); }, 0);
  var desaSet = {};
  benef.forEach(function(r) { if(r[B.desa]) desaSet[r[B.desa]] = 1; });
  var totalDesa = Object.keys(desaSet).length;
  var kabSet = {};
  benef.forEach(function(r) { if(r[B.kab]) kabSet[r[B.kab]] = 1; });
  var totalKab = Object.keys(kabSet).length;
  var uniqBSet = {};
  benef.forEach(function(r) {
    uniqBSet[(r[B.nama]||'').toLowerCase()+'|'+(r[B.desa]||'')] = 1;
  });
  var uniqBenef = Object.keys(uniqBSet).length;

  setEl('kpi-benef', totalBenef.toLocaleString('id-ID'));
  setEl('kpi-pjum',  totalPjum.toLocaleString('id-ID'));
  setEl('kpi-desa',  totalDesa.toLocaleString('id-ID'));
  setEl('kpi-kab',   totalKab + ' Kabupaten');
  setEl('kpi-biaya', fmtShort(totalCost));
  setEl('kpi-uniq',  uniqBenef.toLocaleString('id-ID') + ' unik');

  /* ── Trend Benef per Bulan ── */
  var benefByBulan = sortedBulan(groupCount(benef, function(r) { return validTgl(r[B.tgl]); }));
  mkLine('ch-dash-benef-trend',
    benefByBulan.map(function(x) { var p=x[0].split('-'); return bulanName(p[1])+"'"+p[0].slice(2); }),
    benefByBulan.map(function(x) { return x[1]; }),
    '#F97316', { label:'Beneficiary', noLegend:true });

  /* ── Distribusi Jenis Benef (donut) ── */
  var katData  = topN(groupCount(benef, function(r) { return r[B.kategori]; }), 6);
  var katTotal = katData.reduce(function(s, x) { return s + x[1]; }, 0);
  mkDonut('ch-dash-benef-donut',
    katData.map(function(x) { return x[0]; }),
    katData.map(function(x) { return x[1]; }));
  setEl('donut-center-val', totalBenef.toLocaleString());
  setEl('donut-center-lbl', 'Total');
  renderDonutLegend('donut-legend', katData, katTotal);

  /* ── Benef per Kabupaten ── */
  var kabData = topN(groupCount(benef, function(r) { return r[B.kab]; }), 8);
  var kabMax  = kabData[0] ? kabData[0][1] : 1;
  renderRankList('rank-kab', kabData, kabMax, function(v) { return v.toLocaleString(); }, false);

  /* ── Pengeluaran PJUM per Bulan ── */
  var pjumByBulan = sortedBulan(groupSum(pjum,
    function(r) { return validTgl(r[P.tgl]); },
    function(r) { return r[P.jumlah]; }
  ));
  mkBar('ch-dash-pjum-trend',
    pjumByBulan.map(function(x) { var p=x[0].split('-'); return bulanName(p[1])+"'"+p[0].slice(2); }),
    pjumByBulan.map(function(x) { return x[1]; }),
    '#F97316', { label:'Pengeluaran', yFmt:fmtShort, noLegend:true });

  /* ── Top Jenis Kegiatan ── */
  var kegData  = topN(groupCount(benef, function(r) { return r[B.kegiatan]; }), 5);
  var kegMax   = kegData[0] ? kegData[0][1] : 1;
  var kegTotal = benef.length || 1;
  renderRankList('rank-kegiatan', kegData, kegMax, function(v) {
    return v.toLocaleString() + ' (' + (v/kegTotal*100).toFixed(1) + '%)';
  }, true);

  /* ── Top Benefit Diterima ── */
  var benData = topN(groupCount(benef, function(r) { return r[B.benefit] || r[B.kegiatan]; }), 5);
  var benMax  = benData[0] ? benData[0][1] : 1;
  renderRankList('rank-benefit', benData, benMax, function(v) {
    return v.toLocaleString() + ' (' + (v/kegTotal*100).toFixed(1) + '%)';
  }, true);

  /* ── AI Insight ── */
  buildAiInsight(benef, pjum);
}

function buildAiInsight(benef, pjum) {
  var B = window.B, P = window.P;
  var kabData   = topN(groupCount(benef, function(r) { return r[B.kab]; }), 1);
  var topKab    = kabData[0] ? kabData[0][0] : '—';
  var topKabPct = benef.length ? ((kabData[0]?kabData[0][1]:0) / benef.length * 100).toFixed(1) : '0';
  var pjumBulan = sortedBulan(groupSum(pjum,
    function(r) { return validTgl(r[P.tgl]); },
    function(r) { return r[P.jumlah]; }
  ));
  var topBulanCost = pjumBulan.reduce(function(best, cur) {
    return cur[1] > (best[1]||0) ? cur : best;
  }, ['—', 0]);
  var tbp      = (topBulanCost[0]||'-').split('-');
  var topBulan = tbp[1] ? bulanFull(tbp[1]) + ' ' + tbp[0] : '—';
  var kegData  = topN(groupCount(benef, function(r) { return r[B.kegiatan]; }), 1);
  var topKeg   = kegData[0] ? kegData[0][0] : '—';

  setEl('ai-insight-text',
    'Kabupaten <strong>' + topKab + '</strong> berkontribusi ' + topKabPct + '% dari seluruh penerima manfaat. ' +
    'Kegiatan terbanyak adalah <strong>' + topKeg + '</strong>. ' +
    'Pengeluaran PJUM tertinggi pada <strong>' + topBulan + '</strong> senilai <strong>' + fmtShort(topBulanCost[1]) + '</strong>.'
  );
}

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
