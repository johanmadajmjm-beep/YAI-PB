/* ═══════════════════════════════════════════════
   pjum.js — PJUM page
═══════════════════════════════════════════════ */

function buildPjumPage() {
  var pjum = window.rawPjum;
  var P = window.P;

  populateSel('pf-proyek', uniqArr(pjum.map(function(r) { return r[P.proyek]; })));
  populateSel('pf-staf',   uniqArr(pjum.map(function(r) { return r[P.staf]; })));
  populateSel('pf-kode',   uniqArr(pjum.map(function(r) { return r[P.kode]; })));
  populateSel('pf-tahun',  uniqArr(pjum.map(function(r) { return r[P.tgl] ? r[P.tgl].slice(0,4) : null; }).filter(Boolean)).reverse());
  populateSel('pf-bulan',  ['01','02','03','04','05','06','07','08','09','10','11','12'], bulanName);

  var fids = ['pf-proyek','pf-staf','pf-kode','pf-tahun','pf-bulan','pf-cari'];
  fids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', applyPjumFilter);
      el.addEventListener('input', applyPjumFilter);
    }
  });

  var resetBtn = document.getElementById('pf-reset');
  if (resetBtn) resetBtn.addEventListener('click', function() {
    fids.forEach(function(id) { var el = document.getElementById(id); if(el) el.value = ''; });
    applyPjumFilter();
  });

  applyPjumFilter();
}

function applyPjumFilter() {
  var P = window.P;
  var proyek = v('pf-proyek');
  var staf   = v('pf-staf');
  var kode   = v('pf-kode');
  var tahun  = v('pf-tahun');
  var bulan  = v('pf-bulan');
  var cari   = v('pf-cari').toLowerCase().trim();

  window.APP.pjum.filtered = window.rawPjum.filter(function(r) {
    if (proyek && r[P.proyek] !== proyek) return false;
    if (staf   && r[P.staf]  !== staf)   return false;
    if (kode   && r[P.kode]  !== kode)   return false;
    if (tahun  && !(r[P.tgl]||'').startsWith(tahun)) return false;
    if (bulan  && (r[P.tgl]||'').slice(5,7) !== bulan) return false;
    if (cari && (r[P.kegiatan]||'').toLowerCase().indexOf(cari) < 0 &&
               (r[P.item]||'').toLowerCase().indexOf(cari) < 0 &&
               (r[P.staf]||'').toLowerCase().indexOf(cari) < 0) return false;
    return true;
  });

  window.APP.pjum.page = 0;
  renderPjumStats();
  renderPjumCharts();
  renderPjumTable();
}

function renderPjumStats() {
  var P = window.P;
  var d = window.APP.pjum.filtered;
  var total = d.reduce(function(s, r) { return s + (parseFloat(r[P.jumlah]) || 0); }, 0);
  var transaksi = d.length;
  var progsS = {}, stafS = {}, kodeS = {}, fileS = {};
  d.forEach(function(r) {
    if(r[P.proyek]) progsS[r[P.proyek]] = 1;
    if(r[P.staf])   stafS[r[P.staf]]   = 1;
    if(r[P.kode])   kodeS[r[P.kode]]   = 1;
    if(r[P.file])   fileS[r[P.file]]   = 1;
  });
  setCard('pstat-total', fmtShort(total), fmt(total));
  setCard('pstat-trx',   transaksi.toLocaleString(), 'item pengeluaran');
  setCard('pstat-prog',  Object.keys(progsS).length.toLocaleString(), Object.keys(kodeS).length + ' kode kegiatan');
  setCard('pstat-staf',  Object.keys(stafS).length.toLocaleString(), Object.keys(fileS).length + ' file terupload');
}

