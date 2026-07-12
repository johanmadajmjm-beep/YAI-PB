/**
 * ============================================================
 * main.js — Entry Point Dashboard (Tanpa Router)
 * Yayasan Ayo Indonesia
 * ============================================================
 */

(function() {

    'use strict';

    const state = {
        data: null,
        filteredData: null,
        loading: false,
        error: null,
        currentPage: 'dashboard',
    };

    window._dashboardData = {
        currentData: null,
        updateDashboard: updateDashboard,
        getData: function() { return state.data; },
    };

    let pageCache = {};

    /**
     * Inisialisasi
     */
    async function init() {
        console.log('[Dashboard] Initializing...');

        setupNavigation();
        setupModal();
        setupDetailButton();

        await loadData();

        if (state.data) {
            state.filteredData = state.data;
            window._dashboardData.currentData = state.data;

            if (typeof Filters !== 'undefined') {
                Filters.initFilters(state.data);
            }

            // Load halaman default
            loadPage('dashboard');
        }

        console.log('[Dashboard] Ready.');
    }

    /**
     * Load data dari GAS
     */
    async function loadData() {
        if (state.loading) return;
        state.loading = true;

        try {
            const data = await API.getAdminData();
            if (data && !data.error) {
                state.data = data;
                state.filteredData = data;
                window._dashboardData.currentData = data;
                console.log('[Dashboard] Data loaded successfully');
            } else {
                throw new Error(data?.error || 'Data tidak valid');
            }
        } catch (error) {
            console.error('[Dashboard] Error loading data:', error);
            state.error = error.message;
            showError(error.message);
        } finally {
            state.loading = false;
        }
    }

    /**
     * Load halaman (tanpa router)
     */
    function loadPage(page) {
        if (!state.data) {
            console.warn('[Dashboard] Data belum siap, tunggu...');
            setTimeout(() => loadPage(page), 500);
            return;
        }

        state.currentPage = page;
        const container = document.getElementById('pageContent');
        if (!container) return;

        // Cek cache
        if (pageCache[page]) {
            container.innerHTML = pageCache[page];
            initPageContent(page);
            updateNavActive(page);
            return;
        }

        // Tampilkan loading
        container.innerHTML = `
            <div style="text-align:center;padding:60px 0;color:var(--gray-400);">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p style="margin-top:12px;">Memuat ${page}...</p>
            </div>
        `;

        fetch(`pages/${page}.html`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.text();
            })
            .then(html => {
                pageCache[page] = html;
                container.innerHTML = html;
                initPageContent(page);
                updateNavActive(page);
            })
            .catch(err => {
                console.error('[Dashboard] Failed to load page:', err);
                container.innerHTML = `
                    <div style="text-align:center;padding:60px 0;color:var(--danger);">
                        <i class="fas fa-exclamation-circle fa-2x"></i>
                        <p style="margin-top:12px;">Gagal memuat halaman: ${err.message}</p>
                        <button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;border:none;border-radius:8px;background:var(--accent);color:white;cursor:pointer;">
                            <i class="fas fa-sync"></i> Muat Ulang
                        </button>
                    </div>
                `;
            });
    }

    /**
     * Inisialisasi konten per halaman
     */
    function initPageContent(page) {
        const data = state.data;

        switch (page) {
            case 'dashboard':
                initDashboard(data);
                break;
            case 'beneficiary':
                initBeneficiary(data);
                break;
            case 'pjum':
                initPjum(data);
                break;
            case 'wilayah':
                initWilayah(data);
                break;
            case 'pengaturan':
                initPengaturan();
                break;
            default:
                // Halaman placeholder (analitik, data, laporan)
                break;
        }
    }

    /**
     * Inisialisasi Dashboard
     */
    function initDashboard(data) {
        if (!data) return;

        const filterBar = document.getElementById('filterBarDashboard');
        if (filterBar) filterBar.style.display = 'flex';

        // Sembunyikan filter bar lain
        document.querySelectorAll('#filterBarBenef, #filterBarPjum').forEach(el => {
            if (el) el.style.display = 'none';
        });

        if (typeof Metrics !== 'undefined') Metrics.renderMetrics(data);
        if (typeof Charts !== 'undefined') Charts.renderAllCharts(data);
        if (typeof Insights !== 'undefined') Insights.generateInsight(data);
        if (typeof Filters !== 'undefined' && typeof Filters.updateTop5 === 'function') {
            Filters.updateTop5(data);
        }

        setupDashboardFilters();
    }

    /**
     * Inisialisasi Beneficiary
     */
    function initBeneficiary(data) {
        if (!data) return;

        // Sembunyikan filter bar dashboard & pjum
        const dashFilter = document.getElementById('filterBarDashboard');
        if (dashFilter) dashFilter.style.display = 'none';
        const pjumFilter = document.getElementById('filterBarPjum');
        if (pjumFilter) pjumFilter.style.display = 'none';

        // Tampilkan filter bar benef
        const benefFilter = document.getElementById('filterBarBenef');
        if (benefFilter) benefFilter.style.display = 'flex';

        if (typeof Pages !== 'undefined') {
            Pages.renderBeneficiaryPage(data);
        }

        setupBenefFilters();
    }

    /**
     * Inisialisasi PJUM
     */
    function initPjum(data) {
        if (!data) return;

        // Sembunyikan filter bar dashboard & benef
        const dashFilter = document.getElementById('filterBarDashboard');
        if (dashFilter) dashFilter.style.display = 'none';
        const benefFilter = document.getElementById('filterBarBenef');
        if (benefFilter) benefFilter.style.display = 'none';

        // Tampilkan filter bar pjum
        const pjumFilter = document.getElementById('filterBarPjum');
        if (pjumFilter) pjumFilter.style.display = 'flex';

        if (typeof Pages !== 'undefined') {
            Pages.renderPjumPage(data);
        }

        setupPjumFilters();
    }

    /**
     * Inisialisasi Wilayah
     */
    function initWilayah(data) {
        if (!data) return;

        // Sembunyikan semua filter bar
        document.querySelectorAll('#filterBarDashboard, #filterBarBenef, #filterBarPjum').forEach(el => {
            if (el) el.style.display = 'none';
        });

        if (typeof Tables !== 'undefined') {
            Tables.renderWilayah(data);
        }
    }

    /**
     * Inisialisasi Pengaturan
     */
    function initPengaturan() {
        document.querySelectorAll('#filterBarDashboard, #filterBarBenef, #filterBarPjum').forEach(el => {
            if (el) el.style.display = 'none';
        });

        if (typeof window.initPengaturanPage === 'function') {
            window.initPengaturanPage();
        }
    }

    /**
     * Update dashboard (dipanggil dari filter)
     */
    function updateDashboard(data) {
        if (!data) return;
        window._dashboardData.currentData = data;
        state.filteredData = data;

        // Update hanya jika halaman dashboard yang aktif
        if (state.currentPage === 'dashboard') {
            if (typeof Metrics !== 'undefined') Metrics.renderMetrics(data);
            if (typeof Charts !== 'undefined') Charts.renderAllCharts(data);
            if (typeof Insights !== 'undefined') Insights.generateInsight(data);
            if (typeof Filters !== 'undefined' && typeof Filters.updateTop5 === 'function') {
                Filters.updateTop5(data);
            }
        }
    }

    /**
     * Setup navigasi
     */
    function setupNavigation() {
        document.querySelectorAll('.nav-links li').forEach(link => {
            link.addEventListener('click', function() {
                const page = this.dataset.page;
                if (page === state.currentPage) return;
                loadPage(page);
            });
        });
    }

    function updateNavActive(page) {
        document.querySelectorAll('.nav-links li').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });
    }

    /**
     * Setup filter dashboard
     */
    function setupDashboardFilters() {
        const applyBtn = document.getElementById('applyFilter');
        const resetBtn = document.getElementById('resetFilter');

        if (applyBtn && !applyBtn._listenerAdded) {
            applyBtn.addEventListener('click', () => {
                if (typeof Filters !== 'undefined') Filters.applyDashboardFilters();
            });
            applyBtn._listenerAdded = true;
        }

        if (resetBtn && !resetBtn._listenerAdded) {
            resetBtn.addEventListener('click', () => {
                if (typeof Filters !== 'undefined') Filters.resetDashboardFilters();
            });
            resetBtn._listenerAdded = true;
        }
    }

    function setupBenefFilters() {
        const applyBtn = document.getElementById('benefApplyFilter');
        const resetBtn = document.getElementById('benefResetFilter');

        if (applyBtn && !applyBtn._listenerAdded) {
            applyBtn.addEventListener('click', () => {
                if (typeof Filters !== 'undefined') Filters.applyBenefFilters();
            });
            applyBtn._listenerAdded = true;
        }

        if (resetBtn && !resetBtn._listenerAdded) {
            resetBtn.addEventListener('click', () => {
                if (typeof Filters !== 'undefined') Filters.resetBenefFilters();
            });
            resetBtn._listenerAdded = true;
        }
    }

    function setupPjumFilters() {
        const applyBtn = document.getElementById('pjumApplyFilter');
        const resetBtn = document.getElementById('pjumResetFilter');

        if (applyBtn && !applyBtn._listenerAdded) {
            applyBtn.addEventListener('click', () => {
                if (typeof Filters !== 'undefined') Filters.applyPjumFilters();
            });
            applyBtn._listenerAdded = true;
        }

        if (resetBtn && !resetBtn._listenerAdded) {
            resetBtn.addEventListener('click', () => {
                if (typeof Filters !== 'undefined') Filters.resetPjumFilters();
            });
            resetBtn._listenerAdded = true;
        }
    }

    /**
     * Setup modal
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

    function setupDetailButton() {
        const btn = document.getElementById('btnDetailAnalitik');
        if (btn) {
            btn.addEventListener('click', showDetailModal);
        }
    }

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

        // ... konten modal (sama seperti sebelumnya)
        const benef = data.benef || {};
        const pjum = data.pjum || {};
        const totalBenef = benef.total || 0;
        const totalCost = pjum.totalCost || 0;
        const desaCount = Object.keys(benef.byDesa || {}).length;
        const programCount = Object.keys(benef.byProyek || {}).length;

        const topDesa = Object.entries(benef.byDesa || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topKegiatan = Object.entries(benef.byKegiatan || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);

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
            html += `<h4 style="margin:16px 0 8px;color:var(--gray-700);">Top 5 Desa</h4><ul style="list-style:none;padding:0;margin-bottom:12px;">`;
            topDesa.forEach((item, i) => {
                html += `<li style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-200);font-size:14px;">
                    <span>${i+1}. ${item[0]}</span><span style="font-weight:600;">${item[1]} benef</span>
                </li>`;
            });
            html += `</ul>`;
        }

        if (topKegiatan.length > 0) {
            html += `<h4 style="margin:16px 0 8px;color:var(--gray-700);">Top 5 Kegiatan</h4><ul style="list-style:none;padding:0;margin-bottom:12px;">`;
            topKegiatan.forEach((item, i) => {
                html += `<li style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-200);font-size:14px;">
                    <span>${i+1}. ${item[0]}</span><span style="font-weight:600;">${item[1]} benef</span>
                </li>`;
            });
            html += `</ul>`;
        }

        html += `
            <div style="margin-top:16px;padding:12px 16px;background:var(--accent-light);border-radius:10px;font-size:13px;color:var(--gray-700);">
                <strong>Ringkasan:</strong> ${totalBenef} Beneficiary tersebar di ${desaCount} desa, dengan total biaya ${Metrics.formatRupiah(totalCost)} dari ${programCount} program.
            </div>
        `;

        body.innerHTML = html;
        modal.classList.add('show');
    }

    function showError(message) {
        const container = document.getElementById('pageContent');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--danger);">
                    <i class="fas fa-exclamation-triangle fa-3x"></i>
                    <h3 style="margin:16px 0;">Gagal Memuat Data</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;border:none;border-radius:8px;background:var(--accent);color:white;cursor:pointer;">
                        <i class="fas fa-sync"></i> Muat Ulang
                    </button>
                </div>
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