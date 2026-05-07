import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FaceCaptureModal } from './FaceCaptureModal';

describe('FaceCaptureModal', () => {
  const mockGetUserMedia = vi.fn();

  beforeEach(() => {
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
    });
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream);
  });

  afterEach(() => {
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
