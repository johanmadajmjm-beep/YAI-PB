/* ═══════════════════════════════════════════════
   api.js — Data layer YAI Dashboard
   GAS endpoint + sessionStorage cache
═══════════════════════════════════════════════ */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbz7fjIFALDAbVo2TGEUi0j-RwLqZk7KxcUyU2rdNAiTHcEsAMD2i0O0g4-biV41Nw-hew/exec';
const CACHE_KEY_RAW = 'yai_raw_v2';
const CACHE_KEY_TTL = 'yai_raw_ttl_v2';
const CACHE_TTL_MS  = 10 * 60 * 1000; // 10 menit

/* rawPjum field indices */
window.P = { tgl:0, staf:1, proyek:2, kode:3, kegiatan:4, item:5, jumlah:6, file:7 };

/* rawBenef field indices */
window.B = {
  nama:0, gender:1, kategori:2, usia:3, desa:4, kec:5,
  kegiatan:6, staf:7, tgl:8, proyek:9, kab:10, instansi:11,
  file:12, disab:13, noHp:14, katUsia:15, paroki:16,
  jabatan:17, benefit:18, kode:19, lembaga:20, stafPengupload:21,
  lainnya:22, jikaBenda:23
};

window.rawPjum  = [];
window.rawBenef = [];

/* ── fetch ─────────────────────────────────── */
async function fetchRawData(force = false) {
  if (!force) {
    try {
      const ttl = parseInt(sessionStorage.getItem(CACHE_KEY_TTL) || '0');
      if (Date.now() < ttl) {
        const cached = sessionStorage.getItem(CACHE_KEY_RAW);
        if (cached) {
          const d = JSON.parse(cached);
          window.rawPjum  = d.pjum  || [];
          window.rawBenef = d.benef || [];
          return { fromCache: true };
        }
      }
    } catch (e) { /* ignore */ }
  }

  const r   = await fetch(`${GAS_URL}?action=getRawRows`, { redirect: 'follow' });
  const d   = await r.json();
  window.rawPjum  = d.pjum  || [];
  window.rawBenef = d.benef || [];

  try {
    sessionStorage.setItem(CACHE_KEY_RAW, JSON.stringify(d));
    sessionStorage.setItem(CACHE_KEY_TTL, String(Date.now() + CACHE_TTL_MS));
  } catch (e) { /* quota */ }

  return { fromCache: false };
}

/* ── helpers ─────────────────────────────────── */
window.fmt    = n => 'Rp ' + Number(n).toLocaleString('id-ID');
window.fmtShort = n => {
  if (n >= 1e9) return 'Rp ' + (n / 1e9).toFixed(2) + ' M';
  if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1) + ' jt';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
};
window.bulanName = m => ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][parseInt(m)-1] || m;
window.bulanFull = m => ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(m)-1] || m;

window.groupSum = (arr, keyFn, valFn) => {
  const m = {};
  arr.forEach(r => {
    const k = keyFn(r) || '—';
    m[k] = (m[k] || 0) + (valFn ? (parseFloat(valFn(r)) || 0) : 1);
  });
  return m;
};

window.groupCount = (arr, keyFn) => groupSum(arr, keyFn, null);

window.top = (obj, n = 10) =>
  Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

window.sortedBulan = obj =>
  Object.entries(obj).sort((a, b) => a[0].localeCompare(b[0]));

window.uniq = arr =>
  [...new Set(arr.filter(Boolean).map(s => String(s).trim()))].sort();

window.classifyItem = item => {
  const k = (item || '').toLowerCase();
  if (k.includes('konsumsi') || k.includes('makan') || k.includes('snack') || k.includes('minum')) return 'Konsumsi';
  if (k.includes('narasumber') || k.includes('fasilitator') || k.includes('instruktur')) return 'Fee Narasumber';
  if (k.includes('transport') || k.includes('perjalanan') || k.includes('tiket') || k.includes('ojek') || k.includes('bensin')) return 'Transport';
  if (k.includes('kendaraan') || k.includes('sewa') || k.includes('bbm')) return 'Kendaraan/BBM';
  if (k.includes('atk') || k.includes('alat tulis') || k.includes('kertas') || k.includes('fotokopi')) return 'ATK';
  if (k.includes('gaji') || k.includes('honor') || k.includes('insentif') || k.includes('upah')) return 'Gaji/Honor';
  if (k.includes('akomodasi') || k.includes('penginapan') || k.includes('hotel')) return 'Akomodasi';
  if (k.includes('dokumentasi') || k.includes('foto') || k.includes('cetak') || k.includes('banner')) return 'Dok/Cetak';
  if (k.includes('komunikasi') || k.includes('pulsa') || k.includes('internet')) return 'Komunikasi';
  return 'Lainnya';
};
