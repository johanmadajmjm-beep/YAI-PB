/* ═══════════════════════════════════════════════
   dashboard.js — Executive Dashboard page
═══════════════════════════════════════════════ */

function buildDashboard() {
  const pjum  = window.rawPjum;
  const benef = window.rawBenef;

  /* ── KPI Cards ── */
  const totalBenef  = benef.length;
  const totalPjum   = new Set(pjum.map(r => r[P.file]).filter(Boolean)).size;
  const totalCost   = pjum.reduce((s, r) => s + (parseFloat(r[P.jumlah]) || 0), 0);
  const totalDesa   = new Set(benef.map(r => r[B.desa]).filter(Boolean)).size;
  const totalKab    = new Set(benef.map(r => r[B.kab]).filter(Boolean)).size;
  const uniqBenef   = new Set(benef.map(r => (r[B.nama]||'').toLowerCase()+'|'+(r[B.desa]||''))).size;

  setEl('kpi-benef',    totalBenef.toLocaleString('id-ID'));
  setEl('kpi-pjum',     totalPjum.toLocaleString('id-ID'));
  setEl('kpi-desa',     totalDesa.toLocaleString('id-ID'));
  setEl('kpi-kab',      totalKab + ' Kabupaten');
  setEl('kpi-biaya',    fmtShort(totalCost));
  setEl('kpi-uniq',     uniqBenef.toLocaleString('id-ID') + ' unik');

  /* ── Trend Benef per Bulan ── */
  const benefByBulan = sortedBulan(groupCount(benef, r => r[B.tgl]?.slice(0, 7)));
  const bLabels = benefByBulan.map(([k]) => { const [y, m] = k.split('-'); return bulanName(m) + " '" + y.slice(2); });
  mkLine('ch-dash-benef-trend', bLabels, benefByBulan.map(([, v]) => v), '#F97316',
    { label: 'Beneficiary', noLegend: true });

  /* ── Distribusi Jenis Benef (Kategori) ── */
  const katData  = top(groupCount(benef, r => r[B.kategori]), 6);
  const katTotal = katData.reduce((s, [, v]) => s + v, 0);
  mkDonut('ch-dash-benef-donut', katData.map(([k]) => k), katData.map(([, v]) => v));
  setEl('donut-center-val', totalBenef.toLocaleString());
  setEl('donut-center-lbl', 'Total');
  renderDonutLegend('donut-legend', katData, katTotal);

  /* ── Benef per Kabupaten ── */
  const kabData = top(groupCount(benef, r => r[B.kab]), 8);
  const kabMax  = kabData[0]?.[1] || 1;
  const kabTotal = benef.length || 1;
  renderRankList('rank-kab', kabData, kabMax, kabTotal, v => v.toLocaleString(), false);

  /* ── Pengeluaran PJUM per Bulan ── */
  const pjumByBulan = sortedBulan(groupSum(pjum, r => r[P.tgl]?.slice(0, 7), r => r[P.jumlah]));
  mkBar('ch-dash-pjum-trend',
    pjumByBulan.map(([k]) => { const [y, m] = k.split('-'); return bulanName(m) + " '" + y.slice(2); }),
    pjumByBulan.map(([, v]) => v),
    '#F97316',
    { label: 'Pengeluaran', yFmt: fmtShort, noLegend: true }
  );

  /* ── Top Jenis Kegiatan (dari Benef) ── */
  const kegData = top(groupCount(benef, r => r[B.kegiatan]), 5);
  const kegMax  = kegData[0]?.[1] || 1;
  const kegTotal = benef.length || 1;
  renderRankList('rank-kegiatan', kegData, kegMax, kegTotal, v => v.toLocaleString() + ' (' + (v/kegTotal*100).toFixed(1) + '%)', true);

  /* ── Top Benefit yang Diterima ── */
  const benData = top(groupCount(benef, r => r[B.benefit] || r[B.kegiatan]), 5);
  const benMax  = benData[0]?.[1] || 1;
  renderRankList('rank-benefit', benData, benMax, kegTotal, v => v.toLocaleString() + ' (' + (v/kegTotal*100).toFixed(1) + '%)', true);

  /* ── AI Insight ── */
  buildAiInsight(benef, pjum);
}

function buildAiInsight(benef, pjum) {
  const kabData    = top(groupCount(benef, r => r[B.kab]), 1);
  const topKab     = kabData[0]?.[0] || '—';
  const topKabPct  = benef.length ? ((kabData[0]?.[1] || 0) / benef.length * 100).toFixed(1) : '0';
  const pjumBulan  = sortedBulan(groupSum(pjum, r => r[P.tgl]?.slice(0, 7), r => r[P.jumlah]));
  const topBulanCost = pjumBulan.reduce((best, cur) => cur[1] > (best[1] || 0) ? cur : best, ['—', 0]);
  const [thy, thm] = (topBulanCost[0] || '-').split('-');
  const topBulan   = thm ? bulanFull(thm) + ' ' + thy : '—';
  const kegData    = top(groupCount(benef, r => r[B.kegiatan]), 1);
  const topKeg     = kegData[0]?.[0] || '—';

  setEl('ai-insight-text',
    `Kabupaten <strong>${topKab}</strong> berkontribusi ${topKabPct}% dari seluruh penerima manfaat. ` +
    `Kegiatan terbanyak adalah <strong>${topKeg}</strong>. ` +
    `Pengeluaran PJUM tertinggi terjadi pada <strong>${topBulan}</strong> senilai <strong>${fmtShort(topBulanCost[1])}</strong>.`
  );
}

/* ── Helpers ── */
function setEl(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function renderDonutLegend(id, entries, total) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = entries.map(([k, v], i) => `
    <div class="dl-item">
      <div class="dl-dot" style="background:${PALETTE[i % PALETTE.length]}"></div>
      <div class="dl-name">${k}</div>
      <div class="dl-pct">${total ? (v / total * 100).toFixed(1) : 0}%</div>
    </div>`).join('');
}

function renderRankList(id, entries, max, total, valFmt, isNumber) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = entries.map(([k, v], i) => `
    <div class="rank-item cols3">
      <div class="rank-num ${i < 3 ? 'top' : ''}">${i + 1}</div>
      <div>
        <div class="rank-name">${k}</div>
        ${isNumber ? `<div class="rank-bar"><div class="rank-bar-fill" style="width:${max ? v/max*100 : 0}%"></div></div>` : ''}
      </div>
      <div class="rank-val">${valFmt(v)}</div>
    </div>`).join('');
}
