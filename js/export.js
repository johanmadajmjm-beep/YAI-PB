/* ═══════════════════════════════════════════════
   export.js — Shared PDF & Excel export utilities
   Dependencies: jsPDF, jsPDF-AutoTable, SheetJS
═══════════════════════════════════════════════ */

/* ── Helper: format filter summary string ── */
window.getFilterSummary = function(filters) {
  var parts = [];
  filters.forEach(function(f) {
    if (f.val && f.val !== '' && f.val !== '__blank__') {
      parts.push(f.label + ': ' + f.val);
    } else if (f.val === '__blank__') {
      parts.push(f.label + ': (Tanggal Kosong)');
    }
  });
  return parts.length ? parts.join(' | ') : 'Semua Data (Tanpa Filter)';
};

/* ── Helper: capture chart canvas as image ── */
window.getChartImage = function(canvasId) {
  var el = document.getElementById(canvasId);
  if (!el || el.style.display === 'none') return null;
  try { return el.toDataURL('image/png'); } catch(e) { return null; }
};

/* ══════════════════════════════════════════════════
   buildPDF — Professional PDF Report Generator
   config: {
     title: string,
     subtitle: string,
     filterText: string,
     kpis: [{label, value, sub?}],
     sections: [{type:'table'|'chart'|'text', ...}]
   }
══════════════════════════════════════════════════ */
window.buildPDF = function(config) {
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  var W = 210, H = 297, M = 15; // A4 dims + margin
  var pageNum = 1;
  var y = M;

  var COL = {
    orange: [249,115,22], dark: [26,31,54], text2: [74,85,128],
    text3: [138,150,184], border: [232,236,244], bg: [245,246,250],
    white: [255,255,255], green: [34,197,94], blue: [79,142,247]
  };

  function addPage() {
    addFooter();
    doc.addPage();
    pageNum++;
    y = M;
  }
  function checkSpace(need) { if (y + need > H - 20) addPage(); }

  function addFooter() {
    doc.setFontSize(8); doc.setTextColor.apply(doc, COL.text3);
    doc.text('YAI Dashboard Report — Generated ' + new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'}) + ', ' + new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}), M, H - 8);
    doc.text('Halaman ' + pageNum, W - M, H - 8, { align: 'right' });
    doc.setDrawColor.apply(doc, COL.border);
    doc.line(M, H - 12, W - M, H - 12);
  }

  /* ── Header ── */
  doc.setFillColor.apply(doc, COL.orange);
  doc.rect(0, 0, W, 32, 'F');
  doc.setFontSize(18); doc.setTextColor.apply(doc, COL.white);
  doc.setFont(undefined, 'bold');
  doc.text(config.title || 'Laporan', M, 14);
  doc.setFontSize(10); doc.setFont(undefined, 'normal');
  doc.text(config.subtitle || 'Yayasan Ayo Indonesia', M, 21);
  doc.setFontSize(8);
  doc.text(new Date().toLocaleDateString('id-ID', {day:'2-digit',month:'long',year:'numeric'}), W - M, 14, {align:'right'});
  y = 38;

  /* ── Filter summary ── */
  if (config.filterText) {
    doc.setFillColor.apply(doc, COL.bg);
    doc.roundedRect(M, y, W - 2*M, 8, 2, 2, 'F');
    doc.setFontSize(8); doc.setTextColor.apply(doc, COL.text2);
    doc.setFont(undefined, 'bold');
    doc.text('Filter: ', M + 3, y + 5.5);
    doc.setFont(undefined, 'normal');
    doc.text(config.filterText, M + 14, y + 5.5);
    y += 14;
  }

  /* ── KPI Cards ── */
  if (config.kpis && config.kpis.length) {
    var kpiW = (W - 2*M - (config.kpis.length - 1) * 3) / config.kpis.length;
    config.kpis.forEach(function(kpi, i) {
      var kx = M + i * (kpiW + 3);
      doc.setFillColor.apply(doc, COL.white);
      doc.setDrawColor.apply(doc, COL.border);
      doc.roundedRect(kx, y, kpiW, 18, 2, 2, 'FD');
      doc.setFontSize(7); doc.setTextColor.apply(doc, COL.text3);
      doc.text(kpi.label, kx + 3, y + 5);
      doc.setFontSize(13); doc.setTextColor.apply(doc, COL.dark);
      doc.setFont(undefined, 'bold');
      doc.text(String(kpi.value), kx + 3, y + 13);
      doc.setFont(undefined, 'normal');
      if (kpi.sub) {
        doc.setFontSize(6); doc.setTextColor.apply(doc, COL.text3);
        doc.text(kpi.sub, kx + kpiW - 3, y + 15, {align:'right'});
      }
    });
    y += 24;
  }

  /* ── Sections ── */
  (config.sections || []).forEach(function(sec) {
    if (sec.type === 'heading') {
      checkSpace(12);
      doc.setFontSize(12); doc.setTextColor.apply(doc, COL.dark);
      doc.setFont(undefined, 'bold');
      doc.text(sec.text, M, y + 4);
      doc.setFont(undefined, 'normal');
      if (sec.sub) {
        doc.setFontSize(8); doc.setTextColor.apply(doc, COL.text3);
        doc.text(sec.sub, M, y + 9);
        y += 14;
      } else {
        y += 8;
      }
    }
    else if (sec.type === 'text') {
      checkSpace(10);
      doc.setFontSize(9); doc.setTextColor.apply(doc, COL.text2);
      var lines = doc.splitTextToSize(sec.text, W - 2*M);
      lines.forEach(function(line) {
        checkSpace(5);
        doc.text(line, M, y + 4);
        y += 4.5;
      });
      y += 4;
    }
    else if (sec.type === 'table') {
      checkSpace(20);
      doc.autoTable({
        startY: y,
        head: [sec.head],
        body: sec.body,
        margin: { left: M, right: M },
        styles: { fontSize: 7.5, cellPadding: 2, lineColor: COL.border, lineWidth: 0.2, textColor: COL.dark },
        headStyles: { fillColor: COL.orange, textColor: COL.white, fontStyle: 'bold', fontSize: 7.5 },
        alternateRowStyles: { fillColor: [250, 251, 253] },
        didDrawPage: function(data) {
          if (data.pageNumber > 1) { pageNum++; }
        },
        columnStyles: sec.colStyles || {}
      });
      y = doc.lastAutoTable.finalY + 8;
    }
    else if (sec.type === 'chart') {
      var img = getChartImage(sec.canvasId);
      if (img) {
        var cw = sec.width || (W - 2*M);
        var ch = sec.height || 55;
        checkSpace(ch + 4);
        try { doc.addImage(img, 'PNG', M, y, cw, ch); } catch(e) {}
        y += ch + 6;
      }
    }
    else if (sec.type === 'spacer') {
      y += sec.height || 6;
    }
  });

  addFooter();
  doc.save(config.filename || 'Laporan.pdf');
};

/* ══════════════════════════════════════════════════
   exportExcel — Export benef + pjum to 2-sheet XLSX
══════════════════════════════════════════════════ */
window.exportExcelLaporan = function(benefRows, pjumRows) {
  var B = window.B, P = window.P;
  var wb = XLSX.utils.book_new();

  /* Sheet 1: Beneficiary */
  var bHead = ['Nama','Gender','Kat.Usia','Kategori','Disabilitas','Desa','Kecamatan','Kabupaten','Program','Kegiatan','Benefit','Staf','Tanggal','Kode'];
  var bData = benefRows.map(function(r) {
    return [r[B.nama],r[B.gender],r[B.katUsia]||r[B.usia],r[B.kategori],r[B.disab],r[B.desa],r[B.kec],r[B.kab],r[B.proyek],r[B.kegiatan],r[B.benefit],r[B.staf],r[B.tgl],r[B.kode]];
  });
  var ws1 = XLSX.utils.aoa_to_sheet([bHead].concat(bData));
  ws1['!cols'] = bHead.map(function(){ return {wch:16}; });
  XLSX.utils.book_append_sheet(wb, ws1, 'Beneficiary');

  /* Sheet 2: PJUM */
  var pHead = ['Tanggal','Staf','Program','Kode','Kegiatan','Item','Komponen','Jumlah (Rp)','File'];
  var pData = pjumRows.map(function(r) {
    return [r[P.tgl],r[P.staf],r[P.proyek],r[P.kode],r[P.kegiatan],r[P.item],classifyItem(r[P.item]),parseFloat(r[P.jumlah])||0,r[P.file]];
  });
  var ws2 = XLSX.utils.aoa_to_sheet([pHead].concat(pData));
  ws2['!cols'] = pHead.map(function(){ return {wch:18}; });
  XLSX.utils.book_append_sheet(wb, ws2, 'PJUM');

  XLSX.writeFile(wb, 'YAI_Export_' + new Date().toISOString().slice(0,10) + '.xlsx');
};
