/* ═══════════════════════════════════════════════
   export.js — Narrative PDF & Excel export
   Dependencies: jsPDF, jsPDF-AutoTable, SheetJS
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
   buildPDF — Narrative-style report
   config: {
     title, subtitle, filterText, filename,
     narrative: [                          ← body narasi
       {heading:'...'},
       {text:'paragraf narasi...'},
       {text:'paragraf kedua...'},
       ...
     ],
     lampiran: [                           ← lampiran (tabel/grafik)
       {heading:'Tabel A1: ...'},
       {table:{head:[],body:[],colStyles:{}}},
       {heading:'Grafik B1: ...'},
       {chart:{canvasId:'...',height:55}},
       ...
     ]
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
  var COL = {
    orange:[249,115,22], dark:[26,31,54], text2:[74,85,128],
    text3:[138,150,184], border:[232,236,244], bg:[245,246,250],
    white:[255,255,255]
  };

  function addFooter() {
    doc.setFontSize(8); doc.setTextColor.apply(doc,COL.text3);
    doc.text('YAI Dashboard — '+new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})+', '+new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}), M, H-8);
    doc.text('Halaman '+pageNum, W-M, H-8, {align:'right'});
    doc.setDrawColor.apply(doc,COL.border); doc.line(M,H-12,W-M,H-12);
  }
  function addPage() { addFooter(); doc.addPage(); pageNum++; y=M; }
  function checkSpace(need) { if (y+need > H-20) addPage(); }

  /* ── Cover header ── */
  doc.setFillColor.apply(doc,COL.orange);
  doc.rect(0,0,W,34,'F');
  doc.setFontSize(20); doc.setTextColor.apply(doc,COL.white); doc.setFont(undefined,'bold');
  doc.text(config.title||'Laporan', M, 15);
  doc.setFontSize(10); doc.setFont(undefined,'normal');
  doc.text(config.subtitle||'Yayasan Ayo Indonesia', M, 23);
  doc.setFontSize(8);
  doc.text(new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'}), W-M, 15, {align:'right'});
  if (config.filterText) {
    doc.setFontSize(8);
    doc.text('Filter: '+config.filterText, W-M, 22, {align:'right'});
  }
  y = 42;

  /* ── Narrative body ── */
  (config.narrative||[]).forEach(function(item) {
    if (item.heading) {
      checkSpace(14);
      doc.setDrawColor.apply(doc,COL.orange); doc.setLineWidth(0.6);
      doc.line(M, y+1, M+25, y+1);
      doc.setFontSize(13); doc.setTextColor.apply(doc,COL.dark); doc.setFont(undefined,'bold');
      doc.text(item.heading, M, y+8);
      doc.setFont(undefined,'normal'); doc.setLineWidth(0.2);
      y += 14;
    }
    else if (item.text) {
      doc.setFontSize(9.5); doc.setTextColor.apply(doc,COL.text2);
      var lines = doc.splitTextToSize(item.text, W-2*M);
      lines.forEach(function(line) {
        checkSpace(5);
        doc.text(line, M, y);
        y += 4.8;
      });
      y += 3;
    }
    else if (item.bullet) {
      checkSpace(6);
      doc.setFontSize(9.5); doc.setTextColor.apply(doc,COL.dark);
      doc.text('•', M+2, y);
      doc.setTextColor.apply(doc,COL.text2);
      var blines = doc.splitTextToSize(item.bullet, W-2*M-8);
      blines.forEach(function(line,i) {
        checkSpace(5);
        doc.text(line, M+7, y);
        y += 4.8;
      });
    }
  });

  /* ── Lampiran ── */
  if (config.lampiran && config.lampiran.length) {
    addPage();
    doc.setFillColor.apply(doc,COL.bg);
    doc.rect(M, y, W-2*M, 10, 'F');
    doc.setFontSize(14); doc.setTextColor.apply(doc,COL.dark); doc.setFont(undefined,'bold');
    doc.text('LAMPIRAN', M+4, y+7);
    doc.setFont(undefined,'normal');
    y += 16;

    config.lampiran.forEach(function(item) {
      if (item.heading) {
        checkSpace(12);
        doc.setFontSize(11); doc.setTextColor.apply(doc,COL.dark); doc.setFont(undefined,'bold');
        doc.text(item.heading, M, y+4);
        doc.setFont(undefined,'normal');
        y += 10;
      }
      else if (item.table) {
        checkSpace(20);
        doc.autoTable({
          startY: y,
          head: [item.table.head],
          body: item.table.body,
          margin: {left:M, right:M},
          styles: {fontSize:7.5, cellPadding:2, lineColor:COL.border, lineWidth:0.2, textColor:COL.dark},
          headStyles: {fillColor:COL.orange, textColor:COL.white, fontStyle:'bold', fontSize:7.5},
          alternateRowStyles: {fillColor:[250,251,253]},
          columnStyles: item.table.colStyles||{}
        });
        y = doc.lastAutoTable.finalY + 8;
      }
      else if (item.chart) {
        var img = getChartImage(item.chart.canvasId);
        if (img) {
          var cw=item.chart.width||(W-2*M), ch=item.chart.height||55;
          checkSpace(ch+6);
          try{doc.addImage(img,'PNG',M,y,cw,ch);}catch(e){}
          y += ch + 8;
        }
      }
    });
  }

  addFooter();
  doc.save(config.filename||'Laporan.pdf');
  } catch(err) {
    console.error('PDF export error:', err);
    alert('Gagal membuat PDF: '+err.message);
  }
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
