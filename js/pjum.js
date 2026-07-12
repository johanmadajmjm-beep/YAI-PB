/* ═══════════════════════════════════════════════
   pjum.js — PJUM page
═══════════════════════════════════════════════ */

function buildPjumPage() {
  const pjum = window.rawPjum;

  populateSel('pf-proyek', uniq(pjum.map(r => r[P.proyek])));
  populateSel('pf-staf',   uniq(pjum.map(r => r[P.staf])));
  populateSel('pf-kode',   uniq(pjum.map(r => r[P.kode])));
  populateSel('pf-tahun',  uniq(pjum.map(r => r[P.tgl]?.slice(0,4)).filter(Boolean)).reverse());
  populateSel('pf-bulan',  ['01','02','03','04','05','06','07','08','09','10','11','12'], m => bulanName(m));

  const fids = ['pf-proyek','pf-staf','pf-kode','pf-tahun','pf-bulan','pf-cari'];
  fids.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.addEventListener('change', applyPjumFilter); el.addEventListener('input', applyPjumFilter); }
  });

  document.getElementById('pf-reset').addEventListener('click', () => {
    fids.forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    applyPjumFilter();
  });

  applyPjumFilter();
}

function applyPjumFilter() {
  const proyek = v('pf-proyek');
  const staf   = v('pf-staf');
  const kode   = v('pf-kode');
  const tahun  = v('pf-tahun');
  const bulan  = v('pf-bulan');
  const cari   = v('pf-cari').toLowerCase().trim();

  window.APP.pjum.filtered = window.rawPjum.filter(r => {
    if (proyek && r[P.proyek] !== proyek) return false;
    if (staf   && r[P.staf]  !== staf)   return false;
    if (kode   && r[P.kode]  !== kode)   return false;
    if (tahun  && !r[P.tgl]?.startsWith(tahun)) return false;
    if (bulan  && r[P.tgl]?.slice(5,7) !== bulan) return false;
    if (cari && !(r[P.kegiatan]||'').toLowerCase().includes(cari) &&
               !(r[P.item]||'').toLowerCase().includes(cari) &&
               !(r[P.staf]||'').toLowerCase().includes(cari)) return false;
    return true;
  });

  window.APP.pjum.page = 0;
  renderPjumStats();
  renderPjumCharts();
  renderPjumTable();
}

function renderPjumStats() {
  const d = window.APP.pjum.filtered;
  const total   = d.reduce((s, r) => s + (parseFloat(r[P.jumlah]) || 0), 0);
  const transaksi = d.length;
  const progs   = new Set(d.map(r => r[P.proyek]).filter(Boolean)).size;
  const stafSet = new Set(d.map(r => r[P.staf]).filter(Boolean)).size;
  const kodeSet = new Set(d.map(r => r[P.kode]).filter(Boolean)).size;
  const fileSet = new Set(d.map(r => r[P.file]).filter(Boolean)).size;

  setCard('pstat-total',   fmtShort(total),               fmt(total));
  setCard('pstat-trx',     transaksi.toLocaleString(),    'item pengeluaran');
  setCard('pstat-prog',    progs.toLocaleString(),        `${kodeSet} kode kegiatan`);
  setCard('pstat-staf',    stafSet.toLocaleString(),      `${fileSet} file terupload`);
}

