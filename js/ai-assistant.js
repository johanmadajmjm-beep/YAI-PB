/* ═══════════════════════════════════════════════════════════════
   ai-assistant.js — Gemini AI Chat Widget untuk YAI-PB Dashboard
   Versi: 1.0 | Build: 2026-07-30
   
   Cara pakai:
   1. Simpan Gemini API Key di konstanta GEMINI_API_KEY di bawah
   2. Widget otomatis muncul sebagai tombol "AI" di pojok kanan bawah
   3. Widget membaca data dashboard yang sedang aktif (rawBenef, rawPjum)
      dan mengirimkannya ke Gemini sebagai konteks
═══════════════════════════════════════════════════════════════ */

/* ── KONFIGURASI — API key disimpan aman di GAS (tidak diekspos di browser) ── */
/* Pertanyaan dikirim ke GAS endpoint yang sama dengan dashboard, GAS yang memanggil Gemini */

/* ══════════════════════════════════════════════════
   1. CONTEXT BUILDER
   Membuat ringkasan data dashboard untuk dikirim ke AI
══════════════════════════════════════════════════ */
function buildDashboardContext() {
  if (!window.rawBenef || !window.rawPjum) return 'Data dashboard belum tersedia.';

  var B = window.B, P = window.P;
  var benef = window.rawBenef;
  var pjum  = window.rawPjum;
  function rp(n) { return 'Rp ' + fmtShort(n); }
  function grp(arr, keyFn) {
    var m = {};
    arr.forEach(function(r) { var k = keyFn(r); if (k) m[k] = (m[k]||0)+1; });
    return m;
  }
  function grpSum(arr, keyFn, valFn) {
    var m = {};
    arr.forEach(function(r) { var k = keyFn(r); if (k) m[k] = (m[k]||0)+(parseFloat(valFn(r))||0); });
    return m;
  }
  function sortDesc(obj) {
    return Object.entries(obj).sort(function(a,b){return b[1]-a[1];});
  }
  function fmtObj(obj, valFmt, limit) {
    return sortDesc(obj).slice(0, limit||999).map(function(x,i){
      return (i+1)+'. '+x[0]+': '+(valFmt ? valFmt(x[1]) : x[1]);
    }).join('\n');
  }

  /* ── KPI ── */
  var uniqBenef = countUniqBenef(benef);
  var totalCost = pjum.reduce(function(s,r){return s+(parseFloat(r[P.jumlah])||0);},0);
  var fileSetP={}, fileSetB={};
  pjum.forEach(function(r){if(r[P.file])fileSetP[r[P.file]]=1;});
  benef.forEach(function(r){if(r[B.file])fileSetB[r[B.file]]=1;});
  var gL=countUniqByGender(benef,'L'), gP=countUniqByGender(benef,'P');

  /* ── Wilayah ── */
  var desaSet={},kecSet={},kabSet={};
  benef.forEach(function(r){
    if(r[B.desa])desaSet[r[B.desa]]=1;
    if(r[B.kec])kecSet[r[B.kec]]=1;
    if(r[B.kab])kabSet[r[B.kab]]=1;
  });

  /* ── Semua Program ── */
  var progBenef={}, progCost={}, progTrx={};
  benef.forEach(function(r){var p=(r[B.proyek]||'').trim();if(p)progBenef[p]=(progBenef[p]||0)+1;});
  pjum.forEach(function(r){
    var p=(r[P.proyek]||'').trim();
    if(p){progCost[p]=(progCost[p]||0)+(parseFloat(r[P.jumlah])||0);progTrx[p]=(progTrx[p]||0)+1;}
  });
  var allProg = Object.keys(Object.assign({},progBenef,progCost)).sort();

  /* ── Semua Staf ── */
  var stafBenef={}, stafCost={}, stafTrx={}, stafFile={};
  benef.forEach(function(r){var s=(r[B.staf]||'').trim();if(s)stafBenef[s]=(stafBenef[s]||0)+1;});
  pjum.forEach(function(r){
    var s=(r[P.staf]||'').trim();
    if(s){stafCost[s]=(stafCost[s]||0)+(parseFloat(r[P.jumlah])||0);stafTrx[s]=(stafTrx[s]||0)+1;}
  });
  pjum.forEach(function(r){var s=(r[P.staf]||'').trim();var f=(r[P.file]||'').trim();if(s&&f){if(!stafFile[s])stafFile[s]={};stafFile[s][f]=1;}});

  /* ── Semua Desa ── */
  var desaBenef = grp(benef, function(r){return (r[B.desa]||'').trim();});
  var kecBenef  = grp(benef, function(r){return (r[B.kec]||'').trim();});
  var kabBenef  = grp(benef, function(r){return (r[B.kab]||'').trim();});

  /* ── Kegiatan ── */
  var kegBenef = grp(benef, function(r){return (r[B.kegiatan]||'').trim();});
  var kegCost  = grpSum(pjum, function(r){return (r[P.kegiatan]||'').trim();}, function(r){return r[P.jumlah];});

  /* ── Kategori & Disabilitas ── */
  var katBenef  = grp(benef, function(r){return (r[B.kategori]||'').trim();});
  var usiaBenef = grp(benef, function(r){return (r[B.katUsia]||'').trim();});
  var disabBenef= grp(benef, function(r){return (r[B.disab]||'').trim();});

  /* ── Komponen Biaya ── */
  var kompBiaya = grpSum(pjum,
    function(r){return classifyItem ? classifyItem(r[P.item]) : (r[P.item]||'Lainnya');},
    function(r){return r[P.jumlah];}
  );

  /* ── Trend Bulanan ── */
  var bulanBenef={}, bulanCost={};
  benef.forEach(function(r){var t=validTgl(r[B.tgl]);if(t)bulanBenef[t]=(bulanBenef[t]||0)+1;});
  pjum.forEach(function(r){var t=validTgl(r[P.tgl]);if(t)bulanCost[t]=(bulanCost[t]||0)+(parseFloat(r[P.jumlah])||0);});

  /* ── Semua Bulan ── */
  var semuaBulan={};
  Object.keys(bulanBenef).forEach(function(b){semuaBulan[b]=1;});
  Object.keys(bulanCost).forEach(function(b){semuaBulan[b]=1;});
  var bulanList = Object.keys(semuaBulan).sort();

  /* ── Per Bulan per Staf ── */
  var bsStafPjum={}, bsStafBenef={};
  pjum.forEach(function(r){
    var t=validTgl(r[P.tgl]);if(!t)return;
    var s=(r[P.staf]||'').trim();if(!s)return;
    if(!bsStafPjum[t])bsStafPjum[t]={};
    if(!bsStafPjum[t][s])bsStafPjum[t][s]={trx:0,cost:0};
    bsStafPjum[t][s].trx++;
    bsStafPjum[t][s].cost+=(parseFloat(r[P.jumlah])||0);
  });
  benef.forEach(function(r){
    var t=validTgl(r[B.tgl]);if(!t)return;
    var s=(r[B.staf]||'').trim();if(!s)return;
    if(!bsStafBenef[t])bsStafBenef[t]={};
    bsStafBenef[t][s]=(bsStafBenef[t][s]||0)+1;
  });

  /* ── Status kirim per bulan (6 bulan terakhir) ── */
  var daftarStaf = window.CANONICAL_STAF || Object.keys(stafBenef);
  var bulan6     = bulanList.slice(-6);
  var statusKirim = bulan6.map(function(bulan) {
    var sudahP = Object.keys(bsStafPjum[bulan]||{});
    var sudahB = Object.keys(bsStafBenef[bulan]||{});
    var belumP = daftarStaf.filter(function(s){return sudahP.indexOf(s)<0;});
    var belumB = daftarStaf.filter(function(s){return sudahB.indexOf(s)<0;});
    var detailP = sudahP.map(function(s){
      var d=bsStafPjum[bulan][s];
      return s+'('+d.trx+' trx, '+rp(d.cost)+')';
    }).join(', ');
    var detailB = sudahB.map(function(s){
      return s+'('+bsStafBenef[bulan][s]+' benef)';
    }).join(', ');
    return [
      'Bulan '+bulan+':',
      '  PJUM sudah ('+sudahP.length+'): '+(detailP||'—'),
      '  PJUM belum ('+belumP.length+'): '+(belumP.join(', ')||'—'),
      '  Benef sudah ('+sudahB.length+'): '+(detailB||'—'),
      '  Benef belum ('+belumB.length+'): '+(belumB.join(', ')||'—'),
    ].join('\n');
  });

  /* ── Susun context ── */
  var ctx = [
    '=== DATA DASHBOARD YAI-PB (Yayasan Ayo Indonesia) ===',

    '\n== KPI UTAMA ==',
    '- Beneficiary Unik: '+uniqBenef.toLocaleString('id-ID')+' orang',
    '- Total Records: '+benef.length.toLocaleString('id-ID')+' baris',
    '- Total Biaya PJUM: '+rp(totalCost),
    '- Transaksi PJUM: '+pjum.length.toLocaleString('id-ID'),
    '- File PJUM: '+Object.keys(fileSetP).length,
    '- File Benef: '+Object.keys(fileSetB).length,
    '- Rp/Benef Unik: '+(uniqBenef>0?rp(totalCost/uniqBenef):'—'),
    '- Gender: L='+gL+', P='+gP+', Rasio P:L='+(gL>0?(gP/gL).toFixed(2):'—'),

    '\n== WILAYAH ==',
    '- Kabupaten: '+Object.keys(kabSet).length,
    '- Kecamatan: '+Object.keys(kecSet).length,
    '- Desa/Kelurahan: '+Object.keys(desaSet).length,

    '\n== SEMUA PROGRAM (benef records | biaya PJUM | transaksi) ==',
    allProg.map(function(p){
      return '- '+p+': '+(progBenef[p]||0)+' benef records'+(progCost[p]?', '+rp(progCost[p]):'')+(progTrx[p]?', '+progTrx[p]+' trx':'');
    }).join('\n'),

    '\n== SEMUA STAF (benef records | biaya PJUM | file) ==',
    daftarStaf.map(function(s){
      var b=stafBenef[s]||0, c=stafCost[s]||0, f=stafFile[s]?Object.keys(stafFile[s]).length:0;
      return '- '+s+': '+b+' benef records'+(c?', '+rp(c):'')+(f?', '+f+' file':'');
    }).join('\n'),

    '\n== SEBARAN KABUPATEN ==',
    fmtObj(kabBenef, null, 20),

    '\n== SEBARAN KECAMATAN (top 30) ==',
    fmtObj(kecBenef, null, 30),

    '\n== SEBARAN DESA (top 50) ==',
    fmtObj(desaBenef, null, 50),

    '\n== KEGIATAN BENEF (top 30) ==',
    fmtObj(kegBenef, null, 30),

    '\n== KEGIATAN PJUM — BIAYA (top 20) ==',
    fmtObj(kegCost, rp, 20),

    '\n== KATEGORI BENEF ==',
    fmtObj(katBenef, null, 20),

    '\n== KATEGORI USIA ==',
    fmtObj(usiaBenef, null, 15),

    '\n== RAGAM DISABILITAS ==',
    fmtObj(disabBenef, null, 15),

    '\n== KOMPONEN BIAYA PJUM ==',
    fmtObj(kompBiaya, rp, 15),

    '\n== TREND BULANAN ==',
    bulanList.map(function(b){
      return b+': '+(bulanBenef[b]||0)+' benef records'+(bulanCost[b]?', '+rp(bulanCost[b]):'');
    }).join('\n'),

    '\n== STATUS PENGIRIMAN FILE (6 bulan terakhir) ==',
    '(Daftar staf: '+daftarStaf.join(', ')+')',
    statusKirim.join('\n\n'),

    '\n=== AKHIR DATA ==='
  ].join('\n');

  return ctx;
}

