import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheckIn } from './CheckIn';

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
  handleSwitchCamera: vi.fn(),
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
        expect.objectContaining({ initialFacingMode: 'user' }),
      );
    });
  });
});
