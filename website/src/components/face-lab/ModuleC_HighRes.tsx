/**
 * Module C: High Resolution Strategy
 * Requests max resolution camera stream, captures at full resolution with high JPEG quality
 * @crossref:used-in[FaceLab]
 * @crossref:uses[FaceLabModuleShell, recognizeFace, getNativeFaceDetector, analyzeFrame, getCameraStream, stopStream]
 */

import { useEffect, useRef, useState } from 'react';
import { recognizeFace } from '@/lib/api';
import {
  getNativeFaceDetector,
  analyzeFrame,
  stopStream,
} from '@/components/shared/faceCaptureEngine';
import { FaceLabModuleShell } from './FaceLabModule';
import type { ModuleResult, FaceLabModuleProps } from './types';

export function ModuleC_HighRes({ onResult: _onResult }: FaceLabModuleProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef(getNativeFaceDetector());
  const [detectionScore, setDetectionScore] = useState(0);

  useEffect(() => {
    const initCamera = async () => {
      try {
        // Request maximum resolution
        const constraints: MediaStreamConstraints[] = [
          {
            video: {
              facingMode: { exact: 'user' },
              width: { ideal: 3840 },
              height: { ideal: 2160 },
            },
            audio: false,
          },
          {
            video: {
              facingMode: { ideal: 'user' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          },
          {
            video: {
              facingMode: { ideal: 'user' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          { video: true, audio: false },
        ];

        let stream: MediaStream | null = null;
        for (const constraint of constraints) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraint);
            break;
          } catch {
            // Try next constraint
          }
        }

        if (!stream) throw new Error('Could not get camera stream');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;

        // Start detection loop at downscaled resolution
        const detector = detectorRef.current;
        const interval = setInterval(async () => {
          if (!videoRef.current) return;

          const result = await analyzeFrame(videoRef.current, detector, true);
          setDetectionScore(result.score);
        }, 260);

        return () => clearInterval(interval);
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

    // Capture at full resolution with high JPEG quality
    const blob = await new Promise<Blob | null>((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(videoElement, 0, 0);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
    });

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
        moduleId: 'highres',
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
      id="highres"
      title="Module C: High Resolution"
      description="Requests maximum camera resolution, high JPEG quality (0.95)"
      onCapture={handleCapture}
    >
      <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 text-xs">
        <div className="font-medium text-purple-900 mb-2">Detection Score (Preview)</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-purple-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-purple-600 h-full transition-all duration-200"
              style={{ width: `${detectionScore * 100}%` }}
            />
          </div>
          <div className="font-mono font-medium text-purple-700 min-w-[3.5rem] text-right">
            {(detectionScore * 100).toFixed(1)}%
          </div>
        </div>
        <div className="text-gray-600 mt-2">
          Captures at max resolution with JPEG quality 0.95
        </div>
      </div>
    </FaceLabModuleShell>
  );
}
