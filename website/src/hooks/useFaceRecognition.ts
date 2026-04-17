import { useState, useCallback } from 'react';
import { recognizeFace, registerFace, type FaceMatchResult } from '@/lib/api';

type RecognitionState =
  | { status: 'idle' }
  | { status: 'processing' }
  | { status: 'success'; match: NonNullable<FaceMatchResult['match']> }
  | { status: 'no_match' }
  | { status: 'error'; message: string };

type RegisterState =
  | { status: 'idle' }
  | { status: 'processing' }
  | { status: 'success' }
  | { status: 'error'; message: string };

export function useFaceRecognition() {
  const [recognizeState, setRecognizeState] = useState<RecognitionState>({ status: 'idle' });
  const [registerState, setRegisterState] = useState<RegisterState>({ status: 'idle' });

  const recognize = useCallback(async (image: Blob) => {
    setRecognizeState({ status: 'processing' });
    try {
      const result = await recognizeFace(image);
      if (result.match) {
        setRecognizeState({ status: 'success', match: result.match });
      } else {
        setRecognizeState({ status: 'no_match' });
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'faceRecognition.recognizeFailed';
      setRecognizeState({ status: 'error', message });
      return { match: null } as FaceMatchResult;
    }
  }, []);

  const register = useCallback(async (partnerId: string, image: Blob) => {
    setRegisterState({ status: 'processing' });
    try {
      await registerFace(partnerId, image);
      setRegisterState({ status: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'faceRecognition.registerFailed';
      setRegisterState({ status: 'error', message });
    }
  }, []);

  const reset = useCallback(() => {
    setRecognizeState({ status: 'idle' });
    setRegisterState({ status: 'idle' });
  }, []);

  return {
    recognizeState,
    registerState,
    recognize,
    register,
    reset,
  };
}
