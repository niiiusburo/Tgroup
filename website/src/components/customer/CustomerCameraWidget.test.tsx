import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CustomerCameraWidget } from './CustomerCameraWidget';

describe('CustomerCameraWidget', () => {
  const mockGetUserMedia = vi.fn();
  const mockStop = vi.fn();

  beforeEach(() => {
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      writable: true,
    });
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: mockStop }],
    } as unknown as MediaStream);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders idle state with Face ID and Quick Add buttons', () => {
    render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Face ID/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quick Add/i })).toBeInTheDocument();
  });

  it('opens camera preview when Quick Add is clicked', async () => {
    render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Quick Add/i }));

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({ video: expect.any(Object), audio: false }),
      );
    });

    expect(screen.getByRole('button', { name: /Quét/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hủy/i })).toBeInTheDocument();
  });

  it('opens camera preview when Face ID is clicked', async () => {
    render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Face ID/i }));

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    expect(screen.getByRole('button', { name: /Nhận diện/i })).toBeInTheDocument();
  });

  it('calls onQuickAddResult with mock data after capture', async () => {
    const onQuickAddResult = vi.fn();
    render(<CustomerCameraWidget onQuickAddResult={onQuickAddResult} onFaceIdResult={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Quick Add/i }));
    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Quét/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Đang xử lý/i })).toBeInTheDocument());

    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(onQuickAddResult).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'NGUYỄN VĂN A',
          identitynumber: '079199000123',
        }),
      );
    });
  });

  it('returns to idle when cancel is clicked', async () => {
    render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Quick Add/i }));
    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Hủy/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Quick Add/i })).toBeInTheDocument();
    });
    expect(mockStop).toHaveBeenCalled();
  });

  it('shows error message when camera permission is denied', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

    render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Quick Add/i }));

    await waitFor(() => {
      expect(screen.getByText(/Không thể truy cập camera/i)).toBeInTheDocument();
    });
  });
});
