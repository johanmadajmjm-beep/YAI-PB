/* ═══════════════════════════════════════════════
   report-lib.js — Analytics helpers for reports
   Semua fungsi perhitungan untuk laporan mendalam
═══════════════════════════════════════════════ */

/* ── Gender dengan rekonsiliasi anomali ──
   Satu orang bisa tercatat L di satu baris dan P di baris lain.
   Kita ambil gender yang paling sering muncul untuk orang tersebut. */
window.genderBreakdown = function(arr) {
  var B = window.B;
  var per = {};
  arr.forEach(function(r) {
    var k = benefKey(r);
    if (!per[k]) per[k] = { L:0, P:0, X:0 };
    var g = r[B.gender];
    if (g === 'L') per[k].L++;
    else if (g === 'P') per[k].P++;
    else per[k].X++;
  });
  var L=0, P=0, X=0, konflik=0;
  Object.keys(per).forEach(function(k) {
    var c = per[k];
    if (c.L > 0 && c.P > 0) konflik++;
    if (c.L > c.P && c.L >= c.X) L++;
    else if (c.P > c.L && c.P >= c.X) P++;
    else if (c.L === c.P && c.L > 0) L++;   // tie → L
    else X++;
  });
  var total = L + P + X;
  return { L:L, P:P, X:X, total:total, konflik:konflik,
    pctL: total?(L/total*100):0, pctP: total?(P/total*100):0, pctX: total?(X/total*100):0,
    rasio: L>0 ? P/L : null };
};

/* ── Daftar tahun yang ada di data ── */
window.getYears = function(arr, tglIdx) {
  var s = {};
  arr.forEach(function(r) { var t = validTgl(r[tglIdx]); if (t) s[t.slice(0,4)] = 1; });
  return Object.keys(s).sort();
};

/* ── Rekap per tahun: benef unik + biaya ── */
window.yearlyRecap = function(benef, pjum) {
  var B = window.B, P = window.P;
  var years = {};
  getYears(benef, B.tgl).forEach(function(y){ years[y]=1; });
  getYears(pjum, P.tgl).forEach(function(y){ years[y]=1; });
  var list = Object.keys(years).sort();
  return list.map(function(y) {
    var bRows = benef.filter(function(r){ var t=validTgl(r[B.tgl]); return t && t.slice(0,4)===y; });
    var pRows = pjum.filter(function(r){ var t=validTgl(r[P.tgl]); return t && t.slice(0,4)===y; });
    var cost = pRows.reduce(function(s,r){ return s+(parseFloat(r[P.jumlah])||0); },0);
    var uniq = countUniqBenef(bRows);
    var desaS={}, kegS={};
    bRows.forEach(function(r){ if(r[B.desa])desaS[r[B.desa]]=1; if(r[B.kegiatan])kegS[r[B.kegiatan]]=1; });
    return { tahun:y, uniq:uniq, records:bRows.length, biaya:cost, trx:pRows.length,
      desa:Object.keys(desaS).length, kegiatan:Object.keys(kegS).length,
      rpp: uniq>0 ? cost/uniq : 0 };
  });
};

/* ── Growth rate YoY ── */
window.calcGrowth = function(series, field) {
  return series.map(function(row, i) {
    if (i === 0) return Object.assign({}, row, { growth:null });
    var prev = series[i-1][field];
    var g = prev > 0 ? ((row[field]-prev)/prev*100) : null;
    return Object.assign({}, row, { growth:g });
  });
};

/* ── Periode data: bulan pertama & terakhir ── */
window.dataPeriod = function(arr, tglIdx) {
  var months = [];
  arr.forEach(function(r) { var t = validTgl(r[tglIdx]); if (t) months.push(t); });
  if (!months.length) return null;
  months.sort();
  return { start:months[0], end:months[months.length-1], count:months.length };
};

window.fmtPeriod = function(ym) {
  if (!ym) return '—';
  var p = ym.split('-');
  return bulanFull(p[1]) + ' ' + p[0];
};

/* ── Bulan puncak & terendah ── */
window.peakMonths = function(arr, tglIdx, mode, valIdx) {
  var m;
  if (mode === 'sum') m = groupSum(arr, function(r){return validTgl(r[tglIdx]);}, function(r){return r[valIdx];});
  else m = groupCountUniq(arr, function(r){return validTgl(r[tglIdx]);});
  var entries = Object.keys(m).map(function(k){return [k, m[k]];}).filter(function(x){return x[0];});
  if (!entries.length) return null;
  entries.sort(function(a,b){ return b[1]-a[1]; });
  return { top:entries[0], bottom:entries[entries.length-1], avg: entries.reduce(function(s,x){return s+x[1];},0)/entries.length };
};

