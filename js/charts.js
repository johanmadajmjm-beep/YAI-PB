/* ═══════════════════════════════════════════════
   charts.js — Chart.js factory helpers
═══════════════════════════════════════════════ */

window.CHARTS = {};

window.PALETTE = [
  '#F97316','#4F8EF7','#22C55E','#8B5CF6','#14B8A6',
  '#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16'
];

var BASE_TOOLTIP = {
  backgroundColor: '#1C2237',
  titleColor: '#fff',
  bodyColor: '#C9CEDF',
  borderColor: 'rgba(255,255,255,.08)',
  borderWidth: 1,
  cornerRadius: 9,
  padding: 10,
  titleFont: { family: 'Inter', size: 12, weight: '700' },
  bodyFont: { family: 'Inter', size: 11 }
};

var BASE_SCALE_X = { ticks: { color: '#918C81', font: { size: 11, family: 'Inter' } }, grid: { color: '#F1EEE7' }, border: { color: '#EAE5DB' } };
var BASE_SCALE_Y = { ticks: { color: '#918C81', font: { size: 11, family: 'Inter' } }, grid: { color: '#F1EEE7' }, border: { color: '#EAE5DB' } };

window.mkChart = function(id, type, labels, datasets, extra) {
  extra = extra || {};
  if (window.CHARTS[id]) { window.CHARTS[id].destroy(); }
  var el = document.getElementById(id);
  if (!el) return;

  var opts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: {
        display: !extra.noLegend,
        labels: { color: '#4C5470', font: { size: 12, family: 'Inter' }, boxWidth: 10, boxHeight: 10, borderRadius: 3, useBorderRadius: true, padding: 14 }
      },
      tooltip: Object.assign({}, BASE_TOOLTIP)
    }
  };

  /* Scales for bar/line */
  if (type === 'bar' || type === 'line') {
    opts.scales = {
      x: Object.assign({}, BASE_SCALE_X),
      y: Object.assign({}, BASE_SCALE_Y)
    };
    if (extra.yFmt) {
      opts.scales.y.ticks = Object.assign({}, BASE_SCALE_Y.ticks, { callback: extra.yFmt });
      if (extra.indexAxis === 'y') {
        opts.scales.x.ticks = Object.assign({}, BASE_SCALE_X.ticks, { callback: extra.yFmt });
        delete opts.scales.y.ticks.callback;
      }
      opts.plugins.tooltip.callbacks = {
        label: function(ctx) { return extra.yFmt(ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed); }
      };
    }
    if (extra.stacked) {
      opts.scales.x.stacked = true;
      opts.scales.y.stacked = true;
    }
    if (extra.indexAxis) opts.indexAxis = extra.indexAxis;
  }

  /* Donut/pie */
  if (extra.cutout || type === 'doughnut') {
    opts.cutout = extra.cutout || '65%';
    delete opts.scales;
  }

  /* Override with extra.extra */
  if (extra.extra) {
    if (extra.extra.scales) opts.scales = extra.extra.scales;
    if (extra.extra.cutout) opts.cutout = extra.extra.cutout;
  }

  window.CHARTS[id] = new Chart(el, { type: type, data: { labels: labels, datasets: datasets }, options: opts });
  return window.CHARTS[id];
};

window.mkBar = function(id, labels, data, color, opts) {
  opts = opts || {};
  return mkChart(id, 'bar', labels, [{
    label: opts.label || 'Jumlah',
    data: data,
    backgroundColor: color || PALETTE[0],
    borderRadius: 5,
    borderSkipped: false
  }], opts);
};

window.mkBarH = function(id, labels, data, colors, opts) {
  opts = opts || {};
  return mkChart(id, 'bar', labels, [{
    label: opts.label || 'Jumlah',
    data: data,
    backgroundColor: colors || PALETTE[0],
    borderRadius: 4,
    borderSkipped: false
  }], Object.assign({}, opts, { indexAxis: 'y', noLegend: true }));
};

window.mkLine = function(id, labels, data, color, opts) {
  opts = opts || {};
  return mkChart(id, 'line', labels, [{
    label: opts.label || 'Jumlah',
    data: data,
    borderColor: color || PALETTE[0],
    borderWidth: 2.5,
    backgroundColor: (color || PALETTE[0]) + '22',
    fill: true,
    tension: .38,
    pointRadius: 3,
    pointHoverRadius: 5,
    pointBackgroundColor: '#FFFFFF',
    pointBorderColor: color || PALETTE[0],
    pointBorderWidth: 2
  }], opts);
};

window.mkDonut = function(id, labels, data, colors) {
  return mkChart(id, 'doughnut', labels, [{
    data: data,
    backgroundColor: colors || PALETTE,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 3,
    hoverOffset: 5
  }], { cutout: '65%', noLegend: true });
};

window.mkMultiBar = function(id, labels, datasets, opts) {
  opts = opts || {};
  return mkChart(id, 'bar', labels, datasets, opts);
};
