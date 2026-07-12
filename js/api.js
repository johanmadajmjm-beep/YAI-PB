/**
 * ============================================================
 * api.js — Komunikasi dengan Google Apps Script
 * Yayasan Ayo Indonesia
 * ============================================================
 */

const API = (function() {

    /**
     * Fetch data dari GAS endpoint
     * @param {string} action - Nama action (getAdminData, getRawRows, dll)
     * @param {object} params - Parameter tambahan (opsional)
     * @returns {Promise<object>} - Data JSON dari GAS
     */
    async function fetchData(action, params = {}) {
        const url = new URL(CONFIG.API_BASE_URL);
        url.searchParams.append('action', action);

        // Tambahkan parameter tambahan
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                // Timeout 30 detik
                signal: AbortSignal.timeout(30000),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Cek error dari GAS
            if (data && data.error) {
                throw new Error(data.error);
            }

            return data;

        } catch (error) {
            console.error('[API] Error fetching data:', error.message);
            throw error;
        }
    }

    /**
     * Ambil data agregat untuk dashboard (getAdminData)
     * @returns {Promise<object>} - Data admin (PJUM + Benef)
     */
    async function getAdminData() {
        return fetchData('getAdminData');
    }

    /**
     * Ambil data mentah (getRawRows)
     * @returns {Promise<object>} - Data raw (PJUM + Benef)
     */
    async function getRawRows() {
        return fetchData('getRawRows');
    }

    /**
     * Ambil riwayat upload staf
     * @param {string} staf - Nama staf
     * @returns {Promise<object>} - Riwayat upload
     */
    async function getStatus(staf) {
        return fetchData('getStatus', { staf });
    }

    /**
     * Ambil detail file (PJUM atau Benef)
     * @param {string} jenis - 'PJUM' atau 'Benef'
     * @param {string} fileName - Nama file
     * @returns {Promise<object>} - Detail data
     */
    async function getDetail(jenis, fileName) {
        return fetchData('getDetail', { jenis, fileName });
    }

    // Public API
    return {
        fetchData,
        getAdminData,
        getRawRows,
        getStatus,
        getDetail,
    };

})();

// Export untuk digunakan di file lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
