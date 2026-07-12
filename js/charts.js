/**
 * ============================================================
 * charts.js — Render Semua Grafik dengan Chart.js
 * Yayasan Ayo Indonesia
 * ============================================================
 */

const Charts = (function() {

    // Simpan instance chart untuk update nanti
    let chartInstances = {};

    /**
     * Render semua grafik
     * @param {object} data - Data dari getAdminData()
     */
    function renderAllCharts(data) {
        if (!data) {
            console.warn('[Charts] No data provided');
            return;
        }

        // Cek semua canvas
        const canvases = ['trendChart', 'distribusiChart', 'desaChart', 'pengeluaranChart'];
        let allReady = true;
        canvases.forEach(id => {
            const el = document.getElementById(id);
            if (!el) {
                console.warn('[Charts] Canvas missing:', id);
                allReady = false;
            }
        });

        if (!allReady) {
            console.error('[Charts] Canvas tidak ditemukan, periksa index.html');
            return;
        }

        // Cek Chart.js
        if (typeof Chart === 'undefined') {
            console.error('[Charts] Chart.js tidak terload!');
            return;
        }

        renderTrendChart(data);
        renderDistribusiChart(data);
        renderDesaChart(data);
        renderPengeluaranChart(data);
    }

    /**
     * 1. Trend Beneficiary per Bulan (Line Chart) — FIXED
     */
    function renderTrendChart(data) {
        const ctx = document.getElementById('trendChart');
        if (!ctx) {
            console.error('[Charts] trendChart canvas not found');
            return;
        }

        const byBulan = data.benef?.byBulan || {};

        // Jika data kosong, tampilkan pesan
        if (Object.keys(byBulan).length === 0) {
            console.warn('[Charts] No trend data');
            const parent = ctx.parentElement;
            if (parent) {
                parent.innerHTML = `<div style="text-align:center;color:var(--gray-400);padding:40px 0;">
                    <i class="fas fa-chart-line fa-2x" style="display:block;margin-bottom:8px;"></i>
                    Tidak ada data trend
                </div>`;
            }
            return;
        }

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

        // Hapus chart lama jika ada
        if (chartInstances.trend) {
            chartInstances.trend.destroy();
        }

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
     * 2. Distribusi Jenis Beneficiary (Donut Chart)
     */
    function renderDistribusiChart(data) {
        const ctx = document.getElementById('distribusiChart');
        if (!ctx) return;

        const byKategori = data.benef?.byKategori || {};

        if (Object.keys(byKategori).length === 0) {
            const parent = ctx.parentElement;
            if (parent) {
                parent.innerHTML = `<div style="text-align:center;color:var(--gray-400);padding:40px 0;">
                    <i class="fas fa-chart-pie fa-2x" style="display:block;margin-bottom:8px;"></i>
                    Tidak ada data distribusi
                </div>`;
            }
            return;
        }

        const sorted = Object.entries(byKategori).sort((a, b) => b[1] - a[1]);
        const labels = sorted.map(item => item[0]);
        const values = sorted.map(item => item[1]);
        const colors = CONFIG.CHART_COLORS.slice(0, labels.length);

        if (chartInstances.distribusi) chartInstances.distribusi.destroy();

        chartInstances.distribusi = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: { size: 11 },
                            padding: 12,
                            boxWidth: 12,
                        }
                    }
                },
                cutout: '65%',
            }
        });
    }

    /**
     * 3. Beneficiary per Desa (Bar Chart)
     */
    function renderDesaChart(data) {
        const ctx = document.getElementById('desaChart');
        if (!ctx) return;

        const byDesa = data.benef?.byDesa || {};

        if (Object.keys(byDesa).length === 0) {
            const parent = ctx.parentElement;
            if (parent) {
                parent.innerHTML = `<div style="text-align:center;color:var(--gray-400);padding:40px 0;">
                    <i class="fas fa-chart-bar fa-2x" style="display:block;margin-bottom:8px;"></i>
                    Tidak ada data desa
                </div>`;
            }
            return;
        }

        const sorted = Object.entries(byDesa).sort((a, b) => b[1] - a[1]);
        const top = sorted.slice(0, 10);
        const labels = top.map(item => item[0]);
        const values = top.map(item => item[1]);
        const colors = CONFIG.CHART_COLORS.slice(0, labels.length);

        if (chartInstances.desa) chartInstances.desa.destroy();

        chartInstances.desa = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Jumlah Beneficiary',
                    data: values,
                    backgroundColor: colors,
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: {
                        ticks: {
                            font: { size: 10 },
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

        if (Object.keys(byBulan).length === 0) {
            const parent = ctx.parentElement;
            if (parent) {
                parent.innerHTML = `<div style="text-align:center;color:var(--gray-400);padding:40px 0;">
                    <i class="fas fa-money-bill-wave fa-2x" style="display:block;margin-bottom:8px;"></i>
                    Tidak ada data pengeluaran
                </div>`;
            }
            return;
        }

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

    /**
     * Update semua chart (saat filter berubah)
     * @param {object} filteredData - Data yang sudah difilter
     */
    function updateCharts(filteredData) {
        // Destroy semua chart
        Object.keys(chartInstances).forEach(key => {
            if (chartInstances[key]) {
                chartInstances[key].destroy();
                delete chartInstances[key];
            }
        });

        // Render ulang
        renderAllCharts(filteredData);
    }

    // Public API
    return {
        renderAllCharts,
        renderTrendChart,
        renderDistribusiChart,
        renderDesaChart,
        renderPengeluaranChart,
        updateCharts,
    };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Charts;
}