import { useState, useCallback } from 'react';
import { recognizeFace, registerFace, getFaceStatus, type FaceCandidate, type FaceStatusResult } from '@/lib/api';

type RecognitionState =
  | { status: 'idle' }
  | { status: 'processing' }
  | { status: 'success'; match: FaceCandidate }
  | { status: 'candidates'; candidates: FaceCandidate[] }
  | { status: 'no_match' }
  | { status: 'error'; message: string };

type RegisterState =
  | { status: 'idle' }
  | { status: 'processing' }
  | { status: 'success'; sampleCount: number }
  | { status: 'error'; message: string };

export function useFaceRecognition() {
  const [recognizeState, setRecognizeState] = useState<RecognitionState>({ status: 'idle' });
  const [registerState, setRegisterState] = useState<RegisterState>({ status: 'idle' });
  const [faceStatus, setFaceStatus] = useState<FaceStatusResult | null>(null);

  const recognize = useCallback(async (image: Blob) => {
    setRecognizeState({ status: 'processing' });
    try {
      const result = await recognizeFace(image);
      if (result.match) {
        setRecognizeState({ status: 'success', match: result.match });
      } else if (result.candidates && result.candidates.length > 0) {
        setRecognizeState({ status: 'candidates', candidates: result.candidates });
      } else {
        setRecognizeState({ status: 'no_match' });
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'faceRecognition.recognizeFailed';
      setRecognizeState({ status: 'error', message });
      return { match: null, candidates: [] };
    }
  }, []);

  const register = useCallback(async (partnerId: string, image: Blob, source?: string) => {
    setRegisterState({ status: 'processing' });
    try {
      const result = await registerFace(partnerId, image, source);
      setRegisterState({ status: 'success', sampleCount: result.sampleCount });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'faceRecognition.registerFailed';
      setRegisterState({ status: 'error', message });
      throw err;
    }
  }, []);

  const loadFaceStatus = useCallback(async (partnerId: string) => {
    try {
      const status = await getFaceStatus(partnerId);
      setFaceStatus(status);
      return status;
    } catch {
      setFaceStatus(null);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setRecognizeState({ status: 'idle' });
    setRegisterState({ status: 'idle' });
  }, []);

  return {
    recognizeState,
    registerState,
    faceStatus,
    recognize,
    register,
    loadFaceStatus,
    reset,
  };
}
