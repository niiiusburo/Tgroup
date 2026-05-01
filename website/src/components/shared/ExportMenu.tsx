import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileSpreadsheet, Eye } from 'lucide-react';

export interface ExportMenuProps {
  readonly onExport: () => void;
  readonly onPreview: () => void;
  readonly disabled?: boolean;
  readonly loading?: boolean;
}

export function ExportMenu({
  onExport,
  onPreview,
  disabled = false,
  loading = false,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || loading}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Xuất dữ liệu</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={() => {
              setOpen(false);
              onExport();
            }}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            <span>Xuất Excel</span>
          </button>
          <div className="h-px bg-gray-100 mx-2" />
          <button
            onClick={() => {
              setOpen(false);
              onPreview();
            }}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-4 h-4 text-sky-600" />
            <span>Xem trước số dòng / bộ lọc</span>
          </button>
        </div>
      )}
    </div>
  );
}
