import { useRef, useEffect, useCallback, useState } from 'react';
import { X, Camera, SwitchCamera, Loader2, ScanFace } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FaceCaptureModalProps {
  readonly isOpen: boolean;
  readonly title?: string;
  readonly onCapture: (image: Blob) => void;
  readonly onCancel: () => void;
}

type CameraFacingMode = 'user' | 'environment';
type DetectionState = 'scanning' | 'detected' | 'capturing';
type DetectedFace = {
  boundingBox?: {
    width: number;
    height: number;
  };
};
type FaceDetectorInstance = {
  detect: (source: CanvasImageSource) => Promise<DetectedFace[]>;
};
type FaceDetectorConstructor = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => FaceDetectorInstance;

const AUTO_CAPTURE_SCORE = 0.68;
const AUTO_CAPTURE_READY_FRAMES = 4;
const DETECTION_INTERVAL_MS = 180;

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

async function getCameraStream(facingMode: CameraFacingMode) {
  const constraints: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { exact: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    { video: true, audio: false },
  ];

  let lastError: unknown;
  for (const constraint of constraints) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraint);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function getNativeFaceDetector(): FaceDetectorInstance | null {
  const Detector = (globalThis as typeof globalThis & {
    FaceDetector?: FaceDetectorConstructor;
  }).FaceDetector;
  if (!Detector) return null;

  try {
    return new Detector({ fastMode: true, maxDetectedFaces: 1 });
  } catch {
    return null;
  }
}

function estimateFrameQuality(video: HTMLVideoElement) {
  if (video.videoWidth === 0 || video.videoHeight === 0) return 0;

  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 128;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let total = 0;
  let totalSquares = 0;

  for (let i = 0; i < data.length; i += 4) {
    const luminance = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    total += luminance;
    totalSquares += luminance * luminance;
  }

  const pixels = data.length / 4;
  const mean = total / pixels;
  const variance = totalSquares / pixels - mean * mean;
  const brightnessScore = Math.max(0, 1 - Math.abs(mean - 128) / 128);
  const contrastScore = Math.min(1, Math.sqrt(Math.max(variance, 0)) / 64);

  return Math.max(0, Math.min(1, brightnessScore * 0.55 + contrastScore * 0.45));
}

