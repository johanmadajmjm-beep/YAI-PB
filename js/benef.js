/* ═══════════════════════════════════════════════
   benef.js — Beneficiary page
═══════════════════════════════════════════════ */

function buildBenefPage() {
  const benef = window.rawBenef;

  /* Populate filter dropdowns */
  populateSel('bf-proyek',   uniq(benef.map(r => r[B.proyek])));
  populateSel('bf-staf',     uniq(benef.map(r => r[B.staf])));
  populateSel('bf-kategori', uniq(benef.map(r => r[B.kategori])));
  populateSel('bf-kab',      uniq(benef.map(r => r[B.kab])));
  populateSel('bf-kec',      uniq(benef.map(r => r[B.kec])));
  populateSel('bf-disab',    uniq(benef.map(r => r[B.disab])));
  populateSel('bf-tahun',    uniq(benef.map(r => r[B.tgl]?.slice(0,4)).filter(Boolean)).reverse());
  populateSel('bf-bulan',    ['01','02','03','04','05','06','07','08','09','10','11','12'],
                              m => bulanName(m));

  /* Event listeners — filter on change */
  const fids = ['bf-proyek','bf-staf','bf-kategori','bf-kab','bf-kec','bf-disab','bf-gender','bf-tahun','bf-bulan','bf-cari'];
  fids.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.addEventListener('change', applyBenefFilter); el.addEventListener('input', applyBenefFilter); }
  });

  document.getElementById('bf-reset').addEventListener('click', () => {
    fids.forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    applyBenefFilter();
  });

  applyBenefFilter();
}

function applyBenefFilter() {
  const proyek   = v('bf-proyek');
  const staf     = v('bf-staf');
  const kategori = v('bf-kategori');
  const kab      = v('bf-kab');
  const kec      = v('bf-kec');
  const disab    = v('bf-disab');
  const gender   = v('bf-gender');
  const tahun    = v('bf-tahun');
  const bulan    = v('bf-bulan');
  const cari     = v('bf-cari').toLowerCase().trim();

  window.APP.benef.filtered = window.rawBenef.filter(r => {
    if (proyek   && r[B.proyek]   !== proyek)   return false;
    if (staf     && r[B.staf]     !== staf)     return false;
    if (kategori && r[B.kategori] !== kategori) return false;
    if (kab      && r[B.kab]      !== kab)      return false;
    if (kec      && r[B.kec]      !== kec)      return false;
    if (disab    && r[B.disab]    !== disab)    return false;
    if (gender   && r[B.gender]   !== gender)   return false;
    if (tahun    && !r[B.tgl]?.startsWith(tahun)) return false;
    if (bulan    && r[B.tgl]?.slice(5,7) !== bulan) return false;
    if (cari && !(r[B.nama]||'').toLowerCase().includes(cari) &&
               !(r[B.desa]||'').toLowerCase().includes(cari) &&
               !(r[B.kegiatan]||'').toLowerCase().includes(cari)) return false;
    return true;
  });

  window.APP.benef.page = 0;
  renderBenefStats();
  renderBenefCharts();
  renderBenefTable();
}

function renderBenefStats() {
  const d = window.APP.benef.filtered;
  const total  = d.length;
  const uniq   = new Set(d.map(r => (r[B.nama]||'').toLowerCase()+'|'+(r[B.desa]||''))).size;
  const gL     = d.filter(r => r[B.gender] === 'L').length;
  const gP     = d.filter(r => r[B.gender] === 'P').length;
  const desaSet= new Set(d.map(r => r[B.desa]).filter(Boolean)).size;
  const progs  = new Set(d.map(r => r[B.proyek]).filter(Boolean)).size;

  setCard('bstat-total',  total.toLocaleString('id-ID'), `${uniq.toLocaleString()} unik (nama+desa)`);
  setCard('bstat-lp',     `${gL.toLocaleString()} / ${gP.toLocaleString()}`,
    `${total ? (gP/total*100).toFixed(1) : 0}% perempuan`);
  setCard('bstat-desa',   desaSet.toLocaleString('id-ID'), 'desa/kelurahan tercakup');
  setCard('bstat-prog',   progs.toLocaleString(), 'program aktif');
}

