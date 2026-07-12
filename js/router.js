/**
 * ============================================================
 * router.js — Load Halaman Per Tab
 * Yayasan Ayo Indonesia
 * ============================================================
 */

const Router = (function() {

    let currentPage = 'dashboard';
    let isLoaded = false;

    /**
     * Load halaman berdasarkan menu
     * @param {string} page - Nama halaman (dashboard, beneficiary, pjum, dll)
     */
    function loadPage(page) {
        if (currentPage === page && isLoaded) return;

        currentPage = page;
        const container = document.getElementById('pageContent');
        if (!container) return;

        // Tampilkan loading
        container.innerHTML = `
            <div style="text-align:center;padding:60px 0;color:var(--gray-400);">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p style="margin-top:12px;">Memuat halaman ${page}...</p>
            </div>
        `;

        // Fetch file HTML dari folder pages/
        fetch(`pages/${page}.html`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                container.innerHTML = html;
                isLoaded = true;

                // Inisialisasi halaman setelah konten dimuat
                initPage(page);

                // Update active class di navbar
                updateNavActive(page);
            })
            .catch(error => {
                console.error('[Router] Error loading page:', error);
                container.innerHTML = `
                    <div style="text-align:center;padding:60px 0;color:var(--danger);">
                        <i class="fas fa-exclamation-circle fa-2x"></i>
                        <p style="margin-top:12px;">Gagal memuat halaman: ${error.message}</p>
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
    function initPage(page) {
        const data = window._dashboardData?.currentData || null;

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
            case 'analitik':
                initAnalitik();
                break;
            case 'data':
                initData();
                break;
            case 'laporan':
                initLaporan();
                break;
            case 'pengaturan':
                initPengaturan();
                break;
            default:
                console.warn('[Router] Unknown page:', page);
        }
    }

    /**
     * Inisialisasi halaman Dashboard
     */
    function initDashboard(data) {
        if (!data) {
            console.warn('[Router] No data for dashboard');
            return;
        }

        // Filter bar dashboard sudah ada di HTML
        // Tampilkan filter bar dashboard
        const filterBar = document.getElementById('filterBarDashboard');
        if (filterBar) filterBar.style.display = 'flex';

        // Render metrik & chart
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

        // Setup event listener untuk filter dashboard
        setupDashboardFilters();
    }

    /**
     * Inisialisasi halaman Beneficiary
     */
    function initBeneficiary(data) {
        if (!data) {
            console.warn('[Router] No data for beneficiary');
            return;
        }

        // Sembunyikan filter bar dashboard
        const filterBarDash = document.getElementById('filterBarDashboard');
        if (filterBarDash) filterBarDash.style.display = 'none';

        // Tampilkan filter bar benef
        const filterBarBenef = document.getElementById('filterBarBenef');
        if (filterBarBenef) filterBarBenef.style.display = 'flex';

        // Render halaman Beneficiary
        if (typeof Pages !== 'undefined') {
            Pages.renderBeneficiaryPage(data);
        }

        // Setup event listener untuk filter benef
        setupBenefFilters();
    }

    /**
     * Inisialisasi halaman PJUM
     */
    function initPjum(data) {
        if (!data) {
            console.warn('[Router] No data for pjum');
            return;
        }

        // Sembunyikan filter bar dashboard
        const filterBarDash = document.getElementById('filterBarDashboard');
        if (filterBarDash) filterBarDash.style.display = 'none';

        // Tampilkan filter bar pjum
        const filterBarPjum = document.getElementById('filterBarPjum');
        if (filterBarPjum) filterBarPjum.style.display = 'flex';

        // Render halaman PJUM
        if (typeof Pages !== 'undefined') {
            Pages.renderPjumPage(data);
        }

        // Setup event listener untuk filter pjum
        setupPjumFilters();
    }

    /**
     * Inisialisasi halaman Wilayah
     */
    function initWilayah(data) {
        if (!data) {
            console.warn('[Router] No data for wilayah');
            return;
        }

        // Sembunyikan semua filter bar
        hideAllFilterBars();

        if (typeof Tables !== 'undefined') {
            Tables.renderWilayah(data);
        }
    }

    /**
     * Inisialisasi halaman Analitik (placeholder)
     */
    function initAnalitik() {
        hideAllFilterBars();
        const container = document.getElementById('pageContent');
        if (container) {
            // Jika belum ada konten, tambahkan placeholder
            if (!container.querySelector('.placeholder-content')) {
                container.innerHTML = `
                    <div class="placeholder-content">
                        <h2><i class="fas fa-chart-line"></i> Analitik Lanjutan</h2>
                        <p>Analitik detail akan ditampilkan di sini.</p>
                    </div>
                `;
            }
        }
    }

    /**
     * Inisialisasi halaman Data (placeholder)
     */
    function initData() {
        hideAllFilterBars();
        const container = document.getElementById('pageContent');
        if (container) {
            if (!container.querySelector('.placeholder-content')) {
                container.innerHTML = `
                    <div class="placeholder-content">
                        <h2><i class="fas fa-database"></i> Data Mentah</h2>
                        <p>Data mentah dari database akan ditampilkan di sini.</p>
                    </div>
                `;
            }
        }
    }

    /**
     * Inisialisasi halaman Laporan (placeholder)
     */
    function initLaporan() {
        hideAllFilterBars();
        const container = document.getElementById('pageContent');
        if (container) {
            if (!container.querySelector('.placeholder-content')) {
                container.innerHTML = `
                    <div class="placeholder-content">
                        <h2><i class="fas fa-file-alt"></i> Laporan</h2>
                        <p>Generate laporan akan tersedia di sini.</p>
                    </div>
                `;
            }
        }
    }

    /**
     * Inisialisasi halaman Pengaturan
     */
    function initPengaturan() {
        hideAllFilterBars();
        const container = document.getElementById('pageContent');
        if (container) {
            if (!container.querySelector('.placeholder-content')) {
                container.innerHTML = `
                    <div class="placeholder-content">
                        <h2><i class="fas fa-cog"></i> Pengaturan</h2>
                        <p>Pengaturan dashboard akan ditampilkan di sini.</p>
                    </div>
                `;
            }
        }
    }

    /**
     * Sembunyikan semua filter bar
     */
    function hideAllFilterBars() {
        const ids = ['filterBarDashboard', 'filterBarBenef', 'filterBarPjum'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    /**
     * Update active class di navbar
     */
    function updateNavActive(page) {
        document.querySelectorAll('.nav-links li').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });
    }

    /**
     * Setup event listener filter dashboard
     */
    function setupDashboardFilters() {
        const applyBtn = document.getElementById('applyFilter');
        const resetBtn = document.getElementById('resetFilter');

        if (applyBtn && !applyBtn._listenerAdded) {
            applyBtn.addEventListener('click', () => {
                if (typeof Filters !== 'undefined') {
                    Filters.applyDashboardFilters();
                }
            });
            applyBtn._listenerAdded = true;
        }

        if (resetBtn && !resetBtn._listenerAdded) {
            resetBtn.addEventListener('click', () => {
                if (typeof Filters !== 'undefined') {
                    Filters.resetDashboardFilters();
                }
            });
            resetBtn._listenerAdded = true;
        }
    }

    /**
     * Setup event listener filter benef
     */
    function setupBenefFilters() {
        const applyBtn = document.getElementById('benefApplyFilter');
        const resetBtn = document.getElementById('benefResetFilter');

        if (applyBtn && !applyBtn._listenerAdded) {
            applyBtn.addEventListener('click', () => {
                if (typeof Filters !== 'undefined') {
                    Filters.applyBenefFilters();
                }
            });
            applyBtn._listenerAdded = true;
        }

        if (resetBtn && !resetBtn._listenerAdded) {
            resetBtn.addEventListener('click', () => {
                if (typeof Filters !== 'undefined') {
                    Filters.resetBenefFilters();
                }
            });
            resetBtn._listenerAdded = true;
        }
    }

    /**
     * Setup event listener filter pjum
     */
    function setupPjumFilters() {
        const applyBtn = document.getElementById('pjumApplyFilter');
        const resetBtn = document.getElementById('pjumResetFilter');

        if (applyBtn && !applyBtn._listenerAdded) {
            applyBtn.addEventListener('click', () => {
                if (typeof Filters !== 'undefined') {
                    Filters.applyPjumFilters();
                }
            });
            applyBtn._listenerAdded = true;
        }

        if (resetBtn && !resetBtn._listenerAdded) {
            resetBtn.addEventListener('click', () => {
                if (typeof Filters !== 'undefined') {
                    Filters.resetPjumFilters();
                }
            });
            resetBtn._listenerAdded = true;
        }
    }

    /**
     * Get current page
     */
    function getCurrentPage() {
        return currentPage;
    }

    // Public API
    return {
        loadPage,
        getCurrentPage,
        initDashboard,
        initBeneficiary,
        initPjum,
        initWilayah,
        initAnalitik,
        initData,
        initLaporan,
        initPengaturan,
    };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}