async function analyzeFrame(video: HTMLVideoElement, detector: FaceDetectorInstance | null) {
  const frameQuality = estimateFrameQuality(video);
  if (!detector) {
    return {
      score: frameQuality,
      ready: frameQuality >= AUTO_CAPTURE_SCORE,
    };
  }

  try {
    const faces = await detector.detect(video);
    const face = faces.length === 1 ? faces[0] : null;
    if (!face?.boundingBox) {
      return { score: frameQuality * 0.45, ready: false };
    }

    const faceArea =
      (face.boundingBox.width * face.boundingBox.height) / (video.videoWidth * video.videoHeight);
    const faceSizeScore = Math.max(0, Math.min(1, (faceArea - 0.06) / 0.18));
    const score = Math.max(frameQuality * 0.45 + faceSizeScore * 0.55, frameQuality);

    return {
      score,
      ready: score >= AUTO_CAPTURE_SCORE,
    };
  } catch {
    return {
      score: frameQuality,
      ready: frameQuality >= AUTO_CAPTURE_SCORE,
    };
  }
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
  const autoCapturedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>('environment');
  const [detectionState, setDetectionState] = useState<DetectionState>('scanning');
  const [detectionScore, setDetectionScore] = useState(0);

  const resolvedTitle = title ?? t('faceCapture.title');

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

  useEffect(() => {
    const video = videoRef.current;
    if (!isOpen) {
      stopStream(streamRef.current);
      streamRef.current = null;
      if (video) {
        video.srcObject = null;
      }
      setError(null);
      setIsStarting(false);
      setDetectionState('scanning');
      setDetectionScore(0);
      autoCapturedRef.current = false;
      return;
    }

    let mounted = true;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t('faceCapture.cameraError'));
        return;
      }

      setIsStarting(true);
      setError(null);
      setDetectionState('scanning');
      setDetectionScore(0);
      autoCapturedRef.current = false;
      stopStream(streamRef.current);
      streamRef.current = null;
      if (video) {
        video.srcObject = null;
      }

      try {
        const stream = await getCameraStream(facingMode);
        if (!mounted) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play();
          } catch {
            // The autoplay + playsInline attributes cover browsers that block play().
          }
        }
      } catch {
        if (mounted) {
          setError(t('faceCapture.cameraError'));
        }
      } finally {
        if (mounted) {
          setIsStarting(false);
        }
      }
    };

    void startCamera();

    return () => {
      mounted = false;
      stopStream(streamRef.current);
      streamRef.current = null;
      if (video) {
        video.srcObject = null;
      }
    };
  }, [isOpen, facingMode, t]);

  const handleSwitchCamera = useCallback(() => {
    autoCapturedRef.current = false;
    setDetectionState('scanning');
    setDetectionScore(0);
    setFacingMode((current) => current === 'environment' ? 'user' : 'environment');
  }, []);

  useEffect(() => {
    if (!isOpen || error || isStarting) return;

    let cancelled = false;
    let timeoutId: number | undefined;
    let readyFrames = 0;
    const detector = getNativeFaceDetector();

    const runDetection = async () => {
      const video = videoRef.current;
      if (cancelled || !video) return;

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        readyFrames = 0;
        setDetectionState('scanning');
        setDetectionScore(0);
        timeoutId = window.setTimeout(runDetection, DETECTION_INTERVAL_MS);
        return;
      }

      const result = await analyzeFrame(video, detector);
      if (cancelled) return;

      const nextScore = Math.max(0, Math.min(1, result.score));
      setDetectionScore(nextScore);

      if (result.ready) {
        readyFrames += 1;
        setDetectionState('detected');
      } else {
        readyFrames = 0;
        setDetectionState('scanning');
      }

      if (readyFrames >= AUTO_CAPTURE_READY_FRAMES && !autoCapturedRef.current) {
        autoCapturedRef.current = true;
        setDetectionState('capturing');
        handleCapture();
        return;
      }

      timeoutId = window.setTimeout(runDetection, DETECTION_INTERVAL_MS);
    };

    timeoutId = window.setTimeout(runDetection, DETECTION_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isOpen, error, isStarting, facingMode, handleCapture]);

  const isReady = detectionState === 'detected' || detectionState === 'capturing';
  const detectionLabel =
    detectionState === 'capturing' ?
      t('faceCapture.autoCapturing', 'Auto capturing...') :
      isReady ?
        t('faceCapture.faceDetected', 'Face detected') :
        t('faceCapture.scanning', 'Scanning for face...');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100dvh-1.5rem)]">
        <div className="px-4 py-2.5 bg-primary flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white leading-snug">{resolvedTitle}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            aria-label={t('close', 'Close')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 sm:p-4 overflow-y-auto">
          {error ?
          <p className="text-sm text-red-500 text-center py-6">{error}</p> :

          <>
              <div className="relative aspect-[3/4] sm:aspect-[4/3] rounded-xl overflow-hidden bg-gray-900">
                <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full scale-105 object-cover blur-[12px]" />
                <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                {isStarting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20" aria-live="polite">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                    <span className="sr-only">{t('faceCapture.cameraStarting', 'Starting camera...')}</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-center pointer-events-none" aria-live="polite">
                  <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                    isReady ? 'bg-emerald-500 text-white' : 'bg-black/35 text-white'
                  }`}>
                    {detectionState === 'capturing' ?
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                      <ScanFace className="w-3.5 h-3.5" />
                    }
                    <span>{detectionLabel}</span>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" data-testid="face-outline">
                  <div
                  className={`w-32 h-40 sm:w-36 sm:h-44 border-[3px] rounded-[50%] transition-all duration-200 ${
                    isReady ?
                      'border-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.18),0_0_32px_rgba(16,185,129,0.38)]' :
                      detectionScore > 0.4 ?
                        'border-amber-300 shadow-[0_0_0_5px_rgba(245,158,11,0.16)]' :
                        'border-white/70'
                  }`} />
                </div>
                <div className="absolute bottom-3 left-4 right-4 h-1.5 rounded-full bg-white/25 overflow-hidden pointer-events-none">
                  <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    isReady ? 'bg-emerald-400' : 'bg-amber-300'
                  }`}
                  style={{ width: `${Math.max(8, Math.round(detectionScore * 100))}%` }} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 sm:gap-3">
                <button
                type="button"
                onClick={handleSwitchCamera}
                className="w-11 h-11 flex items-center justify-center text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                aria-label={t('faceCapture.switchCamera', 'Switch camera')}
                title={t('faceCapture.switchCamera', 'Switch camera')}>
                  <SwitchCamera className="w-4 h-4" />
              </button>
                <button
                type="button"
                onClick={handleCapture}
                disabled={isStarting || detectionState === 'capturing'}
                className="h-11 flex items-center gap-2 px-4 text-sm font-semibold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300 transition-colors">
                  <Camera className="w-4 h-4" />
                  {t('faceCapture.capture', 'Chụp')}
              </button>
                <button
                type="button"
                onClick={onCancel}
                className="h-11 px-4 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  {t('cancel', 'Hủy')}
              </button>
              </div>
            </>
          }
        </div>
      </div>
    </div>);
}
