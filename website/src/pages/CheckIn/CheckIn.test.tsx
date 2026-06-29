import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheckIn } from './CheckIn';
import { ApiError, publicFaceCheckIn } from '@/lib/api';

const mockHandleSwitchCamera = vi.hoisted(() => vi.fn());

const mockUseFaceCaptureController = vi.hoisted(() => vi.fn(() => ({
  videoRef: { current: null },
  error: null,
  captureError: null,
  isStarting: false,
  detectionState: 'scanning',
  detectionScore: 0,
  poseIndex: 0,
  profileImages: [],
  isProfileCapture: false,
  currentPose: { id: 'center', labelKey: 'center', fallbackLabel: 'Center', hintKey: 'hint', fallbackHint: 'Look forward' },
  handleCapture: vi.fn(),
  handleSwitchCamera: mockHandleSwitchCamera,
})));

vi.mock('@/components/shared/useFaceCaptureController', () => ({
  useFaceCaptureController: mockUseFaceCaptureController,
}));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  publicFaceCheckIn: vi.fn(),
}));

function renderCheckIn() {
  return render(
    <MemoryRouter>
      <CheckIn />
    </MemoryRouter>,
  );
}

describe('CheckIn kiosk page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without an AuthProvider because it is a public route', async () => {
    const { container } = renderCheckIn();

    await waitFor(() => {
      expect(screen.getAllByText(/check in|điểm danh|checkIn.title/i).length).toBeGreaterThan(0);
      expect(container.textContent).not.toMatch(/sign in|log in|password|token|jwt/i);
    });
  });

  it('starts the kiosk flow with the front camera', async () => {
    renderCheckIn();

    await waitFor(() => {
      expect(mockUseFaceCaptureController).toHaveBeenCalledWith(
        expect.objectContaining({ defaultFacingMode: 'user' }),
      );
    });
  });

  it('keeps the public preview privacy-blurred without blurring the capture video', async () => {
    renderCheckIn();

    expect(await screen.findByTestId('checkin-privacy-blur')).toHaveClass('backdrop-blur-[3px]');
    expect(await screen.findByTestId('checkin-privacy-blur')).toHaveClass('bg-gray-950/10');
    expect(document.querySelector('video')?.className).not.toContain('blur-');
  });

  it('lets the user flip cameras from the public kiosk page', async () => {
    renderCheckIn();

    fireEvent.click(await screen.findByLabelText(/flip camera|đổi camera|checkIn\.flipCamera/i));

    expect(mockHandleSwitchCamera).toHaveBeenCalledTimes(1);
  });

  it('keeps scanning when the provider rejects one frame with NO_FACE', async () => {
    vi.mocked(publicFaceCheckIn).mockRejectedValueOnce(new ApiError({
      status: 422,
      code: 'NO_FACE',
      message: 'No face detected',
    }));
    renderCheckIn();

    await waitFor(() => {
      expect(mockUseFaceCaptureController).toHaveBeenCalled();
    });
    const captureOptions = mockUseFaceCaptureController.mock.calls.at(-1)?.[0];
    expect(captureOptions).toBeDefined();

    await act(async () => {
      await captureOptions!.onCapture(new Blob(['image'], { type: 'image/jpeg' }));
    });

    expect(screen.getByText(/Face not clear yet|Chưa thấy rõ khuôn mặt/i)).toBeInTheDocument();
    expect(screen.queryByText(/No face detected|Something went wrong|Đã xảy ra lỗi/i)).not.toBeInTheDocument();
    expect(mockUseFaceCaptureController.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ isOpen: true }),
    );
  });

  it('shows a terminal error after repeated transient no-face frames', async () => {
    vi.mocked(publicFaceCheckIn).mockRejectedValue(new ApiError({
      status: 422,
      code: 'NO_FACE',
      message: 'No face detected',
    }));
    renderCheckIn();

    await waitFor(() => {
      expect(mockUseFaceCaptureController).toHaveBeenCalled();
    });

    for (let i = 0; i < 5; i += 1) {
      const captureOptions = mockUseFaceCaptureController.mock.calls.at(-1)?.[0];
      expect(captureOptions).toBeDefined();
      await act(async () => {
        await captureOptions!.onCapture(new Blob([`image-${i}`], { type: 'image/jpeg' }));
      });
    }

    expect(screen.getByText(/No face detected/i)).toBeInTheDocument();
    expect(mockUseFaceCaptureController.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ isOpen: false }),
    );
  });
});
