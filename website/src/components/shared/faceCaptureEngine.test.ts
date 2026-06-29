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

  it('captures the full landscape frame for CompreFace instead of cropping the face area', async () => {
    const video = createVideo();

    await captureVideoFrame(video);

    expect(mockCanvasContext.drawImage).toHaveBeenLastCalledWith(
      video,
      0,
      0,
      640,
      480,
      0,
      0,
      960,
      720,
    );
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.92);
  });

  it('preserves the full portrait frame so iPhone framing is not center-cropped away', async () => {
    const video = createPortraitVideo();

    await captureVideoFrame(video);

    expect(mockCanvasContext.drawImage).toHaveBeenLastCalledWith(
      video,
      0,
      0,
      720,
      1280,
      0,
      0,
      540,
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
