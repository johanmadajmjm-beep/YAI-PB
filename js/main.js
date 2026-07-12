/**
 * ============================================================
 * main.js — Entry Point Dashboard
 * Yayasan Ayo Indonesia
 * ============================================================
 */

(function() {

    'use strict';

    // State global
    const state = {
        data: null,          // Data asli dari API
        filteredData: null,  // Data setelah difilter
        loading: false,
        error: null,
    };

    // Simpan referensi ke window untuk akses antar module
    window._dashboardData = {
        currentData: null,
        updateDashboard: updateDashboard,
    };

    /**
     * Inisialisasi dashboard
     */
    async function init() {
        console.log('[Dashboard] Initializing...');

        // Setup event listeners
        setupNavigation();
        setupModal();
        setupDetailButton();

        // Load data
        await loadData();

        // Setup filter setelah data loaded
        if (state.data) {
            Filters.initFilters(state.data);
        }

        console.log('[Dashboard] Ready.');
    }

    /**
     * Load data dari GAS
     */
    async function loadData() {
        if (state.loading) return;

        state.loading = true;
        showLoading(true);

        try {
            // Ambil data dari API
            const data = await API.getAdminData();

            if (data && !data.error) {
                state.data = data;
                state.filteredData = data;

                // Render dashboard
                updateDashboard(data);

                // Render tabel di halaman lain
                Tables.renderBenefTable(data);
                Tables.renderPjumTable(data);
                Tables.renderWilayah(data);

                // Generate insight
                Insights.generateInsight(data);

                // Update Top 5
                Filters.updateTop5(data);

            } else {
                throw new Error(data?.error || 'Data tidak valid');
            }

        } catch (error) {
            console.error('[Dashboard] Error loading data:', error);
            state.error = error.message;
            showError(error.message);
        } finally {
            state.loading = false;
            showLoading(false);
        }
    }

    /**
     * Update dashboard dengan data baru
     * @param {object} data - Data untuk dirender
     */
    function updateDashboard(data) {
        if (!data) return;

        window._dashboardData.currentData = data;
        state.filteredData = data;

        // Render metrics
        if (typeof Metrics !== 'undefined') {
            Metrics.renderMetrics(data);
        }

        // Render charts
        if (typeof Charts !== 'undefined') {
            Charts.renderAllCharts(data);
        }

        // Update insight
        if (typeof Insights !== 'undefined') {
            Insights.generateInsight(data);
        }

        // Update Top 5
        if (typeof Filters !== 'undefined') {
            Filters.updateTop5(data);
        }
    }

    /**
     * Setup navigasi sidebar
     */
    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-links li');
        const pages = {
            dashboard: document.getElementById('page-dashboard'),
            beneficiary: document.getElementById('page-beneficiary'),
            pjum: document.getElementById('page-pjum'),
            wilayah: document.getElementById('page-wilayah'),
            analitik: document.getElementById('page-analitik'),
            data: document.getElementById('page-data'),
            laporan: document.getElementById('page-laporan'),
            pengaturan: document.getElementById('page-pengaturan'),
        };

        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                const page = this.dataset.page;

                // Update active class
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');

                // Show/hide pages
                Object.keys(pages).forEach(key => {
                    if (pages[key]) {
                        pages[key].classList.toggle('active', key === page);
                    }
                });

                // Refresh tabel jika ke halaman beneficiary atau pjum
                if (page === 'beneficiary' && state.filteredData) {
                    Tables.renderBenefTable(state.filteredData);
                }
                if (page === 'pjum' && state.filteredData) {
                    Tables.renderPjumTable(state.filteredData);
                }
                if (page === 'wilayah' && state.filteredData) {
                    Tables.renderWilayah(state.filteredData);
                }
            });
        });
    }

    /**
     * Setup modal detail
     */
    function setupModal() {
        const modal = document.getElementById('detailModal');
        const closeBtn = document.getElementById('modalClose');

        // Tutup modal
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });

        // Tutup jika klik di luar modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });

        // Tutup dengan ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.classList.remove('show');
            }
        });
    }

    /**
     * Setup tombol "Lihat Detail Analitik"
     */
    function setupDetailButton() {
        const btn = document.getElementById('btnDetailAnalitik');
        if (!btn) return;

        btn.addEventListener('click', function() {
            showDetailModal();
        });
    }

    /**
     * Tampilkan modal dengan detail analitik
     */
    function showDetailModal() {
        const modal = document.getElementById('detailModal');
        const body = document.getElementById('modalBody');

        if (!modal || !body) return;

        const data = state.filteredData || state.data;

        if (!data) {
            body.innerHTML = '<p class="loading-text">Data tidak tersedia.</p>';
            modal.classList.add('show');
            return;
        }

        const benef = data.benef || {};
        const pjum = data.pjum || {};

        const totalBenef = benef.total || 0;
        const totalCost = pjum.totalCost || 0;
        const desaCount = Object.keys(benef.byDesa || {}).length;
        const programCount = Object.keys(benef.byProyek || {}).length;

        // Cari top 5 desa
        const topDesa = Object.entries(benef.byDesa || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Cari top 5 kegiatan
        const topKegiatan = Object.entries(benef.byKegiatan || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        let html = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
                <div style="background:var(--gray-50);padding:14px 18px;border-radius:10px;">
                    <div style="font-size:12px;color:var(--gray-500);">Total Beneficiary</div>
                    <div style="font-size:24px;font-weight:700;color:var(--primary);">${totalBenef.toLocaleString('id-ID')}</div>
                </div>
                <div style="background:var(--gray-50);padding:14px 18px;border-radius:10px;">
                    <div style="font-size:12px;color:var(--gray-500);">Total Biaya</div>
                    <div style="font-size:24px;font-weight:700;color:var(--primary);">${Metrics.formatRupiah(totalCost)}</div>
                </div>
                <div style="background:var(--gray-50);padding:14px 18px;border-radius:10px;">
                    <div style="font-size:12px;color:var(--gray-500);">Total Desa</div>
                    <div style="font-size:24px;font-weight:700;color:var(--primary);">${desaCount}</div>
                </div>
                <div style="background:var(--gray-50);padding:14px 18px;border-radius:10px;">
                    <div style="font-size:12px;color:var(--gray-500);">Total Program</div>
                    <div style="font-size:24px;font-weight:700;color:var(--primary);">${programCount}</div>
                </div>
            </div>
        `;

        // Top 5 Desa
        if (topDesa.length > 0) {
            html += `
                <h4 style="margin:16px 0 8px;color:var(--gray-700);">Top 5 Desa</h4>
                <ul style="list-style:none;padding:0;margin-bottom:12px;">
                    ${topDesa.map((item, i) => `
                        <li style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-200);font-size:14px;">
                            <span>${i+1}. ${item[0]}</span>
                            <span style="font-weight:600;">${item[1]} benef</span>
                        </li>
                    `).join('')}
                </ul>
            `;
        }

        // Top 5 Kegiatan
        if (topKegiatan.length > 0) {
            html += `
                <h4 style="margin:16px 0 8px;color:var(--gray-700);">Top 5 Kegiatan</h4>
                <ul style="list-style:none;padding:0;margin-bottom:12px;">
                    ${topKegiatan.map((item, i) => `
                        <li style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-200);font-size:14px;">
                            <span>${i+1}. ${item[0]}</span>
                            <span style="font-weight:600;">${item[1]} benef</span>
                        </li>
                    `).join('')}
                </ul>
            `;
        }

        // Total keseluruhan
        html += `
            <div style="margin-top:16px;padding:12px 16px;background:var(--accent-light);border-radius:10px;font-size:13px;color:var(--gray-700);">
                <strong>Ringkasan:</strong> 
                ${totalBenef} Beneficiary tersebar di ${desaCount} desa, 
                dengan total biaya ${Metrics.formatRupiah(totalCost)} 
                dari ${programCount} program.
            </div>
        `;

        body.innerHTML = html;
        modal.classList.add('show');
    }

    /**
     * Show loading indicator
     */
    function showLoading(isLoading) {
        // Bisa ditambahkan spinner jika diperlukan
        if (isLoading) {
            document.querySelectorAll('.value').forEach(el => {
                if (!el.textContent || el.textContent === '0') {
                    el.textContent = '...';
                }
            });
        }
    }

    /**
     * Show error message
     */
    function showError(message) {
        console.error('[Dashboard] Error:', message);
        // Tampilkan error di insight card
        const insight = document.getElementById('insightText');
        if (insight) {
            insight.innerHTML = `
                <p style="color:var(--danger);">
                    <i class="fas fa-exclamation-circle"></i> 
                    Gagal memuat data: ${message}
                </p>
                <p style="font-size:13px;color:var(--gray-400);margin-top:8px;">
                    Periksa koneksi internet atau URL GAS Anda.
                </p>
            `;
        }
    }

    // ====== START ======
    // Jalankan ketika DOM siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
