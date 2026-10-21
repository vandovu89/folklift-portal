// Vẽ tem in nhiệt (đen trắng) khổ A6 / A7 lên canvas, dùng chung cho: xem trước, in từ máy tính,
// tải ảnh PNG và chia sẻ sang app máy in nhiệt trên điện thoại.
import { formatCapacity } from '@/lib/utils';
import type { ForkliftPrintData } from './PrintQrClient';

export const THERMAL_SIZES = {
  a6: { label: 'A6 (100x150)', widthMm: 100, heightMm: 150, specRows: 5 },
  a7: { label: 'A7 (74x105)', widthMm: 74, heightMm: 105, specRows: 3 },
} as const;
export type ThermalSize = keyof typeof THERMAL_SIZES;

// 12 px/mm ~ 305 dpi: đủ nét cho máy in nhiệt 203/300 dpi
const PX_PER_MM = 12;
const FONT = '"Segoe UI", Arial, sans-serif';

interface ThermalOptions {
  showCompany: boolean;
  showSpecs: boolean;
  showPrice: boolean;
  baseUrl: string;
}

function svgToImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const xml = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new window.Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = err => { URL.revokeObjectURL(url); reject(err); };
    img.src = url;
  });
}

// Đặt font lớn nhất (<= size) sao cho chữ vừa maxWidth; nếu vẫn không vừa ở cỡ tối thiểu thì cắt bớt "…"
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight: string, minSize = size * 0.55): string {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (ctx.measureText(text).width > maxWidth && s > minSize) {
    s -= 1;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  let out = text;
  while (ctx.measureText(out).width > maxWidth && out.length > 1) out = out.slice(0, -2) + '…';
  return out;
}

export async function renderThermalLabel(
  forklift: ForkliftPrintData,
  size: ThermalSize,
  qrSvg: SVGSVGElement,
  opts: ThermalOptions
): Promise<string> {
  const spec = THERMAL_SIZES[size];
  const W = spec.widthMm * PX_PER_MM;
  const H = spec.heightMm * PX_PER_MM;
  const f = W / 1200; // Hệ số cỡ chữ theo chiều ngang (A6 = 1)
  const margin = 36 * f;
  const innerW = W - margin * 2;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas không khả dụng');

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  ctx.textBaseline = 'middle';

  const internalCode = forklift.internalCode || forklift.id.slice(0, 8).toUpperCase();
  const specs = [
    ['Tải trọng', forklift.loadCapacity ? formatCapacity(forklift.loadCapacity, 'vi') : '-'],
    ['Nâng cao', forklift.liftHeight || '-'],
    ['Nhiên liệu', forklift.powerType || '-'],
    ['Năm SX', forklift.year ? String(forklift.year) : '-'],
    ['Số khung', forklift.serialNo || '-'],
  ].slice(0, spec.specRows);

  // Chiều cao từng khối; mã QR lấy phần còn lại để luôn to nhất có thể
  const headerH = opts.showCompany ? 150 * f : 0;
  const codeH = 125 * f;
  const modelH = 82 * f;
  const hintH = 50 * f;
  const specLineH = 52 * f;
  const specsH = opts.showSpecs ? specs.length * specLineH + 12 * f : 0;
  const priceH = opts.showPrice ? 105 * f : 0;
  const footerH = size === 'a6' ? 40 * f : 0;
  const gap = 16 * f;
  const blocks = [headerH, codeH, modelH, hintH, specsH, priceH, footerH].filter(h => h > 0);
  const fixedH = blocks.reduce((a, b) => a + b, 0) + gap * blocks.length;
  const qrSize = Math.min(innerW - 40 * f, H - margin * 2 - fixedH);
  const totalH = fixedH + qrSize + gap;
  let y = margin + Math.max(0, (H - margin * 2 - totalH) / 2);

  // 1. Thanh thương hiệu (nền đen chữ trắng)
  if (opts.showCompany) {
    ctx.fillRect(margin, y, innerW, headerH);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(fitText(ctx, 'XE NÂNG MCK JAPAN', innerW - 30 * f, 62 * f, '900'), W / 2, y + headerH * 0.36);
    ctx.fillText(fitText(ctx, 'HOTLINE / ZALO: 0362.396.092', innerW - 30 * f, 40 * f, '700'), W / 2, y + headerH * 0.76);
    ctx.fillStyle = '#000';
    y += headerH + gap;
  }

  // 2. Mã nội bộ trong khung viền đậm
  ctx.lineWidth = 6 * f;
  ctx.strokeRect(margin + 3 * f, y + 3 * f, innerW - 6 * f, codeH - 6 * f);
  ctx.textAlign = 'center';
  ctx.fillText(fitText(ctx, internalCode, innerW - 40 * f, 96 * f, '900'), W / 2, y + codeH / 2);
  y += codeH + gap;

  // 3. Hãng + Model
  ctx.fillText(fitText(ctx, `${forklift.maker} ${forklift.model}`.toUpperCase(), innerW, 64 * f, '900'), W / 2, y + modelH / 2);
  y += modelH + gap;

  // 4. Mã QR
  const qrImg = await svgToImage(qrSvg);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrImg, (W - qrSize) / 2, y, qrSize, qrSize);
  y += qrSize + gap;

  ctx.fillText(fitText(ctx, 'QUÉT MÃ XEM ẢNH, VIDEO & GIÁ CHI TIẾT', innerW, 34 * f, '800'), W / 2, y + hintH / 2);
  y += hintH + gap;

  // 5. Thông số
  if (opts.showSpecs) {
    ctx.lineWidth = 2 * f;
    specs.forEach(([label, value], i) => {
      const rowY = y + i * specLineH;
      ctx.textAlign = 'left';
      ctx.font = `600 ${38 * f}px ${FONT}`;
      ctx.fillText(`${label}:`, margin + 8 * f, rowY + specLineH / 2);
      ctx.textAlign = 'right';
      const labelW = ctx.measureText(`${label}:  `).width;
      ctx.fillText(fitText(ctx, value, innerW - labelW - 16 * f, 40 * f, '800'), W - margin - 8 * f, rowY + specLineH / 2);
      ctx.beginPath();
      ctx.moveTo(margin, rowY + specLineH);
      ctx.lineTo(W - margin, rowY + specLineH);
      ctx.stroke();
    });
    y += specsH + gap;
  }

  // 6. Giá bán
  if (opts.showPrice) {
    ctx.lineWidth = 5 * f;
    ctx.strokeRect(margin + 2.5 * f, y + 2.5 * f, innerW - 5 * f, priceH - 5 * f);
    ctx.textAlign = 'center';
    const price = forklift.price ? `GIÁ: ${forklift.price.toLocaleString('vi-VN')} đ` : 'GIÁ: LIÊN HỆ';
    ctx.fillText(fitText(ctx, price, innerW - 30 * f, 60 * f, '900'), W / 2, y + priceH / 2);
    y += priceH + gap;
  }

  // 7. Đường dẫn rút gọn (chỉ A6 đủ chỗ)
  if (footerH) {
    ctx.textAlign = 'center';
    const url = `${opts.baseUrl.replace(/^https?:\/\//, '')}/vi/machine/${forklift.id.slice(0, 8)}…`;
    ctx.fillText(fitText(ctx, url, innerW, 28 * f, '600'), W / 2, y + footerH / 2);
  }

  return canvas.toDataURL('image/png');
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);/)?.[1] || 'image/png';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}
