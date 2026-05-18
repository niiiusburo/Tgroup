/**
 * Face Detection Comparison Lab
 * Test 4 auto-capture strategies — only one camera active at a time.
 * @crossref:route[/face]
 * @crossref:used-in[App]
 * @crossref:uses[AutoCaptureModule]
 */

import { useState } from 'react';
import { Microscope, Trash2 } from 'lucide-react';
import { AutoCaptureModule } from '@/components/face-lab/AutoCaptureModule';
import type { ModuleConfig, ModuleResult } from '@/components/face-lab/types';

const RECOMMENDED_ID = 'burst';

const MODULES: ModuleConfig[] = [
  {
    id: 'burst',
    name: 'D — Burst (recommended)',
    description: 'Grabs 5 rapid frames once stable, ships the sharpest. Best for registration.',
    strategy: 'burst',
    videoConstraints: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    jpegQuality: 0.92,
    autoScoreThreshold: 0.5,
    readyFramesNeeded: 3,
    burstFrameCount: 5,
    burstIntervalMs: 100,
  },
  {
    id: 'permissive',
    name: 'B — Permissive 720p (fastest)',
    description: 'Lower bar, captures faster. Best for low-light or moving subjects.',
    strategy: 'quality-only',
    videoConstraints: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    jpegQuality: 0.92,
    autoScoreThreshold: 0.42,
    readyFramesNeeded: 4,
  },
  {
    id: 'standard',
    name: 'A — Standard 720p',
    description: 'Auto-capture when frame quality is stable. Lightweight baseline.',
    strategy: 'native',
    videoConstraints: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    jpegQuality: 0.92,
    autoScoreThreshold: 0.55,
    readyFramesNeeded: 5,
  },
  {
    id: 'highres',
    name: 'C — High-Res 4K (slow)',
    description: '3840×2160 capture. Upload alone takes 20-40s; usually not worth it.',
    strategy: 'highres',
    videoConstraints: {
      facingMode: 'user',
      width: { ideal: 3840 },
      height: { ideal: 2160 },
    },
    jpegQuality: 0.95,
    autoScoreThreshold: 0.55,
    readyFramesNeeded: 5,
  },
];

export function FaceLab() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ModuleResult>>({});

  const handleResult = (moduleId: string, result: ModuleResult) => {
    setResults((prev) => ({ ...prev, [moduleId]: result }));
  };

  const hasResults = Object.keys(results).length > 0;
  const winnerId = pickWinner(results);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-100 p-2.5">
              <Microscope className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Face Detection Lab</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Activate a module to auto-capture and send to CompreFace.
                If no match, you can register the captured face to a customer right here.
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                <strong>Recommended:</strong> Start with the Burst module — sharpest frame, best for registration.
              </p>
            </div>
          </div>
          {hasResults && (
            <button
              type="button"
              onClick={() => setResults({})}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear results
            </button>
          )}
        </header>

        {/* Comparison table */}
        {hasResults && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Comparison ({Object.keys(results).length}/{MODULES.length} tested)
              </h2>
              {winnerId && (
                <p className="text-xs text-emerald-700 mt-0.5">
                  Best so far: <strong>{MODULES.find((m) => m.id === winnerId)?.name}</strong>
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Module</th>
                    <th className="px-4 py-2 text-left font-medium">Match</th>
                    <th className="px-4 py-2 text-right font-medium">Confidence</th>
                    <th className="px-4 py-2 text-right font-medium">Frame Q</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                    <th className="px-4 py-2 text-right font-medium">Upload</th>
                    <th className="px-4 py-2 text-right font-medium">Size</th>
                    <th className="px-4 py-2 text-right font-medium">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {MODULES.map((m) => {
                    const r = results[m.id];
                    if (!r) return null;
                    const isWinner = winnerId === m.id;
                    return (
                      <tr
                        key={m.id}
                        className={isWinner ? 'bg-emerald-50/60' : 'hover:bg-gray-50'}
                      >
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {m.name}
                          {isWinner && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              BEST
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {r.match ? r.match.name : r.candidates.length ? `${r.candidates.length} candidates` : 'No match'}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {r.match ? (
                            <span className="font-semibold text-emerald-700">
                              {(r.match.confidence * 100).toFixed(1)}%
                            </span>
                          ) : r.candidates[0] ? (
                            <span className="text-amber-700">
                              {(r.candidates[0].confidence * 100).toFixed(1)}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                          {Math.round(r.bestFrameScore * 100)}%
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                          {r.timing.total}ms
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                          {r.timing.upload}ms
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                          {(r.imageSize / 1024).toFixed(0)} KB
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                          {r.resolution}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modules grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {MODULES.map((m) => (
            <AutoCaptureModule
              key={m.id}
              config={m}
              isActive={activeId === m.id}
              isRecommended={m.id === RECOMMENDED_ID}
              onActivate={() => setActiveId(m.id)}
              onDeactivate={() => setActiveId((cur) => (cur === m.id ? null : cur))}
              onResult={(r) => handleResult(m.id, r)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function pickWinner(results: Record<string, ModuleResult>): string | null {
  let bestId: string | null = null;
  let bestConfidence = -1;
  for (const [id, r] of Object.entries(results)) {
    if (r.match && r.match.confidence > bestConfidence) {
      bestConfidence = r.match.confidence;
      bestId = id;
    }
  }
  return bestId;
}
