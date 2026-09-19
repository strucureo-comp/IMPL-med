import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { imageUrl } from './api';

const ink = [27, 48, 57];
const muted = [105, 127, 136];
const teal = [34, 109, 112];
const labels = { cardio: 'Cardio & thoracic', neurosurgery: 'Neurosurgery & spine', plastic_surgery: 'Plastic & reconstructive', other_catalog: 'General instruments' };
const text = value => String(value || '').replace(/[\u2010-\u2015]/g, '-');
let fontPromise;
async function loadFonts() {
  if (!fontPromise) fontPromise = Promise.all(['Regular', 'Bold'].map(async weight => {
    const response = await fetch(`/fonts/NotoSans-${weight}.ttf`);
    if (!response.ok) throw new Error('The report font could not be loaded. Please try again.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let start = 0; start < bytes.length; start += 8192) binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
    return btoa(binary);
  })).catch(error => { fontPromise = null; throw error; });
  return fontPromise;
}

export async function createTrayPdf(items, metadata) {
  if (!items.length) throw new Error('Add an instrument to your tray before exporting.');
  const [regular, bold] = await loadFonts();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.addFileToVFS('NotoSans-Regular.ttf', regular);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFileToVFS('NotoSans-Bold.ttf', bold);
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
  doc.setFont('NotoSans');
  doc.setProperties({ title: text(metadata.name || 'Surgical instrument set report'), author: 'IMPL', subject: 'Surgery tray article list' });

  const images = await Promise.all(items.map(async item => {
    if (!item.has_image || !item.image_file) return null;
    try {
      const response = await fetch(imageUrl(item.image_category || item.category, item.image_file), { signal: AbortSignal.timeout(6000) });
      if (!response.ok) return null;
      return new Uint8Array(await response.arrayBuffer());
    } catch { return null; } // An unavailable photo must not prevent an article report.
  }));

  function brand(continued = false) {
    doc.setFillColor(...ink); doc.roundedRect(16, 15, 10, 10, 2, 2, 'F');
    doc.setDrawColor(255); doc.setLineWidth(.7);
    [19, 21, 23].forEach(x => doc.line(x, 18, x, 22));
    doc.line(23, 18, 24.4, 19.4); doc.line(23, 22, 24.4, 20.6);
    doc.setFont('NotoSans', 'bold'); doc.setFontSize(17); doc.setTextColor(...ink); doc.text('IMPL', 30, 21.8);
    doc.setFont('NotoSans', 'normal'); doc.setFontSize(7); doc.setTextColor(...muted); doc.text('INSTRUMENT INTELLIGENCE', 30, 26.2);
    doc.setFontSize(8); doc.text(continued ? 'Surgical instrument set report - continued' : 'Surgical instrument set report', 194, 21, { align: 'right' });
    doc.setDrawColor(219, 229, 232); doc.setLineWidth(.35); doc.line(16, 32, 194, 32);
  }
  brand();
  doc.setFont('NotoSans', 'bold'); doc.setFontSize(19); doc.setTextColor(...ink);
  const heading = doc.splitTextToSize(text(metadata.name || 'Surgery tray'), 178);
  doc.text(heading, 16, 44);
  let y = 49 + (heading.length - 1) * 8;

  const fields = [
    ['Hospital / clinic', metadata.hospital, 'Department / region', metadata.region],
    ['Set ID', metadata.set_no, 'Container', metadata.container],
    ['Report date', metadata.report_date, 'Tray quantity', `${items.reduce((sum, item) => sum + item.quantity, 0)} instruments / ${items.length} ${items.length === 1 ? 'article' : 'articles'}`],
  ];
  fields.forEach(([label, value, rightLabel, rightValue]) => {
    doc.setFont('NotoSans', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...muted);
    doc.text(label.toUpperCase(), 16, y); doc.text(rightLabel.toUpperCase(), 109, y);
    doc.setFontSize(9); doc.setTextColor(...ink);
    const left = doc.splitTextToSize(text(value || 'Not specified'), 81);
    const right = doc.splitTextToSize(text(rightValue || 'Not specified'), 85);
    doc.text(left, 16, y + 5); doc.text(right, 109, y + 5);
    y += 10 + Math.max(left.length, right.length) * 4.3;
  });
  autoTable(doc, {
    startY: y + 2,
    margin: { left: 16, right: 16, top: 43, bottom: 24 },
    head: [['Article code', 'Instrument / specialty', 'Size', 'Qty', 'Image']],
    body: items.map(item => [text(item.code), `${text(item.name)}\n${labels[item.category] || text(item.category)}`, text(item.size || '-'), String(item.quantity), '']),
    theme: 'plain',
    styles: { font: 'NotoSans', fontSize: 8.2, textColor: ink, cellPadding: 3, minCellHeight: 18, lineColor: [228, 235, 238], lineWidth: { bottom: .2 }, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: teal, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, minCellHeight: 10 },
    alternateRowStyles: { fillColor: [247, 250, 250] },
    columnStyles: { 0: { cellWidth: 34 }, 1: { cellWidth: 82 }, 2: { cellWidth: 20 }, 3: { cellWidth: 14, halign: 'center' }, 4: { cellWidth: 28, halign: 'center' } },
    rowPageBreak: 'avoid',
    willDrawPage: data => { if (data.pageNumber > 1) brand(true); },
    didDrawCell: cell => {
      if (cell.section !== 'body') return;
      const item = items[cell.row.index];
      if (cell.column.index === 1 && item.url) doc.link(cell.cell.x, cell.cell.y, cell.cell.width, cell.cell.height, { url: item.url });
      if (cell.column.index !== 4) return;
      const image = images[cell.row.index];
      if (image) {
        try {
          const props = doc.getImageProperties(image);
          const ratio = Math.min(22 / props.width, 13 / props.height);
          const width = props.width * ratio; const height = props.height * ratio;
          doc.addImage(image, 'PNG', cell.cell.x + (cell.cell.width - width) / 2, cell.cell.y + (cell.cell.height - height) / 2, width, height);
          return;
        } catch { /* Keep the row readable if an image is corrupt. */ }
      }
      doc.setFontSize(7); doc.setTextColor(...muted); doc.text('-', cell.cell.x + cell.cell.width / 2, cell.cell.y + cell.cell.height / 2 + 1, { align: 'center' });
    },
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFont('NotoSans', 'normal'); doc.setFontSize(7); doc.setTextColor(...muted);
    doc.setDrawColor(219, 229, 232); doc.line(16, 278, 194, 278);
    doc.text('Catalog source: KLS Martin. Verify article specifications before use.', 16, 283);
    doc.text(`Page ${page} of ${pages}`, 194, 283, { align: 'right' });
    doc.text('Prepared with IMPL | Article names link to catalog references where available.', 16, 288);
  }
  return doc;
}

export async function downloadTrayPdf(items, metadata) {
  const doc = await createTrayPdf(items, metadata);
  const name = (metadata.set_no || 'Surgery-Tray').replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 70);
  doc.save(`IMPL-${name}-${metadata.report_date}.pdf`);
}
