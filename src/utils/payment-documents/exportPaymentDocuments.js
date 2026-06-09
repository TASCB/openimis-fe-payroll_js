import autoTable from 'jspdf-autotable';
import {
  BRAND,
  DEFAULT_TITLES,
  createProtectedPdf,
  drawDocumentHeader,
  drawFooter,
  drawMetadataBoxes,
  drawSummaryBox,
  drawWatermark,
  formatCurrency,
  loadTasafPdfAssets,
} from './pdfCore';

export const DEFAULT_PAYLIST_BREAKDOWN_SUMMARY = {
  paymentLeft: [
    { label: 'Ruzuku isiyo na Masharti', amount: 0 },
    { label: 'Ruzuku ya watoto < 18', amount: 100000 },
    { label: 'Ruzuku ya Ulemavu', amount: 0 },
    { label: 'Ruzuku ya Watoto, Primary & Sekondari', amount: 192000 },
    { label: 'Malipo ambayo hayakuchukuliwa kipindi kilichopita', amount: 0 },
    { label: 'Madai', amount: 0 },
    { label: 'Malipo ya PWP', amount: 0 },
    { label: 'Malipo ya Ruzuku ya Uzalishaji', amount: 0 },
  ],
  deductionRight: [
    { label: 'Adhabu ya kutotimiza masharti ya Elimu', amount: 0 },
    { label: 'Adhabu ya kutotimiza masharti ya Afya', amount: 0 },
    { label: 'Malipo Yaliyozidishwa', amount: 0 },
  ],
  paymentTotalLabel: 'Jumla Ndogo ya Dhana ya Malipo',
  deductionTotalLabel: 'Jumla Ndogo ya Dhana ya Makato',
};

export const demoPaylistPayload = {
  fileName: 'TASAF_Paylist_Scaffold.pdf',
  title: 'ORODHA YA MALIPO YA WALENGWA YA KIJIJI',
  security: { enabled: true },
  metadata: [
    { label: 'Tarehe:', value: new Date().toLocaleDateString() },
    { label: 'Wilaya:', value: 'MONDULI' },
    { label: 'Kijiji:', value: 'NAITI' },
  ],
  summaryText: 'Jumla ya Walengwa: 2 | Jumla ya Fedha: 71,925.00',
  items: [
    {
      controlNumber: '02010910220745',
      headName: 'ADELA NGALUMA LAITEI',
      representativeName: 'ADELA NGALUMA LAITEI',
      channel: 'MPESA',
      amount: 21666.0,
    },
    {
      controlNumber: '02010910220616',
      headName: 'ANNA NYANGUS LUKUMAI',
      representativeName: 'ANNA NYANGUS LUKUMAI',
      channel: 'MPESA',
      amount: 50259.0,
    },
  ],
  breakdownSummary: DEFAULT_PAYLIST_BREAKDOWN_SUMMARY,
};

export const DEFAULT_SLIP_DISCLAIMER = '** Kama kiasi cha malipo sio sahihi tafadhali wasilisha madai yako kwenye kamati husika ya kijiji kwa ajili ya marekebisho kabla ya tarehe ya malipo yanayofuata';
export const DEFAULT_SLIP_HELP_LINE = 'Kwa maulizo piga namba 0800 110 057';

