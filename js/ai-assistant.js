/* ═══════════════════════════════════════════════════════════════
   ai-assistant.js — Asisten YAI-PB v2.0 | Function Calling Edition
   Build: 2026-08-05

   Arsitektur:
   • Claude (claude-sonnet-4-6) = reasoning layer — memahami pertanyaan,
     memilih tool, menyusun jawaban natural
   • Tool functions = data layer — query langsung ke rawBenef / rawPjum
     yang sudah ada di memory browser (sudah bersih & ternormalisasi oleh api.js)
   • GAS tidak dipanggil — data sudah ada, tidak perlu round-trip HTTP

   Mengapa tidak kirim data ke AI:
   • rawBenef bisa 30.000+ baris → context overflow → halusinasi
   • Tool approach: AI hanya menerima hasil agregasi yang spesifik dan akurat
═══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════
   KONFIGURASI
══════════════════════════════════════════════════ */
/* API key Claude diambil dari GAS (tidak diekspos di browser).
   Endpoint ini hanya meneruskan request ke Anthropic dan mengembalikan respons.
   Ganti dengan deployment GAS Anda. */
var AI_PROXY_URL = window.GAS_URL || '';  /* Reuse GAS_URL dari api.js */
var AI_MODEL     = 'claude-sonnet-4-6';
var AI_MAX_TOKENS = 1024;

