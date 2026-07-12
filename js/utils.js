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
