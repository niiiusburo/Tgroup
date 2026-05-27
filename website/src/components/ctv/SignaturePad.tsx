import { useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  readonly onChange: (base64Png: string | null) => void;
}

export function SignaturePad({ onChange }: Props) {
  const { t } = useTranslation('ctv');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    const { x, y } = getPos(e);
    ctx.moveTo(x, y);
  }, [getCtx]);

  const move = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [getCtx]);

  const end = useCallback(() => {
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Compress to PNG and check size
    const base64 = canvas.toDataURL('image/png');
    const base64Data = base64.replace(/^data:image\/png;base64,/, '');
    const sizeKb = (base64Data.length * 3) / 4 / 1024;
    if (sizeKb > 30) {
      // Try to compress by drawing to a smaller canvas
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = 300;
      smallCanvas.height = 100;
      const sctx = smallCanvas.getContext('2d');
      if (sctx) {
        sctx.drawImage(canvas, 0, 0, 300, 100);
        const compressed = smallCanvas.toDataURL('image/png');
        onChange(compressed);
        return;
      }
    }
    onChange(base64);
  }, [onChange]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  }, [getCtx, onChange]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {t('signup.signatureLabel')}
      </label>
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={400}
          height={120}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
      <button
        type="button"
        onClick={clear}
        className="text-xs text-gray-500 hover:text-gray-700 underline"
      >
        {t('signup.clearSignature')}
      </button>
    </div>
  );
}

function getPos(e: React.MouseEvent | React.TouchEvent) {
  const canvas = (e.target as HTMLCanvasElement);
  const rect = canvas.getBoundingClientRect();
  if ('touches' in e) {
    const t = e.touches[0] || e.changedTouches[0];
    return {
      x: (t.clientX - rect.left) * (canvas.width / rect.width),
      y: (t.clientY - rect.top) * (canvas.height / rect.height),
    };
  }
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}
