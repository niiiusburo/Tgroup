import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GlobalFaceIdButton } from './GlobalFaceIdButton';
import { fetchPartners, registerFace } from '@/lib/api';

const navigateMock = vi.fn();
const recognizeMock = vi.fn();
const resetMock = vi.fn();
let recognizeState: { status: 'idle' | 'no_match' } = { status: 'idle' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/hooks/useFaceRecognition', () => ({
  useFaceRecognition: () => ({
    recognizeState,
    recognize: recognizeMock,
    reset: resetMock,
  }),
}));

vi.mock('@/lib/api', () => ({
  fetchPartners: vi.fn(),
  registerFace: vi.fn(),
}));

vi.mock('@/components/shared/FaceCaptureModal', () => ({
  FaceCaptureModal: ({
    isOpen,
    captureMode,
    onCapture,
    onCancel,
  }: {
    isOpen: boolean;
    captureMode?: 'single' | 'profile';
    onCapture: (image: Blob, images?: readonly Blob[]) => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div>
        <button
          type="button"
          onClick={() => {
            if (captureMode === 'profile') {
              const images = [
                new Blob(['center'], { type: 'image/jpeg' }),
                new Blob(['left'], { type: 'image/jpeg' }),
                new Blob(['right'], { type: 'image/jpeg' }),
              ];
              onCapture(images[0], images);
              return;
            }
            onCapture(new Blob(['face'], { type: 'image/jpeg' }));
          }}
        >
          {captureMode === 'profile' ? 'Mock profile capture' : 'Mock capture'}
        </button>
        <button type="button" onClick={onCancel}>
          Mock cancel
        </button>
      </div>
    ) : null,
}));

describe('GlobalFaceIdButton', () => {
  beforeEach(() => {
    recognizeState = { status: 'idle' };
    recognizeMock.mockResolvedValue({ match: null, candidates: [] });
    vi.mocked(fetchPartners).mockReset();
    vi.mocked(registerFace).mockReset();
    navigateMock.mockReset();
    resetMock.mockReset();
  });

  it('guides no-match registration through three profile captures before saving samples', async () => {
    recognizeState = { status: 'no_match' };
    vi.mocked(fetchPartners).mockResolvedValue({
      items: [
        {
          id: 'p-1',
          name: 'TRẦN THANH DUY- QL',
          ref: 'T146292',
          phone: '0906672087',
        },
      ],
    });
    vi.mocked(registerFace).mockResolvedValue({
      partnerId: 'p-1',
      sampleCount: 3,
      faceRegisteredAt: '2026-05-07T09:00:00.000Z',
    });

    render(<GlobalFaceIdButton />);

    fireEvent.click(screen.getByRole('button', { name: /Quick Face ID/i }));
    fireEvent.click(await screen.findByText('Mock capture'));

    expect(await screen.findByText('No customer matched')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Name, phone, or code...'), {
      target: { value: 'T146292' },
    });

    await waitFor(() => {
      expect(fetchPartners).toHaveBeenCalledWith({
        search: 'T146292',
        limit: 10,
        status: 'active',
      });
    });
    fireEvent.click(await screen.findByText('TRẦN THANH DUY- QL'));
    fireEvent.click(screen.getByRole('button', { name: /Capture 3 face angles/i }));
    fireEvent.click(await screen.findByText('Mock profile capture'));

    await waitFor(() => {
      expect(registerFace).toHaveBeenCalledTimes(3);
      expect(navigateMock).toHaveBeenCalledWith('/customers/p-1');
    });
    expect(vi.mocked(registerFace).mock.calls.map((call) => call[2])).toEqual([
      'no_match_rescue',
      'no_match_rescue',
      'no_match_rescue',
    ]);
  });
});
