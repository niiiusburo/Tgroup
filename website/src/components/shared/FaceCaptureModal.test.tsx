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
});