export const demoPaymentSlipPayload = {
  fileName: 'TASAF_Payment_Slip_Scaffold.pdf',
  title: 'ORODHA YA MALIPO YA WALENGWA YA KIJIJI',
  security: { enabled: true },
  payCode: '01022025',
  profileRows: [
    { label: 'MAMLAKA YA ENEO LA UTEKELEZAJI', value: 'KARATU' },
    { label: 'KATA', value: 'MBULUMBULU' },
    { label: 'KIJIJI/MTAA/SHEHIA', value: 'KITETE' },
    { label: 'MSIMAMIZI WA KAYA', value: 'AGNESS FAUSTINI MASSO' },
    { label: 'KIPINDI CHA MALIPO', value: 'Feb 2025' },
    { label: 'JINA LA MWAKILISHI', value: 'AGNESS FAUSTIN MASONG' },
    { label: 'NAMBA YA KITAMBULISHO', value: '02041310438750' },
    { label: 'AKAUNTI/SIMU', value: '0628816914' },
    { label: 'NJIA YA MALIPO', value: 'HALOPESA' },
  ],
  breakdown: [
    { label: 'Ruzuku isiyo na Masharti', amount: 0, group: 'left' },
    { label: 'Malipo ya watoto < 18', amount: 10000, group: 'left' },
    { label: 'Malipo ya Ulemavu', amount: 0, group: 'left' },
    { label: 'Malipo ya Watoto, Walio Shule ya Msingi', amount: 8000, group: 'left' },
    { label: 'Sekondari/Malipo ya Kufunga Mradi', amount: 12000, group: 'left' },
    { label: 'Malipo ambayo hayakuchukuliwa kipindi kilichopita', amount: 0, group: 'left' },
    { label: 'Adhabu ya kutotimiza masharti ya Elimu', amount: 0, group: 'right' },
    { label: 'Adhabu ya kutotimiza masharti ya Afya', amount: 0, group: 'right' },
    { label: 'Malipo yaliyozidishwa Kipindi cha nyuma', amount: 0, group: 'right' },
  ],
  totals: {
    leftLabel: 'Jumla Ndogo ya Dhana ya Malipo',
    leftAmount: 30000,
    rightLabel: 'Jumla Ndogo ya Dhana ya Makato',
    rightAmount: 0,
    totalLabel: 'JUMLA YA MALIPO',
    totalAmount: 30000,
  },
  disclaimer: DEFAULT_SLIP_DISCLAIMER,
  helpLine: DEFAULT_SLIP_HELP_LINE,
};

function drawPaylistSummaryPage(doc, assets, payload, title) {
  const summary = payload.breakdownSummary || DEFAULT_PAYLIST_BREAKDOWN_SUMMARY;
  const left = summary.paymentLeft || [];
  const right = summary.deductionRight || [];
  if (left.length === 0 && right.length === 0) return;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  doc.addPage('a4', 'portrait');

  const maxRows = Math.max(left.length, right.length);
  const body = [];
  for (let i = 0; i < maxRows; i += 1) {
    const l = left[i];
    const r = right[i];
    body.push([
      l?.label || '',
      l ? formatCurrency(l.amount) : '',
      r?.label || '',
      r ? formatCurrency(r.amount) : '',
    ]);
  }

  const paymentTotal = left.reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0);
  const deductionTotal = right.reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0);

  autoTable(doc, {
    startY: 48,
    head: [['DHANA YA MALIPO', 'KIASI', 'DHANA YA MAKATO', 'KIASI']],
    body,
    foot: [[
      summary.paymentTotalLabel || 'Jumla Ndogo ya Dhana ya Malipo',
      formatCurrency(paymentTotal),
      summary.deductionTotalLabel || 'Jumla Ndogo ya Dhana ya Makato',
      formatCurrency(deductionTotal),
    ]],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5, valign: 'middle' },
    headStyles: {
      fillColor: BRAND.primary,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [250, 250, 250],
      textColor: BRAND.ink,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: BRAND.altRow },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 23, halign: 'right' },
      2: { cellWidth: 70 },
      3: { cellWidth: 23, halign: 'right' },
    },
    margin: { left: margin, right: margin, top: 52 },
    didDrawPage: () => {
      drawWatermark(doc, assets, pageWidth, pageHeight);
      drawDocumentHeader({
        doc, assets, title, pageWidth, margin,
        organizationName: payload.organizationName,
        programName: payload.programName,
      });
      drawFooter(doc);
    },
  });
}

export async function exportPaylistPdf(payload = demoPaylistPayload) {
  const assets = await loadTasafPdfAssets();
  const doc = createProtectedPdf({ orientation: 'portrait', protection: payload.security });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const title = payload.title || 'ORODHA YA MALIPO YA WALENGWA YA KIJIJI';

  drawDocumentHeader({ doc, assets, title, pageWidth, margin });

  let contentY = 48;
  contentY = drawMetadataBoxes({
    doc,
    margin,
    pageWidth,
    startY: contentY,
    items: payload.metadata || [],
  });
  contentY += 6;

  if (payload.summaryText) {
    contentY = drawSummaryBox({
      doc,
      margin,
      pageWidth,
      startY: contentY,
      title: 'Muhtasari',
      text: payload.summaryText,
    });
    contentY += 8;
  }

  drawWatermark(doc, assets, pageWidth, pageHeight);

  const rows = (payload.items || []).map((item, index) => [
    index + 1,
    item.controlNumber || '-',
    item.headName || '-',
    item.representativeName || '-',
    item.channel || '-',
    formatCurrency(item.amount),
  ]);

  autoTable(doc, {
    startY: contentY,
    head: [[
      'Na.',
      'NAMBA YA MLENGWA',
      'MKUU WA KAYA',
      'MWAKILISHO WA KAYA',
      'NJIA YA MALIPO',
      'KIASI',
    ]],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: BRAND.primary,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: BRAND.altRow,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 34 },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 35, halign: 'right' },
    },
    margin: {
      left: margin,
      right: margin,
      top: 52,
    },
    didDrawPage: () => {
      const pageNumber = doc.getCurrentPageInfo().pageNumber;
      if (pageNumber > 1) {
        drawDocumentHeader({
        doc, assets, title, pageWidth, margin,
        organizationName: payload.organizationName,
        programName: payload.programName,
      });
      }
      drawWatermark(doc, assets, pageWidth, pageHeight);
      drawFooter(doc);
    },
  });

  drawPaylistSummaryPage(doc, assets, payload, title);

  doc.save(payload.fileName || 'TASAF_Paylist.pdf');
}

