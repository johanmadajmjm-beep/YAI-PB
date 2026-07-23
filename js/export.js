/* ═══════════════════════════════════════════════
   export.js — Narrative PDF & Excel export
═══════════════════════════════════════════════ */

window.getFilterSummary = function(filters) {
  var parts = [];
  filters.forEach(function(f) {
    if (f.val && f.val !== '' && f.val !== '__blank__') parts.push(f.label + ': ' + f.val);
    else if (f.val === '__blank__') parts.push(f.label + ': (Tanggal Kosong)');
  });
  return parts.length ? parts.join(' | ') : 'Semua Data (Tanpa Filter)';
};

window.getChartImage = function(canvasId) {
  var el = document.getElementById(canvasId);
  if (!el || el.style.display === 'none') return null;
  try { return el.toDataURL('image/png'); } catch(e) { return null; }
};

/* ══════════════════════════════════════════════════
   buildPDF — Multi-section narrative report
   config: {
     title, subtitle, filterText, filename,
     meta: {periode, sumber, catatan},
     body: [
       {section:'I. Judul Bagian'},        ← heading besar bernomor
       {heading:'Sub-judul'},              ← sub-heading
       {text:'paragraf...'},
       {bullet:'poin...'},
       {kv:[['Label','Nilai'],...]},       ← tabel key-value ringkas
       {table:{head:[],body:[],title:''}}, ← tabel inline
       {chart:{canvasId:'',height:55,title:''}},
       {callout:'teks penting'},           ← box highlight
       {pagebreak:true}
     ],
     lampiran: [ ...sama seperti body... ]
   }
══════════════════════════════════════════════════ */
window.buildPDF = function(config) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('Library jsPDF belum dimuat. Pastikan koneksi internet aktif lalu refresh halaman.');
    return;
  }
  try {
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  var W=210, H=297, M=15, pageNum=1, y=M;
  var C = {
    orange:[249,115,22], dark:[26,31,54], text2:[74,85,128],
    text3:[138,150,184], border:[232,236,244], bg:[247,248,252],
    white:[255,255,255], accent:[255,243,232]
  };

  function footer() {
    doc.setFontSize(7.5); doc.setTextColor.apply(doc,C.text3);
    doc.text(config.title||'Laporan', M, H-8);
    doc.text('Hal. '+pageNum, W-M, H-8, {align:'right'});
    doc.setDrawColor.apply(doc,C.border); doc.setLineWidth(0.2);
    doc.line(M,H-12,W-M,H-12);
  }
  function newPage() { footer(); doc.addPage(); pageNum++; y=M; }
  function need(h) { if (y+h > H-18) newPage(); }

  /* ── COVER ── */
  doc.setFillColor.apply(doc,C.orange);
  doc.rect(0,0,W,52,'F');
  doc.setFontSize(9); doc.setTextColor.apply(doc,C.white); doc.setFont(undefined,'normal');
  doc.text((config.subtitle||'Yayasan Ayo Indonesia').toUpperCase(), M, 16);
  doc.setFontSize(22); doc.setFont(undefined,'bold');
  var tl = doc.splitTextToSize(config.title||'Laporan', W-2*M);
  doc.text(tl, M, 27);
  doc.setFontSize(9); doc.setFont(undefined,'normal');
  doc.text('Dibuat: '+new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})+
    ' pukul '+new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}), M, 27+tl.length*8+4);
  y = 60;

  /* ── META BOX ── */
  if (config.meta || config.filterText) {
    var rows = [];
    if (config.filterText) rows.push(['Cakupan Data', config.filterText]);
    if (config.meta) {
      if (config.meta.periode) rows.push(['Periode Data', config.meta.periode]);
      if (config.meta.sumber)  rows.push(['Sumber Data', config.meta.sumber]);
    }
    var bh = rows.length*5.5 + 5;
    doc.setFillColor.apply(doc,C.bg);
    doc.setDrawColor.apply(doc,C.border);
    doc.roundedRect(M,y,W-2*M,bh,2,2,'FD');
    doc.setFontSize(8);
    rows.forEach(function(r,i) {
      doc.setTextColor.apply(doc,C.text3); doc.setFont(undefined,'bold');
      doc.text(r[0], M+4, y+6.5+i*5.5);
      doc.setTextColor.apply(doc,C.text2); doc.setFont(undefined,'normal');
      var vl = doc.splitTextToSize(String(r[1]), W-2*M-42);
      doc.text(vl[0], M+38, y+6.5+i*5.5);
    });
    y += bh + 10;
  }

  /* ── RENDERER ── */
  function render(items) {
    (items||[]).forEach(function(it) {
      if (it.pagebreak) { newPage(); return; }

      if (it.section) {
        need(18);
        doc.setFillColor.apply(doc,C.accent);
        doc.rect(M, y, W-2*M, 9, 'F');
        doc.setFillColor.apply(doc,C.orange);
        doc.rect(M, y, 2.5, 9, 'F');
        doc.setFontSize(11.5); doc.setTextColor.apply(doc,C.dark); doc.setFont(undefined,'bold');
        doc.text(it.section, M+6, y+6.2);
        doc.setFont(undefined,'normal');
        y += 14;
      }
      else if (it.heading) {
        need(11);
        doc.setFontSize(10); doc.setTextColor.apply(doc,C.dark); doc.setFont(undefined,'bold');
        doc.text(it.heading, M, y+3.5);
        doc.setFont(undefined,'normal');
        y += 8;
      }
      else if (it.text) {
        doc.setFontSize(9); doc.setTextColor.apply(doc,C.text2);
        doc.splitTextToSize(it.text, W-2*M).forEach(function(ln) {
          need(5); doc.text(ln, M, y); y += 4.6;
        });
        y += 3.5;
      }
      else if (it.bullet) {
        doc.setFontSize(9);
        var bl = doc.splitTextToSize(it.bullet, W-2*M-7);
        bl.forEach(function(ln,i) {
          need(5);
          if (i===0) { doc.setTextColor.apply(doc,C.orange); doc.text('•', M+1.5, y); }
          doc.setTextColor.apply(doc,C.text2);
          doc.text(ln, M+6, y); y += 4.6;
        });
        y += 1.5;
      }
      else if (it.callout) {
        var cl = doc.splitTextToSize(it.callout, W-2*M-10);
        var chh = cl.length*4.6 + 7;
        need(chh+3);
        doc.setFillColor.apply(doc,C.accent);
        doc.roundedRect(M, y-3, W-2*M, chh, 2, 2, 'F');
        doc.setFillColor.apply(doc,C.orange);
        doc.rect(M, y-3, 2.5, chh, 'F');
        doc.setFontSize(9); doc.setTextColor.apply(doc,C.dark);
        cl.forEach(function(ln,i) { doc.text(ln, M+7, y+2.5+i*4.6); });
        y += chh + 4;
      }
      else if (it.kv) {
        need(it.kv.length*5.5 + 4);
        doc.setFontSize(8.5);
        it.kv.forEach(function(r) {
          need(5.5);
          doc.setDrawColor.apply(doc,C.border);
          doc.line(M, y+1.5, W-M, y+1.5);
          doc.setTextColor.apply(doc,C.text2); doc.setFont(undefined,'normal');
          doc.text(String(r[0]), M+1, y);
          doc.setTextColor.apply(doc,C.dark); doc.setFont(undefined,'bold');
          doc.text(String(r[1]), W-M-1, y, {align:'right'});
          doc.setFont(undefined,'normal');
          y += 5.5;
        });
        y += 4;
      }
      else if (it.table) {
        if (it.table.title) {
          need(8);
          doc.setFontSize(8.5); doc.setTextColor.apply(doc,C.text3); doc.setFont(undefined,'bold');
          doc.text(it.table.title, M, y+2);
          doc.setFont(undefined,'normal');
          y += 6;
        }
        need(22);
        doc.autoTable({
          startY: y,
          head: [it.table.head],
          body: it.table.body,
          margin: {left:M, right:M},
          styles: {fontSize:7.2, cellPadding:1.8, lineColor:C.border, lineWidth:0.15, textColor:C.dark},
          headStyles: {fillColor:C.orange, textColor:C.white, fontStyle:'bold', fontSize:7.2},
          alternateRowStyles: {fillColor:[251,252,254]},
          columnStyles: it.table.colStyles||{},
          didDrawPage: function() { pageNum = doc.internal.getNumberOfPages(); }
        });
        y = doc.lastAutoTable.finalY + 8;
      }
      else if (it.chart) {
        var img = getChartImage(it.chart.canvasId);
        if (img) {
          var cw = it.chart.width||(W-2*M), ch = it.chart.height||55;
          if (it.chart.title) {
            need(ch+12);
            doc.setFontSize(8.5); doc.setTextColor.apply(doc,C.text3); doc.setFont(undefined,'bold');
            doc.text(it.chart.title, M, y+2);
            doc.setFont(undefined,'normal');
            y += 6;
          } else need(ch+5);
          try { doc.addImage(img,'PNG',M,y,cw,ch); } catch(e) {}
          y += ch + 8;
        }
      }
      else if (it.spacer) { y += it.spacer; }
    });
  }

  render(config.body);

  /* ── LAMPIRAN ── */
  if (config.lampiran && config.lampiran.length) {
    newPage();
    doc.setFillColor.apply(doc,C.dark);
    doc.rect(M, y, W-2*M, 12, 'F');
    doc.setFontSize(13); doc.setTextColor.apply(doc,C.white); doc.setFont(undefined,'bold');
    doc.text('LAMPIRAN', M+5, y+8.2);
    doc.setFont(undefined,'normal');
    y += 18;
    render(config.lampiran);
  }

  /* ── CATATAN METODOLOGI ── */
  if (config.metodologi && config.metodologi.length) {
    need(40);
    doc.setDrawColor.apply(doc,C.border); doc.setLineWidth(0.3);
    doc.line(M, y, W-M, y); y += 7;
    doc.setFontSize(10); doc.setTextColor.apply(doc,C.dark); doc.setFont(undefined,'bold');
    doc.text('Catatan Metodologi', M, y+3);
    doc.setFont(undefined,'normal');
    y += 9;
    doc.setFontSize(8); doc.setTextColor.apply(doc,C.text3);
    config.metodologi.forEach(function(t) {
      doc.splitTextToSize('— '+t, W-2*M).forEach(function(ln) {
        need(4.4); doc.text(ln, M, y); y += 4.2;
      });
      y += 1.5;
    });
  }

  /* renumber footers */
  var totalPages = doc.internal.getNumberOfPages();
  for (var i=1;i<=totalPages;i++) {
    doc.setPage(i);
    doc.setFontSize(7.5); doc.setTextColor.apply(doc,C.text3);
    doc.setDrawColor.apply(doc,C.border); doc.setLineWidth(0.2);
    doc.line(M,H-12,W-M,H-12);
    doc.text(config.title||'Laporan', M, H-8);
    doc.text('Halaman '+i+' dari '+totalPages, W-M, H-8, {align:'right'});
  }

  doc.save(config.filename||'Laporan.pdf');
  } catch(err) {
    console.error('PDF export error:', err);
    alert('Gagal membuat PDF: '+err.message);
  }
};

