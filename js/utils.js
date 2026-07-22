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
