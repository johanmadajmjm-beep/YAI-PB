/**
 * ============================================================
 * main.js — Entry Point Dashboard (DENGAN ROUTER)
 * Yayasan Ayo Indonesia
 * ============================================================
 */

(function() {

    'use strict';

    // State global
    const state = {
        data: null,
        filteredData: null,
        loading: false,
        error: null,
        currentTab: 'dashboard'
    };

    window._dashboardData = {
        currentData: null,
        updateDashboard: updateDashboard,
    };

    /**
     * Inisialisasi dashboard
     */
    async function init() {
        console.log('[Dashboard] Initializing...');

        setupNavigation();
        setupModal();
        setupDetailButton();

        await loadData();

        if (state.data) {
            // Inisialisasi filter untuk semua tab
            Filters.initFilters(state.data);
        }

        // Load halaman default (dashboard)
        if (typeof Router !== 'undefined') {
            Router.loadPage('dashboard');
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
            const data = await API.getAdminData();

            console.log('[Dashboard] Data received:', data);

            // Cek Chart.js
            if (typeof Chart === 'undefined') {
                console.error('[Dashboard] Chart.js tidak terload!');
                showError('Chart.js tidak terload. Periksa koneksi internet.');
                return;
            }

            if (data && !data.error) {
                state.data = data;
                state.filteredData = data;
                window._dashboardData.currentData = data;

                // Filter diinisialisasi di main.js via Filters.initFilters()
                // Yang akan memanggil populateSelect untuk semua filter

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
     * Update dashboard utama dengan data baru (dipanggil dari filter)
     */
    function updateDashboard(data) {
        if (!data) return;

        window._dashboardData.currentData = data;
        state.filteredData = data;

        // Update chart & metrik di halaman dashboard
        if (typeof Metrics !== 'undefined') {
            Metrics.renderMetrics(data);
        }
        if (typeof Charts !== 'undefined') {
            Charts.renderAllCharts(data);
        }
        if (typeof Insights !== 'undefined') {
            Insights.generateInsight(data);
        }
        if (typeof Filters !== 'undefined') {
            Filters.updateTop5(data);
        }
    }

    /**
     * Setup navigasi sidebar
     */
    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-links li');

        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                const page = this.dataset.page;
                state.currentTab = page;

                if (typeof Router !== 'undefined') {
                    Router.loadPage(page);
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

        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.classList.remove('show'));
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') modal.classList.remove('show');
        });
    }

    /**
     * Setup tombol "Lihat Detail Analitik"
     */
    function setupDetailButton() {
        const btn = document.getElementById('btnDetailAnalitik');
        if (btn) {
            btn.addEventListener('click', showDetailModal);
        }
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

        const topDesa = Object.entries(benef.byDesa || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

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

    function showLoading(isLoading) {
        if (isLoading) {
            document.querySelectorAll('.value').forEach(el => {
                if (!el.textContent || el.textContent === '0') {
                    el.textContent = '...';
                }
            });
        }
    }

    function showError(message) {
        console.error('[Dashboard] Error:', message);
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
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();