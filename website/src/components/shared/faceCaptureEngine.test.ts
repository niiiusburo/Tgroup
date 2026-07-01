import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { analyzeFrame } from './faceCaptureEngine';

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
});
