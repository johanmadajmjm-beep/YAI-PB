/**
 * ============================================================
 * filters.js — Filter Interaktif per Tab
 * Yayasan Ayo Indonesia
 * ============================================================
 */

const Filters = (function() {

    // Data asli (mentah) untuk filtering
    let rawData = null;
    let currentFilters = {
        dashboard: { program: 'all', staf: 'all', bulan: 'all', tahun: 'all' },
        benef: { program: 'all', staf: 'all', bulan: 'all', tahun: 'all' },
        pjum: { program: 'all', staf: 'all', bulan: 'all', tahun: 'all' }
    };

    // ============================================================
    // UTILITY: Ekstrak Bulan & Tahun dari Tanggal
    // ============================================================

    function extractMonth(dateStr) {
        if (!dateStr || dateStr === '—' || dateStr === '') return null;
        
        // Coba parse berbagai format
        let parsed = parseDate(dateStr);
        if (parsed) {
            const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
            return monthNames[parsed.getMonth()];
        }
        
        // Fallback: coba regex
        const patterns = [
            /^(\d{4})-(\d{2})-(\d{2})/,      // YYYY-MM-DD
            /^(\d{2})\/(\d{2})\/(\d{4})/,    // DD/MM/YYYY
            /^(\d{2})-(\d{2})-(\d{4})/,      // DD-MM-YYYY
            /^(\d{4})\/(\d{2})\/(\d{2})/,    // YYYY/MM/DD
        ];
        
        for (let p of patterns) {
            const match = dateStr.match(p);
            if (match) {
                // Coba deteksi format
                if (match[1].length === 4) {
                    // YYYY-MM-DD atau YYYY/MM/DD
                    const month = parseInt(match[2]);
                    if (month >= 1 && month <= 12) {
                        const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
                        return monthNames[month - 1];
                    }
                } else if (match[3] && match[3].length === 4) {
                    // DD/MM/YYYY atau DD-MM-YYYY
                    const month = parseInt(match[2]);
                    if (month >= 1 && month <= 12) {
                        const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
                        return monthNames[month - 1];
                    }
                }
            }
        }
        
        return null;
    }

    function extractYear(dateStr) {
        if (!dateStr || dateStr === '—' || dateStr === '') return null;
        
        // Coba parse berbagai format
        let parsed = parseDate(dateStr);
        if (parsed) {
            return parsed.getFullYear().toString();
        }
        
        // Fallback: cari angka 4 digit yang masuk akal (1900-2099)
        const match = dateStr.match(/\b(19|20)\d{2}\b/);
        if (match) {
            const year = parseInt(match[0]);
            if (year >= 1900 && year <= 2099) {
                return year.toString();
            }
        }
        
        return null;
    }

    function parseDate(dateStr) {
        if (!dateStr || dateStr === '—' || dateStr === '') return null;
        
        // Coba Date.parse
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            // Cek apakah tahun masuk akal (1900-2099)
            const year = d.getFullYear();
            if (year >= 1900 && year <= 2099) {
                return d;
            }
        }
        
        // Coba berbagai format
        const patterns = [
            /^(\d{4})-(\d{2})-(\d{2})/,      // YYYY-MM-DD
            /^(\d{2})\/(\d{2})\/(\d{4})/,    // DD/MM/YYYY
            /^(\d{2})-(\d{2})-(\d{4})/,      // DD-MM-YYYY
            /^(\d{4})\/(\d{2})\/(\d{2})/,    // YYYY/MM/DD
        ];
        
        for (let p of patterns) {
            const match = dateStr.match(p);
            if (match) {
                let year, month, day;
                if (match[1].length === 4) {
                    year = parseInt(match[1]);
                    month = parseInt(match[2]) - 1;
                    day = parseInt(match[3]);
                } else if (match[3] && match[3].length === 4) {
                    year = parseInt(match[3]);
                    month = parseInt(match[2]) - 1;
                    day = parseInt(match[1]);
                } else {
                    continue;
                }
                if (year >= 1900 && year <= 2099 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
                    return new Date(year, month, day);
                }
            }
        }
        
        return null;
    }

    function isValidDate(dateStr) {
        return extractYear(dateStr) !== null && extractMonth(dateStr) !== null;
    }

    // ============================================================
    // INISIALISASI FILTER PER TAB
    // ============================================================

    function initFilters(data) {
        if (!data) return;
        rawData = data;

        const benef = data.benef || {};
        const pjum = data.pjum || {};

        // ---- INISIALISASI: Dashboard ----
        initDashboardFilters(benef, pjum);

        // ---- INISIALISASI: Beneficiary ----
        initBenefFilters(benef);

        // ---- INISIALISASI: PJUM ----
        initPjumFilters(pjum);

        // ---- EVENT LISTENER ----
        setupEventListeners();
    }

    // ============================================================
    // DASHBOARD FILTERS (Gabungan BENEF + PJUM)
    // ============================================================

    function initDashboardFilters(benef, pjum) {
        // Program: gabungan dari benef.byProyek + pjum.byProyek
        const programSet = new Set();
        Object.keys(benef.byProyek || {}).forEach(p => programSet.add(p));
        Object.keys(pjum.byProyek || {}).forEach(p => programSet.add(p));
        populateSelect('filterProgram', programSet, 'Semua Program');

        // Staf: gabungan dari benef.byStaf + pjum.byStaf
        const stafSet = new Set();
        Object.keys(benef.byStaf || {}).forEach(s => stafSet.add(s));
        Object.keys(pjum.byStaf || {}).forEach(s => stafSet.add(s));
        populateSelect('filterStaf', stafSet, 'Semua Staf');

        // Bulan: gabungan dari semua tanggal
        const bulanSet = new Set();
        const benefRows = benef.daftar || [];
        const pjumRows = pjum.daftar || [];
        benefRows.forEach(r => {
            const m = extractMonth(r.tanggal);
            if (m) bulanSet.add(m);
        });
        pjumRows.forEach(r => {
            const m = extractMonth(r.tanggal);
            if (m) bulanSet.add(m);
        });
        // Tambahkan "Blank"
        const hasBlankBenef = benefRows.some(r => !isValidDate(r.tanggal));
        const hasBlankPjum = pjumRows.some(r => !isValidDate(r.tanggal));
        if (hasBlankBenef || hasBlankPjum) bulanSet.add('Blank');
        populateSelect('filterBulan', bulanSet, 'Semua Bulan');

        // Tahun: gabungan dari semua tanggal
        const tahunSet = new Set();
        benefRows.forEach(r => {
            const y = extractYear(r.tanggal);
            if (y) tahunSet.add(y);
        });
        pjumRows.forEach(r => {
            const y = extractYear(r.tanggal);
            if (y) tahunSet.add(y);
        });
        if (hasBlankBenef || hasBlankPjum) tahunSet.add('Blank');
        populateSelect('filterTahun', tahunSet, 'Semua Tahun');
    }

    // ============================================================
    // BENEFICIARY FILTERS
    // Sumber: Program Pendukung, Nama Staf, Tanggal Kegiatan
    // ============================================================

    function initBenefFilters(benef) {
        // Program: dari benef.byProyek (Program Pendukung)
        const programSet = new Set(Object.keys(benef.byProyek || {}));
        populateSelect('benefFilterProgram', programSet, 'Semua Program');

        // Staf: dari benef.byStaf (Nama Staf)
        const stafSet = new Set(Object.keys(benef.byStaf || {}));
        populateSelect('benefFilterStaf', stafSet, 'Semua Staf');

        // Bulan: dari benef.daftar (Tanggal Kegiatan)
        const bulanSet = new Set();
        const rows = benef.daftar || [];
        rows.forEach(r => {
            const m = extractMonth(r.tanggal);
            if (m) bulanSet.add(m);
        });
        if (rows.some(r => !isValidDate(r.tanggal))) bulanSet.add('Blank');
        populateSelect('benefFilterBulan', bulanSet, 'Semua Bulan');

        // Tahun: dari benef.daftar (Tanggal Kegiatan)
        const tahunSet = new Set();
        rows.forEach(r => {
            const y = extractYear(r.tanggal);
            if (y) tahunSet.add(y);
        });
        if (rows.some(r => !isValidDate(r.tanggal))) tahunSet.add('Blank');
        populateSelect('benefFilterTahun', tahunSet, 'Semua Tahun');
    }

    // ============================================================
    // PJUM FILTERS
    // Sumber: Proyek, Staf, Tgl
    // ============================================================

    function initPjumFilters(pjum) {
        // Program: dari pjum.byProyek (Proyek)
        const programSet = new Set(Object.keys(pjum.byProyek || {}));
        populateSelect('pjumFilterProgram', programSet, 'Semua Program');

        // Staf: dari pjum.byStaf (Staf)
        const stafSet = new Set(Object.keys(pjum.byStaf || {}));
        populateSelect('pjumFilterStaf', stafSet, 'Semua Staf');

        // Bulan: dari pjum.daftar (Tgl)
        const bulanSet = new Set();
        const rows = pjum.daftar || [];
        rows.forEach(r => {
            const m = extractMonth(r.tanggal);
            if (m) bulanSet.add(m);
        });
        if (rows.some(r => !isValidDate(r.tanggal))) bulanSet.add('Blank');
        populateSelect('pjumFilterBulan', bulanSet, 'Semua Bulan');

        // Tahun: dari pjum.daftar (Tgl)
        const tahunSet = new Set();
        rows.forEach(r => {
            const y = extractYear(r.tanggal);
            if (y) tahunSet.add(y);
        });
        if (rows.some(r => !isValidDate(r.tanggal))) tahunSet.add('Blank');
        populateSelect('pjumFilterTahun', tahunSet, 'Semua Tahun');
    }

    // ============================================================
    // HELPER: Populate Select
    // ============================================================

    function populateSelect(selectId, valueSet, defaultLabel) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Urutkan
        const values = Array.from(valueSet).filter(v => v && v !== '—' && v !== '' && v !== 'null');
        const sorted = values.sort((a, b) => {
            // Blank selalu di akhir
            if (a === 'Blank') return 1;
            if (b === 'Blank') return -1;
            return a.localeCompare(b);
        });

        let html = `<option value="all">${defaultLabel}</option>`;
        sorted.forEach(v => {
            const label = v === 'Blank' ? '⚠️ Blank (tgl tidak valid)' : v;
            html += `<option value="${v}">${label}</option>`;
        });
        select.innerHTML = html;
    }

    // ============================================================
    // EVENT LISTENERS
    // ============================================================

    function setupEventListeners() {
        // Dashboard
        document.getElementById('applyFilter')?.addEventListener('click', () => applyDashboardFilters());
        document.getElementById('resetFilter')?.addEventListener('click', () => resetDashboardFilters());

        // Beneficiary
        document.getElementById('benefApplyFilter')?.addEventListener('click', () => applyBenefFilters());
        document.getElementById('benefResetFilter')?.addEventListener('click', () => resetBenefFilters());

        // PJUM
        document.getElementById('pjumApplyFilter')?.addEventListener('click', () => applyPjumFilters());
        document.getElementById('pjumResetFilter')?.addEventListener('click', () => resetPjumFilters());
    }

    // ============================================================
    // DASHBOARD FILTERS
    // ============================================================

    function applyDashboardFilters() {
        currentFilters.dashboard = {
            program: document.getElementById('filterProgram')?.value || 'all',
            staf: document.getElementById('filterStaf')?.value || 'all',
            bulan: document.getElementById('filterBulan')?.value || 'all',
            tahun: document.getElementById('filterTahun')?.value || 'all',
        };

        const filtered = filterDashboardData(rawData, currentFilters.dashboard);
        
        // Update dashboard
        if (window._dashboardData && window._dashboardData.updateDashboard) {
            window._dashboardData.updateDashboard(filtered);
        }
    }

    function resetDashboardFilters() {
        document.getElementById('filterProgram').value = 'all';
        document.getElementById('filterStaf').value = 'all';
        document.getElementById('filterBulan').value = 'all';
        document.getElementById('filterTahun').value = 'all';
        applyDashboardFilters();
    }

    function filterDashboardData(data, filters) {
        if (!data) return data;
        
        const result = JSON.parse(JSON.stringify(data));
        const { program, staf, bulan, tahun } = filters;

        // Filter Benef
        if (result.benef && result.benef.daftar) {
            let rows = result.benef.daftar;
            rows = filterBenefRows(rows, { program, staf, bulan, tahun });
            result.benef.daftar = rows;
            result.benef = reAggregateBenef(rows);
        }

        // Filter PJUM
        if (result.pjum && result.pjum.daftar) {
            let rows = result.pjum.daftar;
            rows = filterPjumRows(rows, { program, staf, bulan, tahun });
            result.pjum.daftar = rows;
            result.pjum = reAggregatePjum(rows);
        }

        return result;
    }

    // ============================================================
    // BENEFICIARY FILTERS
    // ============================================================

    function applyBenefFilters() {
        currentFilters.benef = {
            program: document.getElementById('benefFilterProgram')?.value || 'all',
            staf: document.getElementById('benefFilterStaf')?.value || 'all',
            bulan: document.getElementById('benefFilterBulan')?.value || 'all',
            tahun: document.getElementById('benefFilterTahun')?.value || 'all',
        };

        if (rawData) {
            const filtered = filterBenefData(rawData, currentFilters.benef);
            if (typeof Pages !== 'undefined') {
                Pages.renderBeneficiaryPage(filtered);
            }
        }
    }

    function resetBenefFilters() {
        document.getElementById('benefFilterProgram').value = 'all';
        document.getElementById('benefFilterStaf').value = 'all';
        document.getElementById('benefFilterBulan').value = 'all';
        document.getElementById('benefFilterTahun').value = 'all';
        applyBenefFilters();
    }

    function filterBenefData(data, filters) {
        if (!data) return data;
        const result = JSON.parse(JSON.stringify(data));
        const { program, staf, bulan, tahun } = filters;

        if (result.benef && result.benef.daftar) {
            let rows = result.benef.daftar;
            rows = filterBenefRows(rows, { program, staf, bulan, tahun });
            result.benef.daftar = rows;
            result.benef = reAggregateBenef(rows);
        }

        return result;
    }

    function filterBenefRows(rows, filters) {
        const { program, staf, bulan, tahun } = filters;

        return rows.filter(r => {
            // Program (Program Pendukung)
            if (program !== 'all' && program !== 'Blank') {
                if ((r.proyek || '') !== program) return false;
            }
            if (program === 'Blank') {
                if (r.proyek && r.proyek !== '' && r.proyek !== '—') return false;
            }

            // Staf (Nama Staf)
            if (staf !== 'all' && staf !== 'Blank') {
                if ((r.staf || '') !== staf) return false;
            }
            if (staf === 'Blank') {
                if (r.staf && r.staf !== '' && r.staf !== '—') return false;
            }

            // Bulan & Tahun (Tanggal Kegiatan)
            const month = extractMonth(r.tanggal);
            const year = extractYear(r.tanggal);
            const isValid = month !== null && year !== null;

            if (bulan !== 'all' && bulan !== 'Blank') {
                if (month !== bulan) return false;
            }
            if (bulan === 'Blank') {
                if (isValid) return false;
            }

            if (tahun !== 'all' && tahun !== 'Blank') {
                if (year !== tahun) return false;
            }
            if (tahun === 'Blank') {
                if (isValid) return false;
            }

            return true;
        });
    }

    // ============================================================
    // PJUM FILTERS
    // ============================================================

    function applyPjumFilters() {
        currentFilters.pjum = {
            program: document.getElementById('pjumFilterProgram')?.value || 'all',
            staf: document.getElementById('pjumFilterStaf')?.value || 'all',
            bulan: document.getElementById('pjumFilterBulan')?.value || 'all',
            tahun: document.getElementById('pjumFilterTahun')?.value || 'all',
        };

        if (rawData) {
            const filtered = filterPjumData(rawData, currentFilters.pjum);
            if (typeof Pages !== 'undefined') {
                Pages.renderPjumPage(filtered);
            }
        }
    }

    function resetPjumFilters() {
        document.getElementById('pjumFilterProgram').value = 'all';
        document.getElementById('pjumFilterStaf').value = 'all';
        document.getElementById('pjumFilterBulan').value = 'all';
        document.getElementById('pjumFilterTahun').value = 'all';
        applyPjumFilters();
    }

    function filterPjumData(data, filters) {
        if (!data) return data;
        const result = JSON.parse(JSON.stringify(data));
        const { program, staf, bulan, tahun } = filters;

        if (result.pjum && result.pjum.daftar) {
            let rows = result.pjum.daftar;
            rows = filterPjumRows(rows, { program, staf, bulan, tahun });
            result.pjum.daftar = rows;
            result.pjum = reAggregatePjum(rows);
        }

        return result;
    }

    function filterPjumRows(rows, filters) {
        const { program, staf, bulan, tahun } = filters;

        return rows.filter(r => {
            // Program (Proyek)
            if (program !== 'all' && program !== 'Blank') {
                if ((r.proyek || '') !== program) return false;
            }
            if (program === 'Blank') {
                if (r.proyek && r.proyek !== '' && r.proyek !== '—') return false;
            }

            // Staf
            if (staf !== 'all' && staf !== 'Blank') {
                if ((r.staf || '') !== staf) return false;
            }
            if (staf === 'Blank') {
                if (r.staf && r.staf !== '' && r.staf !== '—') return false;
            }

            // Bulan & Tahun (Tgl)
            const month = extractMonth(r.tanggal);
            const year = extractYear(r.tanggal);
            const isValid = month !== null && year !== null;

            if (bulan !== 'all' && bulan !== 'Blank') {
                if (month !== bulan) return false;
            }
            if (bulan === 'Blank') {
                if (isValid) return false;
            }

            if (tahun !== 'all' && tahun !== 'Blank') {
                if (year !== tahun) return false;
            }
            if (tahun === 'Blank') {
                if (isValid) return false;
            }

            return true;
        });
    }

    // ============================================================
    // RE-AGGREGATION HELPERS
    // ============================================================

    function reAggregateBenef(rows) {
        const result = {
            total: rows.length,
            byBulan: {},
            byGender: {},
            byKategori: {},
            byUsia: {},
            byDesa: {},
            byStaf: {},
            byProyek: {},
            byKegiatan: {},
            byInstansi: {},
            uniqueCount: new Set(rows.map(r => (r.nama || '').toLowerCase() + '|' + (r.desa || ''))).size,
            daftar: rows,
        };

        rows.forEach(r => {
            const bulanKey = r.tanggal ? r.tanggal.substring(0, 7) : '—';
            result.byBulan[bulanKey] = (result.byBulan[bulanKey] || 0) + 1;
            result.byGender[r.gender || '—'] = (result.byGender[r.gender || '—'] || 0) + 1;
            result.byKategori[r.kategori || '—'] = (result.byKategori[r.kategori || '—'] || 0) + 1;
            result.byUsia[r.usia || '—'] = (result.byUsia[r.usia || '—'] || 0) + 1;
            result.byDesa[r.desa || '—'] = (result.byDesa[r.desa || '—'] || 0) + 1;
            result.byStaf[r.staf || '—'] = (result.byStaf[r.staf || '—'] || 0) + 1;
            result.byProyek[r.proyek || '—'] = (result.byProyek[r.proyek || '—'] || 0) + 1;
            result.byKegiatan[r.kegiatan || '—'] = (result.byKegiatan[r.kegiatan || '—'] || 0) + 1;
            result.byInstansi[r.instansi || '—'] = (result.byInstansi[r.instansi || '—'] || 0) + 1;
        });

        result.fileCount = new Set(rows.map(r => r.fileName)).size;
        result.programCount = Object.keys(result.byProyek).length;
        result.allStaf = Object.keys(result.byStaf);
        result.allProyek = Object.keys(result.byProyek);

        return result;
    }

    function reAggregatePjum(rows) {
        const result = {
            totalCost: 0,
            byBulan: {},
            byStaf: {},
            byProyek: {},
            byKode: {},
            byKegiatan: {},
            byKomponen: {},
            daftar: rows,
        };

        rows.forEach(r => {
            const cost = r.cost || 0;
            const bulanKey = r.tanggal ? r.tanggal.substring(0, 7) : '—';
            result.totalCost += cost;
            result.byBulan[bulanKey] = (result.byBulan[bulanKey] || 0) + cost;
            result.byStaf[r.staf || '—'] = (result.byStaf[r.staf || '—'] || 0) + cost;
            result.byProyek[r.proyek || '—'] = (result.byProyek[r.proyek || '—'] || 0) + cost;
            result.byKode[r.kode || '—'] = (result.byKode[r.kode || '—'] || 0) + cost;
            result.byKegiatan[r.kegiatan || '—'] = (result.byKegiatan[r.kegiatan || '—'] || 0) + cost;
            
            // Komponen dari keterangan
            const komponen = classifyKomponen(r.keterangan || '');
            result.byKomponen[komponen] = (result.byKomponen[komponen] || 0) + cost;
        });

        result.fileCount = new Set(rows.map(r => r.fileName)).size;
        result.programCount = Object.keys(result.byProyek).length;
        result.allStaf = Object.keys(result.byStaf);
        result.allProyek = Object.keys(result.byProyek);

        return result;
    }

    function classifyKomponen(text) {
        const t = (text || '').toLowerCase();
        if (t.includes('konsumsi') || t.includes('makan') || t.includes('minum') || t.includes('snack')) return 'Konsumsi';
        if (t.includes('narasumber') || t.includes('fasilitator') || t.includes('instruktur')) return 'Fee Narasumber';
        if (t.includes('transport') || t.includes('perjalanan') || t.includes('tiket') || t.includes('ojek') || t.includes('bensin')) return 'Transport';
        if (t.includes('kendaraan') || t.includes('sewa') || t.includes('bbm')) return 'Kendaraan/BBM';
        if (t.includes('atk') || t.includes('alat tulis') || t.includes('kertas') || t.includes('fotokopi')) return 'ATK';
        if (t.includes('gaji') || t.includes('honor') || t.includes('insentif') || t.includes('upah')) return 'Gaji/Honor';
        if (t.includes('akomodasi') || t.includes('penginapan') || t.includes('hotel')) return 'Akomodasi';
        if (t.includes('dokumentasi') || t.includes('foto') || t.includes('cetak') || t.includes('banner')) return 'Dokumentasi/Cetak';
        if (t.includes('komunikasi') || t.includes('pulsa') || t.includes('internet')) return 'Komunikasi';
        return 'Lainnya';
    }

    /**
     * Dapatkan filter saat ini untuk tab tertentu
     */
    function getCurrentFilters(tab = 'dashboard') {
        return currentFilters[tab] || { program: 'all', staf: 'all', bulan: 'all', tahun: 'all' };
    }

    // ============================================================
    // PUBLIC API
    // ============================================================

    return {
        initFilters,
        applyDashboardFilters,
        resetDashboardFilters,
        applyBenefFilters,
        resetBenefFilters,
        applyPjumFilters,
        resetPjumFilters,
        getCurrentFilters,
        extractMonth,
        extractYear,
        isValidDate,
    };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Filters;
}