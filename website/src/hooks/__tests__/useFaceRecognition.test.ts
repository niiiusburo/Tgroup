import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFaceRecognition } from '../useFaceRecognition';
import * as api from '@/lib/api';
import i18n from '@/i18n';

vi.mock('@/lib/api', () => ({
  recognizeFace: vi.fn(),
  registerFace: vi.fn(),
  reregisterFace: vi.fn(),
  getFaceStatus: vi.fn(),
}));

vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({ currentLOB: 'cosmetic' }),
}));

describe('useFaceRecognition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useFaceRecognition());
    expect(result.current.recognizeState.status).toBe('idle');
    expect(result.current.registerState.status).toBe('idle');
    expect(result.current.faceStatus).toBeNull();
  });

  it('transitions to success when face matches with high confidence', async () => {
    vi.mocked(api.recognizeFace).mockResolvedValue({
      match: { partnerId: 'p-1', name: 'Alice', code: 'T001', phone: '0901', confidence: 0.95 },
      candidates: [],
    });

    const { result } = renderHook(() => useFaceRecognition());
    result.current.recognize(new Blob(['img']));

    await waitFor(() => expect(result.current.recognizeState.status).toBe('success'));
    const state = result.current.recognizeState as { status: 'success'; match: { partnerId: string; name: string } };
    expect(state.match.partnerId).toBe('p-1');
    expect(state.match.name).toBe('Alice');
  });

  it('transitions to candidates when plausible matches exist', async () => {
    vi.mocked(api.recognizeFace).mockResolvedValue({
      match: null,
      candidates: [
        { partnerId: 'p-1', name: 'Alice', code: 'T001', phone: '0901', confidence: 0.52 },
        { partnerId: 'p-2', name: 'Bob', code: 'T002', phone: '0902', confidence: 0.48 },
      ],
    });

    const { result } = renderHook(() => useFaceRecognition());
    result.current.recognize(new Blob(['img']));

    await waitFor(() => expect(result.current.recognizeState.status).toBe('candidates'));
    const state = result.current.recognizeState as { status: 'candidates'; candidates: Array<{ partnerId: string }> };
    expect(state.candidates).toHaveLength(2);
    expect(state.candidates[0].partnerId).toBe('p-1');
  });

  it('transitions to ambiguous when backend blocks close identity matches', async () => {
    vi.mocked(api.recognizeFace).mockResolvedValue({
      status: 'ambiguous',
      match: null,
      candidates: [],
      recognitionVersion: 'face-recognition-test',
      ambiguity: {
        code: 'AMBIGUOUS_FACE_MATCH',
        message: 'Face match is ambiguous',
        margin: 0.04,
        requiredMargin: 0.06,
        candidates: [
          { partnerId: 'p-1', name: 'Alice', code: 'T001', phone: '0901', confidence: 0.9 },
          { partnerId: 'p-2', name: 'Bob', code: 'T002', phone: '0902', confidence: 0.86 },
        ],
      },
    });

    const { result } = renderHook(() => useFaceRecognition());
    result.current.recognize(new Blob(['img']));

    await waitFor(() => expect(result.current.recognizeState.status).toBe('ambiguous'));
    const state = result.current.recognizeState as {
      status: 'ambiguous';
      candidates: Array<{ partnerId: string }>;
      recognitionVersion?: string | null;
    };
    expect(state.candidates).toHaveLength(2);
    expect(state.recognitionVersion).toBe('face-recognition-test');
  });

  it('maps AMBIGUOUS_FACE_MATCH errors to a localized rescan message', async () => {
    const ambiguousErr = Object.assign(new Error('raw ambiguous msg'), { code: 'AMBIGUOUS_FACE_MATCH' });
    vi.mocked(api.recognizeFace).mockRejectedValue(ambiguousErr);

    const { result } = renderHook(() => useFaceRecognition());
    result.current.recognize(new Blob(['img'])).catch(() => {});

    await waitFor(() => expect(result.current.recognizeState.status).toBe('error'));
    const state = result.current.recognizeState as { status: 'error'; message: string };
    expect(state.message).toBe(i18n.t('faceRecognition.ambiguous', { ns: 'customers' }));
  });

  it('transitions to no_match when there is no match', async () => {
    vi.mocked(api.recognizeFace).mockResolvedValue({ match: null, candidates: [] });

    const { result } = renderHook(() => useFaceRecognition());
    result.current.recognize(new Blob(['img']));

    await waitFor(() => expect(result.current.recognizeState.status).toBe('no_match'));
  });

  it('transitions to error when API throws', async () => {
    vi.mocked(api.recognizeFace).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFaceRecognition());
    result.current.recognize(new Blob(['img'])).catch(() => {});

    await waitFor(() => expect(result.current.recognizeState.status).toBe('error'));
    const state = result.current.recognizeState as { status: 'error'; message: string };
    expect(state.message).toBe('Network error');
  });

  it('transitions registerState to success with sampleCount', async () => {
    vi.mocked(api.registerFace).mockResolvedValue({
      success: true,
      partnerId: 'p-1',
      sampleId: 's-1',
      sampleCount: 3,
      faceRegisteredAt: '2026-05-07T10:00:00',
    });

    const { result } = renderHook(() => useFaceRecognition());
    result.current.register('p-1', new Blob(['img']));

    await waitFor(() => expect(result.current.registerState.status).toBe('success'));
    const state = result.current.registerState as { status: 'success'; sampleCount: number };
    expect(state.sampleCount).toBe(3);
  });

  it('passes source parameter to registerFace', async () => {
    vi.mocked(api.registerFace).mockResolvedValue({
      success: true,
      partnerId: 'p-1',
      sampleId: 's-1',
      sampleCount: 1,
      faceRegisteredAt: '2026-05-07T10:00:00',
    });

    const { result } = renderHook(() => useFaceRecognition());
    await result.current.register('p-1', new Blob(['img']), 'no_match_rescue');

    expect(api.registerFace).toHaveBeenCalledWith('p-1', expect.any(Blob), 'no_match_rescue', 'cosmetic');
  });

  it('calls registerFace without source when source is omitted', async () => {
    vi.mocked(api.registerFace).mockResolvedValue({
      success: true,
      partnerId: 'p-1',
      sampleId: 's-1',
      sampleCount: 1,
      faceRegisteredAt: '2026-05-07T10:00:00',
    });

    const { result } = renderHook(() => useFaceRecognition());
    await result.current.register('p-1', new Blob(['img']));

    expect(api.registerFace).toHaveBeenCalledWith('p-1', expect.any(Blob), undefined, 'cosmetic');
  });

  it('transitions registerState to error when API throws', async () => {
    vi.mocked(api.registerFace).mockRejectedValue(new Error('Upload failed'));

    const { result } = renderHook(() => useFaceRecognition());
    result.current.register('p-1', new Blob(['img'])).catch(() => {});

    await waitFor(() => expect(result.current.registerState.status).toBe('error'));
    const state = result.current.registerState as { status: 'error'; message: string };
    expect(state.message).toBe('Upload failed');
  });

  it('loads face status successfully', async () => {
    vi.mocked(api.getFaceStatus).mockResolvedValue({
      partnerId: 'p-1',
      registered: true,
      sampleCount: 2,
      lastRegisteredAt: '2026-05-07T10:00:00',
    });

    const { result } = renderHook(() => useFaceRecognition());
    await result.current.loadFaceStatus('p-1');

    await waitFor(() => expect(result.current.faceStatus?.partnerId).toBe('p-1'));
    expect(result.current.faceStatus?.registered).toBe(true);
    expect(result.current.faceStatus?.sampleCount).toBe(2);
  });

  it('sets faceStatus to null when loadFaceStatus fails', async () => {
    vi.mocked(api.getFaceStatus).mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useFaceRecognition());
    await result.current.loadFaceStatus('p-1');

    await waitFor(() => expect(result.current.faceStatus).toBeNull());
  });

  it('recognize handles non-Error exceptions', async () => {
    vi.mocked(api.recognizeFace).mockRejectedValue('string-error');

    const { result } = renderHook(() => useFaceRecognition());
    result.current.recognize(new Blob(['img'])).catch(() => {});

    await waitFor(() => expect(result.current.recognizeState.status).toBe('error'));
    const state = result.current.recognizeState as { status: 'error'; message: string };
    expect(state.message).toBe('faceRecognition.recognizeFailed');
  });

  it('register handles non-Error exceptions', async () => {
    vi.mocked(api.registerFace).mockRejectedValue(123);

    const { result } = renderHook(() => useFaceRecognition());
    await expect(result.current.register('p-1', new Blob(['img']))).rejects.toBe(123);
    await waitFor(() => expect(result.current.registerState.status).toBe('error'));
    const state = result.current.registerState as { status: 'error'; message: string };
    expect(state.message).toBe('faceRecognition.registerFailed');
  });

  it('maps SPOOF_DETECTED to the localized liveness message on recognize', async () => {
    const spoofErr = Object.assign(new Error('raw service msg'), { code: 'SPOOF_DETECTED' });
    vi.mocked(api.recognizeFace).mockRejectedValue(spoofErr);

    const { result } = renderHook(() => useFaceRecognition());
    result.current.recognize(new Blob(['img'])).catch(() => {});

    await waitFor(() => expect(result.current.recognizeState.status).toBe('error'));
    const state = result.current.recognizeState as { status: 'error'; message: string };
    // spoof code wins over the raw error message and resolves to the localized key
    expect(state.message).toBe(i18n.t('faceRecognition.spoofDetected', { ns: 'customers' }));
    expect(state.message).not.toBe('raw service msg');
  });

  it('maps SPOOF_DETECTED to the localized liveness message on register', async () => {
    const spoofErr = Object.assign(new Error('raw service msg'), { code: 'SPOOF_DETECTED' });
    vi.mocked(api.registerFace).mockRejectedValue(spoofErr);

    const { result } = renderHook(() => useFaceRecognition());
    await expect(result.current.register('p-1', new Blob(['img']))).rejects.toBe(spoofErr);
    await waitFor(() => expect(result.current.registerState.status).toBe('error'));
    const state = result.current.registerState as { status: 'error'; message: string };
    expect(state.message).toBe(i18n.t('faceRecognition.spoofDetected', { ns: 'customers' }));
  });

  it('recognize rethrows API errors after setting error state', async () => {
    vi.mocked(api.recognizeFace).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useFaceRecognition());
    await expect(result.current.recognize(new Blob(['img']))).rejects.toThrow('fail');

    await waitFor(() => expect(result.current.recognizeState.status).toBe('error'));
  });

  it('reset clears both states', async () => {
    vi.mocked(api.recognizeFace).mockResolvedValue({
      match: { partnerId: 'p-1', name: 'Alice', code: 'T001', phone: '0901', confidence: 0.95 },
      candidates: [],
    });

    const { result } = renderHook(() => useFaceRecognition());
    result.current.recognize(new Blob(['img']));
    await waitFor(() => expect(result.current.recognizeState.status).toBe('success'));

    result.current.reset();
    await waitFor(() => expect(result.current.recognizeState.status).toBe('idle'));
    expect(result.current.registerState.status).toBe('idle');
  });
});
