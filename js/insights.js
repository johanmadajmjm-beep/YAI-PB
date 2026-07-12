/**
 * ============================================================
 * insights.js — Generate AI Insight dari Data
 * Yayasan Ayo Indonesia
 * ============================================================
 */

const Insights = (function() {

    /**
     * Generate insight dari data
     * @param {object} data - Data dari getAdminData() (sudah difilter)
     */
    function generateInsight(data) {
        const container = document.getElementById('insightText');
        if (!container) return;

        if (!data || !data.benef || !data.pjum) {
            container.innerHTML = '<p>Data tidak tersedia.</p>';
            return;
        }

        const benef = data.benef;
        const pjum = data.pjum;

        const totalBenef = benef.total || 0;
        const totalCost = pjum.totalCost || 0;

        // ---- Cari kabupaten/desa dengan kontribusi terbesar ----
        const byDesa = benef.byDesa || {};
        const sortedDesa = Object.entries(byDesa).sort((a, b) => b[1] - a[1]);
        const topDesa = sortedDesa.length > 0 ? sortedDesa[0] : null;

        // ---- Cari bulan dengan pengeluaran tertinggi ----
        const byBulanPjum = pjum.byBulan || {};
        const sortedBulan = Object.entries(byBulanPjum).sort((a, b) => b[1] - a[1]);
        const topBulan = sortedBulan.length > 0 ? sortedBulan[0] : null;

        // ---- Cari jenis benef terbanyak ----
        const byKategori = benef.byKategori || {};
        const sortedKategori = Object.entries(byKategori).sort((a, b) => b[1] - a[1]);
        const topKategori = sortedKategori.length > 0 ? sortedKategori[0] : null;

        // ---- Cari kegiatan terbanyak ----
        const byKegiatan = benef.byKegiatan || {};
        const sortedKegiatan = Object.entries(byKegiatan).sort((a, b) => b[1] - a[1]);
        const topKegiatan = sortedKegiatan.length > 0 ? sortedKegiatan[0] : null;

        // ---- Bangun kalimat insight ----
        let sentences = [];

        // Insight 1: Total Benef
        if (totalBenef > 0) {
            sentences.push(`Terdapat <span class="highlight">${totalBenef.toLocaleString('id-ID')} Beneficiary</span> terdata.`);
        }

        // Insight 2: Top Desa
        if (topDesa) {
            const pct = ((topDesa[1] / totalBenef) * 100).toFixed(1);
            sentences.push(`Desa <span class="highlight">${topDesa[0]}</span> menyumbang ${pct}% dari seluruh penerima manfaat.`);
        }

        // Insight 3: Top Kategori
        if (topKategori) {
            const pct = ((topKategori[1] / totalBenef) * 100).toFixed(1);
            sentences.push(`Sebagian besar benef adalah <span class="highlight">${topKategori[0]}</span> (${pct}%).`);
        }

        // Insight 4: Top Kegiatan
        if (topKegiatan) {
            sentences.push(`Kegiatan terbanyak: <span class="highlight">${topKegiatan[0]}</span> (${topKegiatan[1]} benef).`);
        }

        // Insight 5: Pengeluaran
        if (totalCost > 0 && topBulan) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            const [year, month] = topBulan[0].split('-');
            const monthLabel = monthNames[parseInt(month) - 1] + ' ' + year;
            const costFormatted = totalCost >= 1e6 ? (totalCost / 1e6).toFixed(2) + 'M' : totalCost.toLocaleString('id-ID');
            sentences.push(`Total pengeluaran <span class="highlight">Rp${costFormatted}</span>, tertinggi pada bulan ${monthLabel}.`);
        }

        // Fallback jika tidak ada insight
        if (sentences.length === 0) {
            sentences.push('Belum ada cukup data untuk menghasilkan insight.');
        }

        container.innerHTML = sentences.map(s => `<p>${s}</p>`).join('');
    }

    /**
     * Refresh insight dengan data terbaru
     */
    function refreshInsight() {
        if (window._dashboardData && window._dashboardData.currentData) {
            generateInsight(window._dashboardData.currentData);
        }
    }

    // Public API
    return {
        generateInsight,
        refreshInsight,
    };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Insights;
}
