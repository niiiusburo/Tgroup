export type CameraFacingMode = 'user' | 'environment';

export type DetectedFace = {
  boundingBox?: {
    width: number;
    height: number;
  };
};

export type FaceDetectorInstance = {
  detect: (source: CanvasImageSource) => Promise<DetectedFace[]>;
};

type FaceDetectorConstructor = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => FaceDetectorInstance;

export const AUTO_CAPTURE_SCORE = 0.68;
export const AUTO_CAPTURE_READY_FRAMES = 6;
export const DETECTION_INTERVAL_MS = 260;
export const PROFILE_POSE_SETTLE_MS = 650;
export const PROFILE_POSE_HOLD_MS = 3000;

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export async function getCameraStream(facingMode: CameraFacingMode) {
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

export function getNativeFaceDetector(): FaceDetectorInstance | null {
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

export async function analyzeFrame(
  video: HTMLVideoElement,
  detector: FaceDetectorInstance | null,
  requireFaceDetection = true,
) {
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
      // For non-frontal poses where face detection is unreliable (left/right),
      // fall back to quality-only scoring instead of penalizing heavily.
      if (!requireFaceDetection) {
        return {
          score: frameQuality,
          ready: frameQuality >= AUTO_CAPTURE_SCORE,
        };
      }
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

export function captureVideoFrame(video: HTMLVideoElement | null) {
  if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
    return Promise.resolve(null);
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });
}
