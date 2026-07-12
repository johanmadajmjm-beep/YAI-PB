/* ═══════════════════════════════════════════════
   api.js — Data layer YAI Dashboard v5
═══════════════════════════════════════════════ */

var GAS_URL       = 'https://script.google.com/macros/s/AKfycbz7fjIFALDAbVo2TGEUi0j-RwLqZk7KxcUyU2rdNAiTHcEsAMD2i0O0g4-biV41Nw-hew/exec';
var CACHE_KEY     = 'yai_raw_v5';
var CACHE_KEY_TTL = 'yai_raw_ttl_v5';
var CACHE_TTL_MS  = 10 * 60 * 1000;

window.P = { tgl:0, staf:1, proyek:2, kode:3, kegiatan:4, item:5, jumlah:6, file:7 };
window.B = {
  nama:0, gender:1, kategori:2, usia:3, desa:4, kec:5,
  kegiatan:6, staf:7, tgl:8, proyek:9, kab:10, instansi:11,
  file:12, disab:13, noHp:14, katUsia:15, paroki:16,
  jabatan:17, benefit:18, kode:19, lembaga:20, stafPengupload:21,
  lainnya:22, jikaBenda:23
};

window.rawPjum  = [];
window.rawBenef = [];

/* ─── sanitize: buang Date object / timestamp ─── */
function sanitizeStr(val) {
  if (!val) return '';
  if (typeof val === 'object') return '';
  var s = String(val).trim();
  if (s.match(/^\w{3}\s+\w{3}\s+\d{2}\s+\d{4}/) || s.match(/^\d{4}-\d{2}-\d{2}T/)) return '';
  return s;
}

/* ─── normText: Title Case + collapse whitespace ───
   "dewasa" → "Dewasa"  |  "ANAK anak" → "Anak Anak"
   Dipakai untuk kategori, usia, disabilitas, kegiatan, benefit, program
─── */
function normText(val) {
  var s = sanitizeStr(val);
  if (!s) return '';
  return s.replace(/\s+/g, ' ')
    .replace(/\S+/g, function(w) {
      // Pertahankan singkatan ALL-CAPS pendek: NLR, JPM, VCA, dll
      if (w.length <= 4 && w === w.toUpperCase() && /^[A-Z]+$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });
}

/* ─── normPlace: sama seperti normText, untuk kab/kec/desa ─── */
function normPlace(val) { return normText(val); }

/* ─── normStaf: Title Case nama staf ─── */
function normStaf(val) {
  var s = sanitizeStr(val);
  if (!s) return '';
  return s.replace(/\s+/g, ' ')
    .replace(/\S+/g, function(w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });
}

/* ─── fetch ─── */
async function fetchRawData(force) {
  force = force || false;
  if (!force) {
    try {
      var ttl = parseInt(sessionStorage.getItem(CACHE_KEY_TTL) || '0');
      if (Date.now() < ttl) {
        var cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          var dc = JSON.parse(cached);
          window.rawPjum  = dc.pjum  || [];
          window.rawBenef = dc.benef || [];
          return { fromCache: true };
        }
      }
    } catch(e) {}
  }

  var r = await fetch(GAS_URL + '?action=getRawRows', { redirect: 'follow' });
  var d = await r.json();

  /* ── Sanitize & normalize PJUM ── */
  var pjum = d.pjum || [];
  pjum.forEach(function(row) {
    row[window.P.kode]     = sanitizeStr(row[window.P.kode]);
    row[window.P.proyek]   = normText(row[window.P.proyek]);
    row[window.P.staf]     = normStaf(row[window.P.staf]);
    row[window.P.kegiatan] = normText(row[window.P.kegiatan]);
    row[window.P.item]     = sanitizeStr(row[window.P.item]);
    row[window.P.file]     = sanitizeStr(row[window.P.file]);
    if (row[window.P.tgl] && typeof row[window.P.tgl] === 'object') row[window.P.tgl] = '';
  });

  /* ── Sanitize & normalize BENEF ── */
  var benef = (d.benef || []).filter(function(row) {
    return row[window.B.nama] && String(row[window.B.nama]).trim() !== '';
  });
  benef.forEach(function(row) {
    // Normalize categorical / geographic fields (Title Case → deduplicate)
    row[window.B.desa]     = normPlace(row[window.B.desa]);
    row[window.B.kec]      = normPlace(row[window.B.kec]);
    row[window.B.kab]      = normPlace(row[window.B.kab]);
    row[window.B.kategori] = normText(row[window.B.kategori]);
    row[window.B.katUsia]  = normText(row[window.B.katUsia]);
    row[window.B.usia]     = normText(row[window.B.usia]);
    row[window.B.disab]    = normText(row[window.B.disab]);
    row[window.B.kegiatan] = normText(row[window.B.kegiatan]);
    row[window.B.benefit]  = normText(row[window.B.benefit]);
    row[window.B.proyek]   = normText(row[window.B.proyek]);
    row[window.B.staf]     = normStaf(row[window.B.staf]);
    row[window.B.kode]     = sanitizeStr(row[window.B.kode]);
    row[window.B.instansi] = normText(row[window.B.instansi]);
    row[window.B.paroki]   = normText(row[window.B.paroki]);
    row[window.B.nama]     = normStaf(row[window.B.nama]);
    if (row[window.B.tgl] && typeof row[window.B.tgl] === 'object') row[window.B.tgl] = '';
    // Gender
    var g = String(row[window.B.gender] || '').trim().toLowerCase();
    if (g === 'l' || g.startsWith('lak')) row[window.B.gender] = 'L';
    else if (g === 'p' || g.startsWith('per')) row[window.B.gender] = 'P';
    else row[window.B.gender] = '—';
  });

  window.rawPjum  = pjum;
  window.rawBenef = benef;

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ pjum: pjum, benef: benef }));
    sessionStorage.setItem(CACHE_KEY_TTL, String(Date.now() + CACHE_TTL_MS));
  } catch(e) {}

  return { fromCache: false };
}

