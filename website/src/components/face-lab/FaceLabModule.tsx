/**
 * Shared Face Lab Module Shell
 * @crossref:used-in[ModuleA_NativeDetector, ModuleB_ManualCapture, ModuleC_HighRes, ModuleD_BurstCapture]
 */

import { useRef, useState } from 'react';
import { Camera, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { ModuleResult } from './types';

interface FaceLabModuleShellProps {
  id: string;
  title: string;
  description: string;
  onCapture: (videoElement: HTMLVideoElement) => Promise<ModuleResult>;
  children?: React.ReactNode;
}

type Status = 'idle' | 'detecting' | 'capturing' | 'uploading' | 'done' | 'error';

export function FaceLabModuleShell({
  id: _id,
  title,
  description,
  onCapture,
  children,
}: FaceLabModuleShellProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [lastResult, setLastResult] = useState<ModuleResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleCaptureClick = async () => {
    if (!videoRef.current) return;

    setStatus('capturing');
    setErrorMsg('');

    try {
      const result = await onCapture(videoRef.current);
      setLastResult(result);
      setStatus('done');

      setTimeout(() => {
        setStatus('idle');
        setLastResult(null);
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(message);
      setStatus('error');

      setTimeout(() => {
        setStatus('idle');
        setErrorMsg('');
      }, 3000);
    }
  };

  const statusIcon = {
    idle: <Camera className="w-4 h-4" />,
    detecting: <Loader2 className="w-4 h-4 animate-spin" />,
    capturing: <Loader2 className="w-4 h-4 animate-spin" />,
    uploading: <Loader2 className="w-4 h-4 animate-spin" />,
    done: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    error: <AlertCircle className="w-4 h-4 text-red-600" />,
  };

  const statusText = {
    idle: 'Ready',
    detecting: 'Detecting...',
    capturing: 'Capturing...',
    uploading: 'Uploading...',
    done: 'Done',
    error: 'Error',
  };

  const statusColor = {
    idle: 'text-gray-600',
    detecting: 'text-blue-600',
    capturing: 'text-blue-600',
    uploading: 'text-blue-600',
    done: 'text-emerald-600',
    error: 'text-red-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-6 gap-4">
        {/* Video element */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {status === 'capturing' && (
            <div className="absolute inset-0 bg-white/10 animate-pulse" />
          )}
        </div>

        {/* Status */}
        <div className={`flex items-center gap-2 text-xs font-medium ${statusColor[status]}`}>
          {statusIcon[status]}
          <span>{statusText[status]}</span>
        </div>

        {/* Custom module controls */}
        {children}

        {/* Capture Button */}
        <button
          onClick={handleCaptureClick}
          disabled={status !== 'idle'}
          className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {status === 'idle' ? 'Capture' : statusText[status]}
        </button>

        {/* Results */}
        {lastResult && !lastResult.error && (
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100 text-xs">
            <div className="font-medium text-emerald-900 mb-2">
              {lastResult.match ? (
                <>
                  <span className="text-emerald-600">✓</span> Match Found
                </>
              ) : (
                <>
                  <span className="text-gray-600">-</span> No Match
                </>
              )}
            </div>
            {lastResult.match && (
              <div className="space-y-1 text-gray-700">
                <div>
                  <strong>{lastResult.match.name}</strong>
                </div>
                <div>
                  Confidence: <span className="font-medium">{(lastResult.match.confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-emerald-100 text-gray-600 space-y-0.5">
              <div>Capture: {lastResult.timing.capture.toFixed(0)}ms</div>
              <div>Upload: {lastResult.timing.upload.toFixed(0)}ms</div>
              <div>Total: {lastResult.timing.total.toFixed(0)}ms</div>
              <div>Size: {(lastResult.imageSize / 1024).toFixed(1)} KB</div>
              <div>Res: {lastResult.resolution}</div>
            </div>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="bg-red-50 rounded-lg p-4 border border-red-100 text-xs">
            <div className="font-medium text-red-900 mb-1">
              <span className="text-red-600">!</span> Error
            </div>
            <div className="text-red-700">{errorMsg}</div>
          </div>
        )}
      </div>
    </div>
  );
}
