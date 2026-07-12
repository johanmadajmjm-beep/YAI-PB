/* ═══════════════════════════════════════════════
   utils.js — Shared helpers
═══════════════════════════════════════════════ */

/* Get value from select/input */
window.v = id => {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
};

/* Populate a <select> — keeps existing value if still valid */
window.populateSel = (id, values, labelFn) => {
  const el = document.getElementById(id);
  if (!el) return;
  const cur = el.value;
  el.innerHTML = '<option value="">Semua</option>' +
    values.map(val => `<option value="${val}">${labelFn ? labelFn(val) : val}</option>`).join('');
  if (cur && [...el.options].some(o => o.value === cur)) el.value = cur;
};

/* Set innerHTML safely */
window.setEl = (id, html) => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
};

/* Set stat card value + sub text */
window.setCard = (id, value, sub) => {
  const el = document.getElementById(id);
  if (!el) return;
  const valEl = el.querySelector('.stat-value');
  const subEl = el.querySelector('.stat-sub');
  if (valEl) valEl.innerHTML = value;
  if (subEl) subEl.innerHTML = sub || '';
};
