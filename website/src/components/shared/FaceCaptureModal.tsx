import { useRef, useEffect, useCallback, useState } from 'react';
import { X, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FaceCaptureModalProps {
  readonly isOpen: boolean;
  readonly title?: string;
  readonly onCapture: (image: Blob) => void;
  readonly onCancel: () => void;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function FaceCaptureModal({
  isOpen,
  title,
  onCapture,
  onCancel
}: FaceCaptureModalProps) {
  const { t } = useTranslation('common');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolvedTitle = title ?? t('faceCapture.title');

  useEffect(() => {
    if (!isOpen) {
      stopStream(streamRef.current);
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setError(null);
      return;
    }

    let mounted = true;
    navigator.mediaDevices.
    getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    }).
    then((stream) => {
      if (!mounted) {
        stopStream(stream);
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }).
    catch(() => {
      setError(t('faceCapture.cameraError'));
    });

    return () => {
      mounted = false;
      stopStream(streamRef.current);
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isOpen]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
      }
    }, 'image/jpeg', 0.92);
  }, [onCapture]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 bg-primary flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{resolvedTitle}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            aria-label="Close">
            
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          {error ?
          <p className="text-sm text-red-500 text-center py-6">{error}</p> :

          <>
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-900">
                <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover" />
              
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-32 h-40 border-2 border-white/70 rounded-[50%]" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                type="button"
                onClick={handleCapture}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-colors">
                
                  <Camera className="w-4 h-4" />
                  {t('faceCapture.capture', 'Chụp')}
              </button>
                <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                
                  {t('cancel', 'Hủy')}
              </button>
              </div>
            </>
          }
        </div>
      </div>
    </div>);

}
