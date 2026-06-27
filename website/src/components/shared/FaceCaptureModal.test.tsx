import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { FaceCaptureModal } from './FaceCaptureModal';

describe('FaceCaptureModal', () => {
  const mockGetUserMedia = vi.fn();
  const mockPlay = vi.fn();
  let mockVideoWidth = 0;
  let mockVideoHeight = 0;

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

  const waitForCameraStart = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockPlay).toHaveBeenCalled();
  };

  beforeEach(() => {
    mockVideoWidth = 0;
    mockVideoHeight = 0;
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
      configurable: true,
      get: () => mockVideoWidth,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
      configurable: true,
      get: () => mockVideoHeight,
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      value: mockPlay,
      writable: true,
    });
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
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream);
    mockPlay.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <FaceCaptureModal isOpen={false} onCapture={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders video and buttons when open', async () => {
    render(<FaceCaptureModal isOpen onCapture={vi.fn()} onCancel={vi.fn()} />);
    expect(await screen.findByText('Chụp')).toBeInTheDocument();
    expect(screen.getByText('Hủy')).toBeInTheDocument();
  });

  it('calls onCancel when cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<FaceCaptureModal isOpen onCapture={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(await screen.findByText('Hủy'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('renders custom title when provided', async () => {
    render(<FaceCaptureModal isOpen title="Custom Title" onCapture={vi.fn()} onCancel={vi.fn()} />);
    expect(await screen.findByText('Custom Title')).toBeInTheDocument();
  });

  it('does not render capture button when camera error occurs', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Camera denied'));
    render(<FaceCaptureModal isOpen onCapture={vi.fn()} onCancel={vi.fn()} />);
    await vi.waitFor(() => {
      expect(screen.queryByText('Chụp')).not.toBeInTheDocument();
    });
  });

  it('renders face outline overlay', async () => {
    render(<FaceCaptureModal isOpen onCapture={vi.fn()} onCancel={vi.fn()} />);
    await vi.waitFor(() => {
      expect(screen.getByTestId('face-outline')).toBeInTheDocument();
    });
  });

  it('turns the face outline green when detection quality is ready', async () => {
    vi.useFakeTimers();
    mockVideoWidth = 640;
    mockVideoHeight = 480;
    class MockFaceDetector {
      detect = vi.fn().mockResolvedValue([
        { boundingBox: { width: 220, height: 260 } },
      ]);
    }
    Object.defineProperty(globalThis, 'FaceDetector', {
      configurable: true,
      value: MockFaceDetector,
    });

    render(<FaceCaptureModal isOpen onCapture={vi.fn()} onCancel={vi.fn()} />);

    await waitForCameraStart();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(320);
    });

    expect(screen.getByText('Đã phát hiện khuôn mặt')).toBeInTheDocument();
    expect(screen.getByText('Chất lượng 100%')).toBeInTheDocument();
    expect(screen.getByTestId('face-outline').firstElementChild?.className).toContain(
      'border-emerald-400',
    );
  });

  it('auto captures after a stable high-quality face frame', async () => {
    vi.useFakeTimers();
    mockVideoWidth = 640;
    mockVideoHeight = 480;
    class MockFaceDetector {
      detect = vi.fn().mockResolvedValue([
        { boundingBox: { width: 220, height: 260 } },
      ]);
    }
    Object.defineProperty(globalThis, 'FaceDetector', {
      configurable: true,
      value: MockFaceDetector,
    });
    const onCapture = vi.fn();

    render(<FaceCaptureModal isOpen onCapture={onCapture} onCancel={vi.fn()} />);

    await waitForCameraStart();
    // 1800ms for detection to stabilize + ~500ms for the 5-frame burst capture.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture.mock.calls[0][0]).toBeInstanceOf(Blob);
  });

  it('still auto-captures when the native detector intermittently drops a frame', async () => {
    // Regression: useFaceCaptureController used to hard-reset readyFrames to 0
    // whenever a single tick fell below the auto-capture threshold. The native
    // FaceDetector occasionally returns zero faces even while the user holds
    // still, so under the old behavior the readiness streak got wiped over and
    // over, the quality score sat high (e.g. 84%) and capture never fired until
    // the 15s safety-net force-capture kicked in — long enough that users gave
    // up. The fix is to decay readyFrames by 1 instead of resetting, matching
    // the lab Module D that was validated as reliable.
    vi.useFakeTimers();
    mockVideoWidth = 640;
    mockVideoHeight = 480;
    let tick = 0;
    class MockFaceDetector {
      detect = vi.fn().mockImplementation(async () => {
        // Pattern: 4 frames with face, 1 frame without. Repeats. Under the old
        // hard-reset behavior this never accumulates 6 ready frames in a row,
        // so capture would stall until the ~15s safety net.
        const inWindow = tick++ % 5;
        return inWindow < 4 ? [{ boundingBox: { width: 220, height: 260 } }] : [];
      });
    }
    Object.defineProperty(globalThis, 'FaceDetector', {
      configurable: true,
      value: MockFaceDetector,
    });
    const onCapture = vi.fn();

    render(<FaceCaptureModal isOpen onCapture={onCapture} onCancel={vi.fn()} />);

    await waitForCameraStart();
    // ~3s: well short of the 15.6s safety-net force-capture. With decay this
    // must capture; with the old hard-reset it would not.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture.mock.calls[0][0]).toBeInstanceOf(Blob);
  });

  it('keeps the camera open and continues scanning when no native FaceDetector is available', async () => {
    // When the browser has no native FaceDetector (Safari, Firefox, iOS), the
    // engine falls back to quality-only scoring instead of showing "no face"
    // and stalling. The modal should stay open and keep scanning until either
    // a high-quality frame triggers capture or the force-capture safety
    // net fires.
    vi.useFakeTimers();
    mockVideoWidth = 640;
    mockVideoHeight = 480;
    Object.defineProperty(globalThis, 'FaceDetector', {
      configurable: true,
      value: undefined,
    });
    const onCapture = vi.fn();

    render(<FaceCaptureModal isOpen onCapture={onCapture} onCancel={vi.fn()} />);

    await waitForCameraStart();
    // Brief window — should still be scanning, no "no face" warning, no capture yet.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(document.querySelector('video')).toBeInTheDocument();
    expect(screen.queryByText(/Không phát hiện khuôn mặt|Face not detected/i)).toBeNull();
  });

  it('keeps the camera open and shows the backend message when capture processing fails', async () => {
    mockVideoWidth = 640;
    mockVideoHeight = 480;
    const onCapture = vi.fn().mockRejectedValue(new Error('No face detected'));
    const onCancel = vi.fn();

    render(<FaceCaptureModal isOpen onCapture={onCapture} onCancel={onCancel} />);

    await waitForCameraStart();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Chụp/i }));
    });

    expect(await screen.findByText('No face detected')).toBeInTheDocument();
    expect(document.querySelector('video')).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('guides profile capture through straight, left, and right samples', async () => {
    mockVideoWidth = 640;
    mockVideoHeight = 480;
    const onCapture = vi.fn();

    render(<FaceCaptureModal isOpen captureMode="profile" onCapture={onCapture} onCancel={vi.fn()} />);

    await waitForCameraStart();
    expect(screen.getByText('Bước 1/3: Nhìn thẳng')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Chụp/i }));
    });
    expect(screen.getByText('Bước 2/3: Quay đầu sang trái')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Chụp/i }));
    });
    expect(screen.getByText('Bước 3/3: Quay đầu sang phải')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Chụp/i }));
    });

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(onCapture.mock.calls[0][1]).toHaveLength(3);
  });

  it('displays camera error message when access is denied', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Camera denied'));
    render(<FaceCaptureModal isOpen onCapture={vi.fn()} onCancel={vi.fn()} />);
    await vi.waitFor(() => {
      expect(screen.getByText(/camera/i)).toBeInTheDocument();
    });
  });

  it('has video element in the DOM when open', async () => {
    render(<FaceCaptureModal isOpen onCapture={vi.fn()} onCancel={vi.fn()} />);
    await vi.waitFor(() => {
      expect(document.querySelector('video')).toBeInTheDocument();
    });
  });

  it('renders the camera preview with privacy blur', async () => {
    render(<FaceCaptureModal isOpen onCapture={vi.fn()} onCancel={vi.fn()} />);
    await vi.waitFor(() => {
      expect(document.querySelector('video')?.className).toContain('blur-[12px]');
    });
  });

  it('requests an iOS-friendly back camera first and can flip to the front camera', async () => {
    render(<FaceCaptureModal isOpen onCapture={vi.fn()} onCancel={vi.fn()} />);

    await vi.waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({ facingMode: { ideal: 'environment' } }),
          audio: false,
        }),
      );
    });

    fireEvent.click(screen.getByLabelText('Đổi camera'));

    await vi.waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({ facingMode: { ideal: 'user' } }),
          audio: false,
        }),
      );
    });
  });

  it('shows a camera error when the browser blocks video playback', async () => {
    const blocked = new Error('Playback blocked');
    blocked.name = 'NotAllowedError';
    mockPlay.mockRejectedValueOnce(blocked);

    render(<FaceCaptureModal isOpen onCapture={vi.fn()} onCancel={vi.fn()} />);

    expect(await screen.findByText(/Camera blocked by browser/i)).toBeInTheDocument();
  });

  it('has close button with X icon', async () => {
    render(<FaceCaptureModal isOpen onCapture={vi.fn()} onCancel={vi.fn()} />);
    const closeBtn = await screen.findByLabelText('Close');
    expect(closeBtn).toBeInTheDocument();
  });

  it('calls onCancel when close button is clicked', async () => {
    const onCancel = vi.fn();
    render(<FaceCaptureModal isOpen onCapture={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(await screen.findByLabelText('Close'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <FaceCaptureModal isOpen={false} onCapture={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders camera icon in capture button', async () => {
    render(<FaceCaptureModal isOpen onCapture={vi.fn()} onCancel={vi.fn()} />);
    const captureBtn = await screen.findByText('Chụp');
    expect(captureBtn).toBeInTheDocument();
  });
});
