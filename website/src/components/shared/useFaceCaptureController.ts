import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AUTO_CAPTURE_READY_FRAMES,
  AUTO_CAPTURE_SCORE,
  DETECTION_INTERVAL_MS,
  PROFILE_POSE_SETTLE_MS,
  PROFILE_POSE_HOLD_MS,
  analyzeFrame,
  captureVideoFrame,
  getCameraStream,
  getNativeFaceDetector,
  stopStream,
  type CameraFacingMode,
} from './faceCaptureEngine';
import { PROFILE_POSES, type DetectionState, type FaceCaptureMode } from './faceCaptureProfile';

// Burst-capture tuning (single-shot mode only — profile mode keeps multi-pose UX).
// Validated in the face-lab comparison: Module D (burst) produced the sharpest
// frames CompreFace receives, which directly raises match confidence.
const BURST_FRAME_COUNT = 5;
const BURST_FRAME_INTERVAL_MS = 100;
// Adaptive-threshold tuning. The native FaceDetector API is Chrome-only behind a
// flag; on Safari/Firefox/iOS the score is bottlenecked by quality scoring and
// rarely reaches the default 0.68 threshold. We relax over time and finally force-
// capture using the best frame seen, so capture never stalls indefinitely.
const ADAPTIVE_RELAX_TICKS_MEDIUM = 24; // ~6s @ 260ms tick
const ADAPTIVE_RELAX_TICKS_DEEP = 40; // ~10.5s
const ADAPTIVE_THRESHOLD_RELAX_MEDIUM = 0.15;
const ADAPTIVE_THRESHOLD_RELAX_DEEP = 0.25;
const ADAPTIVE_THRESHOLD_FLOOR_MEDIUM = 0.45;
const ADAPTIVE_THRESHOLD_FLOOR_DEEP = 0.35;
const FORCE_CAPTURE_TICKS = 30; // ~8s
const FORCE_CAPTURE_MIN_SCORE = 0.25;

interface UseFaceCaptureControllerOptions {
  readonly isOpen: boolean;
  readonly captureMode: FaceCaptureMode;
  readonly defaultFacingMode?: CameraFacingMode;
  readonly cameraErrorMessage: string;
  readonly captureFailedMessage: string;
  readonly onCapture: (image: Blob, images?: readonly Blob[]) => void | Promise<void>;
}

