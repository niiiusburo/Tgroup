/**
 * Module D: Burst Capture Strategy
 * Captures 5 frames rapidly, picks the highest-scoring frame, sends only that
 * @crossref:used-in[FaceLab]
 * @crossref:uses[FaceLabModuleShell, recognizeFace, analyzeFrame, getCameraStream, stopStream]
 */

import { useEffect, useRef, useState } from 'react';
import { recognizeFace } from '@/lib/api';
import {
  analyzeFrame,
  getCameraStream,
  stopStream,
  getNativeFaceDetector,
} from '@/components/shared/faceCaptureEngine';
import { FaceLabModuleShell } from './FaceLabModule';
import type { ModuleResult, FaceLabModuleProps } from './types';

const BURST_FRAME_COUNT = 5;
const BURST_FRAME_INTERVAL_MS = 100;

export function ModuleD_BurstCapture({ onResult: _onResult }: FaceLabModuleProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef(getNativeFaceDetector());
  const [lastBurstScores, setLastBurstScores] = useState<number[]>([]);

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
    const frames: Array<{ blob: Blob; score: number }> = [];
    const detector = detectorRef.current;

    // Capture burst of frames
    for (let i = 0; i < BURST_FRAME_COUNT; i++) {
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
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
      });

      if (blob) {
        // Score this frame
        const result = await analyzeFrame(videoElement, detector, true);
        frames.push({ blob, score: result.score });
      }

      // Wait before next frame (except last)
      if (i < BURST_FRAME_COUNT - 1) {
        await new Promise((resolve) => setTimeout(resolve, BURST_FRAME_INTERVAL_MS));
      }
    }

    if (frames.length === 0) {
      throw new Error('Failed to capture any frames');
    }

    // Pick best frame
    const bestFrame = frames.reduce((best, current) =>
      current.score > best.score ? current : best
    );
    const captureEnd = performance.now();
    const uploadStart = performance.now();

    try {
      const result = await recognizeFace(bestFrame.blob);
      const uploadEnd = performance.now();

      const resolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`;

      // Store scores for display
      setLastBurstScores(frames.map((f) => f.score));

      return {
        moduleId: 'burst',
        match: result.match || null,
        candidates: result.candidates || [],
        timing: {
          capture: captureEnd - captureStart,
          upload: uploadEnd - uploadStart,
          total: uploadEnd - captureStart,
        },
        imageSize: bestFrame.blob.size,
        resolution,
      };
    } catch (err) {
      throw err instanceof Error ? err : new Error('Recognition failed');
    }
  };

  return (
    <FaceLabModuleShell
      id="burst"
      title="Module D: Burst Capture"
      description="Captures 5 frames, uses the highest-scoring one"
      onCapture={handleCapture}
    >
      <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 text-xs">
        <div className="font-medium text-amber-900 mb-2">Last Burst Scores</div>
        {lastBurstScores.length > 0 ? (
          <div className="space-y-1">
            {lastBurstScores.map((score, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-amber-700 font-medium w-6">#{idx + 1}</span>
                <div className="flex-1 bg-amber-200 rounded-full h-1.5">
                  <div
                    className="bg-amber-600 h-full transition-all duration-200"
                    style={{ width: `${score * 100}%` }}
                  />
                </div>
                <span className="font-mono text-amber-700 w-10 text-right">
                  {(score * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-600">Capture 5 frames to see scores</div>
        )}
      </div>
    </FaceLabModuleShell>
  );
}
