/* ═══════════════════════════════════════════════
   benef.js — Beneficiary page
═══════════════════════════════════════════════ */

function buildBenefPage() {
  var benef = window.rawBenef;
  var B = window.B;

  populateSel('bf-proyek',   uniqArr(benef.map(function(r) { return r[B.proyek]; })));
  populateSel('bf-staf',     uniqArr(benef.map(function(r) { return r[B.staf]; })));
  populateSel('bf-kategori', uniqArr(benef.map(function(r) { return r[B.kategori]; })));
  populateSel('bf-kab',      uniqArr(benef.map(function(r) { return r[B.kab]; })));
  populateSel('bf-kec',      uniqArr(benef.map(function(r) { return r[B.kec]; })));
  populateSel('bf-disab',    uniqArr(benef.map(function(r) { return r[B.disab]; })));
  populateSel('bf-tahun',    uniqArr(benef.map(function(r) { return r[B.tgl] ? r[B.tgl].slice(0,4) : null; }).filter(Boolean)).reverse());
  populateSel('bf-bulan',    ['01','02','03','04','05','06','07','08','09','10','11','12'], bulanName);

  var fids = ['bf-proyek','bf-staf','bf-kategori','bf-kab','bf-kec','bf-disab','bf-gender','bf-tahun','bf-bulan','bf-cari'];
  fids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', applyBenefFilter);
      el.addEventListener('input', applyBenefFilter);
    }
  });

  var resetBtn = document.getElementById('bf-reset');
  if (resetBtn) resetBtn.addEventListener('click', function() {
    fids.forEach(function(id) { var el = document.getElementById(id); if(el) el.value = ''; });
    applyBenefFilter();
  });

  applyBenefFilter();
}

function applyBenefFilter() {
  var B = window.B;
  var proyek   = v('bf-proyek');
  var staf     = v('bf-staf');
  var kategori = v('bf-kategori');
  var kab      = v('bf-kab');
  var kec      = v('bf-kec');
  var disab    = v('bf-disab');
  var gender   = v('bf-gender');
  var tahun    = v('bf-tahun');
  var bulan    = v('bf-bulan');
  var cari     = v('bf-cari').toLowerCase();

  window.APP.benef.filtered = window.rawBenef.filter(function(r) {
    if (proyek   && r[B.proyek]   !== proyek)   return false;
    if (staf     && r[B.staf]     !== staf)     return false;
    if (kategori && r[B.kategori] !== kategori) return false;
    if (kab      && r[B.kab]      !== kab)      return false;
    if (kec      && r[B.kec]      !== kec)      return false;
    if (disab    && r[B.disab]    !== disab)    return false;
    if (gender   && r[B.gender]   !== gender)   return false;
    if (tahun    && !(r[B.tgl] || '').startsWith(tahun)) return false;
    if (bulan    && (r[B.tgl] || '').slice(5,7) !== bulan) return false;
    if (cari && (r[B.nama]||'').toLowerCase().indexOf(cari) < 0 &&
               (r[B.desa]||'').toLowerCase().indexOf(cari) < 0 &&
               (r[B.kegiatan]||'').toLowerCase().indexOf(cari) < 0) return false;
    return true;
  });

  window.APP.benef.page = 0;
  renderBenefStats();
  renderBenefCharts();
  renderBenefTable();
}

function renderBenefStats() {
  var B = window.B;
  var d = window.APP.benef.filtered;
  var total = d.length;
  var uniqSet = {};
  d.forEach(function(r) { uniqSet[(r[B.nama]||'').toLowerCase()+'|'+(r[B.desa]||'')] = 1; });
  var uniq  = Object.keys(uniqSet).length;
  var gL    = d.filter(function(r) { return r[B.gender] === 'L'; }).length;
  var gP    = d.filter(function(r) { return r[B.gender] === 'P'; }).length;
  var desaS = {}; d.forEach(function(r) { if(r[B.desa]) desaS[r[B.desa]] = 1; });
  var progS = {}; d.forEach(function(r) { if(r[B.proyek]) progS[r[B.proyek]] = 1; });

  setCard('bstat-total', total.toLocaleString('id-ID'), uniq.toLocaleString() + ' unik (nama+desa)');
  setCard('bstat-lp',    gL.toLocaleString() + ' / ' + gP.toLocaleString(),
    (total ? (gP/total*100).toFixed(1) : 0) + '% perempuan');
  setCard('bstat-desa',  Object.keys(desaS).length.toLocaleString(), 'desa/kelurahan tercakup');
  setCard('bstat-prog',  Object.keys(progS).length.toLocaleString(), 'program aktif');
}