function renderBenefCharts() {
  const d = window.APP.benef.filtered;

  /* Trend bulan */
  const byBulan = sortedBulan(groupCount(d, r => r[B.tgl]?.slice(0,7)));
  mkLine('bch-trend', byBulan.map(([k]) => { const [y,m]=k.split('-'); return bulanName(m)+"'"+y.slice(2); }),
    byBulan.map(([,v]) => v), '#F97316', { label:'Benef', noLegend:true });

  /* Gender donut */
  const gMap = { 'L':'Laki-laki', 'P':'Perempuan', '—':'Tidak Diisi' };
  const byGender = groupCount(d, r => gMap[r[B.gender]] || 'Tidak Diisi');
  const gKeys = Object.keys(byGender);
  mkDonut('bch-gender', gKeys, gKeys.map(k => byGender[k]), ['#4F8EF7','#EF4444','#8A96B8']);

  /* Kategori bar h */
  const byKat = top(groupCount(d, r => r[B.kategori]), 10);
  mkBarH('bch-kategori', byKat.map(([k]) => k), byKat.map(([,v]) => v),
    byKat.map((_,i) => PALETTE[i%PALETTE.length]), { label:'Benef' });

  /* Usia */
  const byUsia = top(groupCount(d, r => r[B.katUsia] || r[B.usia] || '—'), 8);
  mkBarH('bch-usia', byUsia.map(([k])=>k), byUsia.map(([,v])=>v),
    '#F59E0B', { label:'Benef' });

  /* Per program */
  const byProg = top(groupCount(d, r => r[B.proyek]), 8);
  mkBarH('bch-proyek', byProg.map(([k])=>k), byProg.map(([,v])=>v),
    '#22C55E', { label:'Benef' });

  /* Top desa */
  const byDesa = top(groupCount(d, r => r[B.desa]), 10);
  mkBarH('bch-desa', byDesa.map(([k])=>k), byDesa.map(([,v])=>v),
    '#8B5CF6', { label:'Benef' });

  /* Per staf */
  const byStaf = top(groupCount(d, r => r[B.staf]), 10);
  mkBarH('bch-staf', byStaf.map(([k])=>k), byStaf.map(([,v])=>v),
    '#14B8A6', { label:'Benef' });

  /* Disabilitas */
  const byDisab = top(groupCount(d, r => r[B.disab] || '—'), 8);
  mkBarH('bch-disab', byDisab.map(([k])=>k), byDisab.map(([,v])=>v),
    byDisab.map((_,i) => PALETTE[i%PALETTE.length]), { label:'Benef' });
}

function renderBenefTable() {
  const q = (document.getElementById('benef-tbl-search')?.value || '').toLowerCase().trim();
  let rows = window.APP.benef.filtered;
  if (q) rows = rows.filter(r =>
    (r[B.nama]||'').toLowerCase().includes(q) ||
    (r[B.desa]||'').toLowerCase().includes(q) ||
    (r[B.kegiatan]||'').toLowerCase().includes(q) ||
    (r[B.kab]||'').toLowerCase().includes(q)
  );

  const total = rows.length;
  const start = window.APP.benef.page * window.APP.PG_SIZE;
  const slice = rows.slice(start, start + window.APP.PG_SIZE);

  setEl('benef-tbl-count', `${total.toLocaleString()} baris`);
  setEl('benef-pg-info', `${(start+1).toLocaleString()}–${Math.min(start+window.APP.PG_SIZE,total).toLocaleString()} dari ${total.toLocaleString()}`);
  const prevBtn = document.getElementById('benef-pg-prev');
  const nextBtn = document.getElementById('benef-pg-next');
  if (prevBtn) prevBtn.disabled = window.APP.benef.page === 0;
  if (nextBtn) nextBtn.disabled = start + window.APP.PG_SIZE >= total;

  const tbody = document.getElementById('benef-tbl-body');
  if (!tbody) return;
  tbody.innerHTML = slice.length ? slice.map(r => `
    <tr>
      <td>${r[B.nama] || '—'}</td>
      <td><span class="badge badge-${r[B.gender]}">${r[B.gender] || '—'}</span></td>
      <td>${r[B.katUsia] || r[B.usia] || '—'}</td>
      <td>${r[B.kategori] || '—'}</td>
      <td>${r[B.disab] || '—'}</td>
      <td>${r[B.desa] || '—'}</td>
      <td>${r[B.kec] || '—'}</td>
      <td>${r[B.kab] || '—'}</td>
      <td>${r[B.proyek] || '—'}</td>
      <td>${r[B.kegiatan] || '—'}</td>
      <td>${r[B.benefit] || '—'}</td>
      <td>${r[B.staf] || '—'}</td>
      <td class="mono">${r[B.tgl] || '—'}</td>
      <td class="mono">${r[B.kode] || '—'}</td>
    </tr>`).join('')
    : '<tr><td colspan="14" class="empty-state"><span class="ei">🔍</span>Tidak ada data</td></tr>';
}

window.changeBenefPage = dir => {
  window.APP.benef.page = Math.max(0, window.APP.benef.page + dir);
  renderBenefTable();
};
