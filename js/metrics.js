/**
 * ============================================================
 * metrics.js — Render Kartu Metrik
 * Yayasan Ayo Indonesia
 * ============================================================
 */

const Metrics = (function() {

    /**
     * Format Rupiah
     */
    function formatRupiah(amount) {
        if (amount === undefined || amount === null) return 'Rp0';
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(num)) return 'Rp0';
        if (num >= 1e9) return 'Rp' + (num / 1e9).toFixed(2) + ' M';
        if (num >= 1e6) return 'Rp' + (num / 1e6).toFixed(2) + ' M';
        return 'Rp' + num.toLocaleString('id-ID');
    }

    /**
     * Hitung persentase perubahan
     */
    function calculateChange(current, previous) {
        if (!previous || previous === 0) return { percent: 0, direction: 'up' };
        const change = ((current - previous) / Math.abs(previous)) * 100;
        return {
            percent: Math.abs(change),
            direction: change >= 0 ? 'up' : 'down',
            formatted: (change >= 0 ? '↑' : '↓') + ' ' + Math.abs(change).toFixed(1) + '%'
        };
    }

    /**
     * Render 4 kartu metrik
     * @param {object} data - Data dari getAdminData()
     */
    function renderMetrics(data) {
        if (!data) {
            console.warn('[Metrics] No data provided');
            return;
        }

        const benef = data.benef || {};
        const pjum = data.pjum || {};

        // ---- Total Beneficiary ----
        const totalBenef = benef.total || 0;
        const benefPrev = benef.previousTotal || totalBenef * 0.82; // estimasi jika tidak ada
        const benefChange = calculateChange(totalBenef, benefPrev);

        document.getElementById('totalBenef').textContent = totalBenef.toLocaleString('id-ID');
        const benefEl = document.getElementById('benefChange');
        benefEl.textContent = benefChange.formatted;
        benefEl.className = 'change' + (benefChange.direction === 'down' ? ' down' : '');

        // ---- Total PJUM ----
        const totalPjum = pjum.fileCount || 0;
        const pjumPrev = pjum.previousFileCount || Math.max(1, totalPjum * 0.88);
        const pjumChange = calculateChange(totalPjum, pjumPrev);

        document.getElementById('totalPjum').textContent = totalPjum.toLocaleString('id-ID');
        const pjumEl = document.getElementById('pjumChange');
        pjumEl.textContent = pjumChange.formatted;
        pjumEl.className = 'change' + (pjumChange.direction === 'down' ? ' down' : '');

        // ---- Total Desa ----
        const desaCount = Object.keys(benef.byDesa || {}).length;
        const kabCount = Object.keys(benef.byKabupaten || {}).length || 0;

        document.getElementById('totalDesa').textContent = desaCount.toLocaleString('id-ID');
        document.getElementById('totalKab').textContent = kabCount > 0 ? kabCount + ' Kabupaten' : '';

        // ---- Total Biaya ----
        const totalCost = pjum.totalCost || 0;
        const costPrev = pjum.previousTotalCost || totalCost * 0.78;
        const costChange = calculateChange(totalCost, costPrev);

        document.getElementById('totalBiaya').textContent = formatRupiah(totalCost);
        const biayaEl = document.getElementById('biayaChange');
        biayaEl.textContent = costChange.formatted;
        biayaEl.className = 'change' + (costChange.direction === 'down' ? ' down' : '');

        // Simpan data untuk filter
        if (window._dashboardData) {
            window._dashboardData.metrics = {
                totalBenef,
                totalPjum,
                desaCount,
                totalCost,
                benefChange: benefChange.formatted,
                pjumChange: pjumChange.formatted,
                costChange: costChange.formatted,
            };
        }
    }

    // Public API
    return {
        renderMetrics,
        formatRupiah,
        calculateChange,
    };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Metrics;
}
