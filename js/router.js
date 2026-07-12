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

    function loadPage(page) {
        if (currentPage === page && isLoaded) return;

        currentPage = page;
        const container = document.getElementById('pageContent');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align:center;padding:60px 0;color:var(--gray-400);">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p style="margin-top:12px;">Memuat halaman ${page}...</p>
            </div>
        `;

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
                updateNavActive(page);
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

    function waitForDataAndInit(page) {
        const data = window._dashboardData?.currentData || null;

        if (data && !data.error) {
            initPage(page, data);
            return;
        }

        if (retryCount < MAX_RETRY) {
            retryCount++;
            console.log(`[Router] Menunggu data... (percobaan ${retryCount}/${MAX_RETRY})`);
            setTimeout(() => {
                waitForDataAndInit(page);
            }, 300);
        } else {
            console.error('[Router] Data tidak tersedia setelah menunggu.');
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

    function initDashboard(data) {
        if (!data) return;

        const filterBar = document.getElementById('filterBarDashboard');
        if (filterBar) filterBar.style.display = 'flex';
        hideFilterBars(['filterBarBenef', 'filterBarPjum']);

        if (typeof Metrics !== 'undefined') Metrics.renderMetrics(data);
        if (typeof Charts !== 'undefined') Charts.renderAllCharts(data);
        if (typeof Insights !== 'undefined') Insights.generateInsight(data);
        
        // Panggil updateTop5 dengan aman
        if (typeof Filters !== 'undefined' && typeof Filters.updateTop5 === 'function') {
            Filters.updateTop5(data);
        } else {
            console.warn('[Router] Filters.updateTop5 tidak tersedia');
        }

        setupDashboardFilters();
    }

    function initBeneficiary(data) {
        if (!data) return;

        hideFilterBars(['filterBarDashboard', 'filterBarPjum']);
        const filterBar = document.getElementById('filterBarBenef');
        if (filterBar) filterBar.style.display = 'flex';

        if (typeof Pages !== 'undefined') {
            Pages.renderBeneficiaryPage(data);
        }
        setupBenefFilters();
    }

    function initPjum(data) {
        if (!data) return;

        hideFilterBars(['filterBarDashboard', 'filterBarBenef']);
        const filterBar = document.getElementById('filterBarPjum');
        if (filterBar) filterBar.style.display = 'flex';

        if (typeof Pages !== 'undefined') {
            Pages.renderPjumPage(data);
        }
        setupPjumFilters();
    }

    function initWilayah(data) {
        if (!data) return;
        hideAllFilterBars();
        if (typeof Tables !== 'undefined') {
            Tables.renderWilayah(data);
        }
    }

    function initAnalitik() {
        hideAllFilterBars();
    }

    function initData() {
        hideAllFilterBars();
    }

    function initLaporan() {
        hideAllFilterBars();
    }

    function initPengaturan() {
        hideAllFilterBars();
        if (typeof window.initPengaturanPage === 'function') {
            window.initPengaturanPage();
        }
    }

    function hideFilterBars(ids) {
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    function hideAllFilterBars() {
        ['filterBarDashboard', 'filterBarBenef', 'filterBarPjum'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    function updateNavActive(page) {
        document.querySelectorAll('.nav-links li').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });
    }

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

    function getCurrentPage() {
        return currentPage;
    }

    return {
        loadPage,
        getCurrentPage,
    };

})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}