const SLIP_LAYOUT = {
  outerMargin: 6,
  gap: 4,
  topMargin: 6,
  width: 97,
};

function drawCompactSlipHeader(doc, assets, payload, { x, y, width }) {
  const headerHeight = 22;
  doc.setFillColor(...BRAND.primary);
  doc.rect(x, y, width, headerHeight, 'F');

  if (assets?.tasafLogo) {
    try {
      doc.addImage(assets.tasafLogo.data, assets.tasafLogo.format, x + 2, y + 2, 14, 14);
    } catch (e) {
      // ignore
    }
  }

  const titleX = x + 18;
  const titleWidth = width - 20;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(payload.organizationName || DEFAULT_TITLES[0], titleX + (titleWidth / 2), y + 4.5, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text(payload.programName || DEFAULT_TITLES[1], titleX + (titleWidth / 2), y + 8.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    payload.title || 'ORODHA YA MALIPO YA WALENGWA YA KIJIJI',
    titleX + (titleWidth / 2),
    y + 12.5,
    { align: 'center' },
  );

  const chipY = y + 15;
  const chipX = x + 18;
  const chipWidth = width - 20;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(chipX, chipY, chipWidth, 5.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.ink);
  doc.text('PAY CODE:', chipX + 2, chipY + 3.8);
  doc.setTextColor(...BRAND.danger);
  doc.text(String(payload.payCode || '-'), chipX + 22, chipY + 3.8);
  doc.setTextColor(...BRAND.ink);

  return y + headerHeight + 2;
}

function drawCompactSectionTitle(doc, label, { x, y, width }) {
  doc.setFillColor(...BRAND.accent);
  doc.rect(x, y, width, 5, 'F');
  doc.setDrawColor(...BRAND.primary);
  doc.rect(x, y, width, 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.ink);
  doc.text(label, x + (width / 2), y + 3.5, { align: 'center' });
  return y + 5;
}

function drawCompactSlip(doc, assets, payload, { x, y, width }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightGutter = pageWidth - x - width;
  let contentY = drawCompactSlipHeader(doc, assets, payload, { x, y, width });

  contentY = drawCompactSectionTitle(doc, 'MUHTASARI WA TAARIFA YA MALIPO YA HALMASHAURI', {
    x, y: contentY, width,
  });

  const profileRows = payload.profileRows || [];
  const labelW = width * 0.32;
  const valueW = (width - (labelW * 2)) / 2;
  const profilePairs = [];
  for (let i = 0; i < profileRows.length; i += 2) {
    const l = profileRows[i];
    const r = profileRows[i + 1];
    profilePairs.push([
      l?.label || '',
      l?.value ?? '-',
      r?.label || '',
      r?.value ?? '-',
    ]);
  }
  autoTable(doc, {
    startY: contentY,
    body: profilePairs,
    theme: 'grid',
    styles: {
      fontSize: 6, cellPadding: 1, valign: 'middle', overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: labelW, fillColor: BRAND.soft, fontStyle: 'bold' },
      1: { cellWidth: valueW, textColor: BRAND.primary, fontStyle: 'bold' },
      2: { cellWidth: labelW, fillColor: BRAND.soft, fontStyle: 'bold' },
      3: { cellWidth: valueW, textColor: BRAND.primary, fontStyle: 'bold' },
    },
    margin: { left: x, right: rightGutter },
  });
  contentY = doc.lastAutoTable.finalY + 2;

  contentY = drawCompactSectionTitle(doc, 'TAARIFA YA MALIPO', { x, y: contentY, width });

  const breakdown = payload.breakdown || [];
  const left = breakdown.filter((row) => row.group !== 'right');
  const right = breakdown.filter((row) => row.group === 'right');
  const maxRows = Math.max(left.length, right.length);
  const body = [];
  for (let i = 0; i < maxRows; i += 1) {
    body.push([
      left[i]?.label || '',
      left[i] ? formatCurrency(left[i].amount) : '',
      right[i]?.label || '',
      right[i] ? formatCurrency(right[i].amount) : '',
    ]);
  }
  const totals = payload.totals || {};
  const bdLabelW = width * 0.36;
  const bdValueW = (width / 2) - bdLabelW;
  autoTable(doc, {
    startY: contentY,
    head: [['DHANA YA MALIPO', 'KIASI', 'DHANA YA MAKATO', 'KIASI']],
    body,
    foot: [[
      totals.leftLabel || 'Jumla Ndogo ya Dhana ya Malipo',
      formatCurrency(totals.leftAmount),
      totals.rightLabel || 'Jumla Ndogo ya Dhana ya Makato',
      formatCurrency(totals.rightAmount),
    ]],
    theme: 'grid',
    styles: {
      fontSize: 6, cellPadding: 1, valign: 'middle', overflow: 'linebreak',
    },
    headStyles: {
      fillColor: BRAND.primary, textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 6.5,
    },
    footStyles: {
      fillColor: [248, 248, 248], textColor: BRAND.ink, fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: BRAND.altRow },
    columnStyles: {
      0: { cellWidth: bdLabelW },
      1: { cellWidth: bdValueW, halign: 'right' },
      2: { cellWidth: bdLabelW },
      3: { cellWidth: bdValueW, halign: 'right' },
    },
    margin: { left: x, right: rightGutter },
  });
  contentY = doc.lastAutoTable.finalY;

  doc.setFillColor(...BRAND.primary);
  doc.rect(x, contentY, width, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(totals.totalLabel || 'JUMLA YA MALIPO', x + 2, contentY + 4.8);
  doc.text(formatCurrency(totals.totalAmount), x + width - 2, contentY + 4.8, { align: 'right' });
  doc.setTextColor(...BRAND.ink);
  contentY += 9;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(...BRAND.muted);
  const disclaimerLines = doc.splitTextToSize(
    payload.disclaimer || DEFAULT_SLIP_DISCLAIMER,
    width - 2,
  );
  doc.text(disclaimerLines, x + 1, contentY + 2.5);
  contentY += (disclaimerLines.length * 2.6) + 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.danger);
  doc.text(
    payload.helpLine || DEFAULT_SLIP_HELP_LINE,
    x + (width / 2),
    contentY + 3,
    { align: 'center' },
  );
  doc.setTextColor(...BRAND.ink);
}

