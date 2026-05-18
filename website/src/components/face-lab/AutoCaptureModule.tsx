/**
 * Auto-capture face module — activated independently, runs full pipeline:
 * camera → continuous detection loop → auto-capture when face stable → CompreFace → result.
 * Only one module is active at a time (enforced at page level via `isActive` prop).
 */

import { useEffect, useRef, useState } from 'react';
import { Power, Loader2, CheckCircle2, AlertCircle, ScanFace, StopCircle } from 'lucide-react';
import { recognizeFace } from '@/lib/api';
import {
  getNativeFaceDetector,
  analyzeFrame,
  stopStream,
} from '@/components/shared/faceCaptureEngine';
import type { ModuleConfig, ModuleResult } from './types';

const DETECTION_TICK_MS = 250;
const BURST_DEFAULT_COUNT = 5;
const BURST_DEFAULT_INTERVAL_MS = 100;

type Phase =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'scanning'; score: number; readyFrames: number; framesEvaluated: number }
  | { kind: 'capturing' }
  | { kind: 'uploading' }
  | { kind: 'done'; result: ModuleResult }
  | { kind: 'error'; message: string };

interface AutoCaptureModuleProps {
  config: ModuleConfig;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onResult: (result: ModuleResult) => void;
}

export function AutoCaptureModule({
  config,
  isActive,
  onActivate,
  onDeactivate,
  onResult,
}: AutoCaptureModuleProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>({ kind: 'idle' });
  const detectStartRef = useRef<number>(0);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  // Keep ref synced with state to read latest phase inside the detection tick.
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const cleanup = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (streamRef.current) {
      stopStream(streamRef.current);
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // When deactivated externally (e.g., another module activated), stop camera.
  useEffect(() => {
    if (!isActive && phase.kind !== 'idle' && phase.kind !== 'done' && phase.kind !== 'error') {
      cleanup();
      setPhase({ kind: 'idle' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Cleanup on unmount.
  useEffect(() => {
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCapture = async (video: HTMLVideoElement, framesEvaluated: number, lastScore: number) => {
    setPhase({ kind: 'capturing' });
    const captureStart = performance.now();

    let blob: Blob | null = null;
    let bestScore = lastScore;

    if (config.strategy === 'burst') {
      // Capture multiple frames, pick highest-scoring one.
      const detector = getNativeFaceDetector();
      const frameCount = config.burstFrameCount ?? BURST_DEFAULT_COUNT;
      const intervalMs = config.burstIntervalMs ?? BURST_DEFAULT_INTERVAL_MS;
      const frames: Array<{ blob: Blob; score: number }> = [];

      for (let i = 0; i < frameCount; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, intervalMs));
        const frameBlob = await captureFrameWithQuality(video, config.jpegQuality);
        if (!frameBlob) continue;
        const { score } = await analyzeFrame(video, detector, true);
        frames.push({ blob: frameBlob, score });
      }

      if (frames.length === 0) {
        throw new Error('Burst capture produced no frames');
      }
      const best = frames.reduce((a, b) => (b.score > a.score ? b : a));
      blob = best.blob;
      bestScore = best.score;
    } else {
      blob = await captureFrameWithQuality(video, config.jpegQuality);
    }

    if (!blob) throw new Error('Failed to capture frame');

    const captureEnd = performance.now();
    setPhase({ kind: 'uploading' });

    const uploadStart = performance.now();
    const apiResult = await recognizeFace(blob);
    const uploadEnd = performance.now();

    const detectDuration = captureStart - detectStartRef.current;
    const captureDuration = captureEnd - captureStart;
    const uploadDuration = uploadEnd - uploadStart;
    const totalDuration = uploadEnd - detectStartRef.current;

    const result: ModuleResult = {
      moduleId: config.id,
      match: apiResult.match
        ? {
            partnerId: apiResult.match.partnerId,
            name: apiResult.match.name,
            confidence: apiResult.match.confidence,
          }
        : null,
      candidates: apiResult.candidates.map((c) => ({
        partnerId: c.partnerId,
        name: c.name,
        confidence: c.confidence,
      })),
      timing: {
        detect: Math.round(detectDuration),
        capture: Math.round(captureDuration),
        upload: Math.round(uploadDuration),
        total: Math.round(totalDuration),
      },
      imageSize: blob.size,
      resolution: `${video.videoWidth}x${video.videoHeight}`,
      framesEvaluated,
      bestFrameScore: Number(bestScore.toFixed(3)),
    };

    cleanup();
    setPhase({ kind: 'done', result });
    onResult(result);
    onDeactivate();
  };

  const handleActivate = async () => {
    onActivate();
    setPhase({ kind: 'starting' });
    detectStartRef.current = performance.now();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: config.videoConstraints,
        audio: false,
      });
    } catch {
      // Fallback to permissive constraints.
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Camera access denied';
        setPhase({ kind: 'error', message });
        onDeactivate();
        return;
      }
    }

    streamRef.current = stream;
    if (!videoRef.current) {
      cleanup();
      setPhase({ kind: 'error', message: 'Video element missing' });
      onDeactivate();
      return;
    }
    videoRef.current.srcObject = stream;
    try {
      await videoRef.current.play();
    } catch {
      // Autoplay sometimes fails silently; we continue.
    }

    const detector = config.strategy === 'quality-only' ? null : getNativeFaceDetector();
    let readyFrames = 0;
    let framesEvaluated = 0;
    setPhase({ kind: 'scanning', score: 0, readyFrames: 0, framesEvaluated: 0 });

    tickRef.current = setInterval(async () => {
      if (!videoRef.current || phaseRef.current.kind !== 'scanning') return;

      const video = videoRef.current;
      if (video.videoWidth === 0) return;

      framesEvaluated++;
      const requireFace = config.strategy !== 'quality-only';
      const { score, ready } = await analyzeFrame(video, detector, requireFace);

      if (ready && score >= config.autoScoreThreshold) {
        readyFrames++;
      } else {
        readyFrames = Math.max(0, readyFrames - 1);
      }

      setPhase({ kind: 'scanning', score, readyFrames, framesEvaluated });

      if (readyFrames >= config.readyFramesNeeded) {
        if (tickRef.current) {
          clearInterval(tickRef.current);
          tickRef.current = null;
        }
        try {
          await runCapture(video, framesEvaluated, score);
        } catch (err) {
          cleanup();
          const message = err instanceof Error ? err.message : 'Recognition failed';
          setPhase({ kind: 'error', message });
          onDeactivate();
        }
      }
    }, DETECTION_TICK_MS);
  };

  const handleStop = () => {
    cleanup();
    setPhase({ kind: 'idle' });
    onDeactivate();
  };

  const isRunning =
    phase.kind === 'starting' ||
    phase.kind === 'scanning' ||
    phase.kind === 'capturing' ||
    phase.kind === 'uploading';

  const scoreNow = phase.kind === 'scanning' ? phase.score : 0;
  const readyNow = phase.kind === 'scanning' ? phase.readyFrames : 0;
  const scorePercent = Math.round(Math.max(0, Math.min(1, scoreNow)) * 100);
  const readinessPercent = Math.round((readyNow / config.readyFramesNeeded) * 100);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{config.name}</h3>
          <p className="text-xs text-gray-500 truncate mt-0.5">{config.description}</p>
        </div>
        <PhaseBadge phase={phase} />
      </div>

      {/* Camera viewfinder */}
      <div className="relative aspect-[4/3] bg-gray-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isRunning ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Idle overlay */}
        {(phase.kind === 'idle' || phase.kind === 'done' || phase.kind === 'error') && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-400">
            <div className="flex flex-col items-center gap-2">
              <ScanFace className="w-10 h-10 text-gray-600" />
              <p className="text-xs">{phase.kind === 'done' ? 'Done' : 'Camera inactive'}</p>
            </div>
          </div>
        )}

        {/* Starting overlay */}
        {phase.kind === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {/* Detection overlay */}
        {isRunning && (
          <>
            <div className="absolute top-3 left-3 right-3 flex items-center justify-center pointer-events-none">
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                  scoreNow >= config.autoScoreThreshold
                    ? 'bg-emerald-500 text-white'
                    : 'bg-black/50 text-white'
                }`}
              >
                <ScanFace className="w-3.5 h-3.5" />
                <span>Q {scorePercent}%</span>
                <span className="opacity-80">| ready {readyNow}/{config.readyFramesNeeded}</span>
              </div>
            </div>
            {/* Face guide outline */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={`w-32 h-40 border-[3px] rounded-[50%] transition-all duration-200 ${
                  scoreNow >= config.autoScoreThreshold
                    ? 'border-emerald-400 shadow-[0_0_0_5px_rgba(16,185,129,0.18)]'
                    : 'border-white/70'
                }`}
              />
            </div>
            {/* Readiness progress bar */}
            <div className="absolute bottom-3 left-4 right-4 h-1.5 rounded-full bg-white/25 overflow-hidden pointer-events-none">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-150"
                style={{ width: `${Math.max(4, readinessPercent)}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Action + status */}
      <div className="p-4 flex flex-col gap-3">
        {!isRunning && (
          <button
            type="button"
            onClick={handleActivate}
            disabled={isActive && !isRunning}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 transition-colors"
          >
            <Power className="w-4 h-4" />
            {phase.kind === 'done' || phase.kind === 'error' ? 'Run again' : 'Activate'}
          </button>
        )}
        {isRunning && (
          <button
            type="button"
            onClick={handleStop}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
          >
            <StopCircle className="w-4 h-4" />
            Stop
          </button>
        )}

        {phase.kind === 'done' && (
          <ResultPanel result={phase.result} threshold={config.autoScoreThreshold} />
        )}

        {phase.kind === 'error' && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{phase.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

async function captureFrameWithQuality(
  video: HTMLVideoElement,
  quality: number,
): Promise<Blob | null> {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

function PhaseBadge({ phase }: { phase: Phase }) {
  const map: Record<
    Phase['kind'],
    { label: string; bg: string; fg: string; icon: React.ReactNode }
  > = {
    idle: {
      label: 'Inactive',
      bg: 'bg-gray-100',
      fg: 'text-gray-600',
      icon: <Power className="w-3 h-3" />,
    },
    starting: {
      label: 'Starting',
      bg: 'bg-blue-50',
      fg: 'text-blue-700',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    scanning: {
      label: 'Scanning',
      bg: 'bg-amber-50',
      fg: 'text-amber-700',
      icon: <ScanFace className="w-3 h-3" />,
    },
    capturing: {
      label: 'Capturing',
      bg: 'bg-blue-50',
      fg: 'text-blue-700',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    uploading: {
      label: 'Uploading',
      bg: 'bg-blue-50',
      fg: 'text-blue-700',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    done: {
      label: 'Done',
      bg: 'bg-emerald-50',
      fg: 'text-emerald-700',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    error: {
      label: 'Error',
      bg: 'bg-red-50',
      fg: 'text-red-700',
      icon: <AlertCircle className="w-3 h-3" />,
    },
  };
  const cfg = map[phase.kind];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.fg}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function ResultPanel({ result, threshold }: { result: ModuleResult; threshold: number }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs space-y-2">
      {result.match ? (
        <div>
          <p className="font-semibold text-emerald-700">
            ✓ Match: {result.match.name}
          </p>
          <p className="text-gray-600">
            Confidence:{' '}
            <span className="font-medium tabular-nums">
              {(result.match.confidence * 100).toFixed(1)}%
            </span>
          </p>
        </div>
      ) : result.candidates.length > 0 ? (
        <div>
          <p className="font-semibold text-amber-700">? Candidates ({result.candidates.length})</p>
          <ul className="text-gray-600 mt-1 space-y-0.5">
            {result.candidates.slice(0, 3).map((c) => (
              <li key={c.partnerId}>
                {c.name} — {(c.confidence * 100).toFixed(1)}%
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="font-semibold text-gray-700">— No match</p>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-gray-600 pt-1.5 border-t border-gray-200">
        <span>Detect</span>
        <span className="text-right tabular-nums">{result.timing.detect}ms</span>
        <span>Capture</span>
        <span className="text-right tabular-nums">{result.timing.capture}ms</span>
        <span>Upload</span>
        <span className="text-right tabular-nums">{result.timing.upload}ms</span>
        <span>Total</span>
        <span className="text-right tabular-nums font-medium">{result.timing.total}ms</span>
        <span>Frames</span>
        <span className="text-right tabular-nums">{result.framesEvaluated}</span>
        <span>Best Q</span>
        <span className="text-right tabular-nums">
          {Math.round(result.bestFrameScore * 100)}% (≥{Math.round(threshold * 100)}%)
        </span>
        <span>Size</span>
        <span className="text-right tabular-nums">{(result.imageSize / 1024).toFixed(0)} KB</span>
        <span>Res</span>
        <span className="text-right tabular-nums">{result.resolution}</span>
      </div>
    </div>
  );
}
