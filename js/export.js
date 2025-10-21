import { hexToRgb } from './colorConversion.js';

const writeUint16 = (view, offset, value) => view.setUint16(offset, value, false);
const writeUint32 = (view, offset, value) => view.setUint32(offset, value, false);

function downloadFile(filename, content, mimeType = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportCssVariables(palette) {
  const variables = palette
    .map((hex, idx) => `  --color-${idx + 1}: ${hex};`)
    .join('\n');
  const content = `:root {\n${variables}\n}\n`;
  downloadFile('palette.css', content, 'text/css');
}

export function exportScssVariables(palette) {
  const content = palette
    .map((hex, idx) => `$color-${idx + 1}: ${hex};`)
    .join('\n');
  downloadFile('palette.scss', content, 'text/x-scss');
}

export function exportJson(palette) {
  const content = JSON.stringify(palette, null, 2);
  downloadFile('palette.json', content, 'application/json');
}

export function exportUrl(palette) {
  const encoded = encodeURIComponent(palette.join(','));
  const url = `${window.location.origin}${window.location.pathname}?palette=${encoded}`;
  navigator.clipboard
    .writeText(url)
    .catch(() => downloadFile('palette-url.txt', url, 'text/plain'));
}

export function exportPng(palette) {
  const width = 800;
  const height = 200;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const swatchWidth = width / palette.length;
  palette.forEach((hex, index) => {
    ctx.fillStyle = hex;
    ctx.fillRect(index * swatchWidth, 0, swatchWidth, height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText(hex, index * swatchWidth + 20, height - 30);
  });
  canvas.toBlob((blob) => downloadFile('palette.png', blob, 'image/png'));
}

/**
 * Create a very small PDF using raw PDF syntax.
 * The PDF consists of colored rectangles with labels.
 */
export function exportPdf(palette) {
  const pageWidth = 595.28;
  const pageHeight = 200;
  const swatchWidth = pageWidth / palette.length;
  const encoder = new TextEncoder();
  let pdf = '%PDF-1.4\n';
  const swatchContent = palette
    .map((hex, idx) => {
      const { r, g, b } = hexToRgb(hex);
      const x = idx * swatchWidth;
      return `q\n${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg\n${x.toFixed(2)} 0 ${swatchWidth.toFixed(2)} ${pageHeight.toFixed(2)} re\nf\nQ\n`;
    })
    .join('');

  const textContent = palette
    .map((hex, idx) => `BT /F1 16 Tf ${idx * swatchWidth + 12} 20 Td (${hex}) Tj ET\n`)
    .join('');

  const streamContent = `${swatchContent}${textContent}`;
  const streamLength = encoder.encode(streamContent).length;
  const objects = [
    { id: 1, content: '<< /Type /Catalog /Pages 2 0 R >>' },
    { id: 2, content: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' },
    {
      id: 3,
      content: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources 5 0 R /Contents 6 0 R >>`,
    },
    { id: 4, content: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' },
    { id: 5, content: '<< /Font << /F1 4 0 R >> >>' },
    { id: 6, content: `<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream` },
  ];

  const offsets = Array(objects.length + 1).fill(0);
  objects.forEach((object) => {
    offsets[object.id] = pdf.length;
    pdf += `${object.id} 0 obj\n${object.content}\nendobj\n`;
  });

  const startxref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  downloadFile('palette.pdf', blob, 'application/pdf');
}

/**
 * Minimal ASE exporter. The ASE format is binary and consists of chunked color records.
 * This implementation covers RGB swatches only which is sufficient for palettes.
 */
export function exportAse(palette) {
  const chunks = [];
  palette.forEach((hex) => {
    const name = hex;
    const { r, g, b } = hexToRgb(hex);
    const nameChars = name.length + 1;
    const recordLength = 2 + nameChars * 2 + 4 + 4 * 4 + 2;
    const buffer = new ArrayBuffer(6 + recordLength);
    const view = new DataView(buffer);
    view.setUint16(0, 0x0001, false); // color entry
    view.setUint32(2, recordLength, false);
    view.setUint16(6, nameChars, false);
    let pointer = 8;
    for (let i = 0; i < name.length; i += 1) {
      view.setUint16(pointer, name.charCodeAt(i), false);
      pointer += 2;
    }
    view.setUint16(pointer, 0, false);
    pointer += 2;
    ['R', 'G', 'B', ' '].forEach((char, idx) => view.setUint8(pointer + idx, char.charCodeAt(0)));
    pointer += 4;
    view.setFloat32(pointer, r / 255, false);
    view.setFloat32(pointer + 4, g / 255, false);
    view.setFloat32(pointer + 8, b / 255, false);
    view.setFloat32(pointer + 12, 1, false);
    pointer += 16;
    view.setUint16(pointer, 0, false); // color type
    chunks.push(new Uint8Array(buffer));
  });

  const header = new ArrayBuffer(12);
  const headerView = new DataView(header);
  writeUint32(headerView, 0, 0x41534546); // 'ASEF'
  writeUint16(headerView, 4, 1);
  writeUint16(headerView, 6, 0);
  headerView.setUint32(8, palette.length, false);

  const blob = new Blob([header, ...chunks], { type: 'application/octet-stream' });
  downloadFile('palette.ase', blob, 'application/octet-stream');
}

export default {
  exportCssVariables,
  exportScssVariables,
  exportJson,
  exportUrl,
  exportPng,
  exportPdf,
  exportAse,
};
