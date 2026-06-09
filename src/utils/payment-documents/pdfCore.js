import { jsPDF } from 'jspdf';

const BRAND = {
  primary: [0, 102, 102],
  accent: [188, 228, 233],
  soft: [240, 248, 248],
  ink: [0, 0, 0],
  muted: [100, 100, 100],
  border: [0, 102, 102],
  altRow: [245, 245, 245],
  danger: [186, 74, 74],
};

// [0] = implementing organisation (constant for the deployment),
// [1] = programme line — overridden per-program via payload.programName so the
// document is program-aware rather than hardcoded to the PCT programme.
export const DEFAULT_TITLES = [
  'MFUKO WA MAENDELEO YA JAMII (TASAF III)',
  'MPANGO WA KUNUSURU KAYA MASIKINI',
];

const getImageFormat = (mimeType) => {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.includes('png')) return 'PNG';
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'JPEG';
  if (normalized.includes('webp')) return 'WEBP';
  return null;
};

async function loadImageAsset(paths) {
  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (!response.ok) continue;
      const mimeType = response.headers.get('content-type') || '';
      const format = getImageFormat(mimeType);
      if (!format) continue;
      const blob = await response.blob();
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return { data, format };
    } catch (e) {
    }
  }
  return null;
}

export async function loadTasafPdfAssets() {
  const [tasafLogo, governmentLogo] = await Promise.all([
    loadImageAsset(['/front/tasafMIS.png', '/tasafMIS.png']),
    loadImageAsset(['/front/bibiNabwana.png', '/bibiNabwana.png']),
  ]);
  return { tasafLogo, governmentLogo };
}

export function createProtectedPdf({ orientation = 'portrait', protection = {} } = {}) {
  const baseOptions = {
    orientation,
    unit: 'mm',
    format: 'a4',
  };

  if (!protection?.enabled) {
    return new jsPDF(baseOptions);
  }

  try {
    return new jsPDF({
      ...baseOptions,
      encryption: {
        userPassword: protection.userPassword || '',
        ownerPassword: protection.ownerPassword || `tasafmis-${Date.now()}`,
        userPermissions: protection.userPermissions || ['print'],
      },
    });
  } catch (e) {
    const doc = new jsPDF(baseOptions);
    doc.setProperties({
      title: 'TASAF protected export',
      subject: 'Protected payment document export',
      keywords: 'tasaf, openimis, protected, export',
    });
    return doc;
  }
}

export function drawDocumentHeader({
  doc,
  assets,
  title,
  pageWidth,
  margin = 12,
  organizationName,
  programName,
}) {
  const headerHeight = 40;
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  if (assets?.governmentLogo) {
    try {
      doc.addImage(assets.governmentLogo.data, assets.governmentLogo.format, margin, 8, 24, 24);
    } catch (e) {
      // ignore
    }
  }
  if (assets?.tasafLogo) {
    try {
      doc.addImage(assets.tasafLogo.data, assets.tasafLogo.format, pageWidth - margin - 33, 6, 33, 28);
    } catch (e) {
      // ignore
    }
  }

  const centerX = pageWidth / 2;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(organizationName || DEFAULT_TITLES[0], centerX, 12, { align: 'center' });
  doc.setFontSize(11);
  doc.text(programName || DEFAULT_TITLES[1], centerX, 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(title || '', centerX, 24, { align: 'center' });
  doc.setTextColor(...BRAND.ink);
}

export function drawWatermark(doc, assets, pageWidth, pageHeight) {
  if (!assets?.tasafLogo || !doc.GState) return;
  const logoWidth = 150;
  const logoHeight = 130;
  const x = (pageWidth - logoWidth) / 2;
  const y = (pageHeight - logoHeight) / 2;
  doc.setGState(new doc.GState({ opacity: 0.07 }));
  doc.addImage(assets.tasafLogo.data, assets.tasafLogo.format, x, y, logoWidth, logoHeight);
  doc.setGState(new doc.GState({ opacity: 1 }));
}

export function drawFooter(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageNumber = doc.getCurrentPageInfo().pageNumber;
  const totalPages = doc.getNumberOfPages();

  doc.setDrawColor(...BRAND.primary);
  doc.line(12, pageHeight - 10, pageWidth - 12, pageHeight - 10);
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 12, pageHeight - 5, { align: 'right' });
  doc.setTextColor(...BRAND.ink);
}

