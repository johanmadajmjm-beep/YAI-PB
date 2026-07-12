/**
 * ============================================================
 * pages.js — Render Halaman Beneficiary & PJUM (Chart + Info)
 * Yayasan Ayo Indonesia
 * ============================================================
 */

const Pages = (function() {

    let chartInstances = {};

    function renderBeneficiaryPage(data) {
        if (!data) return;

        const benef = data.benef || {};

        const elTotal = document.getElementById('benefPageTotal');
        if (elTotal) elTotal.textContent = (benef.total || 0).toLocaleString('id-ID');

        const elUnique = document.getElementById('benefPageUnique');
        if (elUnique) elUnique.textContent = (benef.uniqueCount || 0).toLocaleString('id-ID');

        const elDesa = document.getElementById('benefPageDesa');
        if (elDesa) elDesa.textContent = Object.keys(benef.byDesa || {}).length.toLocaleString('id-ID');

        const elProgram = document.getElementById('benefPageProgram');
        if (elProgram) elProgram.textContent = Object.keys(benef.byProyek || {}).length.toLocaleString('id-ID');

        renderBenefTrend(benef);
        renderBenefDistribusi(benef);
        renderBenefDesa(benef);
        renderBenefTop5(benef);
    }

    function renderPjumPage(data) {
        if (!data) return;

        const pjum = data.pjum || {};

        const elTotal = document.getElementById('pjumPageTotal');
        if (elTotal) elTotal.textContent = Metrics.formatRupiah(pjum.totalCost || 0);

        const elFile = document.getElementById('pjumPageFile');
        if (elFile) elFile.textContent = (pjum.fileCount || 0).toLocaleString('id-ID');

        const elProyek = document.getElementById('pjumPageProyek');
        if (elProyek) elProyek.textContent = Object.keys(pjum.byProyek || {}).length.toLocaleString('id-ID');

        const elStaf = document.getElementById('pjumPageStaf');
        if (elStaf) elStaf.textContent = Object.keys(pjum.byStaf || {}).length.toLocaleString('id-ID');

        renderPjumPengeluaran(pjum);
        renderPjumKomponen(pjum);
        renderPjumTopProyek(pjum);
        renderPjumTopStaf(pjum);
    }

    function renderBenefTrend(benef) {
        const ctx = document.getElementById('benefTrendChart');
        if (!ctx) return;

        if (chartInstances.benefTrend) {
            chartInstances.benefTrend.destroy();
            delete chartInstances.benefTrend;
        }

        const byBulan = benef.byBulan || {};
        if (Object.keys(byBulan).length === 0) {
            showEmptyState(ctx, 'Tidak ada data trend');
            return;
        }

        const validYears = ['2020','2021','2022','2023','2024','2025','2026'];
        const filtered = {};
        Object.keys(byBulan).forEach(key => {
            const year = key.substring(0,4);
            if (validYears.includes(year)) filtered[key] = byBulan[key];
        });

        const sorted = Object.keys(filtered).sort();
        if (sorted.length === 0) {
            showEmptyState(ctx, 'Tidak ada data trend (tahun 2020-2026)');
            return;
        }
        
        const labels = sorted.map(m => {
            const [year, month] = m.split('-');
            const names = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
            return names[parseInt(month)-1] + ' ' + year;
        });
        const values = sorted.map(m => filtered[m] || 0);

        chartInstances.benefTrend = new Chart(ctx, {
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
                    pointRadius: 3,
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
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

    function renderBenefDistribusi(benef) {
        const ctx = document.getElementById('benefDistribusiChart');
        if (!ctx) return;

        if (chartInstances.benefDistribusi) {
            chartInstances.benefDistribusi.destroy();
            delete chartInstances.benefDistribusi;
        }

        const byKategori = benef.byKategori || {};
        if (Object.keys(byKategori).length === 0) {
            showEmptyState(ctx, 'Tidak ada data distribusi');
            return;
        }

        const sorted = Object.entries(byKategori).sort((a, b) => b[1] - a[1]);
        const labels = sorted.map(item => item[0]);
        const values = sorted.map(item => item[1]);
        const colors = CONFIG.CHART_COLORS.slice(0, labels.length);

        chartInstances.benefDistribusi = new Chart(ctx, {
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
                        labels: { font: { size: 10 }, padding: 10, boxWidth: 12 }
                    }
                },
                cutout: '65%',
            }
        });
    }

    function renderBenefDesa(benef) {
        const ctx = document.getElementById('benefDesaChart');
        if (!ctx) return;

        if (chartInstances.benefDesa) {
            chartInstances.benefDesa.destroy();
            delete chartInstances.benefDesa;
        }

        const byDesa = benef.byDesa || {};
        if (Object.keys(byDesa).length === 0) {
            showEmptyState(ctx, 'Tidak ada data desa');
            return;
        }

        const sorted = Object.entries(byDesa).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const labels = sorted.map(item => item[0]);
        const values = sorted.map(item => item[1]);
        const colors = CONFIG.CHART_COLORS.slice(0, labels.length);

        chartInstances.benefDesa = new Chart(ctx, {
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
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: {
                        ticks: {
                            font: { size: 9 },
                            maxRotation: 45,
                            minRotation: 30,
                        }
                    }
                }
            }
        });
    }

    function renderBenefTop5(benef) {
        const container = document.getElementById('benefTop5List');
        if (!container) return;

        const byKegiatan = benef.byKegiatan || {};
        const sorted = Object.entries(byKegiatan).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const total = Object.values(byKegiatan).reduce((a, b) => a + b, 0);

        if (sorted.length === 0) {
            container.innerHTML = '<li style="justify-content:center;color:var(--gray-400);">Tidak ada data</li>';
            return;
        }

        container.innerHTML = sorted.map((item, i) => {
            const pct = total > 0 ? ((item[1] / total) * 100).toFixed(1) : 0;
            return `<li>
                <span>${i+1}. ${item[0]}</span>
                <span class="badge">${pct}%</span>
            </li>`;
        }).join('');
    }

    function renderPjumPengeluaran(pjum) {
        const ctx = document.getElementById('pjumPengeluaranChart');
        if (!ctx) return;

        if (chartInstances.pjumPengeluaran) {
            chartInstances.pjumPengeluaran.destroy();
            delete chartInstances.pjumPengeluaran;
        }

        const byBulan = pjum.byBulan || {};
        if (Object.keys(byBulan).length === 0) {
            showEmptyState(ctx, 'Tidak ada data pengeluaran');
            return;
        }

        const validYears = ['2020','2021','2022','2023','2024','2025','2026'];
        const filtered = {};
        Object.keys(byBulan).forEach(key => {
            const year = key.substring(0,4);
            if (validYears.includes(year)) filtered[key] = byBulan[key];
        });

        const sorted = Object.keys(filtered).sort();
        if (sorted.length === 0) {
            showEmptyState(ctx, 'Tidak ada data pengeluaran (tahun 2020-2026)');
            return;
        }
        
        const labels = sorted.map(m => {
            const [year, month] = m.split('-');
            const names = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
            return names[parseInt(month)-1] + ' ' + year;
        });
        const values = sorted.map(m => filtered[m] || 0);

        chartInstances.pjumPengeluaran = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pengeluaran (Rp)',
                    data: values,
                    backgroundColor: CONFIG.CHART_COLORS[1] + '80',
                    borderColor: CONFIG.CHART_COLORS[1],
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

    function renderPjumKomponen(pjum) {
        const ctx = document.getElementById('pjumKomponenChart');
        if (!ctx) return;

        if (chartInstances.pjumKomponen) {
            chartInstances.pjumKomponen.destroy();
            delete chartInstances.pjumKomponen;
        }

        const byKomponen = pjum.byKomponen || {};
        if (Object.keys(byKomponen).length === 0) {
            showEmptyState(ctx, 'Tidak ada data komponen');
            return;
        }

        const sorted = Object.entries(byKomponen).sort((a, b) => b[1] - a[1]);
        const labels = sorted.map(item => item[0]);
        const values = sorted.map(item => item[1]);
        const colors = CONFIG.CHART_COLORS.slice(0, labels.length);

        chartInstances.pjumKomponen = new Chart(ctx, {
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
                        labels: { font: { size: 10 }, padding: 10, boxWidth: 12 }
                    }
                },
                cutout: '65%',
            }
        });
    }

    function renderPjumTopProyek(pjum) {
        const container = document.getElementById('pjumTopProyekList');
        if (!container) return;

        const byProyek = pjum.byProyek || {};
        const sorted = Object.entries(byProyek).sort((a, b) => b[1] - a[1]).slice(0, 5);

        if (sorted.length === 0) {
            container.innerHTML = '<li style="justify-content:center;color:var(--gray-400);">Tidak ada data</li>';
            return;
        }

        container.innerHTML = sorted.map((item, i) => {
            return `<li>
                <span>${i+1}. ${item[0]}</span>
                <span class="badge">${Metrics.formatRupiah(item[1])}</span>
            </li>`;
        }).join('');
    }

    function renderPjumTopStaf(pjum) {
        const container = document.getElementById('pjumTopStafList');
        if (!container) return;

        const byStaf = pjum.byStaf || {};
        const sorted = Object.entries(byStaf).sort((a, b) => b[1] - a[1]).slice(0, 5);

        if (sorted.length === 0) {
            container.innerHTML = '<li style="justify-content:center;color:var(--gray-400);">Tidak ada data</li>';
            return;
        }

        container.innerHTML = sorted.map((item, i) => {
            return `<li>
                <span>${i+1}. ${item[0]}</span>
                <span class="badge">${Metrics.formatRupiah(item[1])}</span>
            </li>`;
        }).join('');
    }

    function showEmptyState(ctx, message) {
        const parent = ctx.parentElement;
        if (parent) {
            parent.innerHTML = `<div style="text-align:center;color:var(--gray-400);padding:30px 0;font-size:13px;">
                <i class="fas fa-chart-simple" style="display:block;font-size:24px;margin-bottom:8px;"></i>
                ${message}
            </div>`;
        }
    }

    function destroyAll() {
        Object.keys(chartInstances).forEach(key => {
            if (chartInstances[key]) {
                chartInstances[key].destroy();
                delete chartInstances[key];
            }
        });
    }

    return {
        renderBeneficiaryPage,
        renderPjumPage,
        destroyAll,
    };

})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Pages;
}