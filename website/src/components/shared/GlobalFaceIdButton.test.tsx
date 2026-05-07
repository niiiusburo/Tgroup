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
    onCapture,
    onCancel,
  }: {
    isOpen: boolean;
    onCapture: (image: Blob) => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div>
        <button
          type="button"
          onClick={() => onCapture(new Blob(['face'], { type: 'image/jpeg' }))}
        >
          Mock capture
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

  it('registers a no-match auto-captured face to a searched customer', async () => {
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
      sampleCount: 1,
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
    fireEvent.click(screen.getByRole('button', { name: /Register face/i }));

    await waitFor(() => {
      expect(registerFace).toHaveBeenCalledWith(
        'p-1',
        expect.any(Blob),
        'no_match_rescue',
      );
      expect(navigateMock).toHaveBeenCalledWith('/customers/p-1');
    });
  });
});