export function useFaceCaptureController({
  isOpen,
  captureMode,
  defaultFacingMode = 'environment',
  cameraErrorMessage,
  captureFailedMessage,
  onCapture,
}: UseFaceCaptureControllerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoCapturedRef = useRef(false);
  const profileImagesRef = useRef<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>(defaultFacingMode);
  const [detectionState, setDetectionState] = useState<DetectionState>('scanning');
  const [detectionScore, setDetectionScore] = useState(0);
  const [poseIndex, setPoseIndex] = useState(0);
  const [profileImages, setProfileImages] = useState<readonly Blob[]>([]);

  const isProfileCapture = captureMode === 'profile';

  const resetGuidedCapture = useCallback(() => {
    profileImagesRef.current = [];
    setProfileImages([]);
    setPoseIndex(0);
  }, []);

  // Single-shot burst: capture N frames at short intervals, score each, ship the
  // sharpest one to the caller. Gives CompreFace the cleanest frame possible.
  // Profile mode keeps single-frame capture so the 3-pose flow stays predictable.
  const captureBestOfBurst = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video) return null;
    const detector = getNativeFaceDetector();
    const frames: Array<{ blob: Blob; score: number }> = [];
    for (let i = 0; i < BURST_FRAME_COUNT; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, BURST_FRAME_INTERVAL_MS));
      const frameBlob = await captureVideoFrame(video);
      if (!frameBlob) continue;
      // requireFace=false: if detector is null we still want a numeric quality score
      // back, not a 0.45-penalty cap that would skew "best" selection.
      const { score } = await analyzeFrame(video, detector, detector !== null);
      frames.push({ blob: frameBlob, score });
    }
    if (frames.length === 0) return null;
    return frames.reduce((a, b) => (b.score > a.score ? b : a)).blob;
  }, []);

  const handleCapture = useCallback(async () => {
    setCaptureError(null);

    try {
      if (!isProfileCapture) {
        // Single-shot mode: burst → pick sharpest → send.
        const blob = await captureBestOfBurst();
        if (!blob) return;
        await onCapture(blob, [blob]);
        return;
      }

      // Profile mode (3 poses): single-frame capture per pose, unchanged.
      const blob = await captureVideoFrame(videoRef.current);
      if (!blob) return;

      const nextImages = [...profileImagesRef.current, blob];
      profileImagesRef.current = nextImages;
      setProfileImages(nextImages);

      if (nextImages.length >= PROFILE_POSES.length) {
        await onCapture(nextImages[0], nextImages);
        return;
      }

      autoCapturedRef.current = false;
      setDetectionState('scanning');
      setDetectionScore(0);
      setPoseIndex(nextImages.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : captureFailedMessage;
      setCaptureError(message || captureFailedMessage);
      autoCapturedRef.current = false;
      setDetectionState('scanning');
      setDetectionScore(0);
      // Don't reset profile progress on capture error; let user retry the current pose
    }
  }, [captureBestOfBurst, captureFailedMessage, isProfileCapture, onCapture]);

  useEffect(() => {
    const video = videoRef.current;
    if (!isOpen) {
      stopStream(streamRef.current);
      streamRef.current = null;
      if (video) video.srcObject = null;
      setError(null);
      setCaptureError(null);
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
      setCaptureError(null);
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
          } catch (playErr) {
            const name = playErr instanceof Error ? playErr.name : 'PlayError';
            if (name === 'NotAllowedError' || name === 'AbortError') {
              if (mounted) setError('Camera blocked by browser. Disable Low Power Mode if enabled, allow camera access, and reload.');
              console.error('[FaceCapture] video.play() rejected:', name, playErr);
            }
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
    setCaptureError(null);
    resetGuidedCapture();
    setFacingMode((current) => (current === 'environment' ? 'user' : 'environment'));
  }, [resetGuidedCapture]);

  useEffect(() => {
    if (!isOpen || error || isStarting) return;

    let cancelled = false;
    let timeoutId: number | undefined;
    let readyFrames = 0;
    let elapsedTicks = 0;
    let bestScoreSeen = 0;
    const detector = getNativeFaceDetector();
    const poseStartedAt = Date.now();
    const poseId = PROFILE_POSES[poseIndex]?.id ?? 'center';
    // Critical fix: only REQUIRE face detection if we actually have a working
    // detector. The browser native FaceDetector is null in most browsers
    // (Chrome-only, behind a flag). When null, analyzeFrame would cap the score
    // at frameQuality * 0.45 (≈34%) and capture would stall forever — exactly
    // the bug seen on iPhone Safari.
    const detectorReady = detector !== null;
    const requireFaceDetection = detectorReady && (!isProfileCapture || poseId === 'center');

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

      elapsedTicks += 1;
      const result = await analyzeFrame(video, detector, requireFaceDetection);
      if (cancelled) return;

      const nextScore = Math.max(0, Math.min(1, result.score));
      setDetectionScore(nextScore);
      if (nextScore > bestScoreSeen) bestScoreSeen = nextScore;

      // Adaptive threshold: relax after sustained scanning so we still capture
      // in dim lighting / odd angles instead of stalling at 34%.
      const adaptiveThreshold =
        elapsedTicks > ADAPTIVE_RELAX_TICKS_DEEP
          ? Math.max(ADAPTIVE_THRESHOLD_FLOOR_DEEP, AUTO_CAPTURE_SCORE - ADAPTIVE_THRESHOLD_RELAX_DEEP)
          : elapsedTicks > ADAPTIVE_RELAX_TICKS_MEDIUM
          ? Math.max(ADAPTIVE_THRESHOLD_FLOOR_MEDIUM, AUTO_CAPTURE_SCORE - ADAPTIVE_THRESHOLD_RELAX_MEDIUM)
          : AUTO_CAPTURE_SCORE;

      const meetsAdaptive = nextScore >= adaptiveThreshold;
      if (result.ready || meetsAdaptive) {
        readyFrames += 1;
        setDetectionState('detected');
        setCaptureError(null);
      } else {
        // Decay (not hard reset): the native FaceDetector intermittently drops a
        // frame even when the user is holding still, so a hard reset to 0 would
        // make capture stall at e.g. 84% quality whenever the readiness streak
        // keeps getting wiped by a single dropped frame. This matches the
        // lab Module D behavior that was validated as reliable.
        readyFrames = Math.max(0, readyFrames - 1);
        setDetectionState(requireFaceDetection ? 'no-face' : 'scanning');
      }

      // Auto-capture when stable detection achieved
      if (readyFrames >= AUTO_CAPTURE_READY_FRAMES && !autoCapturedRef.current) {
        autoCapturedRef.current = true;
        setDetectionState('capturing');
        void handleCapture();
        return;
      }

      // Timeout auto-capture for profile poses after hold duration
      if (
        isProfileCapture &&
        !requireFaceDetection &&
        !autoCapturedRef.current &&
        Date.now() - poseStartedAt >= PROFILE_POSE_HOLD_MS
      ) {
        autoCapturedRef.current = true;
        setDetectionState('capturing');
        void handleCapture();
        return;
      }

      // Force-capture safety net: after ~15s of scanning, if we've seen anything
      // remotely face-like at all, capture the best frame rather than stalling
      // forever. Only kicks in for single-shot mode; profile mode has its own
      // pose-hold timeout above.
      if (
        !isProfileCapture &&
        !autoCapturedRef.current &&
        elapsedTicks >= FORCE_CAPTURE_TICKS &&
        bestScoreSeen >= FORCE_CAPTURE_MIN_SCORE
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
    captureError,
    isStarting,
    facingMode,
    detectionState,
    detectionScore,
    poseIndex,
    profileImages,
    isProfileCapture,
    currentPose: PROFILE_POSES[poseIndex] ?? PROFILE_POSES[0],
    handleCapture,
    handleSwitchCamera,
  };
}