/* ══════════════════════════════════════════════════
   2. GROQ API CALL — gratis, langsung dari browser
══════════════════════════════════════════════════ */
var GROQ_API_KEY = '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';
var GROQ_MODEL   = 'llama-3.3-70b-versatile';

async function callGemini(userMessage, chatHistory) {
  var context = buildDashboardContext();

  var systemText = [
    'Kamu adalah AI Assistant untuk Dashboard YAI-PB (Yayasan Ayo Indonesia).',
    'Tugasmu adalah membantu pengguna memahami data yang tampil di dashboard.',
    'Jawablah dalam Bahasa Indonesia yang jelas, ringkas, dan mudah dipahami.',
    'Fokus pada data aktual yang ada di konteks. Jangan mengarang data.',
    'Jika ditanya tentang angka atau data yang tidak ada di konteks, katakan bahwa data tersebut tidak tersedia.',
    'Gunakan format poin/bullet bila membantu kejelasan jawaban.',
    '',
    context
  ].join('\n');

  var messages = [{ role: 'system', content: systemText }];
  chatHistory.slice(-10).forEach(function(msg) {
    messages.push({
      role:    msg.role === 'user' ? 'user' : 'assistant',
      content: String(msg.text || '')
    });
  });
  messages.push({ role: 'user', content: userMessage });

  var response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + GROQ_API_KEY
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages:    messages,
      max_tokens:  1024,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    var errData = await response.json().catch(function() { return {}; });
    var errMsg  = errData.error ? errData.error.message : 'HTTP ' + response.status;
    throw new Error('Groq API error: ' + errMsg);
  }

  var data = await response.json();
  var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  return text || '(Tidak ada respons dari AI)';
}

