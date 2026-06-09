/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 CTV portal and referral surface: website/src/components/ctv/ctvDiscountVoucherCanvas]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
export function formatDiscountValue(value: number, type: 'percent' | 'fixed'): string {
  if (type === 'fixed' || value > 100) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }
  return `${value}%`;
}

export async function renderKolStyleVoucherPng(options: {
  qrCanvas: HTMLCanvasElement;
  code: string;
  discountValue: number;
  discountType: 'percent' | 'fixed';
  brandLine: string;
  footerLine: string;
  discountBanner: string;
  codeLabel: string;
}): Promise<Blob> {
  const { qrCanvas, code, brandLine, footerLine, discountBanner, codeLabel } = options;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const padding = 30;
  const qrSize = qrCanvas.width;
  const canvasWidth = Math.max(qrSize + padding * 2, 350);
  const headerHeight = 80;
  const codeHeight = 60;
  const footerHeight = 40;
  const canvasHeight = headerHeight + codeHeight + qrSize + footerHeight + padding * 2;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const bgGradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  bgGradient.addColorStop(0, '#f0f9ff');
  bgGradient.addColorStop(1, '#fdf2f8');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const bannerGradient = ctx.createLinearGradient(0, 0, canvasWidth, 0);
  bannerGradient.addColorStop(0, '#b91c1c');
  bannerGradient.addColorStop(0.5, '#dc2626');
  bannerGradient.addColorStop(1, '#ef4444');
  ctx.fillStyle = bannerGradient;

  const bannerY = padding / 2;
  const bannerHeight = headerHeight;
  ctx.beginPath();
  ctx.roundRect(padding / 2, bannerY, canvasWidth - padding, bannerHeight, 12);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(discountBanner, canvasWidth / 2, bannerY + 35);

  ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(brandLine, canvasWidth / 2, bannerY + 58);

  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 32px monospace';
  const codeY = bannerY + bannerHeight + codeHeight / 2 + 10;
  ctx.fillText(code, canvasWidth / 2, codeY);

  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.fillText(codeLabel, canvasWidth / 2, codeY - 30);

  const qrX = (canvasWidth - qrSize) / 2;
  const qrY = bannerY + bannerHeight + codeHeight + 10;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12);
  ctx.fill();
  ctx.drawImage(qrCanvas, qrX, qrY);

  ctx.fillStyle = '#6b7280';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(footerLine, canvasWidth / 2, qrY + qrSize + 30);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png');
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64Data] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] || 'image/png';
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}