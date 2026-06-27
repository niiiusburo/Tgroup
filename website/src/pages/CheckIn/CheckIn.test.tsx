import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheckIn } from './CheckIn';

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

    expect(await screen.findByTestId('checkin-privacy-blur')).toHaveClass('backdrop-blur-[14px]');
    expect(document.querySelector('video')?.className).not.toContain('blur-');
  });

  it('lets the user flip cameras from the public kiosk page', async () => {
    renderCheckIn();

    fireEvent.click(await screen.findByLabelText(/flip camera|đổi camera|checkIn\.flipCamera/i));

    expect(mockHandleSwitchCamera).toHaveBeenCalledTimes(1);
  });
});
