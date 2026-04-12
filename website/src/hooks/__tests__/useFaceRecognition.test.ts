import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFaceRecognition } from '../useFaceRecognition';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  recognizeFace: vi.fn(),
  registerFace: vi.fn(),
}));

describe('useFaceRecognition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transitions to success when face matches', async () => {
    vi.mocked(api.recognizeFace).mockResolvedValue({
      match: { partnerId: 'p-1', name: 'A', confidence: 0.95 },
    });

    const { result } = renderHook(() => useFaceRecognition());
    result.current.recognize(new Blob(['img']));

    await waitFor(() => expect(result.current.recognizeState.status).toBe('success'));
    expect((result.current.recognizeState as { status: 'success'; match: { partnerId: string } }).match.partnerId).toBe('p-1');
  });

  it('transitions to no_match when there is no match', async () => {
    vi.mocked(api.recognizeFace).mockResolvedValue({ match: null });

    const { result } = renderHook(() => useFaceRecognition());
    result.current.recognize(new Blob(['img']));

    await waitFor(() => expect(result.current.recognizeState.status).toBe('no_match'));
  });

  it('transitions to error when API throws', async () => {
    vi.mocked(api.recognizeFace).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFaceRecognition());
    result.current.recognize(new Blob(['img']));

    await waitFor(() => expect(result.current.recognizeState.status).toBe('error'));
    expect((result.current.recognizeState as { status: 'error'; message: string }).message).toBe('Network error');
  });

  it('transitions registerState to success', async () => {
    vi.mocked(api.registerFace).mockResolvedValue({ success: true, faceSubjectId: 's-1' });

    const { result } = renderHook(() => useFaceRecognition());
    result.current.register('p-1', new Blob(['img']));

    await waitFor(() => expect(result.current.registerState.status).toBe('success'));
  });
});