/* ── Kelengkapan kolom (data quality) ── */
window.columnCompleteness = function(arr, fields) {
  var total = arr.length || 1;
  return fields.map(function(f) {
    var filled = arr.filter(function(r) {
      var v = r[f.idx];
      if (f.isDate) return !!validTgl(v);
      return v && String(v).trim() !== '' && String(v).trim() !== '—';
    }).length;
    return { nama:f.label, terisi:filled, kosong:total-filled, pct:(filled/total*100) };
  });
};

/* ── Jangkauan wilayah per program ── */
window.programReach = function(benef) {
  var B = window.B;
  var m = {};
  benef.forEach(function(r) {
    var p = r[B.proyek]; if (!p) return;
    if (!m[p]) m[p] = { desa:{}, kec:{}, kab:{}, benef:{}, bulan:[] };
    if (r[B.desa]) m[p].desa[r[B.desa]] = 1;
    if (r[B.kec])  m[p].kec[r[B.kec]] = 1;
    if (r[B.kab])  m[p].kab[r[B.kab]] = 1;
    m[p].benef[benefKey(r)] = 1;
    var t = validTgl(r[B.tgl]); if (t) m[p].bulan.push(t);
  });
  return Object.keys(m).map(function(p) {
    var x = m[p];
    x.bulan.sort();
    return { program:p, desa:Object.keys(x.desa).length, kec:Object.keys(x.kec).length,
      kab:Object.keys(x.kab).length, uniq:Object.keys(x.benef).length,
      mulai:x.bulan[0]||null, akhir:x.bulan[x.bulan.length-1]||null,
      durasi:x.bulan.length ? monthDiff(x.bulan[0], x.bulan[x.bulan.length-1])+1 : 0 };
  }).sort(function(a,b){ return b.uniq-a.uniq; });
};

window.monthDiff = function(a, b) {
  if (!a || !b) return 0;
  var pa=a.split('-'), pb=b.split('-');
  return (parseInt(pb[0])-parseInt(pa[0]))*12 + (parseInt(pb[1])-parseInt(pa[1]));
};

/* ── Overlap program per desa ── */
window.desaProgramMap = function(benef) {
  var B = window.B;
  var m = {};
  benef.forEach(function(r) {
    if (!r[B.desa] || !r[B.proyek]) return;
    if (!m[r[B.desa]]) m[r[B.desa]] = {};
    m[r[B.desa]][r[B.proyek]] = 1;
  });
  return Object.keys(m).map(function(d) {
    return { desa:d, n:Object.keys(m[d]).length, programs:Object.keys(m[d]) };
  }).sort(function(a,b){ return b.n-a.n; });
};

/* ── Indeks konsentrasi (HHI ternormalisasi 0-100) ── */
window.concentrationIndex = function(counts) {
  var total = counts.reduce(function(s,x){return s+x;},0);
  if (!total) return 0;
  var hhi = counts.reduce(function(s,x){ var sh=x/total; return s+sh*sh; },0);
  var n = counts.length;
  if (n <= 1) return 100;
  return ((hhi - 1/n) / (1 - 1/n)) * 100;
};

/* ── Hierarki wilayah: Kab → Kec → Desa ── */
window.wilayahHierarchy = function(benef) {
  var B = window.B;
  var m = {};
  benef.forEach(function(r) {
    var kab = r[B.kab] || '(Tidak Diisi)';
    if (!m[kab]) m[kab] = { kec:{}, desa:{}, benef:{} };
    if (r[B.kec])  m[kab].kec[r[B.kec]] = 1;
    if (r[B.desa]) m[kab].desa[r[B.desa]] = 1;
    m[kab].benef[benefKey(r)] = 1;
  });
  return Object.keys(m).map(function(k) {
    return { kab:k, kec:Object.keys(m[k].kec).length, desa:Object.keys(m[k].desa).length,
      uniq:Object.keys(m[k].benef).length };
  }).sort(function(a,b){ return b.uniq-a.uniq; });
};

