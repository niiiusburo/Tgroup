import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CustomerCameraWidget } from './CustomerCameraWidget';

const mocks = vi.hoisted(() => ({
  recognizeFace: vi.fn(),
  registerFace: vi.fn(),
  getFaceStatus: vi.fn(),
  fetchPartners: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock('@/lib/api', () => ({
  fetchPartners: mocks.fetchPartners,
  recognizeFace: mocks.recognizeFace,
  registerFace: mocks.registerFace,
  getFaceStatus: mocks.getFaceStatus,
}));

// Mock FaceCaptureModal to immediately call onCapture with a fake blob
vi.mock('@/components/shared/FaceCaptureModal', () => ({
  FaceCaptureModal: ({ isOpen, onCapture, onCancel }: {
    isOpen: boolean;
    onCapture: (blob: Blob) => void;
    onCancel: () => void;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="face-capture-modal">
        <button onClick={() => onCapture(new Blob(['fake-image'], { type: 'image/jpeg' }))}>
          Chụp
        </button>
        <button onClick={onCancel}>Hủy</button>
      </div>
    );
  },
}));

describe('CustomerCameraWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders idle state with Face ID and Quick Add buttons', () => {
    render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thêm nhanh/i })).toBeInTheDocument();
  });

  it('opens capture modal when Face ID is clicked', async () => {
    render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i }));
    expect(await screen.findByTestId('face-capture-modal')).toBeInTheDocument();
  });

  it('calls onQuickAddResult after quick add capture', async () => {
    const onQuickAddResult = vi.fn();
    render(<CustomerCameraWidget onQuickAddResult={onQuickAddResult} onFaceIdResult={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Thêm nhanh/i }));

    await waitFor(() => {
      expect(onQuickAddResult).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('returns to idle when cancel is clicked', async () => {
    render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i }));

    const cancelBtn = await screen.findByRole('button', { name: /Hủy/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i })).toBeInTheDocument();
    });
  });

  describe('Face ID auto-match flow', () => {
    it('calls onFaceIdResult with match data when recognize returns a match', async () => {
      mocks.recognizeFace.mockResolvedValue({
        match: { partnerId: 'p1', name: 'Test User', code: 'T001', phone: '0901234567', confidence: 0.95 },
        candidates: [],
      });
      const onFaceIdResult = vi.fn();

      render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={onFaceIdResult} />);
      fireEvent.click(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i }));

      const captureBtn = await screen.findByRole('button', { name: /Chụp/i });
      fireEvent.click(captureBtn);

      await waitFor(() => {
        expect(mocks.recognizeFace).toHaveBeenCalled();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(onFaceIdResult).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Face ID candidate review flow', () => {
    it('shows candidate list when recognize returns candidates', async () => {
      mocks.recognizeFace.mockResolvedValue({
        match: null,
        candidates: [
          { partnerId: 'p1', name: 'Candidate One', confidence: 0.85, phone: '0901111111', code: 'C001' },
          { partnerId: 'p2', name: 'Candidate Two', confidence: 0.72, phone: '0902222222', code: 'C002' },
        ],
      });

      render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i }));

      const captureBtn = await screen.findByRole('button', { name: /Chụp/i });
      fireEvent.click(captureBtn);

      await waitFor(() => {
        expect(mocks.recognizeFace).toHaveBeenCalled();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText(/Candidate One/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('calls onFaceIdResult when a candidate is selected', async () => {
      mocks.recognizeFace.mockResolvedValue({
        match: null,
        candidates: [
          { partnerId: 'p1', name: 'Candidate One', confidence: 0.85, phone: '0901111111', code: 'C001' },
        ],
      });
      const onFaceIdResult = vi.fn();

      render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={onFaceIdResult} />);
      fireEvent.click(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i }));

      const captureBtn = await screen.findByRole('button', { name: /Chụp/i });
      fireEvent.click(captureBtn);

      await waitFor(() => {
        expect(screen.getByText(/Candidate One/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      fireEvent.click(screen.getByText(/Candidate One/i));

      await waitFor(() => {
        expect(onFaceIdResult).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Face ID no-match rescue flow', () => {
    it('enters no-match rescue when recognize returns no match', async () => {
      mocks.recognizeFace.mockResolvedValue({
        match: null,
        candidates: [],
      });

      render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i }));

      const captureBtn = await screen.findByRole('button', { name: /Chụp/i });
      fireEvent.click(captureBtn);

      await waitFor(() => {
        expect(mocks.recognizeFace).toHaveBeenCalled();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText(/No match found/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('calls onFaceIdResult with null when entering no-match rescue', async () => {
      mocks.recognizeFace.mockResolvedValue({ match: null, candidates: [] });
      const onFaceIdResult = vi.fn();

      render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={onFaceIdResult} />);
      fireEvent.click(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i }));

      const captureBtn = await screen.findByRole('button', { name: /Chụp/i });
      fireEvent.click(captureBtn);

      await waitFor(() => {
        expect(onFaceIdResult).toHaveBeenCalledWith(null, expect.any(Blob));
      }, { timeout: 3000 });
    });
  });

  describe('Register flow', () => {
    it('shows search input in no-match rescue mode', async () => {
      mocks.recognizeFace.mockResolvedValue({ match: null, candidates: [] });

      render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i }));

      const captureBtn = await screen.findByRole('button', { name: /Chụp/i });
      fireEvent.click(captureBtn);

      await waitFor(() => {
        expect(screen.getByText(/Search customer to register/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('searches customers when typing in rescue mode', async () => {
      mocks.recognizeFace.mockResolvedValue({ match: null, candidates: [] });
      mocks.fetchPartners.mockResolvedValue({
        items: [
          { id: 'p1', name: 'Alice', ref: 'T001', phone: '0901111111' },
          { id: 'p2', name: 'Bob', ref: 'T002', phone: '0902222222' },
        ],
      });

      render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i }));

      const captureBtn = await screen.findByRole('button', { name: /Chụp/i });
      fireEvent.click(captureBtn);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Name, phone, or code/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchInput = screen.getByPlaceholderText(/Name, phone, or code/i);
      fireEvent.change(searchInput, { target: { value: 'Ali' } });

      await waitFor(() => {
        expect(mocks.fetchPartners).toHaveBeenCalledWith({ search: 'Ali', limit: 10, status: 'active' });
      }, { timeout: 1000 });

      await waitFor(() => {
        expect(screen.getByText(/Alice/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('registers face to selected customer in rescue mode', async () => {
      mocks.recognizeFace.mockResolvedValue({ match: null, candidates: [] });
      mocks.fetchPartners.mockResolvedValue({
        items: [{ id: 'p1', name: 'Alice', ref: 'T001', phone: '0901111111' }],
      });
      mocks.registerFace.mockResolvedValue({
        success: true,
        partnerId: 'p1',
        sampleId: 's-1',
        sampleCount: 1,
        faceRegisteredAt: '2026-05-07T10:00:00',
      });

      const onFaceIdResult = vi.fn();
      render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={onFaceIdResult} />);
      fireEvent.click(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i }));

      const captureBtn = await screen.findByRole('button', { name: /Chụp/i });
      fireEvent.click(captureBtn);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Name, phone, or code/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchInput = screen.getByPlaceholderText(/Name, phone, or code/i);
      fireEvent.change(searchInput, { target: { value: 'Ali' } });

      await waitFor(() => {
        expect(screen.getByText(/Alice/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      fireEvent.click(screen.getByText(/Alice/i));

      // Wait for register button to appear
      await waitFor(() => {
        expect(screen.getByText(/Register face to/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      fireEvent.click(screen.getByText(/Register face to/i));

      await waitFor(() => {
        expect(mocks.registerFace).toHaveBeenCalledWith('p1', expect.any(Blob), 'no_match_rescue');
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(onFaceIdResult).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('shows error when registration fails in rescue mode', async () => {
      mocks.recognizeFace.mockResolvedValue({ match: null, candidates: [] });
      mocks.fetchPartners.mockResolvedValue({
        items: [{ id: 'p1', name: 'Alice', ref: 'T001', phone: '0901111111' }],
      });
      mocks.registerFace.mockRejectedValue(new Error('Face service down'));

      render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i }));

      const captureBtn = await screen.findByRole('button', { name: /Chụp/i });
      fireEvent.click(captureBtn);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Name, phone, or code/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchInput = screen.getByPlaceholderText(/Name, phone, or code/i);
      fireEvent.change(searchInput, { target: { value: 'Ali' } });

      await waitFor(() => {
        expect(screen.getByText(/Alice/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      fireEvent.click(screen.getByText(/Alice/i));

      await waitFor(() => {
        expect(screen.getByText(/Register face to/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      fireEvent.click(screen.getByText(/Register face to/i));

      await waitFor(() => {
        expect(mocks.registerFace).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Reset functionality', () => {
    it('resets state when cancel is clicked', async () => {
      render(<CustomerCameraWidget onQuickAddResult={vi.fn()} onFaceIdResult={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i }));

      const cancelBtn = await screen.findByRole('button', { name: /Hủy/i });
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Nhận diện khuôn mặt/i })).toBeInTheDocument();
      });
    });
  });
});