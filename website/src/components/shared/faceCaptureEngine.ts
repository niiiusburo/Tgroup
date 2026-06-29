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

/** Center crop fraction (intrinsic video coords) — face fills more of CompreFace input. */
export const CENTER_CROP_FRACTION = 0.6;
/** Square output sent to recognize/register (NK2 iPhone fix). */
export const FACE_OUTPUT_SIZE = 600;
const MIN_CAPTURE_MEAN_LUMINANCE = 12;

export type CaptureVideoFrameOptions = {
  /** Mirror horizontally for front (`user`) camera — matches preview expectation. */
  mirrorUserFacing?: boolean;
  /** Apply 60% center crop + scale to FACE_OUTPUT_SIZE (default true for recognition). */
  faceCentricCrop?: boolean;
};

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export async function getCameraStream(facingMode: CameraFacingMode) {
  const constraints: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { exact: facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    },
    {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
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
    return new Detector({ fastMode: true, maxDetectedFaces: 3 });
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
    if (requireFaceDetection) {
      return {
        score: frameQuality * 0.45,
        ready: false,
      };
    }

    return {
      score: frameQuality,
      ready: frameQuality >= AUTO_CAPTURE_SCORE,
    };
  }

  try {
    const faces = await detector.detect(video);
    const face = faces.length === 1 ? faces[0] : null;

    if (!face?.boundingBox) {
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
    if (requireFaceDetection) {
      return {
        score: frameQuality * 0.45,
        ready: false,
      };
    }

    return {
      score: frameQuality,
      ready: frameQuality >= AUTO_CAPTURE_SCORE,
    };
  }
}

/** iOS Safari: wait until intrinsic dimensions exist and a frame is painted. */
export async function waitForVideoFrameReady(
  video: HTMLVideoElement,
  timeoutMs = 4000,
): Promise<boolean> {
  if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    return true;
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('playing', onPlaying);
      clearTimeout(timer);
      resolve(ok);
    };
    const onMeta = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        void video.play().catch(() => undefined);
      }
    };
    const onPlaying = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => finish(video.videoWidth > 0 && video.videoHeight > 0));
      });
    };
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('playing', onPlaying);
    onMeta();
    if (video.readyState >= 2) onPlaying();
  });
}

export function centerCropSourceRect(videoWidth: number, videoHeight: number, fraction = CENTER_CROP_FRACTION) {
  const side = Math.min(videoWidth, videoHeight) * fraction;
  const sx = (videoWidth - side) / 2;
  const sy = (videoHeight - side) / 2;
  return { sx, sy, side };
}

function sampleFrameMeanLuminance(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const sampleW = Math.min(32, w);
  const sampleH = Math.min(32, h);
  const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  return total / (data.length / 4);
}

function drawVideoToCanvas(
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  destW: number,
  destH: number,
  opts: CaptureVideoFrameOptions,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const faceCentric = opts.faceCentricCrop !== false;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, destW, destH);

  if (faceCentric) {
    const { sx, sy, side } = centerCropSourceRect(vw, vh);
    if (opts.mirrorUserFacing) {
      ctx.translate(destW, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, side, side, 0, 0, destW, destH);
    return;
  }

  if (opts.mirrorUserFacing) {
    ctx.translate(destW, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, vw, vh, 0, 0, destW, destH);
}

async function encodeCanvasJpeg(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

/**
 * Capture a JPEG from the live video element using intrinsic dimensions (not CSS size).
 * Rejects near-black frames (Safari video→canvas bug) with one delayed retry.
 */
export async function captureVideoFrame(
  video: HTMLVideoElement | null,
  options: CaptureVideoFrameOptions = {},
): Promise<Blob | null> {
  if (!video) return null;

  const ready = await waitForVideoFrameReady(video);
  if (!ready || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const faceCentric = options.faceCentricCrop !== false;
  const outSize = faceCentric ? FACE_OUTPUT_SIZE : Math.min(video.videoWidth, 1920);
  const outH = faceCentric ? FACE_OUTPUT_SIZE : Math.min(video.videoHeight, 1920);

  const attempt = async (delayMs: number): Promise<Blob | null> => {
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    const canvas = document.createElement('canvas');
    canvas.width = outSize;
    canvas.height = outH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    drawVideoToCanvas(video, ctx, outSize, outH, options);
    const mean = sampleFrameMeanLuminance(ctx, outSize, outH);
    if (mean < MIN_CAPTURE_MEAN_LUMINANCE) {
      return null;
    }
    return encodeCanvasJpeg(canvas);
  };

  const first = await attempt(0);
  if (first) return first;
  return attempt(120);
}
