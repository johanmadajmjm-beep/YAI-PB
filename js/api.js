/* ═══════════════════════════════════════════════
   api.js — Data layer YAI Dashboard v5
═══════════════════════════════════════════════ */

var GAS_URL       = 'https://script.google.com/macros/s/AKfycbz7fjIFALDAbVo2TGEUi0j-RwLqZk7KxcUyU2rdNAiTHcEsAMD2i0O0g4-biV41Nw-hew/exec';
var CACHE_KEY     = 'yai_raw_v8';
var CACHE_KEY_TTL = 'yai_raw_ttl_v8';
var CACHE_TTL_MS  = 10 * 60 * 1000;

window.P = { tgl:0, staf:1, proyek:2, kode:3, kegiatan:4, item:5, jumlah:6, file:7 };
window.B = {
  nama:0, gender:1, kategori:2, usia:3, desa:4, kec:5,
  kegiatan:6, staf:7, tgl:8, proyek:9, kab:10,
  instansi:11,  /* v4.7 TERVERIFIKASI: kolom 11 = "Instansi/Lembaga" (benar).
                   Data kabupaten yang dulu tampak di sini berasal dari fallback
                   ||g('kab') di GAS getRawRows — sudah dicabut (Code_Uploader.gs PATCH v2).
                   Catatan: B.lembaga (20) = kolom "Lembaga Mitra", bukan instansi. */
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

/* ─── normProgram: preserve format tapi lowercase-konsisten untuk matching
   "AYO - JPM" dan "Ayo - JPM" keduanya → "Ayo - JPM"
   Aturan: token setelah "-" tetap uppercase jika semua kapital (singkatan)
─── */
function normProgram(val) {
  var s = sanitizeStr(val);
  if (!s) return '';
  // Ganti multiple spaces
  s = s.replace(/\s+/g, ' ').trim();
  // Split by " - " untuk handle "Ayo - JPM"
  var parts = s.split(/\s*-\s*/);
  return parts.map(function(part, i) {
    // Cek apakah part ini adalah singkatan (semua huruf kapital, no space)
    var words = part.trim().split(/\s+/);
    return words.map(function(w) {
      if (!w) return w;
      // Pertahankan singkatan ALL-CAPS (NLR, JPM, VCA, MPIG, dll) — max 6 char
      if (w.length <= 6 && w === w.toUpperCase() && /^[A-Z0-9]+$/.test(w)) return w;
      // Pertahankan jika ada angka mixed
      if (/\d/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');
  }).join(' - ');
}

/* ─── ALIAS STAF: DINONAKTIFKAN (v4.5) ───
   Nama staf & program sudah dibersihkan langsung di GSheet oleh admin,
   sehingga penggabungan nama di sisi dashboard tidak diperlukan lagi.
   normStaf kini murni Title Case (pengaman format saja). ─── */
var STAF_ALIAS_API = {};

/* ─── normStaf: Title Case + alias resolution ─── */
function normStaf(val) {
  var s = sanitizeStr(val);
  if (!s) return '';
  // Title Case dulu
  var titled = s.replace(/\s+/g, ' ').trim()
    .replace(/\S+/g, function(w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });
  // Cek alias berdasarkan lowercase
  var key = titled.trim().toLowerCase();
  return STAF_ALIAS_API[key] || titled;
}

/* ─── parseJumlah: parser angka rupiah yang tahan format (v4.5) ───
   Menangani: angka murni, "1500000", "1.500.000" (ID), "1,500,000" (EN),
   "Rp 500.000", "500.000,50". Nilai tak terbaca → 0.
─── */
window.parseJumlah = function(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (v == null) return 0;
  var s = String(v).trim();
  if (!s || !/\d/.test(s)) return 0;
  s = s.replace(/rp/gi, '').replace(/\s+/g, '').replace(/[^0-9.,-]/g, '');
  var neg = s.charAt(0) === '-';
  s = s.replace(/-/g, '');
  var hasDot = s.indexOf('.') > -1, hasComma = s.indexOf(',') > -1;
  if (hasDot && hasComma) {
    /* pemisah paling kanan dianggap desimal */
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComma) {
    var pc = s.split(',');
    if (pc.length === 2 && pc[1].length <= 2) s = pc[0] + '.' + pc[1]; /* desimal ID: 1500,50 */
    else s = s.replace(/,/g, '');                                       /* ribuan EN: 1,500,000 */
  } else if (hasDot) {
    var pd = s.split('.');
    var polaRibuan = pd.every(function(p, i) { return i === 0 ? (p.length >= 1 && p.length <= 3) : p.length === 3; });
    if (pd.length === 2 && pd[1].length <= 2 && pd[0].length <= 3 && pd[1].length !== 3) {
      /* 1.5 / 12.75 → desimal */
    } else if (polaRibuan) {
      s = s.replace(/\./g, '');   /* 1.500.000 / 500.000 → ribuan ID */
    } else if (pd.length === 2) {
      /* 1234.56 → desimal EN, biarkan */
    } else {
      s = s.replace(/\./g, '');
    }
  }
  var n = parseFloat(s);
  return isFinite(n) ? (neg ? -n : n) : 0;
};

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
    row[window.P.proyek]   = normProgram(row[window.P.proyek]);
    row[window.P.staf]     = normStaf(row[window.P.staf]);
    row[window.P.kegiatan] = normText(row[window.P.kegiatan]);
    row[window.P.item]     = sanitizeStr(row[window.P.item]);
    row[window.P.file]     = sanitizeStr(row[window.P.file]);
    row[window.P.jumlah]   = window.parseJumlah(row[window.P.jumlah]);
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
    row[window.B.proyek]   = normProgram(row[window.B.proyek]);
    row[window.B.staf]     = normStaf(row[window.B.staf]);
    row[window.B.kode]     = sanitizeStr(row[window.B.kode]);
    row[window.B.instansi] = normText(row[window.B.instansi]);
    row[window.B.lembaga]  = normText(row[window.B.lembaga]);
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
window.fmt = function(n) { return 'Rp ' + Math.round(Number(n)||0).toLocaleString('id-ID'); };
window.fmtShort = function(n) {
  n = Number(n) || 0;
  if (n >= 1e9) return 'Rp ' + (n/1e9).toFixed(2).replace('.', ',') + ' M';
  if (n >= 1e6) return 'Rp ' + (n/1e6).toFixed(1).replace('.', ',') + ' jt';
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
};
window.bulanName = function(m) {
  return ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][parseInt(m)-1] || m;
};
window.bulanFull = function(m) {
  return ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(m)-1] || m;
};
/* validTgl: kembalikan yyyy-MM atau null */
window.validTgl = function(tgl) {
  if (!tgl) return null;
  var s = String(tgl).trim();
  // Format valid: "2023-04" atau "2023-04-15"
  if (!s.match(/^\d{4}-\d{2}/)) return null;
  var parts = s.slice(0,7).split('-');
  var y = parseInt(parts[0]);
  var m = parseInt(parts[1]);
  if (y < 2015 || y > 2030) return null;
  if (m < 1 || m > 12) return null;
  return s.slice(0,7);
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
  if (k.indexOf('transport') > -1 || k.indexOf('perjalanan') > -1 || k.indexOf('ojek') > -1 || k.indexOf('bensin') > -1 || k.indexOf('bbm') > -1 || k.indexOf('kendaraan') > -1) return 'Transport';
  if (k.indexOf('sewa') > -1) return 'Sewa Alat/Tempat';
  if (k.indexOf('atk') > -1 || k.indexOf('alat tulis') > -1 || k.indexOf('kertas') > -1) return 'ATK';
  if (k.indexOf('gaji') > -1 || k.indexOf('honor') > -1 || k.indexOf('insentif') > -1) return 'Gaji/Honor';
  if (k.indexOf('akomodasi') > -1 || k.indexOf('hotel') > -1 || k.indexOf('penginapan') > -1) return 'Akomodasi';
  if (k.indexOf('dokumentasi') > -1 || k.indexOf('foto') > -1 || k.indexOf('cetak') > -1 || k.indexOf('banner') > -1 || k.indexOf('spanduk') > -1) return 'Dok/Cetak';
  if (k.indexOf('komunikasi') > -1 || k.indexOf('pulsa') > -1 || k.indexOf('internet') > -1) return 'Komunikasi';
  return 'Lainnya';
};


/* ═══════════════════════════════════════════════
   debugMapping() — verifikasi mapping kolom vs isi sheet (v4.6)
   Cara pakai: buka dashboard → F12 → Console → ketik: debugMapping()
   Cocokkan kolom "contoh" dengan header GSheet. Jika ada label yang
   tidak sesuai isinya, index di window.B / window.P perlu dikoreksi.
═══════════════════════════════════════════════ */
window.debugMapping = function() {
  function sample(rows, idx) {
    var out = [];
    for (var i = 0; i < rows.length && out.length < 3; i++) {
      var v = rows[i][idx];
      if (v !== undefined && v !== null && String(v).trim() !== '') out.push(String(v).slice(0, 40));
    }
    return out.join(' | ') || '(kosong di semua baris)';
  }
  console.log('%c=== MAPPING BENEF (window.B) — ' + window.rawBenef.length + ' baris ===', 'font-weight:bold;color:#F97316');
  console.table(Object.keys(window.B).map(function(k) {
    return { field: k, index: window.B[k], contoh: sample(window.rawBenef, window.B[k]) };
  }));
  console.log('%c=== MAPPING PJUM (window.P) — ' + window.rawPjum.length + ' baris ===', 'font-weight:bold;color:#4F8EF7');
  console.table(Object.keys(window.P).map(function(k) {
    return { field: k, index: window.P[k], contoh: sample(window.rawPjum, window.P[k]) };
  }));
  console.log('Cocokkan setiap baris "contoh" dengan header kolom di GSheet. Terverifikasi 23/07/2026: paroki (16) OK, instansi (11) OK setelah PATCH v2 GAS. lembaga (20) = Lembaga Mitra.');
};
