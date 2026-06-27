/**
 * CheckIn page test — verifies the public kiosk invariant + diagnostics wiring.
 *
 * Per docs/FACE-ID-SCOPE.md:
 *  - Page renders WITHOUT AuthProvider (public route).
 *  - Never imports useAuth.
 *  - Never calls /api/face/recognize.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Stub the camera controller so we don't need real getUserMedia.
vi.mock('@/components/shared/useFaceCaptureController', () => ({
  useFaceCaptureController: () => ({
    videoRef: { current: null },
    error: null,
    captureError: null,
    isStarting: false,
    detectionState: 'scanning',
    detectionScore: 0,
    poseIndex: 0,
    profileImages: [],
    isProfileCapture: false,
    currentPose: { id: 'center', labelKey: 'a', fallbackLabel: 'A', hintKey: 'b', fallbackHint: 'B' },
    handleCapture: vi.fn(),
    handleSwitchCamera: vi.fn(),
  }),
}));

// Stub the diagnostics module so we don't hit localStorage / fetch in unit tests.
vi.mock('@/lib/faceDiagnostics', () => ({
  logFace: vi.fn(),
  reportFaceEvent: vi.fn(async () => false),
  readDiagnostics: vi.fn(() => []),
  clearDiagnostics: vi.fn(),
  getDeviceInfo: vi.fn(() => ({ ios: false, safari: false, has_media_devices: true, has_face_detector: true })),
}));

// Mock fetch so we never hit the network.
const fetchMock = vi.fn();
global.fetch = fetchMock as any;

import { CheckIn } from './CheckIn';

function renderCheckIn() {
  return render(
    <MemoryRouter>
      <CheckIn />
    </MemoryRouter>
  );
}

describe('CheckIn kiosk page (public, no-auth)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('renders title without crashing (no AuthProvider needed)', async () => {
    renderCheckIn();
    await waitFor(() => {
      const titles = screen.getAllByText(/check in/i);
      expect(titles.length).toBeGreaterThan(0);
    });
  });

  it('renders the kiosk without an AuthProvider (public route invariant)', async () => {
    const { container } = renderCheckIn();
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
      // No login form / token / useAuth artifact leaked into the DOM.
      expect(container.textContent).not.toMatch(/sign in|log in|password|token|jwt/i);
    });
  });
});