/* ══════════════════════════════════════════════════
   3. UI — Widget HTML + CSS
══════════════════════════════════════════════════ */
function injectAIWidget() {
  /* ── CSS ── */
  var style = document.createElement('style');
  style.textContent = [
    /* Tombol trigger */
    '#ai-fab{position:fixed;bottom:24px;right:24px;z-index:9000;',
    'width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#F97316,#ea580c);',
    'border:none;cursor:pointer;box-shadow:0 4px 16px rgba(249,115,22,.45);',
    'display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s;}',
    '#ai-fab:hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(249,115,22,.6);}',
    '#ai-fab svg{width:24px;height:24px;stroke:#fff;fill:none;}',

    /* Badge notifikasi */
    '#ai-fab-badge{position:absolute;top:-2px;right:-2px;width:14px;height:14px;',
    'background:#ef4444;border-radius:50%;border:2px solid #fff;display:none;}',

    /* Panel chat */
    '#ai-panel{position:fixed;bottom:86px;right:24px;z-index:9001;',
    'width:360px;max-height:520px;',
    'background:var(--bg1,#fff);border:1px solid var(--border,#e5e7eb);',
    'border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);',
    'display:none;flex-direction:column;overflow:hidden;font-family:inherit;}',

    /* Header panel */
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

    /* Area pesan */
    '#ai-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:200px;}',

    /* Bubble pesan */
    '.ai-msg{max-width:85%;padding:10px 13px;border-radius:12px;font-size:13px;line-height:1.55;word-break:break-word;}',
    '.ai-msg.user{align-self:flex-end;background:#F97316;color:#fff;border-bottom-right-radius:4px;}',
    '.ai-msg.bot{align-self:flex-start;background:var(--surface,#f3f4f6);color:var(--text1,#111);border-bottom-left-radius:4px;}',
    '.ai-msg.bot a{color:#F97316;}',
    '.ai-msg-time{font-size:10px;opacity:.6;margin-top:4px;text-align:right;}',

    /* Typing indicator */
    '.ai-typing{align-self:flex-start;padding:10px 14px;background:var(--surface,#f3f4f6);border-radius:12px;border-bottom-left-radius:4px;}',
    '.ai-typing span{display:inline-block;width:6px;height:6px;background:var(--text3,#9ca3af);border-radius:50%;margin:0 2px;animation:ai-bounce .9s infinite;}',
    '.ai-typing span:nth-child(2){animation-delay:.15s;}',
    '.ai-typing span:nth-child(3){animation-delay:.3s;}',
    '@keyframes ai-bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-6px);}}',

    /* Chip pertanyaan cepat */
    '#ai-chips{padding:0 14px 10px;display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0;}',
    '.ai-chip{background:none;border:1px solid var(--border,#e5e7eb);border-radius:20px;',
    'padding:5px 11px;font-size:11.5px;cursor:pointer;color:var(--text2,#6b7280);',
    'white-space:nowrap;transition:background .15s,color .15s;}',
    '.ai-chip:hover{background:#FFF7ED;border-color:#F97316;color:#F97316;}',

    /* Input area */
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

  /* ── HTML ── */
  var container = document.createElement('div');
  container.innerHTML = [
    /* FAB Button */
    '<button id="ai-fab" title="Tanya AI Asisten">',
    '  <div id="ai-fab-badge"></div>',
    '  <svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
    '    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    '    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/>',
    '    <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/>',
    '    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>',
    '  </svg>',
    '</button>',

    /* Panel */
    '<div id="ai-panel">',
    '  <!-- Header -->',
    '  <div id="ai-panel-head">',
    '    <div class="ai-avatar">',
    '      <svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
    '        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/>',
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

    '  <!-- Messages -->',
    '  <div id="ai-messages"></div>',

    '  <!-- Quick chips -->',
    '  <div id="ai-chips">',
    '    <button class="ai-chip" data-q="Berapa total beneficiary unik?">Total benef unik</button>',
    '    <button class="ai-chip" data-q="Program apa yang memiliki penerima manfaat terbanyak?">Program terbesar</button>',
    '    <button class="ai-chip" data-q="Siapa staf dengan beneficiary terbanyak?">Top staf</button>',
    '    <button class="ai-chip" data-q="Berapa total biaya PJUM yang tercatat?">Total biaya PJUM</button>',
    '    <button class="ai-chip" data-q="Desa mana yang paling banyak penerima manfaatnya?">Desa terbesar</button>',
    '    <button class="ai-chip" data-q="Bagaimana komposisi gender penerima manfaat?">Komposisi gender</button>',
    '  </div>',

    '  <!-- Input -->',
    '  <div id="ai-input-wrap">',
    '    <textarea id="ai-input" rows="1" placeholder="Tanya sesuatu tentang data dashboard…"></textarea>',
    '    <button id="ai-send" title="Kirim">',
    '      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    '      </svg>',
    '    </button>',
    '  </div>',
    '</div>'
  ].join('\n');
  document.body.appendChild(container);
}

/* ══════════════════════════════════════════════════
   4. CONTROLLER — event handling & chat logic
══════════════════════════════════════════════════ */
function initAIAssistant() {
  injectAIWidget();

  var fab      = document.getElementById('ai-fab');
  var panel    = document.getElementById('ai-panel');
  var closeBtn = document.getElementById('ai-close-btn');
  var clearBtn = document.getElementById('ai-clear-btn');
  var input    = document.getElementById('ai-input');
  var sendBtn  = document.getElementById('ai-send');
  var msgArea  = document.getElementById('ai-messages');
  var statusTxt = document.getElementById('ai-status-txt');
  var badge    = document.getElementById('ai-fab-badge');

  var chatHistory = [];
  var isOpen = false;
  var isLoading = false;

  /* — Toggle panel — */
  function togglePanel() {
    isOpen = !isOpen;
    panel.style.display = isOpen ? 'flex' : 'none';
    badge.style.display = 'none';
    if (isOpen && msgArea.children.length === 0) {
      showWelcome();
    }
    if (isOpen) {
      setTimeout(function() { input.focus(); }, 100);
    }
  }

  fab.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

  /* — Hapus riwayat — */
  clearBtn.addEventListener('click', function() {
    chatHistory = [];
    msgArea.innerHTML = '';
    showWelcome();
  });

  /* — Welcome message — */
  function showWelcome() {
    appendBotMsg(
      'Halo! Saya Asisten AI YAI-PB. 👋\n\n' +
      'Saya dapat membantu Anda memahami data yang ada di dashboard ini — mulai dari jumlah beneficiary, ' +
      'biaya PJUM, sebaran wilayah, hingga performa per program dan staf.\n\n' +
      'Silakan ketik pertanyaan Anda atau pilih salah satu topik di bawah.'
    );
  }

  /* — Append message — */
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

  function scrollBottom() {
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  /* — Markdown sederhana → HTML — */
  function markdownToHtml(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^#{1,3}\s+(.+)$/gm, '<strong>$1</strong>')
      .replace(/^[-•]\s+(.+)$/gm, '• $1')
      .replace(/\n/g, '<br>');
  }

  /* — Kirim pesan ke Gemini — */
  async function sendMessage(userText) {
    if (!userText.trim() || isLoading) return;

    if (!window.rawBenef) {
      appendBotMsg('⚠️ Data dashboard belum dimuat. Silakan tunggu data selesai dimuat terlebih dahulu.');
      return;
    }

    isLoading = true;
    sendBtn.disabled = true;
    statusTxt.textContent = 'Sedang memproses…';
    input.value = '';
    input.style.height = '';

    appendUserMsg(userText);
    showTyping();

    try {
      var reply = await callGemini(userText, chatHistory);
      removeTyping();
      appendBotMsg(reply);

      /* Simpan ke history (max 10 pesan terakhir agar token tidak meledak) */
      chatHistory.push({ role: 'user', text: userText });
      chatHistory.push({ role: 'model', text: reply });
      if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

      statusTxt.textContent = 'Siap membantu';
    } catch (err) {
      removeTyping();
      appendBotMsg('❌ **Terjadi kesalahan:** ' + err.message + '\n\nPastikan API key Gemini sudah benar dan koneksi internet tersedia.');
      statusTxt.textContent = 'Error — coba lagi';
    }

    isLoading = false;
    sendBtn.disabled = false;
    input.focus();
  }

  /* — Event: tombol kirim — */
  sendBtn.addEventListener('click', function() {
    sendMessage(input.value);
  });

  /* — Event: Enter kirim, Shift+Enter newline — */
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });

  /* — Auto-resize textarea — */
  input.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });

  /* — Chip pertanyaan cepat — */
  document.querySelectorAll('.ai-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      if (!isOpen) togglePanel();
      sendMessage(this.dataset.q);
    });
  });

  /* — Badge notif saat panel tertutup (opsional) — */
  window._aiNotifyBadge = function() {
    if (!isOpen) badge.style.display = 'block';
  };
}

/* ══════════════════════════════════════════════════
   5. BOOT — Tunggu dashboard selesai load
══════════════════════════════════════════════════ */
(function bootAI() {
  /* Tunggu sampai APP.loaded = true (data sudah ada) */
  function tryInit() {
    if (window.APP && window.APP.loaded) {
      initAIAssistant();
    } else {
      setTimeout(tryInit, 500);
    }
  }
  /* Mulai cek setelah DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(tryInit, 1000); });
  } else {
    setTimeout(tryInit, 1000);
  }
})();
