import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AUTO_CAPTURE_READY_FRAMES,
  DETECTION_INTERVAL_MS,
  PROFILE_POSE_SETTLE_MS,
  PROFILE_POSE_HOLD_MS,
  analyzeFrame,
  captureVideoFrame,
  getCameraStream,
  getNativeFaceDetector,
  stopStream,
  type CameraFacingMode,
  type QualityFeedback,
} from './faceCaptureEngine';
import { PROFILE_POSES, type DetectionState, type FaceCaptureMode } from './faceCaptureProfile';

interface UseFaceCaptureControllerOptions {
  readonly isOpen: boolean;
  readonly captureMode: FaceCaptureMode;
  readonly cameraErrorMessage: string;
  readonly onCapture: (image: Blob, images?: readonly Blob[]) => void;
}

export function useFaceCaptureController({
  isOpen,
  captureMode,
  cameraErrorMessage,
  onCapture,
}: UseFaceCaptureControllerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoCapturedRef = useRef(false);
  const profileImagesRef = useRef<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>('environment');
  const [detectionState, setDetectionState] = useState<DetectionState>('scanning');
  const [detectionScore, setDetectionScore] = useState(0);
  const [qualityFeedback, setQualityFeedback] = useState<QualityFeedback | null>(null);
  const [poseIndex, setPoseIndex] = useState(0);
  const [profileImages, setProfileImages] = useState<readonly Blob[]>([]);

  const isProfileCapture = captureMode === 'profile';

  const resetGuidedCapture = useCallback(() => {
    profileImagesRef.current = [];
    setProfileImages([]);
    setPoseIndex(0);
  }, []);

  const handleCapture = useCallback(async () => {
    const blob = await captureVideoFrame(videoRef.current);
    if (!blob) return;

    if (!isProfileCapture) {
      onCapture(blob, [blob]);
      return;
    }

    const nextImages = [...profileImagesRef.current, blob];
    profileImagesRef.current = nextImages;
    setProfileImages(nextImages);

    if (nextImages.length >= PROFILE_POSES.length) {
      onCapture(nextImages[0], nextImages);
      return;
    }

    autoCapturedRef.current = false;
    setDetectionState('scanning');
    setDetectionScore(0);
    setPoseIndex(nextImages.length);
  }, [isProfileCapture, onCapture]);

  useEffect(() => {
    const video = videoRef.current;
    if (!isOpen) {
      stopStream(streamRef.current);
      streamRef.current = null;
      if (video) video.srcObject = null;
      setError(null);
      setIsStarting(false);
      setDetectionState('scanning');
      setDetectionScore(0);
      autoCapturedRef.current = false;
      resetGuidedCapture();
      return;
    }

    let mounted = true;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(cameraErrorMessage);
        return;
      }

      setIsStarting(true);
      setError(null);
      setDetectionState('scanning');
      setDetectionScore(0);
      autoCapturedRef.current = false;
      resetGuidedCapture();
      stopStream(streamRef.current);
      streamRef.current = null;
      if (video) video.srcObject = null;

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
            // autoplay + playsInline cover browsers that block play().
          }
        }
      } catch {
        if (mounted) setError(cameraErrorMessage);
      } finally {
        if (mounted) setIsStarting(false);
      }
    };

    void startCamera();

    return () => {
      mounted = false;
      stopStream(streamRef.current);
      streamRef.current = null;
      if (video) video.srcObject = null;
    };
  }, [isOpen, facingMode, cameraErrorMessage, resetGuidedCapture]);

  const handleSwitchCamera = useCallback(() => {
    autoCapturedRef.current = false;
    setDetectionState('scanning');
    setDetectionScore(0);
    setQualityFeedback(null);
    resetGuidedCapture();
    setFacingMode((current) => (current === 'environment' ? 'user' : 'environment'));
  }, [resetGuidedCapture]);

  useEffect(() => {
    if (!isOpen || error || isStarting) return;

    let cancelled = false;
    let timeoutId: number | undefined;
    let readyFrames = 0;
    let consecutiveIssues = 0;
    const detector = getNativeFaceDetector();
    const poseStartedAt = Date.now();
    const poseId = PROFILE_POSES[poseIndex]?.id ?? 'center';
    const requireFaceDetection = !isProfileCapture || poseId === 'center';

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

      if (isProfileCapture && Date.now() - poseStartedAt < PROFILE_POSE_SETTLE_MS) {
        timeoutId = window.setTimeout(runDetection, DETECTION_INTERVAL_MS);
        return;
      }

      const result = await analyzeFrame(video, detector, requireFaceDetection);
      if (cancelled) return;

      const nextScore = Math.max(0, Math.min(1, result.score));
      setDetectionScore(nextScore);
      if (result.feedback) {
        setQualityFeedback(result.feedback);
      }

      // Count frames with quality issues to prevent capture on transient good frames
      const hasIssues = result.feedback ? result.feedback.issues.length > 0 : !result.ready;
      if (result.ready && !hasIssues) {
        readyFrames += 1;
        consecutiveIssues = 0;
        setDetectionState('detected');
      } else {
        readyFrames = 0;
        consecutiveIssues += 1;
        setDetectionState('scanning');
      }

      // Auto-capture only when we have stable good frames AND no quality issues
      if (readyFrames >= AUTO_CAPTURE_READY_FRAMES && !autoCapturedRef.current) {
        autoCapturedRef.current = true;
        setDetectionState('capturing');
        void handleCapture();
        return;
      }

      // Timeout auto-capture for profile poses after hold duration
      // Only auto-capture on timeout if we haven't had persistent issues
      if (
        isProfileCapture &&
        !requireFaceDetection &&
        !autoCapturedRef.current &&
        Date.now() - poseStartedAt >= PROFILE_POSE_HOLD_MS &&
        consecutiveIssues < 5
      ) {
        autoCapturedRef.current = true;
        setDetectionState('capturing');
        void handleCapture();
        return;
      }

      timeoutId = window.setTimeout(runDetection, DETECTION_INTERVAL_MS);
    };

    timeoutId = window.setTimeout(runDetection, DETECTION_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [isOpen, error, isStarting, facingMode, poseIndex, isProfileCapture, handleCapture]);

  return {
    videoRef,
    error,
    isStarting,
    detectionState,
    detectionScore,
    qualityFeedback,
    poseIndex,
    profileImages,
    isProfileCapture,
    currentPose: PROFILE_POSES[poseIndex] ?? PROFILE_POSES[0],
    handleCapture,
    handleSwitchCamera,
  };
}
