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

        renderTrendChart(data);
        renderDistribusiChart(data);
        renderDesaChart(data);
        renderPengeluaranChart(data);
    }

    /**
     * 1. Trend Beneficiary per Bulan (Line Chart)
     */
    function renderTrendChart(data) {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        const byBulan = data.benef?.byBulan || {};

        // Urutkan bulan
        const sortedMonths = Object.keys(byBulan).sort();
        const labels = sortedMonths.map(m => {
            const [year, month] = m.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            return monthNames[parseInt(month) - 1] + ' ' + year;
        });
        const values = sortedMonths.map(m => byBulan[m] || 0);

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
                    pointRadius: 4,
                    borderWidth: 2.5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' Beneficiary';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
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

        // Urutkan dari terbesar ke terkecil
        const sorted = Object.entries(byKategori).sort((a, b) => b[1] - a[1]);
        const labels = sorted.map(item => item[0]);
        const values = sorted.map(item => item[1]);
        const colors = CONFIG.CHART_COLORS.slice(0, labels.length);

        // Hapus chart lama
        if (chartInstances.distribusi) {
            chartInstances.distribusi.destroy();
        }

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
                            font: {
                                size: 11,
                            },
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

        // Ambil top 10 desa
        const sorted = Object.entries(byDesa).sort((a, b) => b[1] - a[1]);
        const top = sorted.slice(0, 10);
        const labels = top.map(item => item[0]);
        const values = top.map(item => item[1]);
        const colors = CONFIG.CHART_COLORS.slice(0, labels.length);

        // Hapus chart lama
        if (chartInstances.desa) {
            chartInstances.desa.destroy();
        }

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
                    legend: {
                        display: false,
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 10,
                            },
                            maxRotation: 45,
                            minRotation: 30,
                        }
                    }
                }
            }
        });
    }

    /**
     * 4. Pengeluaran PJUM per Bulan (Bar Chart)
     */
    function renderPengeluaranChart(data) {
        const ctx = document.getElementById('pengeluaranChart');
        if (!ctx) return;

        const byBulan = data.pjum?.byBulan || {};

        // Urutkan bulan
        const sortedMonths = Object.keys(byBulan).sort();
        const labels = sortedMonths.map(m => {
            const [year, month] = m.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            return monthNames[parseInt(month) - 1] + ' ' + year;
        });
        const values = sortedMonths.map(m => byBulan[m] || 0);

        // Format Rupiah untuk tooltip
        const formatRp = (val) => {
            if (val >= 1e6) return 'Rp' + (val / 1e6).toFixed(1) + 'M';
            if (val >= 1e3) return 'Rp' + (val / 1e3).toFixed(0) + 'K';
            return 'Rp' + val;
        };

        // Hapus chart lama
        if (chartInstances.pengeluaran) {
            chartInstances.pengeluaran.destroy();
        }

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
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
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
                            font: {
                                size: 10,
                            },
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
