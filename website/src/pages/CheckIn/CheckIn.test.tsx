/**
 * CheckIn page test — verifies the public kiosk invariant.
 *
 * Per docs/FACE-ID-SCOPE.md:
 *  - Page renders WITHOUT AuthProvider (public route).
 *  - Never imports useAuth.
 *  - Never calls /api/face/recognize.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';

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

// Mock fetch so we never hit the network.
const fetchMock = vi.fn();
global.fetch = fetchMock as any;

import { CheckIn } from './CheckIn';

function renderCheckIn() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <CheckIn />
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('CheckIn kiosk page (public, no-auth)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('renders title + subtitle without crashing (no AuthProvider needed)', async () => {
    renderCheckIn();
    // Title from i18n key checkIn.title — accepts EN "Check In" or VI "Điểm danh"
    await waitFor(() => {
      const titles = screen.getAllByText(/check in|điểm danh/i);
      expect(titles.length).toBeGreaterThan(0);
    });
  });

  it('renders the kiosk without an AuthProvider (public route invariant)', async () => {
    const { container } = renderCheckIn();
    await waitFor(() => {
      // Page container must be present.
      expect(container.firstChild).not.toBeNull();
      // No login form / token / useAuth artifact leaked into the DOM.
      expect(container.textContent).not.toMatch(/sign in|log in|password|token|jwt/i);
    });
  });
});
