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
    const onCapture = vi.fn();

    render(<FaceCaptureModal isOpen onCapture={onCapture} onCancel={vi.fn()} />);

    await waitForCameraStart();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1800);
    });

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture.mock.calls[0][0]).toBeInstanceOf(Blob);
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

  it('requests the back camera first and can flip to the front camera', async () => {
    render(<FaceCaptureModal isOpen onCapture={vi.fn()} onCancel={vi.fn()} />);

    await vi.waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({ facingMode: { exact: 'environment' } }),
          audio: false,
        }),
      );
    });

    fireEvent.click(screen.getByLabelText('Đổi camera'));

    await vi.waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({ facingMode: { exact: 'user' } }),
          audio: false,
        }),
      );
    });
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