function renderPjumCharts() {
  const d = window.APP.pjum.filtered;

  /* Trend bulan — line */
  const byBulan = sortedBulan(groupSum(d, r => r[P.tgl]?.slice(0,7), r => r[P.jumlah]));
  mkLine('pch-trend',
    byBulan.map(([k]) => { const [y,m]=k.split('-'); return bulanName(m)+"'"+y.slice(2); }),
    byBulan.map(([,v]) => v), '#F97316',
    { label:'Pengeluaran', yFmt: fmtShort, noLegend:true });

  /* Komponen biaya — donut */
  const byKomp = top(groupSum(d, r => classifyItem(r[P.item]), r => r[P.jumlah]), 9);
  const kompTotal = byKomp.reduce((s,[,v])=>s+v,0);
  mkDonut('pch-komponen', byKomp.map(([k])=>k), byKomp.map(([,v])=>v));
  renderDonutLegendPjum('pch-komponen-legend', byKomp, kompTotal);

  /* Per program — bar h */
  const byProyek = top(groupSum(d, r => r[P.proyek], r => r[P.jumlah]), 10);
  mkBarH('pch-proyek', byProyek.map(([k])=>k), byProyek.map(([,v])=>v),
    PALETTE[0], { label:'Biaya', yFmt: fmtShort });

  /* Per staf — bar h */
  const byStaf = top(groupSum(d, r => r[P.staf], r => r[P.jumlah]), 10);
  mkBarH('pch-staf', byStaf.map(([k])=>k), byStaf.map(([,v])=>v),
    '#22C55E', { label:'Biaya', yFmt: fmtShort });

  /* Per kode — bar h */
  const byKode = top(groupSum(d, r => r[P.kode], r => r[P.jumlah]), 10);
  mkBarH('pch-kode', byKode.map(([k])=>k), byKode.map(([,v])=>v),
    '#8B5CF6', { label:'Biaya', yFmt: fmtShort });

  /* Per kegiatan — bar h */
  const byKeg = top(groupSum(d, r => r[P.kegiatan], r => r[P.jumlah]), 8);
  mkBarH('pch-kegiatan', byKeg.map(([k])=>k), byKeg.map(([,v])=>v),
    '#14B8A6', { label:'Biaya', yFmt: fmtShort });
}

function renderDonutLegendPjum(id, entries, total) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = entries.map(([k,v],i) => `
    <div class="dl-item">
      <div class="dl-dot" style="background:${PALETTE[i%PALETTE.length]}"></div>
      <div class="dl-name">${k}</div>
      <div class="dl-pct">${total ? (v/total*100).toFixed(1) : 0}%</div>
    </div>`).join('');
}

function renderPjumTable() {
  const q = (document.getElementById('pjum-tbl-search')?.value || '').toLowerCase().trim();
  let rows = window.APP.pjum.filtered;
  if (q) rows = rows.filter(r =>
    (r[P.kegiatan]||'').toLowerCase().includes(q) ||
    (r[P.item]||'').toLowerCase().includes(q) ||
    (r[P.staf]||'').toLowerCase().includes(q) ||
    (r[P.proyek]||'').toLowerCase().includes(q) ||
    (r[P.kode]||'').toLowerCase().includes(q)
  );

  const total = rows.length;
  const start = window.APP.pjum.page * window.APP.PG_SIZE;
  const slice = rows.slice(start, start + window.APP.PG_SIZE);
  const totalBiaya = rows.reduce((s, r) => s + (parseFloat(r[P.jumlah]) || 0), 0);

  setEl('pjum-tbl-count', `${total.toLocaleString()} baris · ${fmtShort(totalBiaya)}`);
  setEl('pjum-pg-info', `${(start+1).toLocaleString()}–${Math.min(start+window.APP.PG_SIZE,total).toLocaleString()} dari ${total.toLocaleString()}`);
  const prevBtn = document.getElementById('pjum-pg-prev');
  const nextBtn = document.getElementById('pjum-pg-next');
  if (prevBtn) prevBtn.disabled = window.APP.pjum.page === 0;
  if (nextBtn) nextBtn.disabled = start + window.APP.PG_SIZE >= total;

  const tbody = document.getElementById('pjum-tbl-body');
  if (!tbody) return;
  tbody.innerHTML = slice.length ? slice.map(r => `
    <tr>
      <td class="mono">${r[P.tgl] || '—'}</td>
      <td>${r[P.staf] || '—'}</td>
      <td>${r[P.proyek] || '—'}</td>
      <td class="mono">${r[P.kode] || '—'}</td>
      <td>${r[P.kegiatan] || '—'}</td>
      <td>${r[P.item] || '—'}</td>
      <td>${classifyItem(r[P.item])}</td>
      <td class="num">${fmt(parseFloat(r[P.jumlah]) || 0)}</td>
      <td class="mono" style="font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis" title="${r[P.file]||''}">${r[P.file] || '—'}</td>
    </tr>`).join('')
    : '<tr><td colspan="9" class="empty-state"><span class="ei">🔍</span>Tidak ada data</td></tr>';
}

window.changePjumPage = dir => {
  window.APP.pjum.page = Math.max(0, window.APP.pjum.page + dir);
  renderPjumTable();
};
