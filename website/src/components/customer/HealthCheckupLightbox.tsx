import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import type { ExternalCheckupImage } from '@/lib/api';

interface HealthCheckupLightboxProps {
  readonly currentImage: ExternalCheckupImage;
  readonly imageIndex: number;
  readonly imageCount: number;
  readonly onClose: () => void;
  readonly onPrev: () => void;
  readonly onNext: () => void;
}

export function HealthCheckupLightbox({
  currentImage,
  imageIndex,
  imageCount,
  onClose,
  onPrev,
  onNext,
}: HealthCheckupLightboxProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-8">
      <div className="relative bg-white rounded-xl shadow-2xl p-3 max-w-[min(520px,90vw)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-50 p-1.5 rounded-full bg-white text-gray-600 shadow-lg border border-gray-100 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative">
          <img
            src={currentImage.url}
            alt={currentImage.label || 'Checkup image'}
            className="max-w-full max-h-[55vh] object-contain rounded-lg"
          />

          {imageIndex > 0 && (
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-50 p-1.5 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {imageIndex < imageCount - 1 && (
            <button
              type="button"
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-50 p-1.5 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="pt-3 text-center">
          <p className="text-xs text-gray-700 truncate px-2">
            {currentImage.label || 'Image'} ({imageIndex + 1} / {imageCount})
          </p>
          <a
            href={currentImage.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 mt-1 text-[11px] text-gray-500 hover:text-primary underline"
          >
            <ExternalLink className="w-3 h-3" />
            Open original
          </a>
        </div>
      </div>
    </div>
  );
}
