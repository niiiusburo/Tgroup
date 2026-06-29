import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { analyzeFrame, captureVideoFrame } from './faceCaptureEngine';

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
    vi.clearAllMocks();
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => mockCanvasContext as unknown as CanvasRenderingContext2D),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: vi.fn((callback: BlobCallback) => {
        callback(new Blob(['face'], { type: 'image/jpeg' }));
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createVideo() {
    const video = document.createElement('video');
    Object.defineProperty(video, 'videoWidth', { configurable: true, value: 640 });
    Object.defineProperty(video, 'videoHeight', { configurable: true, value: 480 });
    return video;
  }

  function createPortraitVideo() {
    const video = document.createElement('video');
    Object.defineProperty(video, 'videoWidth', { configurable: true, value: 720 });
    Object.defineProperty(video, 'videoHeight', { configurable: true, value: 1280 });
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

  it('analyzes the raw video element so overlay blur cannot affect face detection', async () => {
    const video = createVideo();
    const detector = {
      detect: vi.fn().mockResolvedValue([{ boundingBox: { width: 220, height: 260 } }]),
    };

    const result = await analyzeFrame(video, detector as unknown as FaceDetector, true);

    expect(detector.detect).toHaveBeenCalledWith(video);
    expect(mockCanvasContext.drawImage).toHaveBeenLastCalledWith(video, 0, 0, 96, 128);
    expect(result.ready).toBe(true);
  });

  it('tight-crops the landscape frame to 60% of the smaller side so the face fills more of the image CompreFace/face-service receive', async () => {
    // The full frame on a 1920x1080 front camera leaves the face at ~12% of
    // the shipped image, below the ~20% NO_FACE threshold of both CompreFace
    // and face-service. We crop to 60% of min(640, 480) = 288px centered.
    // Then we downscale so the longest output side is 960px, keeping aspect.
    const video = createVideo();

    await captureVideoFrame(video);

    // cropSide = round(480 * 0.6) = 288, sx = round((640 - 288)/2) = 176, sy = round((480 - 288)/2) = 96
    // output side = 960 (scale = 960/288)
    expect(mockCanvasContext.drawImage).toHaveBeenLastCalledWith(
      video,
      176,
      96,
      288,
      288,
      0,
      0,
      960,
      960,
    );
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.92);
  });

  it('tight-crops the portrait frame to 60% of the smaller side and downscales to a square', async () => {
    // iPhone front camera is portrait. min(720, 1280) = 720, cropSide = 432,
    // sx = round((720 - 432)/2) = 144, sy = round((1280 - 432)/2) = 424
    // output side = 960 (scale = 960/432)
    const video = createPortraitVideo();

    await captureVideoFrame(video);

    expect(mockCanvasContext.drawImage).toHaveBeenLastCalledWith(
      video,
      144,
      424,
      432,
      432,
      0,
      0,
      960,
      960,
    );
  });

  it('falls back to toDataURL when canvas toBlob returns null', async () => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: vi.fn((callback: BlobCallback) => {
        callback(null);
      }),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
      configurable: true,
      value: vi.fn(() => 'data:image/jpeg;base64,ZmFjZQ=='),
    });

    const blob = await captureVideoFrame(createVideo());

    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe('image/jpeg');
  });
});
