import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CustomerCameraWidget } from './CustomerCameraWidget';

vi.mock('@/hooks/useFaceRecognition', () => ({
  useFaceRecognition: () => ({
    recognizeState: { status: 'idle' },
    registerState: { status: 'idle' },
    recognize: vi.fn(),
    register: vi.fn(),
    reset: vi.fn(),
  }),
}));

const mockGetUserMedia = vi.fn();
const mockStop = vi.fn();

describe('CustomerCameraWidget', () => {
  beforeEach(() => {
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
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

  it('opens capture modal when Face ID is clicked', async () => {
    render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Face ID/i }));
    expect(await screen.findByText('customerProfile')).toBeInTheDocument();
  });

  it('calls onQuickAddResult after quick add capture', async () => {
    const onQuickAddResult = vi.fn();
    render(<CustomerCameraWidget onQuickAddResult={onQuickAddResult} onFaceIdResult={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Quick Add/i }));
    vi.advanceTimersByTime(2000);
    await waitFor(() => {
      expect(onQuickAddResult).toHaveBeenCalled();
    });
  });

  it('returns to idle when cancel is clicked after Face ID', async () => {
    render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Face ID/i }));
    expect(await screen.findByText('customerProfile')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Hủy/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Face ID/i })).toBeInTheDocument();
    });
  });
});