/* ══════════════════════════════════════════════════
   1. TOOL DEFINITIONS
   Dikirim ke Claude API agar Claude bisa memilih fungsi yang tepat.
   Setiap tool.name harus sama persis dengan kunci di TOOL_EXECUTORS di bawah.
══════════════════════════════════════════════════ */
var YAI_TOOLS = [

  /* ── BENEF ──────────────────────────────────────── */
  {
    name: 'getBenefCount',
    description: 'Hitung jumlah benefisiari (penerima manfaat) unik. ' +
      'Gunakan saat user bertanya "berapa jumlah", "berapa total", "berapa banyak" benef. ' +
      'Unik berarti satu orang yang ikut banyak kegiatan tetap dihitung 1. ' +
      'Semua parameter opsional — kosongkan yang tidak disebutkan user.',
    input_schema: {
      type: 'object',
      properties: {
        kecamatan:  { type: 'string', description: 'Nama kecamatan (sebagian nama boleh). Null = semua.' },
        desa:       { type: 'string', description: 'Nama desa (sebagian nama boleh). Null = semua.' },
        staf:       { type: 'string', description: 'Nama staf/CBR Worker (sebagian nama boleh). Null = semua.' },
        proyek:     { type: 'string', description: 'Nama program/proyek. Null = semua.' },
        bulan:      { type: 'integer', description: 'Bulan 1-12. Null = semua bulan.' },
        tahun:      { type: 'integer', description: 'Tahun misal 2026. Null = semua tahun.' },
        gender:     { type: 'string', enum: ['L', 'P'], description: 'Filter gender. Null = semua.' },
        kategori:   { type: 'string', description: 'Kategori benef (anak/dewasa/dll). Null = semua.' },
        disabilitas:{ type: 'string', description: 'Jenis disabilitas. Null = semua.' }
      },
      required: []
    }
  },

  {
    name: 'getBenefByWilayah',
    description: 'Hitung benef unik dikelompokkan per desa atau per kecamatan. ' +
      'Gunakan saat user bertanya "desa mana yang terbanyak/tertinggi", ' +
      '"ranking wilayah", "perbandingan antar desa/kecamatan", atau meminta daftar wilayah beserta jumlahnya.',
    input_schema: {
      type: 'object',
      properties: {
        group_by: { type: 'string', enum: ['desa', 'kecamatan'], description: 'Level pengelompokan.' },
        bulan:    { type: 'integer', description: 'Filter bulan. Null = semua.' },
        tahun:    { type: 'integer', description: 'Filter tahun. Null = semua.' },
        staf:     { type: 'string',  description: 'Filter nama staf. Null = semua.' },
        top_n:    { type: 'integer', description: 'Ambil N teratas saja. Null = semua wilayah.' }
      },
      required: ['group_by']
    }
  },

  {
    name: 'getBenefTrend',
    description: 'Bandingkan jumlah benef antara dua periode (bulan/tahun). ' +
      'Gunakan saat user minta perbandingan, tren, atau selisih antar waktu. ' +
      'Contoh: "bandingkan bulan ini dengan bulan lalu", "naik atau turun?".',
    input_schema: {
      type: 'object',
      properties: {
        bulan_awal:  { type: 'integer' },
        tahun_awal:  { type: 'integer' },
        bulan_akhir: { type: 'integer' },
        tahun_akhir: { type: 'integer' },
        kecamatan:   { type: 'string', description: 'Filter kecamatan. Null = semua.' },
        staf:        { type: 'string', description: 'Filter staf. Null = semua.' }
      },
      required: ['bulan_awal', 'tahun_awal', 'bulan_akhir', 'tahun_akhir']
    }
  },

  /* ── PJUM ──────────────────────────────────────── */
  {
    name: 'getPJUMSummary',
    description: 'Ringkasan anggaran PJUM: total realisasi, jumlah transaksi, realisasi per benef. ' +
      'Gunakan untuk pertanyaan umum tentang biaya, anggaran, atau pengeluaran.',
    input_schema: {
      type: 'object',
      properties: {
        staf:      { type: 'string',  description: 'Filter nama staf. Null = semua.' },
        kecamatan: { type: 'string',  description: 'Filter kecamatan. Null = semua.' },
        proyek:    { type: 'string',  description: 'Filter program. Null = semua.' },
        bulan:     { type: 'integer', description: 'Filter bulan. Null = semua.' },
        tahun:     { type: 'integer', description: 'Filter tahun. Null = semua.' }
      },
      required: []
    }
  },

  {
    name: 'getKegiatanByStaf',
    description: 'Daftar kegiatan yang dilakukan oleh staf tertentu, beserta anggaran. ' +
      'Gunakan saat user menyebut nama orang dan bertanya tentang kegiatan, ' +
      'aktivitas, atau anggaran mereka. ' +
      'Contoh: "Johan melakukan kegiatan apa?", "berapa anggaran yang dipakai Eni?".',
    input_schema: {
      type: 'object',
      properties: {
        staf:      { type: 'string',  description: 'Nama staf (sebagian nama boleh, wajib diisi).' },
        bulan:     { type: 'integer', description: 'Filter bulan. Null = semua.' },
        tahun:     { type: 'integer', description: 'Filter tahun. Null = semua.' },
        kecamatan: { type: 'string',  description: 'Filter kecamatan. Null = semua.' }
      },
      required: ['staf']
    }
  },

  {
    name: 'getAnggaranByKategori',
    description: 'Rincian penggunaan anggaran PJUM dikelompokkan per kategori biaya ' +
      '(Transport, Konsumsi, ATK, Fee Narasumber, dll). ' +
      'Gunakan untuk pertanyaan tentang komposisi atau rincian pengeluaran.',
    input_schema: {
      type: 'object',
      properties: {
        staf:  { type: 'string',  description: 'Filter nama staf. Null = semua.' },
        bulan: { type: 'integer', description: 'Filter bulan. Null = semua.' },
        tahun: { type: 'integer', description: 'Filter tahun. Null = semua.' }
      },
      required: []
    }
  },

  /* ── META / KELENGKAPAN ──────────────────────────── */
  {
    name: 'checkKelengkapanData',
    description: 'Periksa staf mana yang sudah/belum mengirim data PJUM atau Benef untuk periode tertentu. ' +
      'Gunakan saat user bertanya "siapa yang belum upload?", "data mana yang belum masuk?", ' +
      '"apakah ada laporan yang kurang?".',
    input_schema: {
      type: 'object',
      properties: {
        dataset: { type: 'string', enum: ['PJUM', 'Benef', 'semua'], description: 'Dataset yang dicek.' },
        bulan:   { type: 'integer', description: 'Bulan yang dicek. Null = semua bulan.' },
        tahun:   { type: 'integer', description: 'Tahun yang dicek. Null = semua tahun.' }
      },
      required: ['dataset']
    }
  },

  {
    name: 'getListStaf',
    description: 'Ambil daftar semua nama staf yang ada dalam sistem. ' +
      'Gunakan saat user bertanya "siapa saja stafnya?", atau saat nama yang disebut user ' +
      'tidak jelas dan perlu dikonfirmasi.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },

  {
    name: 'getBenefProfile',
    description: 'Cari profil atau data satu orang benef berdasarkan nama. ' +
      'Gunakan saat user menyebut nama spesifik dan bertanya tentang data orang tersebut.',
    input_schema: {
      type: 'object',
      properties: {
        nama: { type: 'string', description: 'Nama benef (sebagian nama boleh).' }
      },
      required: ['nama']
    }
  }
];

/* ══════════════════════════════════════════════════
   2. TOOL EXECUTORS
   Fungsi-fungsi yang dijalankan di browser menggunakan
   rawBenef / rawPjum yang sudah ada di window.
   Tidak ada HTTP request — semua kalkulasi lokal.
══════════════════════════════════════════════════ */

/* Helper: filter rawBenef/rawPjum berdasarkan parameter teks (partial match, case-insensitive) */
function matchStr(rowVal, filter) {
  if (!filter) return true;
  return String(rowVal || '').toLowerCase().indexOf(filter.toLowerCase()) > -1;
}

/* Helper: filter berdasarkan bulan dan tahun dari field tgl "yyyy-MM" */
function matchPeriod(row, fieldIndex, bulan, tahun) {
  if (!bulan && !tahun) return true;
  var tgl = window.validTgl(row[fieldIndex]);
  if (!tgl) return false;
  if (tahun && parseInt(tgl.slice(0, 4)) !== tahun) return false;
  if (bulan && parseInt(tgl.slice(5, 7)) !== bulan) return false;
  return true;
}

/* Helper: format rupiah */
function rp(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }

/* ──────────────────────────────────────────────── */
var TOOL_EXECUTORS = {

  getBenefCount: function(p) {
    var B = window.B;
    var filtered = window.rawBenef.filter(function(r) {
      return matchStr(r[B.kec],     p.kecamatan)
          && matchStr(r[B.desa],    p.desa)
          && matchStr(r[B.staf],    p.staf)
          && matchStr(r[B.proyek],  p.proyek)
          && matchStr(r[B.kategori],p.kategori)
          && matchStr(r[B.disab],   p.disabilitas)
          && (!p.gender || r[B.gender] === p.gender)
          && matchPeriod(r, B.tgl, p.bulan, p.tahun);
    });
    var uniq = window.countUniqBenef(filtered);
    var laki = window.countUniqByGender(filtered, 'L');
    var perempuan = window.countUniqByGender(filtered, 'P');
    return {
      total_records: filtered.length,
      benef_unik: uniq,
      laki_laki: laki,
      perempuan: perempuan,
      parameter: p
    };
  },

  getBenefByWilayah: function(p) {
    var B = window.B;
    var filtered = window.rawBenef.filter(function(r) {
      return matchStr(r[B.staf], p.staf)
          && matchPeriod(r, B.tgl, p.bulan, p.tahun);
    });
    var keyFn = p.group_by === 'desa'
      ? function(r) { return String(r[B.desa] || '').trim(); }
      : function(r) { return String(r[B.kec]  || '').trim(); };
    var grouped = window.groupCountUniq(filtered, keyFn);
    var sorted = Object.entries(grouped)
      .filter(function(e) { return e[0] && e[0] !== '—'; })
      .sort(function(a, b) { return b[1] - a[1]; });
    if (p.top_n) sorted = sorted.slice(0, p.top_n);
    return {
      group_by: p.group_by,
      total_wilayah: sorted.length,
      data: sorted.map(function(e) { return { wilayah: e[0], benef_unik: e[1] }; }),
      parameter: p
    };
  },

  getBenefTrend: function(p) {
    var B = window.B;
    function countPeriod(bln, thn) {
      var rows = window.rawBenef.filter(function(r) {
        return matchStr(r[B.kec], p.kecamatan)
            && matchStr(r[B.staf], p.staf)
            && matchPeriod(r, B.tgl, bln, thn);
      });
      return { records: rows.length, unik: window.countUniqBenef(rows) };
    }
    var awal  = countPeriod(p.bulan_awal,  p.tahun_awal);
    var akhir = countPeriod(p.bulan_akhir, p.tahun_akhir);
    var selisih = akhir.unik - awal.unik;
    var persen  = awal.unik > 0
      ? ((selisih / awal.unik) * 100).toFixed(1) + '%'
      : 'N/A';
    return {
      periode_awal:  { label: p.tahun_awal  + '-' + String(p.bulan_awal).padStart(2,'0'),  benef_unik: awal.unik },
      periode_akhir: { label: p.tahun_akhir + '-' + String(p.bulan_akhir).padStart(2,'0'), benef_unik: akhir.unik },
      selisih: selisih,
      persentase_perubahan: persen,
      arah: selisih > 0 ? 'naik' : selisih < 0 ? 'turun' : 'sama',
      parameter: p
    };
  },

  getPJUMSummary: function(p) {
    var P = window.P;
    var filtered = window.rawPjum.filter(function(r) {
      return matchStr(r[P.staf],    p.staf)
          && matchStr(r[P.proyek],  p.proyek)
          && matchPeriod(r, P.tgl, p.bulan, p.tahun);
    });
    /* filter kecamatan dari benef rows yang sesuai staf/periode jika diminta */
    var totalRealisasi = filtered.reduce(function(s, r) {
      return s + (parseFloat(r[P.jumlah]) || 0);
    }, 0);
    var stafSet = {};
    filtered.forEach(function(r) {
      var s = String(r[P.staf] || '').trim();
      if (s) {
        if (!stafSet[s]) stafSet[s] = { trx: 0, total: 0 };
        stafSet[s].trx++;
        stafSet[s].total += (parseFloat(r[P.jumlah]) || 0);
      }
    });
    var perStaf = Object.entries(stafSet).map(function(e) {
      return { staf: e[0], trx: e[1].trx, total: rp(e[1].total) };
    }).sort(function(a, b) { return b.trx - a.trx; });
    return {
      total_transaksi: filtered.length,
      total_realisasi: rp(totalRealisasi),
      total_realisasi_angka: totalRealisasi,
      jumlah_staf: perStaf.length,
      per_staf: perStaf,
      parameter: p
    };
  },

  getKegiatanByStaf: function(p) {
    var P = window.P;
    var B = window.B;
    var filtered = window.rawPjum.filter(function(r) {
      return matchStr(r[P.staf], p.staf)
          && matchPeriod(r, P.tgl, p.bulan, p.tahun);
    });
    /* Group by kegiatan */
    var kegMap = {};
    filtered.forEach(function(r) {
      var k = String(r[P.kegiatan] || 'Tidak tercatat').trim();
      if (!kegMap[k]) kegMap[k] = { trx: 0, total: 0, tanggal_list: [] };
      kegMap[k].trx++;
      kegMap[k].total += (parseFloat(r[P.jumlah]) || 0);
      var tgl = window.validTgl(r[P.tgl]);
      if (tgl && kegMap[k].tanggal_list.indexOf(tgl) < 0)
        kegMap[k].tanggal_list.push(tgl);
    });
    var kegiatan = Object.entries(kegMap).map(function(e) {
      return {
        kegiatan: e[0],
        jumlah_transaksi: e[1].trx,
        total_anggaran: rp(e[1].total),
        periode: e[1].tanggal_list.sort().join(', ')
      };
    }).sort(function(a, b) { return b.jumlah_transaksi - a.jumlah_transaksi; });

    /* Benef yang didampingi staf ini di periode sama */
    var benefRows = window.rawBenef.filter(function(r) {
      return matchStr(r[B.staf], p.staf)
          && matchPeriod(r, B.tgl, p.bulan, p.tahun);
    });
    var totalAnggaran = filtered.reduce(function(s, r) {
      return s + (parseFloat(r[P.jumlah]) || 0);
    }, 0);

    return {
      staf_query: p.staf,
      total_transaksi_pjum: filtered.length,
      total_anggaran: rp(totalAnggaran),
      jumlah_benef_didampingi: window.countUniqBenef(benefRows),
      daftar_kegiatan: kegiatan,
      parameter: p
    };
  },

  getAnggaranByKategori: function(p) {
    var P = window.P;
    var filtered = window.rawPjum.filter(function(r) {
      return matchStr(r[P.staf], p.staf)
          && matchPeriod(r, P.tgl, p.bulan, p.tahun);
    });
    var byKat = {};
    filtered.forEach(function(r) {
      var kat = window.classifyItem ? window.classifyItem(r[P.item]) : (r[P.item] || 'Lainnya');
      if (!byKat[kat]) byKat[kat] = 0;
      byKat[kat] += (parseFloat(r[P.jumlah]) || 0);
    });
    var total = filtered.reduce(function(s, r) { return s + (parseFloat(r[P.jumlah]) || 0); }, 0);
    var sorted = Object.entries(byKat).sort(function(a, b) { return b[1] - a[1]; });
    return {
      total_realisasi: rp(total),
      per_kategori: sorted.map(function(e) {
        return {
          kategori: e[0],
          jumlah: rp(e[1]),
          persen: total > 0 ? (e[1] / total * 100).toFixed(1) + '%' : '0%'
        };
      }),
      parameter: p
    };
  },

  checkKelengkapanData: function(p) {
    var P = window.P, B = window.B;
    var daftarStaf = window.CANONICAL_STAF || [];

    function cekDataset(dataset) {
      var rows = dataset === 'PJUM' ? window.rawPjum : window.rawBenef;
      var stafField = dataset === 'PJUM' ? P.staf : B.staf;
      var tglField  = dataset === 'PJUM' ? P.tgl  : B.tgl;
      var filtered  = rows.filter(function(r) {
        return matchPeriod(r, tglField, p.bulan, p.tahun);
      });
      var sudahSet = {};
      filtered.forEach(function(r) {
        var s = String(r[stafField] || '').trim();
        if (s) sudahSet[s] = 1;
      });
      var sudah  = Object.keys(sudahSet);
      var belum  = daftarStaf.filter(function(s) { return !sudahSet[s]; });
      return { dataset: dataset, sudah_upload: sudah, belum_upload: belum };
    }

    var hasil = [];
    if (p.dataset === 'PJUM' || p.dataset === 'semua') hasil.push(cekDataset('PJUM'));
    if (p.dataset === 'Benef' || p.dataset === 'semua') hasil.push(cekDataset('Benef'));
    return {
      periode: { bulan: p.bulan || 'semua', tahun: p.tahun || 'semua' },
      total_staf_canonical: daftarStaf.length,
      hasil: hasil,
      parameter: p
    };
  },

  getListStaf: function() {
    var B = window.B;
    var canonical = window.CANONICAL_STAF || [];
    var dariData  = window.uniqArr(window.rawBenef.map(function(r) { return r[B.staf]; }));
    return {
      staf_canonical: canonical,
      staf_dari_data: dariData,
      total: canonical.length
    };
  },

  getBenefProfile: function(p) {
    var B = window.B;
    var matches = window.rawBenef.filter(function(r) {
      return matchStr(r[B.nama], p.nama);
    });
    if (matches.length === 0) return { ditemukan: false, nama_query: p.nama };
    /* Ambil data unik per orang (kode/nama+desa) */
    var orangSet = {};
    matches.forEach(function(r) {
      var key = window.benefKey(r);
      if (!orangSet[key]) {
        orangSet[key] = {
          nama:       r[B.nama],
          gender:     r[B.gender],
          kategori:   r[B.kategori],
          usia:       r[B.usia],
          disabilitas:r[B.disab],
          desa:       r[B.desa],
          kecamatan:  r[B.kec],
          staf:       r[B.staf],
          program:    r[B.proyek],
          kegiatan_list: []
        };
      }
      var keg = String(r[B.kegiatan] || '').trim();
      if (keg && orangSet[key].kegiatan_list.indexOf(keg) < 0)
        orangSet[key].kegiatan_list.push(keg);
    });
    var profil = Object.values(orangSet);
    return {
      ditemukan: true,
      nama_query: p.nama,
      jumlah_orang_ditemukan: profil.length,
      profil: profil.slice(0, 5)  /* Batasi 5 hasil agar tidak terlalu panjang */
    };
  }

};

/* ══════════════════════════════════════════════════
   3. TOOL EXECUTOR — jalankan tool yang dipilih Claude
══════════════════════════════════════════════════ */
function executeTool(toolName, toolInput) {
  var executor = TOOL_EXECUTORS[toolName];
  if (!executor) {
    return { error: 'Tool tidak dikenal: ' + toolName };
  }
  try {
    return executor(toolInput || {});
  } catch (err) {
    return { error: 'Error saat menjalankan ' + toolName + ': ' + err.message };
  }
}

/* ══════════════════════════════════════════════════
   4. CLAUDE API CALL — via GAS proxy
   GAS proxy meneruskan request ke Anthropic API
   sehingga API key tidak terekspos di browser.

   GAS perlu menangani action=aiProxy dengan body:
   { model, max_tokens, system, tools, messages }
   dan mengembalikan response Anthropic API apa adanya.
══════════════════════════════════════════════════ */
var AI_SYSTEM_PROMPT = [
  'Kamu adalah Asisten AI untuk Dashboard YAI-PB (Yayasan Ayo Indonesia — Program BEN).',
  'Tugasmu membantu koordinator dan staf memahami data program.',
  '',
  'ATURAN WAJIB:',
  '1. Jangan pernah mengarang atau menebak angka. Semua data HARUS dari hasil tool.',
  '2. Jika pertanyaan menyangkut data (jumlah, nama, anggaran, wilayah) — SELALU panggil tool dulu.',
  '3. Jika hasil tool kosong, sampaikan bahwa data tidak ditemukan untuk filter tersebut.',
  '4. Gunakan Bahasa Indonesia yang ramah, jelas, dan profesional.',
  '5. Format jawaban dengan ringkas. Gunakan poin jika ada banyak item.',
  '6. Untuk pertanyaan umum atau konseptual (bukan data), jawab langsung tanpa tool.',
  '',
  'Konteks domain:',
  '- Benef = penerima manfaat (anak/orang muda dengan disabilitas)',
  '- PJUM = laporan pertanggungjawaban keuangan per staf',
  '- CBR Worker = petugas lapangan yang mendampingi benef di desa',
  '- Program aktif: BEN, MPIG, NLR, dan program lain di YAI'
].join('\n');

async function callClaudeWithTools(userMessage, chatHistory) {
  /* Susun messages: history + pesan baru */
  var messages = [];
  chatHistory.slice(-8).forEach(function(msg) {    /* max 8 pesan history */
    messages.push({ role: msg.role, content: msg.content });
  });
  messages.push({ role: 'user', content: userMessage });

  /* === Putaran 1: Claude memilih tool atau langsung jawab === */
  var resp1 = await callProxy({
    model: AI_MODEL,
    max_tokens: AI_MAX_TOKENS,
    system: AI_SYSTEM_PROMPT,
    tools: YAI_TOOLS,
    messages: messages
  });

  /* Jika Claude tidak memanggil tool → langsung return teks */
  if (resp1.stop_reason !== 'tool_use') {
    var textBlock = (resp1.content || []).find(function(b) { return b.type === 'text'; });
    return textBlock ? textBlock.text : '(Tidak ada respons)';
  }

  /* === Claude memilih tool: jalankan semua tool_use block === */
  var toolResults = [];
  var toolUseBlocks = (resp1.content || []).filter(function(b) { return b.type === 'tool_use'; });

  toolUseBlocks.forEach(function(block) {
    var result = executeTool(block.name, block.input);
    toolResults.push({
      type: 'tool_result',
      tool_use_id: block.id,
      content: JSON.stringify(result)
    });
  });

  /* === Putaran 2: kirim hasil tool → Claude susun jawaban final === */
  var messages2 = messages.concat([
    { role: 'assistant', content: resp1.content },
    { role: 'user',      content: toolResults }
  ]);

  var resp2 = await callProxy({
    model: AI_MODEL,
    max_tokens: AI_MAX_TOKENS,
    system: AI_SYSTEM_PROMPT,
    tools: YAI_TOOLS,
    messages: messages2
  });

  var finalText = (resp2.content || []).find(function(b) { return b.type === 'text'; });
  return finalText ? finalText.text : '(Tidak ada respons dari AI)';
}

/* Helper: kirim request ke GAS proxy */
async function callProxy(body) {
  var url = AI_PROXY_URL + '?action=aiProxy';
  var resp = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  });
  if (!resp.ok) {
    var err = await resp.json().catch(function() { return {}; });
    throw new Error(err.error || 'HTTP ' + resp.status);
  }
  return await resp.json();
}

