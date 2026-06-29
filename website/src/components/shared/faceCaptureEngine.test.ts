import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  analyzeFrame,
  centerCropSourceRect,
  CENTER_CROP_FRACTION,
  FACE_OUTPUT_SIZE,
  getNativeFaceDetector,
} from './faceCaptureEngine';

describe('faceCaptureEngine', () => {
  const createReadyFrameData = () => {
    const data = new Uint8ClampedArray(96 * 128 * 4);
    for (let i = 0; i < data.length; i += 4) {
      const luminance = (i / 4) % 2 === 0 ? 64 : 192;
      data[i] = luminance;
      data[i + 1] = luminance;
      data[i + 2] = luminance;
      data[i + 3] = 255;
    }
    return data;
  };

  const mockCanvasContext = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: createReadyFrameData() })),
  };

  beforeEach(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => mockCanvasContext as unknown as CanvasRenderingContext2D),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as typeof globalThis & { FaceDetector?: unknown }).FaceDetector;
  });

  function createVideo() {
    const video = document.createElement('video');
    Object.defineProperty(video, 'videoWidth', { configurable: true, value: 640 });
    Object.defineProperty(video, 'videoHeight', { configurable: true, value: 480 });
    return video;
  }

  it('does not auto-ready center capture from image quality alone when no face detector exists', async () => {
    const result = await analyzeFrame(createVideo(), null, true);

    expect(result.ready).toBe(false);
  });

  it('still allows quality-only readiness for guided side poses when face detection is not required', async () => {
    const result = await analyzeFrame(createVideo(), null, false);

    expect(result.ready).toBe(true);
  });

  it('configures native detection to expose multiple faces in the frame', () => {
    const detect = vi.fn();
    const FaceDetector = vi.fn(function () {
      return { detect };
    });
    (globalThis as typeof globalThis & { FaceDetector?: unknown }).FaceDetector = FaceDetector;

    expect(getNativeFaceDetector()).toEqual({ detect });
    expect(FaceDetector).toHaveBeenCalledWith({ fastMode: true, maxDetectedFaces: 3 });
  });

  it('blocks auto-ready capture when native detection sees more than one face', async () => {
    const detector = {
      detect: vi.fn(async () => [
        { boundingBox: { width: 160, height: 190 } },
        { boundingBox: { width: 150, height: 180 } },
      ]),
    };

    const result = await analyzeFrame(createVideo(), detector, true);

    expect(result.ready).toBe(false);
    expect(result.score).toBeLessThan(0.68);
  });

  it('centerCropSourceRect uses min side and center fraction for CompreFace-sized face region', () => {
    const { sx, sy, side } = centerCropSourceRect(1920, 1080, CENTER_CROP_FRACTION);
    expect(side).toBeCloseTo(648, 0);
    expect(sx).toBeCloseTo((1920 - 648) / 2, 0);
    expect(sy).toBeCloseTo((1080 - 648) / 2, 0);
  });

  it('exports NK2-friendly output size constant', () => {
    expect(FACE_OUTPUT_SIZE).toBe(600);
    expect(CENTER_CROP_FRACTION).toBe(0.6);
  });
});
