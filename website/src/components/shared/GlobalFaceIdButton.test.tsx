import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GlobalFaceIdButton } from './GlobalFaceIdButton';
import { fetchPartners, registerFace } from '@/lib/api';

const navigateMock = vi.fn();
const recognizeMock = vi.fn();
const resetMock = vi.fn();
type MockMatch = { partnerId: string; name: string; code: string; phone: string | null; confidence: number };
let recognizeState:
  | { status: 'idle' | 'no_match' }
  | { status: 'success'; match: MockMatch }
  | { status: 'ambiguous'; candidates: MockMatch[]; recognitionVersion?: string | null } = { status: 'idle' };
let canCrossView = false;
const probeCrossLobMock = vi.fn();

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

vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({
    currentLOB: 'cosmetic',
  }),
}));

vi.mock('@/lib/api', () => ({
  fetchPartners: vi.fn(),
  registerFace: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (p: string) => (p === 'lob.crossview' ? canCrossView : true) }),
}));

vi.mock('@/lib/api/partners', () => ({
  probeCrossLob: (...args: unknown[]) => probeCrossLobMock(...args),
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
          onClick={() => {
            void Promise.resolve(onCapture(new Blob(['face'], { type: 'image/jpeg' }))).catch(() => {});
          }}
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
    canCrossView = false;
    probeCrossLobMock.mockReset();
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

    fireEvent.click(screen.getByRole('button', { name: /Quét nhanh khuôn mặt/i }));
    fireEvent.click(await screen.findByText('Mock capture'));

    expect(await screen.findByText('Không tìm thấy')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Tên, SĐT hoặc mã...'), {
      target: { value: 'T146292' },
    });

    await waitFor(() => {
      expect(fetchPartners).toHaveBeenCalledWith({
        search: 'T146292',
        limit: 10,
        status: 'active',
        lob: 'cosmetic',
      });
    });
    fireEvent.click(await screen.findByText('TRẦN THANH DUY- QL'));
    fireEvent.click(screen.getByRole('button', { name: /Đăng ký khuôn mặt/i }));

    await waitFor(() => {
      expect(registerFace).toHaveBeenCalledWith(
        'p-1',
        expect.any(Blob),
        'no_match_rescue',
        'cosmetic',
      );
      expect(navigateMock).toHaveBeenCalledWith('/customers/p-1');
    });
  });

  it('keeps the capture modal open when recognition returns no-face error', async () => {
    recognizeMock.mockRejectedValue(new Error('No face detected'));

    render(<GlobalFaceIdButton />);

    fireEvent.click(screen.getByRole('button', { name: /Quét nhanh khuôn mặt/i }));
    fireEvent.click(await screen.findByText('Mock capture'));

    await waitFor(() => {
      expect(recognizeMock).toHaveBeenCalled();
    });

    // Modal should still be open (capture button still visible)
    expect(screen.getByText('Mock capture')).toBeInTheDocument();
    // And the quick face button should still be visible
    expect(screen.getByRole('button', { name: /Quét nhanh khuôn mặt/i })).toBeInTheDocument();
  });

  it('blocks ambiguous matches and shows the Face ID version instead of selectable customers', async () => {
    const candidates = [
      { partnerId: 'p-1', name: 'Alice', code: 'T001', phone: '0901', confidence: 0.9 },
      { partnerId: 'p-2', name: 'Bob', code: 'T002', phone: '0902', confidence: 0.86 },
    ];
    recognizeState = { status: 'ambiguous', candidates, recognitionVersion: 'face-recognition-test' };
    recognizeMock.mockResolvedValue({
      status: 'ambiguous',
      match: null,
      candidates: [],
      recognitionVersion: 'face-recognition-test',
      ambiguity: { code: 'AMBIGUOUS_FACE_MATCH', candidates },
    });

    render(<GlobalFaceIdButton />);
    fireEvent.click(screen.getByRole('button', { name: /Quét nhanh khuôn mặt/i }));
    fireEvent.click(await screen.findByText('Mock capture'));

    expect(await screen.findByText(/Cần quét khuôn mặt rõ hơn/i)).toBeInTheDocument();
    expect(screen.getByText('face-recognition-test')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('shows the cross-LOB chooser when the recognized customer exists in both LOBs', async () => {
    canCrossView = true;
    const match = { partnerId: 'cos-1', name: 'Alice', code: 'C1', phone: '0901234567', confidence: 0.97 };
    recognizeState = { status: 'success', match };
    recognizeMock.mockResolvedValue({ match, candidates: [] });
    probeCrossLobMock.mockResolvedValue({ matched: true, otherLob: 'dental', otherId: 'den-9', otherName: 'Alice' });
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    render(<GlobalFaceIdButton />);
    fireEvent.click(screen.getByRole('button', { name: /Quét nhanh khuôn mặt/i }));
    fireEvent.click(await screen.findByText('Mock capture'));

    // Probes the other LOB by phone and does NOT auto-navigate.
    await waitFor(() => expect(probeCrossLobMock).toHaveBeenCalledWith('0901234567', 'cosmetic'));
    expect(await screen.findByText(/cả hai mảng/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();

    // Choosing the OTHER LOB opens its record in a new tab via the ?lob= deep link.
    fireEvent.click(screen.getByText('Nha khoa'));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('/customers/den-9?lob=dental'),
      '_blank',
      expect.any(String),
    );
    openSpy.mockRestore();
  });
});
