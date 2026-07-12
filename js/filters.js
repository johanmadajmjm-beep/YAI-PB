/**
 * ============================================================
 * filters.js — Filter Interaktif (Program, Staf, Bulan, Tahun)
 * Yayasan Ayo Indonesia
 * ============================================================
 */

const Filters = (function() {

    // Data asli (mentah) untuk filtering
    let rawData = null;
    let currentFilters = {
        program: 'all',
        staf: 'all',
        bulan: 'all',
        tahun: 'all',
    };

    /**
     * Inisialisasi filter: isi dropdown dari data
     * @param {object} data - Data dari getAdminData()
     */
    function initFilters(data) {
        if (!data) return;

        rawData = data;

        const benef = data.benef || {};
        const pjum = data.pjum || {};

        // ---- Program ----
        const programSet = new Set();
        Object.keys(benef.byProyek || {}).forEach(p => programSet.add(p));
        Object.keys(pjum.byProyek || {}).forEach(p => programSet.add(p));

        const programSelect = document.getElementById('filterProgram');
        programSelect.innerHTML = '<option value="all">Semua Program</option>';
        Array.from(programSet).sort().forEach(p => {
            if (p && p !== '—') {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                programSelect.appendChild(opt);
            }
        });

        // ---- Staf ----
        const stafSet = new Set();
        Object.keys(benef.byStaf || {}).forEach(s => stafSet.add(s));
        Object.keys(pjum.byStaf || {}).forEach(s => stafSet.add(s));

        const stafSelect = document.getElementById('filterStaf');
        stafSelect.innerHTML = '<option value="all">Semua Staf</option>';
        Array.from(stafSet).sort().forEach(s => {
            if (s && s !== '—') {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                stafSelect.appendChild(opt);
            }
        });

        // ---- Bulan ----
        const bulanSet = new Set();
        Object.keys(benef.byBulan || {}).forEach(b => bulanSet.add(b));
        Object.keys(pjum.byBulan || {}).forEach(b => bulanSet.add(b));

        const bulanSelect = document.getElementById('filterBulan');
        bulanSelect.innerHTML = '<option value="all">Semua Bulan</option>';
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        Array.from(bulanSet).sort().forEach(b => {
            if (b && b.length >= 7) {
                const [year, month] = b.split('-');
                const label = monthNames[parseInt(month) - 1] + ' ' + year;
                const opt = document.createElement('option');
                opt.value = b;
                opt.textContent = label;
                bulanSelect.appendChild(opt);
            }
        });

        // ---- Tahun ----
        const tahunSet = new Set();
        Object.keys(benef.byBulan || {}).forEach(b => {
            if (b.length >= 4) tahunSet.add(b.substring(0, 4));
        });
        Object.keys(pjum.byBulan || {}).forEach(b => {
            if (b.length >= 4) tahunSet.add(b.substring(0, 4));
        });

        const tahunSelect = document.getElementById('filterTahun');
        tahunSelect.innerHTML = '<option value="all">Semua Tahun</option>';
        Array.from(tahunSet).sort().reverse().forEach(t => {
            if (t) {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                tahunSelect.appendChild(opt);
            }
        });

        // Event listener untuk tombol
        document.getElementById('applyFilter').addEventListener('click', applyFilters);
        document.getElementById('resetFilter').addEventListener('click', resetFilters);
    }

    /**
     * Terapkan filter
     */
    function applyFilters() {
        if (!rawData) {
            console.warn('[Filters] No data to filter');
            return;
        }

        currentFilters = {
            program: document.getElementById('filterProgram').value,
            staf: document.getElementById('filterStaf').value,
            bulan: document.getElementById('filterBulan').value,
            tahun: document.getElementById('filterTahun').value,
        };

        const filtered = filterData(rawData, currentFilters);

        // Update dashboard dengan data yang sudah difilter
        if (window._dashboardData && window._dashboardData.updateDashboard) {
            window._dashboardData.updateDashboard(filtered);
        } else {
            // Fallback: panggil langsung
            if (typeof Metrics !== 'undefined') {
                Metrics.renderMetrics(filtered);
            }
            if (typeof Charts !== 'undefined') {
                Charts.updateCharts(filtered);
            }
            if (typeof Insights !== 'undefined') {
                Insights.generateInsight(filtered);
            }
            if (typeof Tables !== 'undefined') {
                Tables.renderBenefTable(filtered);
                Tables.renderPjumTable(filtered);
            }
        }

        // Update Top 5
        updateTop5(filtered);
    }

    /**
     * Reset filter ke default
     */
    function resetFilters() {
        document.getElementById('filterProgram').value = 'all';
        document.getElementById('filterStaf').value = 'all';
        document.getElementById('filterBulan').value = 'all';
        document.getElementById('filterTahun').value = 'all';
        applyFilters();
    }

    /**
     * Filter data berdasarkan kriteria
     * @param {object} data - Data asli dari getAdminData()
     * @param {object} filters - Objek filter
     * @returns {object} - Data yang sudah difilter
     */
    function filterData(data, filters) {
        const { program, staf, bulan, tahun } = filters;

        // Clone data untuk dimodifikasi
        const result = JSON.parse(JSON.stringify(data));

        // ---- Filter Beneficiary ----
        if (result.benef && result.benef.daftar) {
            let filteredRows = result.benef.daftar;

            if (program !== 'all') {
                filteredRows = filteredRows.filter(r => r.proyek === program);
            }
            if (staf !== 'all') {
                filteredRows = filteredRows.filter(r => r.staf === staf);
            }
            if (bulan !== 'all') {
                filteredRows = filteredRows.filter(r => r.tanggal && r.tanggal.startsWith(bulan));
            }
            if (tahun !== 'all') {
                filteredRows = filteredRows.filter(r => r.tanggal && r.tanggal.startsWith(tahun));
            }

            // Re-agregasi
            result.benef.daftar = filteredRows;
            result.benef.total = filteredRows.length;
            result.benef.byBulan = aggregateByKey(filteredRows, 'tanggal', (v) => v.substring(0, 7));
            result.benef.byGender = aggregateByKey(filteredRows, 'gender');
            result.benef.byKategori = aggregateByKey(filteredRows, 'kategori');
            result.benef.byUsia = aggregateByKey(filteredRows, 'usia');
            result.benef.byDesa = aggregateByKey(filteredRows, 'desa');
            result.benef.byStaf = aggregateByKey(filteredRows, 'staf');
            result.benef.byProyek = aggregateByKey(filteredRows, 'proyek');
            result.benef.byInstansi = aggregateByKey(filteredRows, 'instansi');
            result.benef.uniqueCount = new Set(filteredRows.map(r => (r.nama || '').toLowerCase() + '|' + (r.desa || ''))).size;
        }

        // ---- Filter PJUM ----
        if (result.pjum && result.pjum.daftar) {
            let filteredRows = result.pjum.daftar;

            if (program !== 'all') {
                filteredRows = filteredRows.filter(r => r.proyek === program);
            }
            if (staf !== 'all') {
                filteredRows = filteredRows.filter(r => r.staf === staf);
            }
            if (bulan !== 'all') {
                filteredRows = filteredRows.filter(r => r.tanggal && r.tanggal.startsWith(bulan));
            }
            if (tahun !== 'all') {
                filteredRows = filteredRows.filter(r => r.tanggal && r.tanggal.startsWith(tahun));
            }

            result.pjum.daftar = filteredRows;
            result.pjum.totalCost = filteredRows.reduce((sum, r) => sum + (r.cost || 0), 0);
            result.pjum.byBulan = aggregateByKey(filteredRows, 'tanggal', (v) => v.substring(0, 7), 'cost');
            result.pjum.byStaf = aggregateByKey(filteredRows, 'staf', null, 'cost');
            result.pjum.byProyek = aggregateByKey(filteredRows, 'proyek', null, 'cost');
            result.pjum.byKode = aggregateByKey(filteredRows, 'kode', null, 'cost');
            result.pjum.byKegiatan = aggregateByKey(filteredRows, 'kegiatan', null, 'cost');
            result.pjum.fileCount = new Set(filteredRows.map(r => r.fileName)).size;
        }

        return result;
    }

    /**
     * Helper: agregasi berdasarkan key
     */
    function aggregateByKey(rows, key, transform = null, valueKey = null) {
        const result = {};
        rows.forEach(row => {
            let val = row[key] || '—';
            if (transform) val = transform(val);
            const amount = valueKey ? (row[valueKey] || 0) : 1;
            result[val] = (result[val] || 0) + amount;
        });
        return result;
    }

    /**
     * Update Top 5 Jenis Kegiatan
     */
    function updateTop5(data) {
        const byKegiatan = data.benef?.byKegiatan || {};
        const sorted = Object.entries(byKegiatan).sort((a, b) => b[1] - a[1]);
        const top5 = sorted.slice(0, 5);
        const total = sorted.reduce((sum, item) => sum + item[1], 0);

        const list = document.getElementById('top5List');
        if (!list) return;

        if (top5.length === 0) {
            list.innerHTML = '<li style="justify-content:center;color:var(--gray-400);">Tidak ada data</li>';
            return;
        }

        list.innerHTML = top5.map((item, index) => {
            const pct = total > 0 ? ((item[1] / total) * 100).toFixed(1) : 0;
            return `<li>
                <span>${index + 1}. ${item[0]}</span>
                <span class="badge">${pct}%</span>
            </li>`;
        }).join('');
    }

    /**
     * Dapatkan filter saat ini
     */
    function getCurrentFilters() {
        return { ...currentFilters };
    }

    // Public API
    return {
        initFilters,
        applyFilters,
        resetFilters,
        filterData,
        getCurrentFilters,
        updateTop5,
    };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Filters;
}
