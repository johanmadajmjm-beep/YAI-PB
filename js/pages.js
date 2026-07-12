/* ═══════════════════════════════════════════════
   wilayah.js — Sebaran Wilayah page
═══════════════════════════════════════════════ */

function buildWilayahPage() {
  const benef = window.rawBenef;

  populateSel('wf-proyek', uniq(benef.map(r => r[B.proyek])));
  populateSel('wf-tahun',  uniq(benef.map(r => r[B.tgl]?.slice(0,4)).filter(Boolean)).reverse());

  const fids = ['wf-proyek','wf-tahun'];
  fids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', applyWilayahFilter);
  });
  document.getElementById('wf-reset')?.addEventListener('click', () => {
    fids.forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    applyWilayahFilter();
  });

  applyWilayahFilter();
}

function applyWilayahFilter() {
  const proyek = v('wf-proyek');
  const tahun  = v('wf-tahun');

  window.APP.wilayah.filtered = window.rawBenef.filter(r => {
    if (proyek && r[B.proyek] !== proyek) return false;
    if (tahun  && !r[B.tgl]?.startsWith(tahun)) return false;
    return true;
  });

  window.APP.wilayah.page = 0;
  renderWilayahCharts();
  renderWilayahTable();
}

function renderWilayahCharts() {
  const d = window.APP.wilayah.filtered;

  /* Kabupaten */
  const byKab = top(groupCount(d, r => r[B.kab]), 12);
  mkBarH('wch-kab', byKab.map(([k])=>k), byKab.map(([,v])=>v),
    byKab.map((_,i)=>PALETTE[i%PALETTE.length]), { label:'Benef' });

  /* Kecamatan */
  const byKec = top(groupCount(d, r => r[B.kec]), 12);
  mkBarH('wch-kec', byKec.map(([k])=>k), byKec.map(([,v])=>v),
    '#F97316', { label:'Benef' });

  /* Desa top 15 */
  const byDesa = top(groupCount(d, r => r[B.desa]), 15);
  mkBarH('wch-desa', byDesa.map(([k])=>k), byDesa.map(([,v])=>v),
    '#8B5CF6', { label:'Benef' });

  /* Stat summary */
  const kabSet  = new Set(d.map(r=>r[B.kab]).filter(Boolean)).size;
  const kecSet  = new Set(d.map(r=>r[B.kec]).filter(Boolean)).size;
  const desaSet = new Set(d.map(r=>r[B.desa]).filter(Boolean)).size;
  setEl('wstat-kab',  kabSet.toLocaleString());
  setEl('wstat-kec',  kecSet.toLocaleString());
  setEl('wstat-desa', desaSet.toLocaleString());
  setEl('wstat-tot',  d.length.toLocaleString());
}

