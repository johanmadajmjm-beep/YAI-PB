/**
 * 1. Trend Beneficiary per Bulan (Line Chart) — FIXED
 */
function renderTrendChart(data) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    const byBulan = data.benef?.byBulan || {};

    // ---- FILTER TAHUN WAJAR (2020–2026) ----
    const validYears = ['2020','2021','2022','2023','2024','2025','2026'];
    const filtered = {};
    Object.keys(byBulan).forEach(key => {
        const year = key.substring(0,4);
        if (validYears.includes(year)) {
            filtered[key] = byBulan[key];
        }
    });

    const sortedMonths = Object.keys(filtered).sort();
    
    // Batasi label maksimal 20
    let labels = [];
    let values = [];
    if (sortedMonths.length > 20) {
        const step = Math.ceil(sortedMonths.length / 20);
        const sampled = sortedMonths.filter((_, i) => i % step === 0);
        labels = sampled.map(m => {
            const [year, month] = m.split('-');
            const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
            return monthNames[parseInt(month)-1] + ' ' + year;
        });
        values = sampled.map(m => filtered[m] || 0);
    } else {
        labels = sortedMonths.map(m => {
            const [year, month] = m.split('-');
            const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
            return monthNames[parseInt(month)-1] + ' ' + year;
        });
        values = sortedMonths.map(m => filtered[m] || 0);
    }

    if (chartInstances.trend) chartInstances.trend.destroy();

    chartInstances.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Beneficiary',
                data: values,
                borderColor: CONFIG.CHART_COLORS[0],
                backgroundColor: CONFIG.CHART_COLORS[0] + '20',
                fill: true,
                tension: 0.3,
                pointBackgroundColor: CONFIG.CHART_COLORS[0],
                pointRadius: 3,
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' Beneficiary';
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: {
                    ticks: {
                        maxTicksLimit: 15,
                        font: { size: 9 },
                        maxRotation: 45,
                        minRotation: 30,
                    }
                }
            }
        }
    });
}

/**
 * 4. Pengeluaran PJUM per Bulan (Bar Chart) — FIXED
 */
function renderPengeluaranChart(data) {
    const ctx = document.getElementById('pengeluaranChart');
    if (!ctx) return;

    const byBulan = data.pjum?.byBulan || {};

    // ---- FILTER TAHUN WAJAR (2020–2026) ----
    const validYears = ['2020','2021','2022','2023','2024','2025','2026'];
    const filtered = {};
    Object.keys(byBulan).forEach(key => {
        const year = key.substring(0,4);
        if (validYears.includes(year)) {
            filtered[key] = byBulan[key];
        }
    });

    const sortedMonths = Object.keys(filtered).sort();
    
    let labels = [];
    let values = [];
    if (sortedMonths.length > 20) {
        const step = Math.ceil(sortedMonths.length / 20);
        const sampled = sortedMonths.filter((_, i) => i % step === 0);
        labels = sampled.map(m => {
            const [year, month] = m.split('-');
            const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
            return monthNames[parseInt(month)-1] + ' ' + year;
        });
        values = sampled.map(m => filtered[m] || 0);
    } else {
        labels = sortedMonths.map(m => {
            const [year, month] = m.split('-');
            const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
            return monthNames[parseInt(month)-1] + ' ' + year;
        });
        values = sortedMonths.map(m => filtered[m] || 0);
    }

    if (chartInstances.pengeluaran) chartInstances.pengeluaran.destroy();

    chartInstances.pengeluaran = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pengeluaran (Rp)',
                data: values,
                backgroundColor: CONFIG.CHART_COLORS[0] + '80',
                borderColor: CONFIG.CHART_COLORS[0],
                borderWidth: 2,
                borderRadius: 4,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Rp ' + context.parsed.y.toLocaleString('id-ID');
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
                            if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
                            return value;
                        }
                    }
                },
                x: {
                    ticks: {
                        maxTicksLimit: 15,
                        font: { size: 9 },
                        maxRotation: 45,
                        minRotation: 30,
                    }
                }
            }
        }
    });
}