function renderBenefCharts() {
  var B = window.B;
  var d = window.APP.benef.filtered;

  var byBulan = sortedBulan(groupCount(d, function(r) { return r[B.tgl] ? r[B.tgl].slice(0,7) : null; }));
  mkLine('bch-trend',
    byBulan.map(function(x) { var p=x[0].split('-'); return bulanName(p[1])+"'"+p[0].slice(2); }),
    byBulan.map(function(x) { return x[1]; }), '#F97316', { label:'Benef', noLegend:true });

  var gMap = { 'L':'Laki-laki', 'P':'Perempuan', '—':'Tidak Diisi' };
  var byGender = groupCount(d, function(r) { return gMap[r[B.gender]] || 'Tidak Diisi'; });
  var gKeys = Object.keys(byGender);
  mkDonut('bch-gender', gKeys, gKeys.map(function(k) { return byGender[k]; }), ['#4F8EF7','#EF4444','#8A96B8']);

  var byKat = topN(groupCount(d, function(r) { return r[B.kategori]; }), 10);
  mkBarH('bch-kategori', byKat.map(function(x){return x[0];}), byKat.map(function(x){return x[1];}),
    byKat.map(function(_,i){return PALETTE[i%PALETTE.length];}), { label:'Benef' });

  var byUsia = topN(groupCount(d, function(r) { return r[B.katUsia] || r[B.usia] || '—'; }), 8);
  mkBarH('bch-usia', byUsia.map(function(x){return x[0];}), byUsia.map(function(x){return x[1];}),
    '#F59E0B', { label:'Benef' });

  var byProg = topN(groupCount(d, function(r) { return r[B.proyek]; }), 8);
  mkBarH('bch-proyek', byProg.map(function(x){return x[0];}), byProg.map(function(x){return x[1];}),
    '#22C55E', { label:'Benef' });

  var byDesa = topN(groupCount(d, function(r) { return r[B.desa]; }), 10);
  mkBarH('bch-desa', byDesa.map(function(x){return x[0];}), byDesa.map(function(x){return x[1];}),
    '#8B5CF6', { label:'Benef' });

  var byStaf = topN(groupCount(d, function(r) { return r[B.staf]; }), 10);
  mkBarH('bch-staf', byStaf.map(function(x){return x[0];}), byStaf.map(function(x){return x[1];}),
    '#14B8A6', { label:'Benef' });

  var byDisab = topN(groupCount(d, function(r) { return r[B.disab] || '—'; }), 8);
  mkBarH('bch-disab', byDisab.map(function(x){return x[0];}), byDisab.map(function(x){return x[1];}),
    byDisab.map(function(_,i){return PALETTE[i%PALETTE.length];}), { label:'Benef' });
}

function renderBenefTable() {
  var B = window.B;
  var q = (document.getElementById('benef-tbl-search') ? document.getElementById('benef-tbl-search').value : '').toLowerCase().trim();
  var rows = window.APP.benef.filtered;
  if (q) rows = rows.filter(function(r) {
    return (r[B.nama]||'').toLowerCase().indexOf(q) > -1 ||
           (r[B.desa]||'').toLowerCase().indexOf(q) > -1 ||
           (r[B.kegiatan]||'').toLowerCase().indexOf(q) > -1 ||
           (r[B.kab]||'').toLowerCase().indexOf(q) > -1;
  });

  var total = rows.length;
  var start = window.APP.benef.page * window.APP.PG_SIZE;
  var slice = rows.slice(start, start + window.APP.PG_SIZE);

  setEl('benef-tbl-count', total.toLocaleString() + ' baris');
  setEl('benef-pg-info', (start+1).toLocaleString() + '–' + Math.min(start+window.APP.PG_SIZE,total).toLocaleString() + ' dari ' + total.toLocaleString());
  var prevBtn = document.getElementById('benef-pg-prev');
  var nextBtn = document.getElementById('benef-pg-next');
  if (prevBtn) prevBtn.disabled = window.APP.benef.page === 0;
  if (nextBtn) nextBtn.disabled = start + window.APP.PG_SIZE >= total;

  var tbody = document.getElementById('benef-tbl-body');
  if (!tbody) return;
  if (!slice.length) {
    tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;padding:32px;color:var(--text3)">Tidak ada data</td></tr>';
    return;
  }
  tbody.innerHTML = slice.map(function(r) {
    return '<tr>' +
      '<td>' + (r[B.nama]||'—') + '</td>' +
      '<td><span class="badge badge-' + r[B.gender] + '">' + (r[B.gender]||'—') + '</span></td>' +
      '<td>' + (r[B.katUsia]||r[B.usia]||'—') + '</td>' +
      '<td>' + (r[B.kategori]||'—') + '</td>' +
      '<td>' + (r[B.disab]||'—') + '</td>' +
      '<td>' + (r[B.desa]||'—') + '</td>' +
      '<td>' + (r[B.kec]||'—') + '</td>' +
      '<td>' + (r[B.kab]||'—') + '</td>' +
      '<td>' + (r[B.proyek]||'—') + '</td>' +
      '<td>' + (r[B.kegiatan]||'—') + '</td>' +
      '<td>' + (r[B.benefit]||'—') + '</td>' +
      '<td>' + (r[B.staf]||'—') + '</td>' +
      '<td class="mono">' + (r[B.tgl]||'—') + '</td>' +
      '<td class="mono">' + (r[B.kode]||'—') + '</td>' +
    '</tr>';
  }).join('');
}

window.changeBenefPage = function(dir) {
  window.APP.benef.page = Math.max(0, window.APP.benef.page + dir);
  renderBenefTable();
};
