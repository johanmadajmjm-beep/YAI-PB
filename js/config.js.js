/**
 * ============================================================
 * config.js — Konfigurasi Dashboard
 * Yayasan Ayo Indonesia
 * ============================================================
 */

const CONFIG = {
    // ====== API ======
    API_BASE_URL: 'https://script.google.com/macros/s/AKfycbz7fjIFALDAbVo2TGEUi0j-RwLqZk7KxcUyU2rdNAiTHcEsAMD2i0O0g4-biV41Nw-hew/exec',

    // ====== WARNA ======
    COLORS: {
        primary: '#1a3a6b',
        primaryLight: '#2a5a9a',
        accent: '#2a7de1',
        success: '#2e7d32',
        danger: '#b33c3c',
        gray500: '#7a8aa0',
        gray700: '#2a3a52',
    },

    // ====== PALETTE GRAFIK ======
    CHART_COLORS: [
        '#2a7de1', '#42a5f5', '#66bb6a', '#ffa726', '#ef5350',
        '#ab47bc', '#26c6da', '#8d6e63', '#78909c', '#d4e157'
    ],

    // ====== DEFAULt ======
    DEFAULT_MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],

    // ====== INSIGHT ======
    INSIGHT: {
        MIN_BENEF_FOR_TREND: 5,
        TOP_KEGIATAN_LIMIT: 5,
    }
};

// Export untuk digunakan di file lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}