export function drawMetadataBoxes({
  doc,
  margin = 12,
  pageWidth,
  startY,
  items,
}) {
  const safeItems = (items || []).filter(Boolean);
  if (safeItems.length === 0) return startY;

  const contentWidth = pageWidth - (margin * 2);
  const gap = 3;
  const boxHeight = 14;
  const boxWidth = (contentWidth - (gap * (safeItems.length - 1))) / safeItems.length;

  let x = margin;
  safeItems.forEach((item) => {
    doc.setFillColor(...BRAND.soft);
    doc.rect(x, startY, boxWidth, boxHeight, 'F');
    doc.setDrawColor(...BRAND.primary);
    doc.rect(x, startY, boxWidth, boxHeight);
    doc.setTextColor(...BRAND.ink);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.label || ''), x + 2, startY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const valueLines = doc.splitTextToSize(String(item.value ?? '-'), boxWidth - 4);
    doc.text(valueLines[0] || '-', x + 2, startY + 11);
    x += boxWidth + gap;
  });
  return startY + boxHeight;
}

export function drawSummaryBox({
  doc,
  margin = 12,
  pageWidth,
  startY,
  title = 'Muhtasari',
  text,
}) {
  const contentWidth = pageWidth - (margin * 2);
  doc.setFillColor(230, 245, 245);
  doc.rect(margin, startY, contentWidth, 16, 'F');
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.5);
  doc.rect(margin, startY, contentWidth, 16);
  doc.setTextColor(...BRAND.ink);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin + 3, startY + 5);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(String(text || ''), margin + 3, startY + 12);
  return startY + 16;
}

export function drawSectionTitle(doc, label, startY, options = {}) {
  const {
    x = 12,
    width = doc.internal.pageSize.getWidth() - 24,
    fillColor = BRAND.accent,
  } = options;
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, startY, width, 8, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(label, x + 3, startY + 5.5);
  return startY + 10;
}

export function drawKeyValueGrid(doc, rows, options = {}) {
  const {
    startY = 32,
    margin = 12,
    columns = 2,
    rowHeight = 12,
    labelWidth = 28,
  } = options;
  const pageWidth = doc.internal.pageSize.getWidth();
  const gap = 4;
  const availableWidth = pageWidth - (margin * 2) - (gap * (columns - 1));
  const colWidth = availableWidth / columns;
  let y = startY;

  rows.forEach((row, index) => {
    const column = index % columns;
    const rowIndex = Math.floor(index / columns);
    const x = margin + ((colWidth + gap) * column);
    y = startY + (rowIndex * rowHeight);

    doc.setDrawColor(...BRAND.border);
    doc.setFillColor(...BRAND.soft);
    doc.rect(x, y, labelWidth, rowHeight, 'F');
    doc.rect(x + labelWidth, y, colWidth - labelWidth, rowHeight);
    doc.rect(x, y, colWidth, rowHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(String(row.label || ''), x + 2, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...BRAND.primary);
    const valueLines = doc.splitTextToSize(String(row.value ?? '-'), colWidth - labelWidth - 4);
    doc.text(valueLines[0] || '-', x + labelWidth + 2, y + 7.2);
    doc.setTextColor(...BRAND.ink);
  });

  return y + rowHeight;
}

export function drawQrBlock(doc, { x, y, size = 22, qrImage, qrLabel }) {
  doc.setDrawColor(...BRAND.border);
  doc.rect(x, y, size, size);
  if (qrImage?.data && qrImage?.format) {
    doc.addImage(qrImage.data, qrImage.format, x, y, size, size);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('QR', x + (size / 2), y + (size / 2), { align: 'center' });
  }
  if (qrLabel) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(qrLabel, x + (size / 2), y + size + 4, { align: 'center' });
  }
}

export function drawAmountChip(doc, { x, y, label, value, width = 70 }) {
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(x, y, width, 10, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(label, x + 3, y + 6.2);
  doc.setFillColor(255, 255, 255);
  doc.rect(x + 24, y + 1.5, width - 27, 7);
  doc.setTextColor(210, 38, 38);
  doc.setFontSize(10.5);
  doc.text(String(value ?? '-'), x + 27, y + 6.2);
  doc.setTextColor(...BRAND.ink);
}

export function formatCurrency(value) {
  const numeric = Number(value || 0);
  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function normalizeBreakdownColumns(rows = []) {
  const normalized = rows.map((row) => ({
    label: row.label,
    amount: formatCurrency(row.amount),
    group: row.group || 'left',
    accent: row.accent || null,
  }));

  return {
    left: normalized.filter((row) => row.group === 'left'),
    right: normalized.filter((row) => row.group === 'right'),
  };
}

export { BRAND };