/* ══════════════════════════════════════════════════
   Standard metodologi notes
══════════════════════════════════════════════════ */
window.stdMetodologi = function(extra) {
  var base = [
    'Beneficiary unik dihitung berdasarkan kombinasi nama dan desa. Satu orang yang mengikuti beberapa kegiatan tetap dihitung satu kali.',
    'Total records adalah jumlah baris catatan partisipasi, bukan jumlah orang.',
    'Data dengan tanggal kosong tidak masuk dalam analisis temporal (tren bulanan dan tahunan), namun tetap dihitung dalam total keseluruhan.',
    'Jika satu orang tercatat dengan gender berbeda pada baris berbeda, sistem mengambil gender yang paling sering muncul untuk orang tersebut.',
    'Nilai rupiah dibulatkan ke satuan terdekat. Notasi "jt" = juta, "M" = miliar.',
    'Data bersumber dari Google Sheets YAI dan diperbarui secara berkala. Angka dalam laporan ini mencerminkan kondisi pada saat laporan dibuat.'
  ];
  return extra ? base.concat(extra) : base;
};

/* ══════════════════════════════════════════════════
   exportExcel — 2-sheet XLSX
══════════════════════════════════════════════════ */
window.exportExcelLaporan = function(benefRows, pjumRows) {
  if (!window.XLSX) { alert('Library SheetJS belum dimuat. Refresh halaman.'); return; }
  var B=window.B, P=window.P;
  var wb = XLSX.utils.book_new();
  var bHead=['Nama','Gender','Kat.Usia','Kategori','Disabilitas','Desa','Kecamatan','Kabupaten','Program','Kegiatan','Benefit','Staf','Tanggal','Kode'];
  var bData=benefRows.map(function(r){return [r[B.nama],r[B.gender],r[B.katUsia]||r[B.usia],r[B.kategori],r[B.disab],r[B.desa],r[B.kec],r[B.kab],r[B.proyek],r[B.kegiatan],r[B.benefit],r[B.staf],r[B.tgl],r[B.kode]];});
  var ws1=XLSX.utils.aoa_to_sheet([bHead].concat(bData));
  ws1['!cols']=bHead.map(function(){return{wch:16};});
  XLSX.utils.book_append_sheet(wb,ws1,'Beneficiary');
  var pHead=['Tanggal','Staf','Program','Kode','Kegiatan','Item','Komponen','Jumlah (Rp)','File'];
  var pData=pjumRows.map(function(r){return [r[P.tgl],r[P.staf],r[P.proyek],r[P.kode],r[P.kegiatan],r[P.item],classifyItem(r[P.item]),parseFloat(r[P.jumlah])||0,r[P.file]];});
  var ws2=XLSX.utils.aoa_to_sheet([pHead].concat(pData));
  ws2['!cols']=pHead.map(function(){return{wch:18};});
  XLSX.utils.book_append_sheet(wb,ws2,'PJUM');
  XLSX.writeFile(wb,'YAI_Export_'+new Date().toISOString().slice(0,10)+'.xlsx');
};
