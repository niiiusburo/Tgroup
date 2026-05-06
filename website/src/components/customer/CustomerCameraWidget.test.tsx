import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CustomerCameraWidget } from './CustomerCameraWidget';

const mockRecognize = vi.fn();
const mockRegister = vi.fn();
const mockReset = vi.fn();
const mockLoadFaceStatus = vi.fn();

vi.mock('@/hooks/useFaceRecognition', () => ({
  useFaceRecognition: () => ({
    recognizeState: { status: 'idle' },
    registerState: { status: 'idle' },
    faceStatus: null,
    recognize: mockRecognize,
    register: mockRegister,
    loadFaceStatus: mockLoadFaceStatus,
    reset: mockReset,
  }),
}));

const mockGetUserMedia = vi.fn();

describe('CustomerCameraWidget', () => {
  beforeEach(() => {
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
    });
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders idle state with Face ID and Quick Add buttons', () => {
    render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thêm nhanh/i })).toBeInTheDocument();
  });

  it('opens capture modal when Face ID is clicked', async () => {
    render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i }));
    expect(await screen.findByText(/customerProfile/i)).toBeInTheDocument();
  });

  it('calls onQuickAddResult after quick add capture', async () => {
    const onQuickAddResult = vi.fn();
    render(<CustomerCameraWidget onQuickAddResult={onQuickAddResult} onFaceIdResult={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Thêm nhanh/i }));

    await waitFor(() => {
      expect(onQuickAddResult).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('returns to idle when cancel is clicked', async () => {
    render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i }));

    const cancelBtn = await screen.findByRole('button', { name: /Hủy/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i })).toBeInTheDocument();
    });
  });
});
