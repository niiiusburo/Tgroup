/**
 * Module B: Manual Capture Strategy
 * No detection, simple raw camera feed with manual capture button
 * @crossref:used-in[FaceLab]
 * @crossref:uses[FaceLabModuleShell, recognizeFace, captureVideoFrame, getCameraStream, stopStream]
 */

import { useEffect, useRef } from 'react';
import { recognizeFace } from '@/lib/api';
import {
  captureVideoFrame,
  getCameraStream,
  stopStream,
} from '@/components/shared/faceCaptureEngine';
import { FaceLabModuleShell } from './FaceLabModule';
import type { ModuleResult, FaceLabModuleProps } from './types';

export function ModuleB_ManualCapture({ onResult: _onResult }: FaceLabModuleProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await getCameraStream('user');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
      } catch (err) {
        console.error('Camera init failed:', err);
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        stopStream(streamRef.current);
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
        moduleId: 'manual',
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
      id="manual"
      title="Module B: Manual Capture"
      description="No detection, raw camera feed with manual capture"
      onCapture={handleCapture}
    >
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-xs text-gray-700">
        Simple baseline: captures raw frame at 1280x720 whenever you click
      </div>
    </FaceLabModuleShell>
  );
}
