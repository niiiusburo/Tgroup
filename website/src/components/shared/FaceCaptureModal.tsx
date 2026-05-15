import { X, Camera, SwitchCamera, Loader2, ScanFace, ArrowLeft, ArrowRight, Sun, SunDim, Move, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PROFILE_POSES, type FaceCaptureMode } from './faceCaptureProfile';
import { useFaceCaptureController } from './useFaceCaptureController';

interface FaceCaptureModalProps {
  readonly isOpen: boolean;
  readonly title?: string;
  readonly captureMode?: FaceCaptureMode;
  readonly onCapture: (image: Blob, images?: readonly Blob[]) => void;
  readonly onCancel: () => void;
}

export function FaceCaptureModal({
  isOpen,
  title,
  captureMode = 'single',
  onCapture,
  onCancel
}: FaceCaptureModalProps) {
  const { t } = useTranslation('common');
  const resolvedTitle = title ?? t('faceCapture.title');
  const {
    videoRef,
    error,
    isStarting,
    detectionState,
    detectionScore,
    qualityFeedback,
    poseIndex,
    profileImages,
    isProfileCapture,
    currentPose,
    handleCapture,
    handleSwitchCamera,
  } = useFaceCaptureController({
    isOpen,
    captureMode,
    cameraErrorMessage: t('faceCapture.cameraError'),
    onCapture,
  });

  const isReady = detectionState === 'detected' || detectionState === 'capturing';
  const detectionPercent = Math.round(Math.max(0, Math.min(1, detectionScore)) * 100);
  const poseLabel = t(currentPose.labelKey, currentPose.fallbackLabel);
  const poseHint = t(currentPose.hintKey, currentPose.fallbackHint);
  const completedPoseCount = isProfileCapture ? profileImages.length : 0;
  const isSidePose = currentPose?.id !== 'center';

  // Build human-readable quality feedback message
  const getFeedbackMessage = (): { text: string; icon: React.ReactNode; type: 'good' | 'warn' | 'error' } => {
    if (detectionState === 'capturing') {
      return { text: t('faceCapture.autoCapturing', 'Auto capturing...'), icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, type: 'good' };
    }
    if (isReady) {
      return { text: t('faceCapture.faceDetected', 'Face detected — hold steady'), icon: <ScanFace className="w-3.5 h-3.5" />, type: 'good' };
    }
    const issues = qualityFeedback?.issues ?? [];
    if (issues.includes('too_dark')) {
      return { text: t('faceCapture.tooDark', 'Too dark — move to brighter area'), icon: <SunDim className="w-3.5 h-3.5" />, type: 'warn' };
    }
    if (issues.includes('too_bright')) {
      return { text: t('faceCapture.tooBright', 'Too bright — reduce lighting'), icon: <Sun className="w-3.5 h-3.5" />, type: 'warn' };
    }
    if (issues.includes('too_blurry')) {
      return { text: t('faceCapture.tooBlurry', 'Too blurry — hold steady'), icon: <Move className="w-3.5 h-3.5" />, type: 'warn' };
    }
    if (issues.includes('face_too_small')) {
      return { text: t('faceCapture.faceTooSmall', 'Move closer to camera'), icon: <ArrowRight className="w-3.5 h-3.5" />, type: 'warn' };
    }
    if (issues.includes('no_face_detected')) {
      return { text: t('faceCapture.noFace', 'No face detected — center your face'), icon: <AlertCircle className="w-3.5 h-3.5" />, type: 'error' };
    }
    if (isSidePose) {
      return { text: t('faceCapture.holdSteady', 'Hold steady, tap Capture'), icon: <ScanFace className="w-3.5 h-3.5" />, type: 'warn' };
    }
    return { text: t('faceCapture.scanning', 'Scanning for face...'), icon: <ScanFace className="w-3.5 h-3.5" />, type: 'warn' };
  };

  const feedback = getFeedbackMessage();
  const captureBtnLabel =
    isSidePose && detectionState === 'scanning'
      ? t('faceCapture.capturePose', 'Chụp pose')
      : t('faceCapture.capture', 'Chụp');

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
                className="absolute inset-0 w-full h-full scale-105 object-cover" />
                <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                {isStarting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20" aria-live="polite">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                    <span className="sr-only">{t('faceCapture.cameraStarting', 'Starting camera...')}</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-center pointer-events-none" aria-live="polite">
                  <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                    isReady ? 'bg-emerald-500 text-white' :
                    feedback.type === 'error' ? 'bg-red-500 text-white' :
                    feedback.type === 'warn' ? 'bg-amber-500 text-white' :
                    'bg-black/35 text-white'
                  }`}>
                    {feedback.icon}
                    <span>{feedback.text}</span>
                    <span className="tabular-nums opacity-90">
                      {detectionPercent}%
                    </span>
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

              {isProfileCapture && (
                <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2.5" aria-live="polite">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {currentPose.id === 'left' ? (
                        <ArrowLeft className="h-4 w-4 shrink-0 text-orange-600" />
                      ) : currentPose.id === 'right' ? (
                        <ArrowRight className="h-4 w-4 shrink-0 text-orange-600" />
                      ) : (
                        <ScanFace className="h-4 w-4 shrink-0 text-orange-600" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-gray-900">
                          {t('faceCapture.profileStep', {
                            defaultValue: 'Step {{current}}/{{total}}: {{pose}}',
                            current: poseIndex + 1,
                            total: PROFILE_POSES.length,
                            pose: poseLabel,
                          })}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-gray-600">{poseHint}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-orange-700 ring-1 ring-orange-200">
                      {completedPoseCount}/{PROFILE_POSES.length}
                    </span>
                  </div>
                </div>
              )}

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
                onClick={() => void handleCapture()}
                disabled={isStarting || detectionState === 'capturing'}
                className={`h-11 flex items-center gap-2 px-4 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${
                  isSidePose && detectionState === 'scanning'
                    ? 'bg-orange-500 animate-pulse'
                    : 'bg-emerald-500 hover:bg-emerald-600'
                }`}>
                  <Camera className="w-4 h-4" />
                  {captureBtnLabel}
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
