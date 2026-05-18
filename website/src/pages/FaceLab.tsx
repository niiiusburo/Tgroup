/**
 * Face Detection Comparison Lab
 * @crossref:route[/face-lab]
 * @crossref:used-in[App]
 * @crossref:uses[FaceLabModule, ModuleA_NativeDetector, ModuleB_ManualCapture, ModuleC_HighRes, ModuleD_BurstCapture]
 */

import { useState } from 'react';
import { Microscope } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ModuleA_NativeDetector } from '@/components/face-lab/ModuleA_NativeDetector';
import { ModuleB_ManualCapture } from '@/components/face-lab/ModuleB_ManualCapture';
import { ModuleC_HighRes } from '@/components/face-lab/ModuleC_HighRes';
import { ModuleD_BurstCapture } from '@/components/face-lab/ModuleD_BurstCapture';
import type { ModuleResult } from '@/components/face-lab/types';

export function FaceLab() {
  const [results, setResults] = useState<Record<string, ModuleResult>>({});

  const handleModuleResult = (moduleId: string, result: ModuleResult) => {
    setResults((prev) => ({
      ...prev,
      [moduleId]: result,
    }));
  };

  const moduleIds = ['native', 'manual', 'highres', 'burst'];
  const hasResults = moduleIds.some((id) => results[id]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Face Detection Lab"
        subtitle="Compare 4 face detection strategies side by side"
        icon={<Microscope className="w-6 h-6 text-emerald-600" />}
      />

      {/* Results Comparison Table */}
      {hasResults && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Results Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-200">
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Module</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Match</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Confidence</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Total Time (ms)</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Image Size</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Resolution</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {moduleIds.map((id) => {
                  const result = results[id];
                  if (!result) return null;
                  const displayId =
                    id === 'native'
                      ? 'Native Detector'
                      : id === 'manual'
                        ? 'Manual Capture'
                        : id === 'highres'
                          ? 'High Res'
                          : 'Burst Capture';
                  return (
                    <tr key={id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-900">{displayId}</td>
                      <td className="px-4 py-2 text-gray-700">
                        {result.error ? (
                          <span className="text-red-600 text-xs">{result.error}</span>
                        ) : result.match ? (
                          <span className="font-medium">{result.match.name}</span>
                        ) : (
                          <span className="text-gray-500">No match</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {result.error ? (
                          '-'
                        ) : result.match ? (
                          <span className="text-emerald-600 font-medium">
                            {(result.match.confidence * 100).toFixed(1)}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-700">
                        {result.timing.total.toFixed(0)}
                      </td>
                      <td className="px-4 py-2 text-gray-700">
                        {(result.imageSize / 1024).toFixed(1)} KB
                      </td>
                      <td className="px-4 py-2 text-gray-700">{result.resolution}</td>
                      <td className="px-4 py-2">
                        {result.error ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Error
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            Done
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2x2 Grid of Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModuleA_NativeDetector onResult={(result) => handleModuleResult('native', result)} />
        <ModuleB_ManualCapture onResult={(result) => handleModuleResult('manual', result)} />
        <ModuleC_HighRes onResult={(result) => handleModuleResult('highres', result)} />
        <ModuleD_BurstCapture onResult={(result) => handleModuleResult('burst', result)} />
      </div>
    </div>
  );
}