/* ══════════════════════════════════════════════════
   5. UI — Widget Chat (dipertahankan dari v1.0)
   Hanya fungsi AI backend yang diganti.
   Tampilan identik agar tidak perlu perubahan CSS/HTML.
══════════════════════════════════════════════════ */
function injectAIWidget() {
  var style = document.createElement('style');
  style.textContent = [
    '#ai-fab{position:fixed;bottom:24px;right:24px;z-index:9000;',
    'width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#F97316,#ea580c);',
    'border:none;cursor:pointer;box-shadow:0 4px 16px rgba(249,115,22,.45);',
    'display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s;}',
    '#ai-fab:hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(249,115,22,.6);}',
    '#ai-fab svg{width:24px;height:24px;stroke:#fff;fill:none;}',
    '#ai-fab-badge{position:absolute;top:-2px;right:-2px;width:14px;height:14px;',
    'background:#ef4444;border-radius:50%;border:2px solid #fff;display:none;}',
    '#ai-panel{position:fixed;bottom:86px;right:24px;z-index:9001;',
    'width:370px;max-height:540px;',
    'background:var(--bg1,#fff);border:1px solid var(--border,#e5e7eb);',
    'border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);',
    'display:none;flex-direction:column;overflow:hidden;font-family:inherit;}',
    '#ai-panel-head{padding:14px 16px;background:linear-gradient(135deg,#F97316,#ea580c);',
    'display:flex;align-items:center;gap:10px;flex-shrink:0;}',
    '#ai-panel-head .ai-avatar{width:32px;height:32px;border-radius:50%;',
    'background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;}',
    '#ai-panel-head .ai-avatar svg{width:18px;height:18px;stroke:#fff;fill:none;}',
    '#ai-panel-head .ai-title{flex:1;}',
    '#ai-panel-head .ai-title strong{display:block;font-size:13px;font-weight:700;color:#fff;}',
    '#ai-panel-head .ai-title span{font-size:11px;color:rgba(255,255,255,.8);}',
    '#ai-panel-head .ai-head-btn{background:none;border:none;cursor:pointer;',
    'color:rgba(255,255,255,.8);padding:4px;border-radius:6px;display:flex;align-items:center;justify-content:center;}',
    '#ai-panel-head .ai-head-btn:hover{background:rgba(255,255,255,.15);color:#fff;}',
    '#ai-panel-head .ai-head-btn svg{width:16px;height:16px;stroke:currentColor;fill:none;}',
    '#ai-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:200px;}',
    '.ai-msg{max-width:88%;padding:10px 13px;border-radius:12px;font-size:13px;line-height:1.6;word-break:break-word;}',
    '.ai-msg.user{align-self:flex-end;background:#F97316;color:#fff;border-bottom-right-radius:4px;}',
    '.ai-msg.bot{align-self:flex-start;background:var(--surface,#f3f4f6);color:var(--text1,#111);border-bottom-left-radius:4px;}',
    '.ai-msg.bot a{color:#F97316;}',
    /* Label kecil "mengambil data..." saat tool sedang berjalan */
    '.ai-tool-indicator{align-self:flex-start;font-size:11px;color:var(--text3,#9ca3af);',
    'padding:4px 10px;background:var(--surface,#f3f4f6);border-radius:20px;display:flex;align-items:center;gap:5px;}',
    '.ai-tool-dot{width:6px;height:6px;border-radius:50%;background:#F97316;animation:ai-pulse 1.2s infinite;}',
    '@keyframes ai-pulse{0%,100%{opacity:1}50%{opacity:.3}}',
    '.ai-typing{align-self:flex-start;padding:10px 14px;background:var(--surface,#f3f4f6);border-radius:12px;border-bottom-left-radius:4px;}',
    '.ai-typing span{display:inline-block;width:6px;height:6px;background:var(--text3,#9ca3af);border-radius:50%;margin:0 2px;animation:ai-bounce .9s infinite;}',
    '.ai-typing span:nth-child(2){animation-delay:.15s;}',
    '.ai-typing span:nth-child(3){animation-delay:.3s;}',
    '@keyframes ai-bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-6px);}}',
    '#ai-chips{padding:0 14px 10px;display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0;}',
    '.ai-chip{background:none;border:1px solid var(--border,#e5e7eb);border-radius:20px;',
    'padding:5px 11px;font-size:11.5px;cursor:pointer;color:var(--text2,#6b7280);',
    'white-space:nowrap;transition:background .15s,color .15s;}',
    '.ai-chip:hover{background:#FFF7ED;border-color:#F97316;color:#F97316;}',
    '#ai-input-wrap{padding:10px 12px;border-top:1px solid var(--border,#e5e7eb);',
    'display:flex;gap:8px;flex-shrink:0;align-items:flex-end;}',
    '#ai-input{flex:1;border:1px solid var(--border,#e5e7eb);border-radius:10px;',
    'padding:9px 12px;font-size:13px;resize:none;min-height:38px;max-height:100px;',
    'font-family:inherit;background:var(--bg1,#fff);color:var(--text1,#111);',
    'outline:none;transition:border .15s;line-height:1.45;}',
    '#ai-input:focus{border-color:#F97316;}',
    '#ai-send{width:36px;height:36px;border-radius:10px;background:#F97316;border:none;',
    'cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;',
    'transition:background .15s;margin-bottom:1px;}',
    '#ai-send:hover{background:#ea580c;}',
    '#ai-send:disabled{background:#fbd5b0;cursor:not-allowed;}',
    '#ai-send svg{width:16px;height:16px;stroke:#fff;fill:none;}'
  ].join('');
  document.head.appendChild(style);

  var container = document.createElement('div');
  container.innerHTML = [
    '<button id="ai-fab" title="Tanya AI Asisten">',
    '  <div id="ai-fab-badge"></div>',
    '  <svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
    '    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    '    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/>',
    '    <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/>',
    '    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>',
    '  </svg>',
    '</button>',
    '<div id="ai-panel">',
    '  <div id="ai-panel-head">',
    '    <div class="ai-avatar">',
    '      <svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
    '        <rect x="2" y="3" width="20" height="14" rx="2"/>',
    '        <line x1="8" y1="21" x2="16" y2="21"/>',
    '        <line x1="12" y1="17" x2="12" y2="21"/>',
    '      </svg>',
    '    </div>',
    '    <div class="ai-title">',
    '      <strong>Asisten YAI-PB</strong>',
    '      <span id="ai-status-txt">Siap membantu</span>',
    '    </div>',
    '    <button class="ai-head-btn" id="ai-clear-btn" title="Hapus riwayat chat">',
    '      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.17"/>',
    '      </svg>',
    '    </button>',
    '    <button class="ai-head-btn" id="ai-close-btn" title="Tutup">',
    '      <svg viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round">',
    '        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    '      </svg>',
    '    </button>',
    '  </div>',
    '  <div id="ai-messages"></div>',
    '  <div id="ai-chips">',
    '    <button class="ai-chip" data-q="Berapa total beneficiary unik saat ini?">Total benef unik</button>',
    '    <button class="ai-chip" data-q="Desa mana yang paling banyak beneficiary-nya?">Desa terbanyak</button>',
    '    <button class="ai-chip" data-q="Berapa total biaya PJUM yang tercatat?">Total biaya PJUM</button>',
    '    <button class="ai-chip" data-q="Siapa staf yang belum upload data PJUM bulan ini?">Cek kelengkapan</button>',
    '    <button class="ai-chip" data-q="Siapa saja daftar staf yang ada di sistem?">Daftar staf</button>',
    '    <button class="ai-chip" data-q="Bagaimana komposisi gender penerima manfaat?">Komposisi gender</button>',
    '  </div>',
    '  <div id="ai-input-wrap">',
    '    <textarea id="ai-input" rows="1" placeholder="Tanya sesuatu tentang data dashboard…"></textarea>',
    '    <button id="ai-send" title="Kirim">',
    '      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '        <line x1="22" y1="2" x2="11" y2="13"/>',
    '        <polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    '      </svg>',
    '    </button>',
    '  </div>',
    '</div>'
  ].join('\n');
  document.body.appendChild(container);
}

