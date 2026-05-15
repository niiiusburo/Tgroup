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

// Quality thresholds tuned for real-world clinic conditions
export const AUTO_CAPTURE_SCORE = 0.72;
export const AUTO_CAPTURE_READY_FRAMES = 4;
export const DETECTION_INTERVAL_MS = 200;
export const PROFILE_POSE_SETTLE_MS = 500;
export const PROFILE_POSE_HOLD_MS = 2500;

// Minimum face size as fraction of frame (0.15 = 15%)
const MIN_FACE_AREA_RATIO = 0.12;
// Minimum blur variance (Laplacian) — lower = more blurry
const MIN_BLUR_VARIANCE = 45;
// Ideal brightness range (0-255)
const IDEAL_BRIGHTNESS_MIN = 60;
const IDEAL_BRIGHTNESS_MAX = 200;

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

export type QualityFeedback = {
  score: number;
  isReady: boolean;
  issues: string[];
};

function estimateBlurVariance(data: Uint8ClampedArray, width: number, height: number): number {
  // Convert to grayscale
  const gray = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
  }

  // Laplacian kernel [0, 1, 0, 1, -4, 1, 0, 1, 0]
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const v = gray[idx];
      const laplacian = (
        gray[idx - width] + gray[idx + width] +
        gray[idx - 1] + gray[idx + 1] -
        4 * v
      );
      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

function estimateFrameQuality(video: HTMLVideoElement): QualityFeedback {
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return { score: 0, isReady: false, issues: ['camera_not_ready'] };
  }

  const canvas = document.createElement('canvas');
  // Use a larger canvas for better blur detection
  canvas.width = 160;
  canvas.height = 120;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { score: 0, isReady: false, issues: ['canvas_error'] };

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  const pixels = data.length / 4;
  const meanBrightness = total / pixels;

  const blurVariance = estimateBlurVariance(data, canvas.width, canvas.height);

  const issues: string[] = [];

  // Brightness check
  let brightnessScore = 1;
  if (meanBrightness < IDEAL_BRIGHTNESS_MIN) {
    issues.push('too_dark');
    brightnessScore = Math.max(0, meanBrightness / IDEAL_BRIGHTNESS_MIN);
  } else if (meanBrightness > IDEAL_BRIGHTNESS_MAX) {
    issues.push('too_bright');
    brightnessScore = Math.max(0, 1 - (meanBrightness - IDEAL_BRIGHTNESS_MAX) / 55);
  }

  // Blur check
  let blurScore = 1;
  if (blurVariance < MIN_BLUR_VARIANCE) {
    issues.push('too_blurry');
    blurScore = Math.max(0, blurVariance / MIN_BLUR_VARIANCE);
  }

  // Combined score: blur is weighted higher because it's the #1 cause of bad embeddings
  const score = Math.max(0, Math.min(1, blurScore * 0.6 + brightnessScore * 0.4));

  return {
    score,
    isReady: score >= AUTO_CAPTURE_SCORE && issues.length === 0,
    issues,
  };
}

export async function analyzeFrame(
  video: HTMLVideoElement,
  detector: FaceDetectorInstance | null,
  requireFaceDetection = true,
): Promise<{ score: number; ready: boolean; feedback?: QualityFeedback; faceAreaRatio?: number }> {
  const quality = estimateFrameQuality(video);

  if (!detector) {
    return {
      score: quality.score,
      ready: quality.isReady,
      feedback: quality,
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
          score: quality.score,
          ready: quality.isReady,
          feedback: quality,
        };
      }
      // No face detected — penalize heavily
      const issues = [...quality.issues, 'no_face_detected'];
      return {
        score: quality.score * 0.3,
        ready: false,
        feedback: { ...quality, issues },
      };
    }

    const faceAreaRatio =
      (face.boundingBox.width * face.boundingBox.height) / (video.videoWidth * video.videoHeight);

    // Face too small = poor embedding quality
    let sizePenalty = 1;
    const issues = [...quality.issues];
    if (faceAreaRatio < MIN_FACE_AREA_RATIO) {
      issues.push('face_too_small');
      sizePenalty = Math.max(0.3, faceAreaRatio / MIN_FACE_AREA_RATIO);
    }

    // Combined score: quality * size
    const score = Math.max(0, Math.min(1, quality.score * sizePenalty));

    return {
      score,
      ready: score >= AUTO_CAPTURE_SCORE && issues.length === 0,
      feedback: { ...quality, issues },
      faceAreaRatio,
    };
  } catch {
    return {
      score: quality.score,
      ready: quality.isReady,
      feedback: quality,
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
