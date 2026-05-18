/**
 * Module A: Native FaceDetector Strategy
 * Uses browser native FaceDetector API with auto-capture on quality score
 * @crossref:used-in[FaceLab]
 * @crossref:uses[FaceLabModuleShell, recognizeFace, getNativeFaceDetector, analyzeFrame, captureVideoFrame, getCameraStream, stopStream]
 */

import { useEffect, useRef, useState } from 'react';
import { recognizeFace } from '@/lib/api';
import {
  getNativeFaceDetector,
  analyzeFrame,
  captureVideoFrame,
  getCameraStream,
  stopStream,
  AUTO_CAPTURE_SCORE,
  AUTO_CAPTURE_READY_FRAMES,
  DETECTION_INTERVAL_MS,
} from '@/components/shared/faceCaptureEngine';
import { FaceLabModuleShell } from './FaceLabModule';
import type { ModuleResult, FaceLabModuleProps } from './types';

interface State {
  stream: MediaStream | null;
  detector: ReturnType<typeof getNativeFaceDetector>;
  detectionInterval: ReturnType<typeof setInterval> | null;
  readyFrameCount: number;
}

export function ModuleA_NativeDetector({ onResult: _onResult }: FaceLabModuleProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stateRef = useRef<State>({
    stream: null,
    detector: null,
    detectionInterval: null,
    readyFrameCount: 0,
  });
  const [detectionScore, setDetectionScore] = useState(0);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await getCameraStream('user');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const detector = getNativeFaceDetector();
        stateRef.current.stream = stream;
        stateRef.current.detector = detector;

        // Start detection loop
        const interval = setInterval(async () => {
          if (!videoRef.current) return;

          const result = await analyzeFrame(videoRef.current, detector, true);
          setDetectionScore(result.score);

          if (result.ready) {
            stateRef.current.readyFrameCount++;
            if (stateRef.current.readyFrameCount >= AUTO_CAPTURE_READY_FRAMES) {
              clearInterval(stateRef.current.detectionInterval!);
              stateRef.current.detectionInterval = null;
              // Auto-capture would happen here, but we'll let user click manually for this lab
            }
          } else {
            stateRef.current.readyFrameCount = 0;
          }
        }, DETECTION_INTERVAL_MS);

        stateRef.current.detectionInterval = interval;
      } catch (err) {
        console.error('Camera init failed:', err);
      }
    };

    initCamera();

    return () => {
      if (stateRef.current.detectionInterval) {
        clearInterval(stateRef.current.detectionInterval);
      }
      if (stateRef.current.stream) {
        stopStream(stateRef.current.stream);
      }
    };
  }, []);

  const handleCapture = async (videoElement: HTMLVideoElement): Promise<ModuleResult> => {
    const captureStart = performance.now();
    const blob = await captureVideoFrame(videoElement);

    if (!blob) {
      throw new Error('Failed to capture frame');
    }

    const captureEnd = performance.now();
    const uploadStart = performance.now();

    try {
      const result = await recognizeFace(blob);
      const uploadEnd = performance.now();

      const resolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`;

      return {
        moduleId: 'native',
        match: result.match || null,
        candidates: result.candidates || [],
        timing: {
          capture: captureEnd - captureStart,
          upload: uploadEnd - uploadStart,
          total: uploadEnd - captureStart,
        },
        imageSize: blob.size,
        resolution,
      };
    } catch (err) {
      throw err instanceof Error ? err : new Error('Recognition failed');
    }
  };

  return (
    <FaceLabModuleShell
      id="native"
      title="Module A: Native FaceDetector"
      description="Uses browser FaceDetector API with real-time quality scoring"
      onCapture={handleCapture}
    >
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 text-xs">
        <div className="font-medium text-blue-900 mb-2">Detection Score</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-blue-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-200"
              style={{ width: `${detectionScore * 100}%` }}
            />
          </div>
          <div className="font-mono font-medium text-blue-700 min-w-[3.5rem] text-right">
            {(detectionScore * 100).toFixed(1)}%
          </div>
        </div>
        <div className="text-gray-600 mt-2">
          Auto-capture at {(AUTO_CAPTURE_SCORE * 100).toFixed(0)}% for {AUTO_CAPTURE_READY_FRAMES} frames
        </div>
      </div>
    </FaceLabModuleShell>
  );
}
