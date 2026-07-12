/**
 * ============================================================
 * tables.js — Render Tabel Data (Beneficiary & PJUM)
 * Yayasan Ayo Indonesia
 * ============================================================
 */

const Tables = (function() {

    /**
     * Render tabel Beneficiary di halaman Beneficiary
     * @param {object} data - Data dari getAdminData()
     */
    function renderBenefTable(data) {
        const container = document.getElementById('benefTableContainer');
        if (!container) return;

        const rows = data?.benef?.daftar || [];

        if (rows.length === 0) {
            container.innerHTML = '<p style="color:var(--gray-400);padding:20px 0;">Tidak ada data Beneficiary.</p>';
            return;
        }

        // Tampilkan 50 data pertama
        const displayRows = rows.slice(0, 50);

        let html = `
            <div class="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Nama</th>
                            <th>Gender</th>
                            <th>Kategori</th>
                            <th>Desa</th>
                            <th>Kegiatan</th>
                            <th>Staf</th>
                            <th>Tanggal</th>
                            <th>Program</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        displayRows.forEach((row, i) => {
            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${escapeHtml(row.nama || '—')}</strong></td>
                    <td>${escapeHtml(row.gender || '—')}</td>
                    <td>${escapeHtml(row.kategori || '—')}</td>
                    <td>${escapeHtml(row.desa || '—')}</td>
                    <td>${escapeHtml(row.kegiatan || '—')}</td>
                    <td>${escapeHtml(row.staf || '—')}</td>
                    <td>${escapeHtml(row.tanggal || '—')}</td>
                    <td>${escapeHtml(row.proyek || '—')}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            <p style="margin-top:12px;color:var(--gray-400);font-size:13px;">
                Menampilkan ${displayRows.length} dari ${rows.length} data.
                ${rows.length > 50 ? ' (50 data teratas ditampilkan)' : ''}
            </p>
        `;

        container.innerHTML = html;
    }

    /**
     * Render tabel PJUM di halaman PJUM
     * @param {object} data - Data dari getAdminData()
     */
    function renderPjumTable(data) {
        const container = document.getElementById('pjumTableContainer');
        if (!container) return;

        const rows = data?.pjum?.daftar || [];

        if (rows.length === 0) {
            container.innerHTML = '<p style="color:var(--gray-400);padding:20px 0;">Tidak ada data PJUM.</p>';
            return;
        }

        const displayRows = rows.slice(0, 50);

        let html = `
            <div class="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Tanggal</th>
                            <th>Staf</th>
                            <th>Proyek</th>
                            <th>Kode</th>
                            <th>Kegiatan</th>
                            <th>Keterangan</th>
                            <th>Jumlah (Rp)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        displayRows.forEach((row, i) => {
            const cost = row.cost || 0;
            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${escapeHtml(row.tanggal || '—')}</td>
                    <td>${escapeHtml(row.staf || '—')}</td>
                    <td>${escapeHtml(row.proyek || '—')}</td>
                    <td>${escapeHtml(row.kode || '—')}</td>
                    <td>${escapeHtml(row.kegiatan || '—')}</td>
                    <td>${escapeHtml(row.keterangan || '—')}</td>
                    <td style="font-weight:600;">${formatRupiah(cost)}</td>
                </tr>
            `;
        });

        const totalCost = rows.reduce((sum, r) => sum + (r.cost || 0), 0);

        html += `
                    </tbody>
                    <tfoot>
                        <tr style="background:var(--gray-50);font-weight:600;">
                            <td colspan="7" style="text-align:right;">Total</td>
                            <td>${formatRupiah(totalCost)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <p style="margin-top:12px;color:var(--gray-400);font-size:13px;">
                Menampilkan ${displayRows.length} dari ${rows.length} data.
                ${rows.length > 50 ? ' (50 data teratas ditampilkan)' : ''}
            </p>
        `;

        container.innerHTML = html;
    }

    /**
     * Render data Wilayah
     */
    function renderWilayah(data) {
        const container = document.getElementById('wilayahContainer');
        if (!container) return;

        const byDesa = data?.benef?.byDesa || {};
        const sorted = Object.entries(byDesa).sort((a, b) => b[1] - a[1]);

        if (sorted.length === 0) {
            container.innerHTML = '<p style="color:var(--gray-400);padding:20px 0;">Tidak ada data wilayah.</p>';
            return;
        }

        let html = `
            <div class="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Desa / Kelurahan</th>
                            <th>Jumlah Beneficiary</th>
                            <th>Persentase</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        const total = sorted.reduce((sum, item) => sum + item[1], 0);

        sorted.forEach((item, i) => {
            const pct = total > 0 ? ((item[1] / total) * 100).toFixed(1) : 0;
            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${escapeHtml(item[0])}</strong></td>
                    <td>${item[1].toLocaleString('id-ID')}</td>
                    <td>${pct}%</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            <p style="margin-top:12px;color:var(--gray-400);font-size:13px;">
                Total ${sorted.length} desa, ${total.toLocaleString('id-ID')} Beneficiary.
            </p>
        `;

        container.innerHTML = html;
    }

    /**
     * Helper: escape HTML
     */
    function escapeHtml(text) {
        if (!text) return '—';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Helper: format Rupiah
     */
    function formatRupiah(amount) {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(num) || num === 0) return 'Rp0';
        if (num >= 1e9) return 'Rp' + (num / 1e9).toFixed(2) + ' M';
        if (num >= 1e6) return 'Rp' + (num / 1e6).toFixed(2) + ' M';
        return 'Rp' + num.toLocaleString('id-ID');
    }

    // Public API
    return {
        renderBenefTable,
        renderPjumTable,
        renderWilayah,
    };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Tables;
}