function drawCutLine(doc, pageWidth, pageHeight) {
  const centerX = pageWidth / 2;
  doc.setDrawColor(...BRAND.muted);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(centerX, 4, centerX, pageHeight - 4);
  doc.setLineDashPattern([], 0);
}

export async function exportPaymentSlipPdf(payload = demoPaymentSlipPayload) {
  return exportPaymentSlipsPdf([payload], {
    fileName: payload.fileName,
    security: payload.security,
  });
}

export async function exportPaymentSlipsPdf(payloads, options = {}) {
  const list = Array.isArray(payloads) ? payloads.filter(Boolean) : [];
  if (list.length === 0) return;

  const assets = await loadTasafPdfAssets();
  const doc = createProtectedPdf({
    orientation: 'portrait',
    protection: options.security || list[0]?.security,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const {
    outerMargin, gap, topMargin, width: slipWidth,
  } = SLIP_LAYOUT;

  const slotX = (slot) => (slot === 0
    ? outerMargin
    : outerMargin + slipWidth + gap);

  list.forEach((payload, index) => {
    const slot = index % 2;
    if (slot === 0 && index > 0) {
      doc.addPage('a4', 'portrait');
    }
    if (slot === 0) {
      drawWatermark(doc, assets, pageWidth, pageHeight);
      if (list.length - index > 1) drawCutLine(doc, pageWidth, pageHeight);
      drawFooter(doc);
    }
    drawCompactSlip(doc, assets, payload, {
      x: slotX(slot), y: topMargin, width: slipWidth,
    });
  });

  doc.save(options.fileName || 'TASAF_Payment_Slips.pdf');
}