/* ── Ragam disabilitas (per jenis, bukan cuma ya/tidak) ── */
window.disabilityBreakdown = function(benef) {
  var B = window.B;
  var seen = {}, jenis = {}, adaDisab = 0, tanpaDisab = 0;
  benef.forEach(function(r) {
    var k = benefKey(r);
    if (seen[k]) return;
    seen[k] = 1;
    var val = (r[B.disab]||'').trim();
    var low = val.toLowerCase();
    if (val && low!=='—' && low!=='tidak' && low!=='tidak ada' && low!=='none' && low!=='no' && low!=='-') {
      adaDisab++;
      jenis[val] = (jenis[val]||0) + 1;
    } else tanpaDisab++;
  });
  var list = Object.keys(jenis).map(function(j){return [j, jenis[j]];}).sort(function(a,b){return b[1]-a[1];});
  return { adaDisab:adaDisab, tanpaDisab:tanpaDisab, total:adaDisab+tanpaDisab, jenis:list };
};

/* ── Group unik untuk kolom apa pun (dengan label kosong) ── */
window.uniqGroupField = function(benef, idx, emptyLabel) {
  var seen = {}, m = {};
  benef.forEach(function(r) {
    var k = benefKey(r);
    if (seen[k]) return;
    seen[k] = 1;
    var val = (r[idx]||'').toString().trim();
    var key = (val && val!=='—') ? val : (emptyLabel||'(Tidak Diisi)');
    m[key] = (m[key]||0) + 1;
  });
  return Object.keys(m).map(function(k){return [k, m[k]];}).sort(function(a,b){return b[1]-a[1];});
};

/* ── Program count konsisten: gabungan benef + pjum ── */
window.allProgramList = function(benef, pjum) {
  var B = window.B, P = window.P;
  var m = {};
  benef.forEach(function(r){ if(r[B.proyek]) m[normKey(r[B.proyek])] = r[B.proyek].trim(); });
  pjum.forEach(function(r){ if(r[P.proyek]) m[normKey(r[P.proyek])] = r[P.proyek].trim(); });
  return Object.values(m).sort();
};

/* ── Trend deskripsi otomatis ── */
window.describeTrend = function(series, field) {
  if (series.length < 2) return 'Data belum cukup untuk menilai tren.';
  var first = series[0][field], last = series[series.length-1][field];
  var growths = [];
  for (var i=1;i<series.length;i++) {
    var p = series[i-1][field];
    if (p>0) growths.push((series[i][field]-p)/p*100);
  }
  var avgG = growths.length ? growths.reduce(function(s,x){return s+x;},0)/growths.length : 0;
  var arah = avgG > 10 ? 'meningkat' : avgG < -10 ? 'menurun' : 'relatif stabil';
  return 'Secara umum tren ' + arah + ' dengan rata-rata perubahan ' +
    (avgG>=0?'+':'') + avgG.toFixed(1) + '% per tahun.';
};

/* ── Rata-rata partisipasi per orang ── */
window.avgParticipation = function(benef) {
  var uniq = countUniqBenef(benef);
  return uniq > 0 ? benef.length / uniq : 0;
};

/* ── Anomali detector ── */
window.detectAnomalies = function(benef, pjum) {
  var B = window.B, P = window.P;
  var out = [];
  var g = genderBreakdown(benef);
  if (g.konflik > 0) out.push({ jenis:'Gender ganda', jml:g.konflik,
    ket:'Orang yang sama tercatat L dan P di baris berbeda' });
  var noTgl = benef.filter(function(r){ return !validTgl(r[B.tgl]); }).length;
  if (noTgl > 0) out.push({ jenis:'Tanggal kosong (Benef)', jml:noTgl, ket:'Tidak masuk analisis temporal' });
  var pNoTgl = pjum.filter(function(r){ return !validTgl(r[P.tgl]); }).length;
  if (pNoTgl > 0) out.push({ jenis:'Tanggal kosong (PJUM)', jml:pNoTgl, ket:'Tidak masuk analisis temporal' });
  var noDesa = benef.filter(function(r){ return !r[B.desa]||r[B.desa]==='—'; }).length;
  if (noDesa > 0) out.push({ jenis:'Desa kosong', jml:noDesa, ket:'Tidak masuk analisis wilayah' });
  var nol = pjum.filter(function(r){ return (parseFloat(r[P.jumlah])||0) <= 0; }).length;
  if (nol > 0) out.push({ jenis:'Nilai PJUM nol/negatif', jml:nol, ket:'Perlu verifikasi' });
  var noNama = benef.filter(function(r){ return !r[B.nama]||String(r[B.nama]).trim()===''; }).length;
  if (noNama > 0) out.push({ jenis:'Nama kosong', jml:noNama, ket:'Mempengaruhi penghitungan orang unik' });
  return out;
};