function renderWilayahTable() {
  const d = window.APP.wilayah.filtered;
  const byDesa = top(groupCount(d, r => r[B.desa]), 100);
  const total  = byDesa.reduce((s,[,v])=>s+v,0)||1;
  const start  = window.APP.wilayah.page * 20;
  const slice  = byDesa.slice(start, start+20);

  const tbody = document.getElementById('wilayah-tbl-body');
  if (!tbody) return;
  tbody.innerHTML = slice.map(([desa, cnt], i) => {
    const row = d.find(r => r[B.desa] === desa);
    return `<tr>
      <td>${start+i+1}</td>
      <td><strong>${desa}</strong></td>
      <td>${row ? (row[B.kec]||'—') : '—'}</td>
      <td>${row ? (row[B.kab]||'—') : '—'}</td>
      <td class="num">${cnt.toLocaleString()}</td>
      <td class="num">${(cnt/total*100).toFixed(1)}%</td>
      <td>
        <div class="rank-bar" style="width:120px">
          <div class="rank-bar-fill" style="width:${byDesa[0]?.[1]?cnt/byDesa[0][1]*100:0}%"></div>
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" class="empty-state">Tidak ada data</td></tr>';

  setEl('wilayah-pg-info', `${start+1}–${Math.min(start+20,byDesa.length)} dari ${byDesa.length} desa`);
  const prevBtn = document.getElementById('wilayah-pg-prev');
  const nextBtn = document.getElementById('wilayah-pg-next');
  if (prevBtn) prevBtn.disabled = window.APP.wilayah.page === 0;
  if (nextBtn) nextBtn.disabled = start+20 >= byDesa.length;
}

window.changeWilayahPage = dir => {
  window.APP.wilayah.page = Math.max(0, window.APP.wilayah.page + dir);
  renderWilayahTable();
};


/* ═══════════════════════════════════════════════
   analitik.js — Analitik Mendalam page
═══════════════════════════════════════════════ */

function buildAnalitikPage() {
  renderAnalitikCharts();
}

function renderAnalitikCharts() {
  const pjum  = window.rawPjum;
  const benef = window.rawBenef;

  /* 1. Biaya per Program — stacked month */
  const programs = [...new Set(pjum.map(r => r[P.proyek]).filter(Boolean))].slice(0, 6);
  const allBulan = [...new Set(pjum.map(r => r[P.tgl]?.slice(0,7)).filter(Boolean))].sort();
  const bulanLabels = allBulan.map(k => { const [y,m]=k.split('-'); return bulanName(m)+"'"+y.slice(2); });

  const stackedDatasets = programs.map((prog, i) => ({
    label: prog,
    data: allBulan.map(bln => {
      return pjum.filter(r => r[P.proyek]===prog && r[P.tgl]?.slice(0,7)===bln)
                 .reduce((s,r)=>s+(parseFloat(r[P.jumlah])||0),0);
    }),
    backgroundColor: PALETTE[i % PALETTE.length],
    borderRadius: 3
  }));

  mkMultiBar('ach-pjum-stacked', bulanLabels, stackedDatasets,
    { yFmt: fmtShort, stacked: true });

  /* 2. Rasio Gender per Program */
  const progList = [...new Set(benef.map(r => r[B.proyek]).filter(Boolean))].slice(0, 8);
  const lData = progList.map(p => benef.filter(r=>r[B.proyek]===p && r[B.gender]==='L').length);
  const pData = progList.map(p => benef.filter(r=>r[B.proyek]===p && r[B.gender]==='P').length);
  mkMultiBar('ach-gender-prog', progList, [
    { label:'Laki-laki', data:lData, backgroundColor:'#4F8EF7', borderRadius:3 },
    { label:'Perempuan', data:pData, backgroundColor:'#EF4444', borderRadius:3 }
  ], { stacked: true });

  /* 3. Benef per Kategori per Bulan (top 4 kategori) */
  const topKat = top(groupCount(benef, r=>r[B.kategori]), 4).map(([k])=>k);
  const benefBulan = [...new Set(benef.map(r=>r[B.tgl]?.slice(0,7)).filter(Boolean))].sort();
  const bBulanLabels = benefBulan.map(k => { const [y,m]=k.split('-'); return bulanName(m)+"'"+y.slice(2); });
  const katDatasets = topKat.map((kat, i) => ({
    label: kat,
    data: benefBulan.map(bln => benef.filter(r=>r[B.kategori]===kat && r[B.tgl]?.slice(0,7)===bln).length),
    borderColor: PALETTE[i], backgroundColor: PALETTE[i]+'22',
    fill: false, tension: .35, pointRadius: 3
  }));
  mkChart('ach-kategori-trend', 'line', bBulanLabels, katDatasets, {});

  /* 4. Cost per Komponen — pie */
  const byKomp = top(groupSum(pjum, r=>classifyItem(r[P.item]), r=>r[P.jumlah]), 9);
  mkDonut('ach-komponen', byKomp.map(([k])=>k), byKomp.map(([,v])=>v));
  renderAchKomponenLegend(byKomp);

  /* 5. Top Staf Benef vs PJUM */
  const topStafB = top(groupCount(benef, r=>r[B.staf]), 8);
  const stafNames = topStafB.map(([k])=>k);
  const stafPjumData = stafNames.map(s =>
    pjum.filter(r=>r[P.staf]===s).reduce((acc,r)=>acc+(parseFloat(r[P.jumlah])||0),0)
  );
  mkMultiBar('ach-staf-compare', stafNames, [
    { label:'Jml Benef', data:topStafB.map(([,v])=>v), backgroundColor:'#F97316', borderRadius:3, yAxisID:'y' },
    { label:'Biaya PJUM (Rp)', data:stafPjumData, backgroundColor:'#4F8EF7', borderRadius:3, yAxisID:'y1' }
  ], {
    extra: {
      scales: {
        x: { ticks:{color:'#8A96B8',font:{size:11}}, grid:{color:'#F0F2F8'} },
        y:  { type:'linear', position:'left',  ticks:{color:'#F97316',font:{size:11}}, grid:{color:'#F0F2F8'} },
        y1: { type:'linear', position:'right', ticks:{color:'#4F8EF7',font:{size:11}, callback: fmtShort}, grid:{drawOnChartArea:false} }
      }
    }
  });

  /* 6. Efisiensi — Cost per Benef per Program */
  const progBenef = groupCount(benef, r=>r[B.proyek]);
  const progCost  = groupSum(pjum,  r=>r[P.proyek], r=>r[P.jumlah]);
  const efisiEntry = Object.keys(progBenef)
    .filter(p => progCost[p])
    .map(p => ({ p, ratio: (progCost[p]||0) / (progBenef[p]||1) }))
    .sort((a,b)=>a.ratio-b.ratio).slice(0,8);
  mkBarH('ach-efisiensi',
    efisiEntry.map(e=>e.p), efisiEntry.map(e=>e.ratio),
    efisiEntry.map((_,i)=>PALETTE[i%PALETTE.length]),
    { label:'Rp per Benef', yFmt: fmtShort });
}

function renderAchKomponenLegend(entries) {
  const total = entries.reduce((s,[,v])=>s+v,0)||1;
  const el = document.getElementById('ach-komponen-legend');
  if (!el) return;
  el.innerHTML = entries.map(([k,v],i) => `
    <div class="dl-item">
      <div class="dl-dot" style="background:${PALETTE[i%PALETTE.length]}"></div>
      <div class="dl-name">${k}</div>
      <div class="dl-pct">${fmtShort(v)} · ${(v/total*100).toFixed(1)}%</div>
    </div>`).join('');
}
