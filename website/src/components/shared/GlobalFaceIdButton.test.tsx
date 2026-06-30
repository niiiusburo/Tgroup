import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GlobalFaceIdButton } from './GlobalFaceIdButton';
import { fetchPartners, registerFace } from '@/lib/api';

const navigateMock = vi.fn();
const recognizeMock = vi.fn();
const resetMock = vi.fn();
type MockRecognitionState =
  | { status: 'idle' }
  | { status: 'no_match'; recognitionVersion?: string | null }
  | {
      status: 'candidates';
      candidates: Array<{ partnerId: string; name: string; code: string; phone: string; confidence: number }>;
      recognitionVersion?: string | null;
    };
let recognizeState: MockRecognitionState = { status: 'idle' };

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
    title,
    versionLabel,
    captureMode,
    onCapture,
    onCancel,
  }: {
    isOpen: boolean;
    title?: string;
    versionLabel?: string;
    captureMode?: 'single' | 'profile';
    onCapture: (image: Blob, images?: readonly Blob[]) => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div>
        <span>{title}</span>
        <span>{versionLabel}</span>
        <span data-testid="mock-capture-mode">{captureMode ?? 'single'}</span>
        <button
          type="button"
          onClick={() => {
            const images =
              captureMode === 'profile'
                ? [
                    new Blob(['face-center'], { type: 'image/jpeg' }),
                    new Blob(['face-left'], { type: 'image/jpeg' }),
                    new Blob(['face-right'], { type: 'image/jpeg' }),
                  ]
                : undefined;
            const image = images?.[0] ?? new Blob(['face'], { type: 'image/jpeg' });
            void Promise.resolve(onCapture(image, images)).catch(() => {});
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
  });

  it('requires guided left/right capture before registering a no-match face to a searched customer', async () => {
    recognizeState = { status: 'no_match', recognitionVersion: 'face-recognition-0.32.54' };
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
    expect(screen.getByTestId('mock-capture-mode')).toHaveTextContent('single');
    fireEvent.click(await screen.findByText('Mock capture'));

    expect(await screen.findByText('No customer matched')).toBeInTheDocument();
    expect(screen.getAllByText('v0.32.54')).toHaveLength(2);
    expect(screen.getByText(/capture straight, left, and right angles/i)).toBeInTheDocument();

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
    fireEvent.click(screen.getByRole('button', { name: /Start 3-angle scan/i }));

    expect(await screen.findByText('3-angle Face ID registration')).toBeInTheDocument();
    expect(screen.getByTestId('mock-capture-mode')).toHaveTextContent('profile');
    fireEvent.click(screen.getByText('Mock capture'));

    await waitFor(() => {
      expect(registerFace).toHaveBeenCalledTimes(3);
      expect(navigateMock).toHaveBeenCalledWith('/customers/p-1');
    });
    expect(registerFace).toHaveBeenNthCalledWith(1, 'p-1', expect.any(Blob), 'no_match_rescue');
    expect(registerFace).toHaveBeenNthCalledWith(2, 'p-1', expect.any(Blob), 'no_match_rescue');
    expect(registerFace).toHaveBeenNthCalledWith(3, 'p-1', expect.any(Blob), 'no_match_rescue');
  });

  it('passes the active NK2 Face ID version into the camera popup', async () => {
    render(<GlobalFaceIdButton />);

    fireEvent.click(screen.getByRole('button', { name: /Quick Face ID/i }));

    expect(await screen.findByText('Quick Face ID')).toBeInTheDocument();
    expect(screen.getAllByText('v0.32.54')).toHaveLength(2);
  });

  it('requires a clearer scan instead of exposing ambiguous candidate choices', async () => {
    recognizeState = {
      status: 'candidates',
      recognitionVersion: 'face-recognition-0.32.54',
      candidates: [
        { partnerId: 'p-1', name: 'Alice', code: 'T001', phone: '0901', confidence: 0.91 },
        { partnerId: 'p-2', name: 'Bob', code: 'T002', phone: '0902', confidence: 0.89 },
      ],
    };

    render(<GlobalFaceIdButton />);

    fireEvent.click(screen.getByRole('button', { name: /Quick Face ID/i }));
    fireEvent.click(await screen.findByText('Mock capture'));

    expect(await screen.findByText('Face ID needs a clearer scan')).toBeInTheDocument();
    expect(screen.getByText('2 possible matches hidden for safety')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('keeps the capture modal open when recognition returns no-face error', async () => {
    recognizeMock.mockRejectedValue(new Error('No face detected'));

    render(<GlobalFaceIdButton />);

    fireEvent.click(screen.getByRole('button', { name: /Quick Face ID/i }));
    fireEvent.click(await screen.findByText('Mock capture'));

    await waitFor(() => {
      expect(recognizeMock).toHaveBeenCalled();
    });

    expect(screen.getByText('Mock capture')).toBeInTheDocument();
    expect(screen.getByText('Quick Face ID')).toBeInTheDocument();
  });
});
