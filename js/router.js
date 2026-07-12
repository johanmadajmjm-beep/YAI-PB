/**
 * ============================================================
 * router.js — Load Halaman Per Tab
 * Yayasan Ayo Indonesia
 * ============================================================
 */

const Router = (function() {

    let currentPage = 'dashboard';
    let isLoaded = false;
    let retryCount = 0;
    const MAX_RETRY = 10;

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
                retryCount = 0;

                // Update active class di navbar
                updateNavActive(page);

                // Inisialisasi halaman setelah konten dimuat
                // TAPI tunggu data siap
                waitForDataAndInit(page);
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
     * Tunggu data siap, baru init halaman
     */
    function waitForDataAndInit(page) {
        const data = window._dashboardData?.currentData || null;

        if (data && !data.error) {
            // Data sudah siap, langsung init
            initPage(page, data);
            return;
        }

        // Data belum siap, coba tunggu
        if (retryCount < MAX_RETRY) {
            retryCount++;
            console.log(`[Router] Menunggu data... (percobaan ${retryCount}/${MAX_RETRY})`);
            setTimeout(() => {
                waitForDataAndInit(page);
            }, 300);
        } else {
            console.error('[Router] Data tidak tersedia setelah menunggu.');
            // Coba tampilkan error di halaman
            const container = document.getElementById('pageContent');
            if (container) {
                container.innerHTML = `
                    <div style="text-align:center;padding:60px 20px;color:var(--danger);">
                        <i class="fas fa-exclamation-triangle fa-3x"></i>
                        <h3 style="margin:16px 0;">Data Tidak Tersedia</h3>
                        <p>Gagal memuat data dari server. Periksa koneksi atau refresh halaman.</p>
                        <button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;border:none;border-radius:8px;background:var(--accent);color:white;cursor:pointer;">
                            <i class="fas fa-sync"></i> Muat Ulang
                        </button>
                    </div>
                `;
            }
        }
    }

    /**
     * Inisialisasi konten per halaman
     */
    function initPage(page, data) {
        if (!data) {
            console.warn('[Router] No data for page:', page);
            return;
        }

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

        // Tampilkan filter bar dashboard
        const filterBar = document.getElementById('filterBarDashboard');
        if (filterBar) filterBar.style.display = 'flex';

        // Sembunyikan filter bar lainnya
        hideFilterBars(['filterBarBenef', 'filterBarPjum']);

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
        hideFilterBars(['filterBarDashboard', 'filterBarPjum']);

        // Tampilkan filter bar benef
        const filterBar = document.getElementById('filterBarBenef');
        if (filterBar) filterBar.style.display = 'flex';

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
        hideFilterBars(['filterBarDashboard', 'filterBarBenef']);

        // Tampilkan filter bar pjum
        const filterBar = document.getElementById('filterBarPjum');
        if (filterBar) filterBar.style.display = 'flex';

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
        // Konten sudah di-load dari HTML
    }

    /**
     * Inisialisasi halaman Data (placeholder)
     */
    function initData() {
        hideAllFilterBars();
        // Konten sudah di-load dari HTML
    }

    /**
     * Inisialisasi halaman Laporan (placeholder)
     */
    function initLaporan() {
        hideAllFilterBars();
        // Konten sudah di-load dari HTML
    }

    /**
     * Inisialisasi halaman Pengaturan
     */
    function initPengaturan() {
        hideAllFilterBars();
        // Konten sudah di-load dari HTML dengan script inline-nya
        // Panggil initPengaturanPage jika ada
        if (typeof window.initPengaturanPage === 'function') {
            window.initPengaturanPage();
        }
    }

    /**
     * Sembunyikan filter bar tertentu
     */
    function hideFilterBars(ids) {
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
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
    };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}