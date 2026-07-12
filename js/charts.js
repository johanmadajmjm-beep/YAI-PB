/* ═══════════════════════════════════════════════
   charts.js — Chart.js factory helpers
═══════════════════════════════════════════════ */

window.CHARTS = {};

const PALETTE = [
  '#F97316','#4F8EF7','#22C55E','#8B5CF6','#14B8A6',
  '#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16'
];

const BASE_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  plugins: {
    legend: {
      labels: { color: '#4A5580', font: { size: 12, family: 'Inter' }, boxWidth: 10, padding: 14 }
    },
    tooltip: {
      backgroundColor: '#1A1F36', titleColor: '#fff', bodyColor: '#8A96B8',
      borderColor: '#E8ECF4', borderWidth: 1,
      callbacks: {}
    }
  }
};

const SCALE_BASE = {
  x: { ticks: { color: '#8A96B8', font: { size: 11 } }, grid: { color: '#F0F2F8' } },
  y: { ticks: { color: '#8A96B8', font: { size: 11 } }, grid: { color: '#F0F2F8' } }
};

window.mkChart = (id, type, labels, datasets, extra = {}) => {
  if (window.CHARTS[id]) { window.CHARTS[id].destroy(); }
  const el = document.getElementById(id);
  if (!el) return;

  const opts = JSON.parse(JSON.stringify(BASE_OPTS));
  if (extra.yFmt) {
    opts.plugins.tooltip.callbacks.label = ctx => extra.yFmt(ctx.parsed.y ?? ctx.parsed);
    if (extra.indexAxis !== 'y') {
      opts.scales = JSON.parse(JSON.stringify(SCALE_BASE));
      opts.scales.y.ticks.callback = extra.yFmt;
    } else {
      opts.scales = JSON.parse(JSON.stringify(SCALE_BASE));
      opts.scales.x.ticks.callback = extra.yFmt;
    }
  } else if (type === 'bar' || type === 'line') {
    opts.scales = JSON.parse(JSON.stringify(SCALE_BASE));
  }

  if (extra.indexAxis) opts.indexAxis = extra.indexAxis;
  if (extra.cutout)    { opts.cutout = extra.cutout; delete opts.scales; }
  if (extra.noLegend)  opts.plugins.legend.display = false;
  if (extra.stacked) {
    opts.scales = opts.scales || JSON.parse(JSON.stringify(SCALE_BASE));
    opts.scales.x.stacked = true;
    opts.scales.y.stacked = true;
  }

  window.CHARTS[id] = new Chart(el, {
    type, data: { labels, datasets }, options: opts
  });
  return window.CHARTS[id];
};

/* Convenience wrappers */
window.mkBar = (id, labels, data, color = PALETTE[0], opts = {}) =>
  mkChart(id, 'bar', labels,
    [{ label: opts.label || 'Jumlah', data, backgroundColor: color, borderRadius: 5, borderSkipped: false }],
    opts);

window.mkBarH = (id, labels, data, colors, opts = {}) =>
  mkChart(id, 'bar', labels,
    [{ label: opts.label || 'Jumlah', data, backgroundColor: colors || PALETTE[0], borderRadius: 4, borderSkipped: false }],
    { ...opts, indexAxis: 'y', noLegend: true });

window.mkLine = (id, labels, data, color = PALETTE[0], opts = {}) =>
  mkChart(id, 'line', labels,
    [{ label: opts.label || 'Jumlah', data, borderColor: color,
      backgroundColor: color + '18', fill: true, tension: .38,
      pointRadius: 4, pointBackgroundColor: color }],
    opts);

window.mkDonut = (id, labels, data, colors) =>
  mkChart(id, 'doughnut', labels,
    [{ data, backgroundColor: colors || PALETTE, borderWidth: 0, hoverOffset: 4 }],
    { cutout: '65%', noLegend: true });

window.mkMultiBar = (id, labels, datasets, opts = {}) =>
  mkChart(id, 'bar', labels, datasets, opts);

window.PALETTE = PALETTE;