/* ══════════════════════════════════════════════════
   6. CONTROLLER — event handling & chat logic
══════════════════════════════════════════════════ */
function initAIAssistant() {
  injectAIWidget();

  var fab       = document.getElementById('ai-fab');
  var panel     = document.getElementById('ai-panel');
  var closeBtn  = document.getElementById('ai-close-btn');
  var clearBtn  = document.getElementById('ai-clear-btn');
  var input     = document.getElementById('ai-input');
  var sendBtn   = document.getElementById('ai-send');
  var msgArea   = document.getElementById('ai-messages');
  var statusTxt = document.getElementById('ai-status-txt');
  var badge     = document.getElementById('ai-fab-badge');

  /* chatHistory menyimpan format Anthropic: [{role, content}] */
  var chatHistory = [];
  var isOpen      = false;
  var isLoading   = false;

  function togglePanel() {
    isOpen = !isOpen;
    panel.style.display = isOpen ? 'flex' : 'none';
    badge.style.display = 'none';
    if (isOpen && msgArea.children.length === 0) showWelcome();
    if (isOpen) setTimeout(function() { input.focus(); }, 100);
  }
  fab.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

  clearBtn.addEventListener('click', function() {
    chatHistory = [];
    msgArea.innerHTML = '';
    showWelcome();
  });

  function showWelcome() {
    appendBotMsg(
      'Halo! Saya Asisten AI YAI-PB. 👋\n\n' +
      'Saya dapat menjawab pertanyaan tentang data benefisiari, anggaran PJUM, ' +
      'sebaran wilayah, dan kegiatan staf — dengan data yang akurat langsung dari sistem.\n\n' +
      'Silakan ketik pertanyaan atau pilih topik di bawah.'
    );
  }

  function appendUserMsg(text) {
    var div = document.createElement('div');
    div.className = 'ai-msg user';
    div.textContent = text;
    msgArea.appendChild(div);
    scrollBottom();
  }

  function appendBotMsg(text) {
    var div = document.createElement('div');
    div.className = 'ai-msg bot';
    div.innerHTML = markdownToHtml(text);
    msgArea.appendChild(div);
    scrollBottom();
    return div;
  }

  /* Indikator kecil saat tool sedang dieksekusi */
  function showToolIndicator(toolName) {
    removeToolIndicator();
    var div = document.createElement('div');
    div.className  = 'ai-tool-indicator';
    div.id         = 'ai-tool-indicator';
    var label = {
      getBenefCount:       'Menghitung benefisiari…',
      getBenefByWilayah:   'Menganalisis wilayah…',
      getBenefTrend:       'Membandingkan periode…',
      getPJUMSummary:      'Merangkum anggaran…',
      getKegiatanByStaf:   'Mencari kegiatan staf…',
      getAnggaranByKategori:'Merinci komponen biaya…',
      checkKelengkapanData:'Memeriksa kelengkapan data…',
      getListStaf:         'Mengambil daftar staf…',
      getBenefProfile:     'Mencari profil benef…'
    }[toolName] || 'Mengambil data…';
    div.innerHTML = '<div class="ai-tool-dot"></div>' + label;
    msgArea.appendChild(div);
    scrollBottom();
  }

  function removeToolIndicator() {
    var el = document.getElementById('ai-tool-indicator');
    if (el) el.remove();
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'ai-typing';
    div.id = 'ai-typing-indicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    msgArea.appendChild(div);
    scrollBottom();
  }

  function removeTyping() {
    var el = document.getElementById('ai-typing-indicator');
    if (el) el.remove();
  }

  function scrollBottom() { msgArea.scrollTop = msgArea.scrollHeight; }

  function markdownToHtml(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^#{1,3}\s+(.+)$/gm, '<strong>$1</strong>')
      .replace(/^[-•]\s+(.+)$/gm, '• $1')
      .replace(/\n/g, '<br>');
  }

  /* ── sendMessage: inti logika chat ── */
  async function sendMessage(userText) {
    if (!userText.trim() || isLoading) return;

    if (!window.rawBenef || window.rawBenef.length === 0) {
      appendBotMsg('⚠️ Data dashboard belum dimuat. Silakan tunggu hingga data selesai dimuat.');
      return;
    }

    /* Cek apakah GAS proxy URL tersedia */
    if (!AI_PROXY_URL) {
      appendBotMsg('⚠️ AI Proxy URL belum dikonfigurasi. Pastikan GAS_URL sudah diset dan GAS mendukung action=aiProxy.');
      return;
    }

    isLoading = true;
    sendBtn.disabled = true;
    statusTxt.textContent = 'Memproses…';
    input.value = '';
    input.style.height = '';

    appendUserMsg(userText);
    showTyping();

    try {
      /* Intercept: tampilkan tool indicator sebelum tool dieksekusi.
         Kita wrap callClaudeWithTools agar bisa menampilkan indikator.
         Strategi: panggil Claude putaran 1 langsung (bukan lewat wrapper),
         tampilkan indikator, lalu jalankan tool, lalu putaran 2. */
      var reply = await callClaudeWithToolsAndUI(userText);

      removeTyping();
      removeToolIndicator();
      appendBotMsg(reply);

      /* Simpan ke history dalam format Anthropic */
      chatHistory.push({ role: 'user',      content: userText });
      chatHistory.push({ role: 'assistant', content: reply });
      if (chatHistory.length > 16) chatHistory = chatHistory.slice(-16);

      statusTxt.textContent = 'Siap membantu';

    } catch (err) {
      removeTyping();
      removeToolIndicator();
      appendBotMsg('❌ **Terjadi kesalahan:** ' + err.message + '\n\nPeriksa konfigurasi GAS proxy dan koneksi internet.');
      statusTxt.textContent = 'Error — coba lagi';
    }

    isLoading = false;
    sendBtn.disabled = false;
    input.focus();
  }

  /* Versi sendMessage dengan UI feedback per tool */
  async function callClaudeWithToolsAndUI(userText) {
    var messages = [];
    chatHistory.slice(-8).forEach(function(msg) {
      messages.push({ role: msg.role, content: msg.content });
    });
    messages.push({ role: 'user', content: userText });

    /* Putaran 1 */
    var resp1 = await callProxy({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      system: AI_SYSTEM_PROMPT,
      tools: YAI_TOOLS,
      messages: messages
    });

    if (resp1.stop_reason !== 'tool_use') {
      var t = (resp1.content || []).find(function(b) { return b.type === 'text'; });
      return t ? t.text : '(Tidak ada respons)';
    }

    /* Tool dipanggil — tampilkan indikator */
    var toolUseBlocks = (resp1.content || []).filter(function(b) { return b.type === 'tool_use'; });
    removeTyping();

    var toolResults = [];
    for (var i = 0; i < toolUseBlocks.length; i++) {
      var block = toolUseBlocks[i];
      showToolIndicator(block.name);
      /* Sedikit delay agar indikator sempat terlihat */
      await new Promise(function(res) { setTimeout(res, 300); });
      var result = executeTool(block.name, block.input);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result)
      });
    }

    removeToolIndicator();
    showTyping();

    /* Putaran 2 */
    var messages2 = messages.concat([
      { role: 'assistant', content: resp1.content },
      { role: 'user',      content: toolResults }
    ]);
    var resp2 = await callProxy({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      system: AI_SYSTEM_PROMPT,
      tools: YAI_TOOLS,
      messages: messages2
    });

    var finalText = (resp2.content || []).find(function(b) { return b.type === 'text'; });
    return finalText ? finalText.text : '(Tidak ada respons dari AI)';
  }

  sendBtn.addEventListener('click', function() { sendMessage(input.value); });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); }
  });
  input.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });
  document.querySelectorAll('.ai-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      if (!isOpen) togglePanel();
      sendMessage(this.dataset.q);
    });
  });

  window._aiNotifyBadge = function() {
    if (!isOpen) badge.style.display = 'block';
  };
}

/* ══════════════════════════════════════════════════
   7. BOOT
══════════════════════════════════════════════════ */
(function bootAI() {
  function tryInit() {
    if (window.APP && window.APP.loaded) {
      initAIAssistant();
    } else {
      setTimeout(tryInit, 500);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(tryInit, 1000); });
  } else {
    setTimeout(tryInit, 1000);
  }
})();
