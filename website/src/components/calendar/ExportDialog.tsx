import { useState } from 'react';
import { X } from 'lucide-react';

export type ExportMode = 'current-filter' | 'date-range';

interface ExportDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onExport: (mode: ExportMode, dateFrom: string, dateTo: string) => void;
  readonly defaultDateFrom?: string;
  readonly defaultDateTo?: string;
}

export function ExportDialog({
  isOpen,
  onClose,
  onExport,
  defaultDateFrom,
  defaultDateTo
}: ExportDialogProps) {
  const [mode, setMode] = useState<ExportMode>('current-filter');
  const [dateFrom, setDateFrom] = useState(defaultDateFrom || '');
  const [dateTo, setDateTo] = useState(defaultDateTo || '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900"></h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="export-mode"
              checked={mode === 'current-filter'}
              onChange={() => setMode('current-filter')}
              className="w-4 h-4 text-orange-500" />
            
            <span className="text-sm text-gray-700"></span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="export-mode"
              checked={mode === 'date-range'}
              onChange={() => setMode('date-range')}
              className="w-4 h-4 text-orange-500" />
            
            <span className="text-sm text-gray-700"></span>
          </label>

          {mode === 'date-range' &&
          <div className="flex items-center gap-2 pl-6">
              <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg" />
            
              <span className="text-gray-400">–</span>
              <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg" />
            
            </div>
          }
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
            

          </button>
          <button
            onClick={() => {
              onExport(mode, dateFrom, dateTo);
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg">
            

          </button>
        </div>
      </div>
    </div>);

}