function renderPjumCharts() {
  var P = window.P;
  var d = window.APP.pjum.filtered;

  var byBulan = sortedBulan(groupSum(d,
    function(r) { return validTgl(r[P.tgl]); },
    function(r) { return r[P.jumlah]; }
  ));
  mkLine('pch-trend',
    byBulan.map(function(x) { var p=x[0].split('-'); return bulanName(p[1])+"'"+p[0].slice(2); }),
    byBulan.map(function(x) { return x[1]; }),
    '#F97316', { label:'Pengeluaran', yFmt:fmtShort, noLegend:true });

  var byKomp = topN(groupSum(d, function(r){return classifyItem(r[P.item]);}, function(r){return r[P.jumlah];}), 9);
  var kompTotal = byKomp.reduce(function(s,x){return s+x[1];},0);
  mkDonut('pch-komponen', byKomp.map(function(x){return x[0];}), byKomp.map(function(x){return x[1];}));
  renderDonutLegendPjum('pch-komponen-legend', byKomp, kompTotal);

  var byProyek = topN(groupSum(d, function(r){return r[P.proyek];}, function(r){return r[P.jumlah];}), 10);
  mkBarH('pch-proyek', byProyek.map(function(x){return x[0];}), byProyek.map(function(x){return x[1];}),
    PALETTE[0], { label:'Biaya', yFmt:fmtShort });

  var byStaf = topN(groupSum(d, function(r){return r[P.staf];}, function(r){return r[P.jumlah];}), 10);
  mkBarH('pch-staf', byStaf.map(function(x){return x[0];}), byStaf.map(function(x){return x[1];}),
    '#22C55E', { label:'Biaya', yFmt:fmtShort });

  var byKode = topN(groupSum(d, function(r){return r[P.kode];}, function(r){return r[P.jumlah];}), 10);
  mkBarH('pch-kode', byKode.map(function(x){return x[0];}), byKode.map(function(x){return x[1];}),
    '#8B5CF6', { label:'Biaya', yFmt:fmtShort });

  var byKeg = topN(groupSum(d, function(r){return r[P.kegiatan];}, function(r){return r[P.jumlah];}), 8);
  mkBarH('pch-kegiatan', byKeg.map(function(x){return x[0];}), byKeg.map(function(x){return x[1];}),
    '#14B8A6', { label:'Biaya', yFmt:fmtShort });

  /* Quick stats */
  var qs = document.getElementById('pjum-quick-stats');
  if (qs) {
    var items = [
      ['Rata-rata per Transaksi', d.length ? fmtShort(d.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0)/d.length) : '—'],
      ['Transaksi Terbesar', d.length ? fmtShort(Math.max.apply(null, d.map(function(r){return parseFloat(r[P.jumlah])||0;}))) : '—'],
      ['Program Terbanyak Biaya', byProyek[0] ? byProyek[0][0] : '—'],
      ['Staf Terbanyak Biaya', byStaf[0] ? byStaf[0][0] : '—'],
    ];
    qs.innerHTML = items.map(function(x) {
      return '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">' +
        '<span style="color:var(--text2);font-size:13px">' + x[0] + '</span>' +
        '<span style="font-weight:700;font-size:13px">' + x[1] + '</span>' +
      '</div>';
    }).join('');
  }
}

function renderDonutLegendPjum(id, entries, total) {
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

function renderPjumTable() {
  var P = window.P;
  var q = (document.getElementById('pjum-tbl-search') ? document.getElementById('pjum-tbl-search').value : '').toLowerCase().trim();
  var rows = window.APP.pjum.filtered;
  if (q) rows = rows.filter(function(r) {
    return (r[P.kegiatan]||'').toLowerCase().indexOf(q) > -1 ||
           (r[P.item]||'').toLowerCase().indexOf(q) > -1 ||
           (r[P.staf]||'').toLowerCase().indexOf(q) > -1 ||
           (r[P.proyek]||'').toLowerCase().indexOf(q) > -1 ||
           (r[P.kode]||'').toLowerCase().indexOf(q) > -1;
  });

  var total = rows.length;
  var start = window.APP.pjum.page * window.APP.PG_SIZE;
  var slice = rows.slice(start, start + window.APP.PG_SIZE);
  var totalBiaya = rows.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);

  setEl('pjum-tbl-count', total.toLocaleString() + ' baris · ' + fmtShort(totalBiaya));
  setEl('pjum-pg-info', (start+1).toLocaleString() + '–' + Math.min(start+window.APP.PG_SIZE,total).toLocaleString() + ' dari ' + total.toLocaleString());
  var prevBtn = document.getElementById('pjum-pg-prev');
  var nextBtn = document.getElementById('pjum-pg-next');
  if (prevBtn) prevBtn.disabled = window.APP.pjum.page === 0;
  if (nextBtn) nextBtn.disabled = start + window.APP.PG_SIZE >= total;

  var tbody = document.getElementById('pjum-tbl-body');
  if (!tbody) return;
  if (!slice.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text3)">Tidak ada data</td></tr>';
    return;
  }
  tbody.innerHTML = slice.map(function(r) {
    return '<tr>' +
      '<td class="mono">' + (r[P.tgl]||'—') + '</td>' +
      '<td>' + (r[P.staf]||'—') + '</td>' +
      '<td>' + (r[P.proyek]||'—') + '</td>' +
      '<td class="mono">' + (r[P.kode]||'—') + '</td>' +
      '<td>' + (r[P.kegiatan]||'—') + '</td>' +
      '<td>' + (r[P.item]||'—') + '</td>' +
      '<td>' + classifyItem(r[P.item]) + '</td>' +
      '<td class="num">' + fmt(parseFloat(r[P.jumlah])||0) + '</td>' +
      '<td class="mono" style="font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis" title="' + (r[P.file]||'') + '">' + (r[P.file]||'—') + '</td>' +
    '</tr>';
  }).join('');
}

window.changePjumPage = function(dir) {
  window.APP.pjum.page = Math.max(0, window.APP.pjum.page + dir);
  renderPjumTable();
};
