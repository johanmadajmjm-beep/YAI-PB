/* ═══════════════════════════════════════════════
   api.js — Data layer YAI Dashboard
   GAS endpoint + sessionStorage cache
═══════════════════════════════════════════════ */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbz7fjIFALDAbVo2TGEUi0j-RwLqZk7KxcUyU2rdNAiTHcEsAMD2i0O0g4-biV41Nw-hew/exec';
const CACHE_KEY_RAW = 'yai_raw_v3';
const CACHE_KEY_TTL = 'yai_raw_ttl_v3';
const CACHE_TTL_MS  = 10 * 60 * 1000;

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
async function fetchRawData(force) {
  force = force || false;
  if (!force) {
    try {
      var ttl = parseInt(sessionStorage.getItem(CACHE_KEY_TTL) || '0');
      if (Date.now() < ttl) {
        var cached = sessionStorage.getItem(CACHE_KEY_RAW);
        if (cached) {
          var dc = JSON.parse(cached);
          window.rawPjum  = dc.pjum  || [];
          window.rawBenef = dc.benef || [];
          return { fromCache: true };
        }
      }
    } catch (e) { /* ignore */ }
  }

  var r = await fetch(GAS_URL + '?action=getRawRows', { redirect: 'follow' });
  var d = await r.json();
  window.rawPjum  = d.pjum  || [];
  window.rawBenef = d.benef || [];

  try {
    sessionStorage.setItem(CACHE_KEY_RAW, JSON.stringify(d));
    sessionStorage.setItem(CACHE_KEY_TTL, String(Date.now() + CACHE_TTL_MS));
  } catch (e) { /* quota */ }

  return { fromCache: false };
}

/* ── helpers (semua pakai prefix yai_ atau nama unik) ── */
window.fmt = function(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
};

window.fmtShort = function(n) {
  if (n >= 1e9) return 'Rp ' + (n / 1e9).toFixed(2) + ' M';
  if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1) + ' jt';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
};

window.bulanName = function(m) {
  return ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][parseInt(m)-1] || m;
};

window.bulanFull = function(m) {
  return ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(m)-1] || m;
};

window.groupSum = function(arr, keyFn, valFn) {
  var m = {};
  arr.forEach(function(r) {
    var k = keyFn(r) || '—';
    m[k] = (m[k] || 0) + (valFn ? (parseFloat(valFn(r)) || 0) : 1);
  });
  return m;
};

window.groupCount = function(arr, keyFn) {
  return window.groupSum(arr, keyFn, null);
};

/* RENAMED: topN (bukan top, karena window.top = parent frame) */
window.topN = function(obj, n) {
  n = n || 10;
  return Object.entries(obj).sort(function(a, b) { return b[1] - a[1]; }).slice(0, n);
};

window.sortedBulan = function(obj) {
  return Object.entries(obj).sort(function(a, b) { return a[0].localeCompare(b[0]); });
};

window.uniqArr = function(arr) {
  return Array.from(new Set(arr.filter(Boolean).map(function(s) { return String(s).trim(); }))).sort();
};

window.classifyItem = function(item) {
  var k = (item || '').toLowerCase();
  if (k.indexOf('konsumsi') > -1 || k.indexOf('makan') > -1 || k.indexOf('snack') > -1 || k.indexOf('minum') > -1) return 'Konsumsi';
  if (k.indexOf('narasumber') > -1 || k.indexOf('fasilitator') > -1 || k.indexOf('instruktur') > -1) return 'Fee Narasumber';
  if (k.indexOf('transport') > -1 || k.indexOf('perjalanan') > -1 || k.indexOf('tiket') > -1 || k.indexOf('ojek') > -1 || k.indexOf('bensin') > -1) return 'Transport';
  if (k.indexOf('kendaraan') > -1 || k.indexOf('sewa') > -1 || k.indexOf('bbm') > -1) return 'Kendaraan/BBM';
  if (k.indexOf('atk') > -1 || k.indexOf('alat tulis') > -1 || k.indexOf('kertas') > -1 || k.indexOf('fotokopi') > -1) return 'ATK';
  if (k.indexOf('gaji') > -1 || k.indexOf('honor') > -1 || k.indexOf('insentif') > -1 || k.indexOf('upah') > -1) return 'Gaji/Honor';
  if (k.indexOf('akomodasi') > -1 || k.indexOf('penginapan') > -1 || k.indexOf('hotel') > -1) return 'Akomodasi';
  if (k.indexOf('dokumentasi') > -1 || k.indexOf('foto') > -1 || k.indexOf('cetak') > -1 || k.indexOf('banner') > -1) return 'Dok/Cetak';
  if (k.indexOf('komunikasi') > -1 || k.indexOf('pulsa') > -1 || k.indexOf('internet') > -1) return 'Komunikasi';
  return 'Lainnya';
};