/* ── helpers ── */
window.fmt = function(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); };
window.fmtShort = function(n) {
  if (n >= 1e9) return 'Rp ' + (n/1e9).toFixed(2) + ' M';
  if (n >= 1e6) return 'Rp ' + (n/1e6).toFixed(1) + ' jt';
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
    var k = keyFn(r);
    if (!k || k === '—' || k === '') return;
    m[k] = (m[k] || 0) + (valFn ? (parseFloat(valFn(r)) || 0) : 1);
  });
  return m;
};
window.groupCount = function(arr, keyFn) { return window.groupSum(arr, keyFn, null); };
window.topN = function(obj, n) {
  n = n || 10;
  return Object.entries(obj).sort(function(a,b){ return b[1]-a[1]; }).slice(0, n);
};
window.sortedBulan = function(obj) {
  return Object.entries(obj).sort(function(a,b){ return a[0].localeCompare(b[0]); });
};
window.uniqArr = function(arr) {
  return Array.from(new Set(
    arr.filter(function(x){ return x && String(x).trim() && x !== '—'; })
       .map(function(s){ return String(s).trim(); })
  )).sort();
};
window.classifyItem = function(item) {
  var k = (item || '').toLowerCase();
  if (k.indexOf('konsumsi') > -1 || k.indexOf('makan') > -1 || k.indexOf('snack') > -1) return 'Konsumsi';
  if (k.indexOf('narasumber') > -1 || k.indexOf('fasilitator') > -1) return 'Fee Narasumber';
  if (k.indexOf('transport') > -1 || k.indexOf('perjalanan') > -1 || k.indexOf('ojek') > -1 || k.indexOf('bensin') > -1) return 'Transport';
  if (k.indexOf('kendaraan') > -1 || k.indexOf('sewa') > -1 || k.indexOf('bbm') > -1) return 'Kendaraan/BBM';
  if (k.indexOf('atk') > -1 || k.indexOf('alat tulis') > -1 || k.indexOf('kertas') > -1) return 'ATK';
  if (k.indexOf('gaji') > -1 || k.indexOf('honor') > -1 || k.indexOf('insentif') > -1) return 'Gaji/Honor';
  if (k.indexOf('akomodasi') > -1 || k.indexOf('hotel') > -1) return 'Akomodasi';
  if (k.indexOf('dokumentasi') > -1 || k.indexOf('foto') > -1 || k.indexOf('cetak') > -1 || k.indexOf('banner') > -1) return 'Dok/Cetak';
  if (k.indexOf('komunikasi') > -1 || k.indexOf('pulsa') > -1 || k.indexOf('internet') > -1) return 'Komunikasi';
  return 'Lainnya';
};
