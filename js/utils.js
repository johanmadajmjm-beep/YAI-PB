/* ═══════════════════════════════════════════════
   utils.js — Shared helpers
═══════════════════════════════════════════════ */

window.v = function(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
};

window.populateSel = function(id, values, labelFn) {
  var el = document.getElementById(id);
  if (!el) return;
  var cur = el.value;
  el.innerHTML = '<option value="">Semua</option>' +
    values.map(function(val) {
      return '<option value="' + val + '">' + (labelFn ? labelFn(val) : val) + '</option>';
    }).join('');
  if (cur) {
    var opts = Array.from(el.options);
    if (opts.some(function(o) { return o.value === cur; })) el.value = cur;
  }
};

window.setEl = function(id, html) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = html;
};

window.setCard = function(id, value, sub) {
  var el = document.getElementById(id);
  if (!el) return;
  var valEl = el.querySelector('.stat-value');
  var subEl = el.querySelector('.stat-sub');
  if (valEl) valEl.innerHTML = value;
  if (subEl) subEl.innerHTML = sub || '';
};

/* ═══════════════════════════════════════════════
   Unique Beneficiary Helpers
   Key unik = nama(lowercase) + '|' + desa
   Satu orang yang ikut banyak kegiatan tetap dihitung 1
═══════════════════════════════════════════════ */

/* benefKey: kembalikan unique key untuk satu row benef */
window.benefKey = function(r) {
  var B = window.B;
  return (r[B.nama]||'').toLowerCase() + '|' + (r[B.desa]||'');
};

/* countUniqBenef: hitung jumlah orang unik dalam array benef */
window.countUniqBenef = function(arr) {
  var s = {};
  arr.forEach(function(r) { s[benefKey(r)] = 1; });
  return Object.keys(s).length;
};

/* groupCountUniq: group by groupKeyFn, hitung orang unik per group
   Return object { groupKey: uniqueCount } */
window.groupCountUniq = function(arr, groupKeyFn) {
  var groups = {};
  arr.forEach(function(r) {
    var gk = groupKeyFn(r);
    if (!gk || gk === '—' || gk === '') return;
    if (!groups[gk]) groups[gk] = {};
    groups[gk][benefKey(r)] = 1;
  });
  var result = {};
  Object.keys(groups).forEach(function(k) {
    result[k] = Object.keys(groups[k]).length;
  });
  return result;
};

/* countUniqByGender: hitung orang unik untuk gender tertentu */
window.countUniqByGender = function(arr, gender) {
  var B = window.B;
  var s = {};
  arr.forEach(function(r) {
    if (r[B.gender] === gender) s[benefKey(r)] = 1;
  });
  return Object.keys(s).length;
};

/* ═══════════════════════════════════════════════
   Sortable tables — registry global (v4.4)
   HTML: <th class="th-sort" data-tbl="key" data-col="i">
   Renderer membaca window.SORT[key] = {col, dir}
═══════════════════════════════════════════════ */
window.SORT = {};
window._sortHandlers = {};

/* Comparator numeric-aware: angka dibanding numerik, teks pakai locale id */
window.cmpVals = function(a, b) {
  var an = (typeof a === 'number'), bn = (typeof b === 'number');
  if (an && bn) return a - b;
  var as = String(a == null ? '' : a), bs = String(b == null ? '' : b);
  /* baris kosong/— selalu di bawah */
  var ae = (!as || as === '—'), be = (!bs || bs === '—');
  if (ae && be) return 0; if (ae) return 1; if (be) return -1;
  if (/^-?\d+([.,]\d+)?$/.test(as) && /^-?\d+([.,]\d+)?$/.test(bs)) {
    return parseFloat(as.replace(',', '.')) - parseFloat(bs.replace(',', '.'));
  }
  return as.localeCompare(bs, 'id', { sensitivity: 'base' });
};

document.addEventListener('click', function(e) {
  var th = e.target && e.target.closest ? e.target.closest('th.th-sort') : null;
  if (!th) return;
  var key = th.getAttribute('data-tbl');
  var col = parseInt(th.getAttribute('data-col'), 10);
  if (!key || isNaN(col)) return;
  var st = window.SORT[key];
  if (st && st.col === col) st.dir = -st.dir;
  else st = { col: col, dir: 1 };
  window.SORT[key] = st;
  /* update indikator panah di thead terkait */
  var row = th.parentElement;
  if (row) Array.prototype.forEach.call(row.children, function(c) { c.removeAttribute('data-dir'); });
  th.setAttribute('data-dir', st.dir === 1 ? 'asc' : 'desc');
  if (window._sortHandlers[key]) window._sortHandlers[key]();
});
