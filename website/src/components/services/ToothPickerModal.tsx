import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';

interface ToothPickerModalProps {
  readonly isOpen: boolean;
  readonly initialValues?: readonly string[];
  readonly onClose: () => void;
  readonly onSave: (values: string[]) => void;
}

type TabKey = 'all' | 'upper' | 'lower' | 'arch';
type Dentition = 'permanent' | 'primary';

const PERMANENT_TEETH = {
  q1: [18, 17, 16, 15, 14, 13, 12, 11],
  q2: [21, 22, 23, 24, 25, 26, 27, 28],
  q3: [31, 32, 33, 34, 35, 36, 37, 38],
  q4: [48, 47, 46, 45, 44, 43, 42, 41],
};

const PRIMARY_TEETH = {
  q1: [55, 54, 53, 52, 51],
  q2: [61, 62, 63, 64, 65],
  q3: [71, 72, 73, 74, 75],
  q4: [85, 84, 83, 82, 81],
};

function getToothImageUrl(num: number): string {
  return `https://tamdentist.tdental.vn/assets/images/teeth/${num}.png`;
}

export function ToothPickerModal({ isOpen, initialValues = [], onClose, onSave }: ToothPickerModalProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [dentition, setDentition] = useState<Dentition>('permanent');

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(initialValues.map((v) => parseInt(v, 10)).filter((n) => !isNaN(n))));
    }
  }, [isOpen, initialValues]);

  const toggleTooth = (num: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  const handleSave = () => {
    const sorted = Array.from(selected).sort((a, b) => a - b);
    onSave(sorted.map(String));
  };

  const currentTeeth = useMemo(() => (dentition === 'permanent' ? PERMANENT_TEETH : PRIMARY_TEETH), [dentition]);

  const renderQuadrant = (nums: number[], reverse = false) => (
    <div className="flex gap-1 justify-center items-center">
      {nums.map((n) => {
        const isSelected = selected.has(n);
        return (
          <button
            key={n}
            type="button"
            onClick={() => toggleTooth(n)}
            className={[
              'w-11 flex items-center cursor-pointer select-none border p-0.5 transition-colors',
              'hover:border-gray-300',
              isSelected ? 'border-[#1a6de3] bg-blue-50' : 'border-white',
              reverse ? 'flex-col-reverse' : 'flex-col',
            ].join(' ')}
          >
            <div className="w-9 h-[52px] flex items-center justify-center pointer-events-none">
              <img
                src={getToothImageUrl(n)}
                alt={String(n)}
                width={36}
                height={52}
                className="object-contain"
                loading="lazy"
              />
            </div>
            <div
              className={[
                'w-full text-center text-xs py-0.5 font-variant-numeric tabular-nums',
                isSelected ? 'bg-[#1a6de3] text-white font-semibold' : 'text-gray-600',
              ].join(' ')}
            >
              {n}
            </div>
          </button>
        );
      })}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-[780px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Chọn răng</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-200">
          <div className="flex rounded overflow-hidden border border-gray-300">
            {([
              { key: 'all', label: 'Chọn răng' },
              { key: 'upper', label: 'Hàm trên' },
              { key: 'lower', label: 'Hàm dưới' },
              { key: 'arch', label: 'Nguyên hàm' },
            ] as { key: TabKey; label: string }[]).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  'px-3 py-1.5 text-sm font-medium border-r last:border-r-0 border-gray-300',
                  activeTab === tab.key
                    ? 'bg-[#e8f4fd] text-[#0a6ebd] shadow-[inset_0_0_0_1px_#0a6ebd] z-10'
                    : 'bg-white text-gray-700 hover:bg-gray-50',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-700">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="dentition"
                value="permanent"
                checked={dentition === 'permanent'}
                onChange={() => setDentition('permanent')}
                className="accent-[#1976d2]"
              />
              Răng vĩnh viễn
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="dentition"
                value="primary"
                checked={dentition === 'primary'}
                onChange={() => setDentition('primary')}
                className="accent-[#1976d2]"
              />
              Răng sữa
            </label>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-5">
          {activeTab === 'all' && (
            <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 gap-y-3 justify-items-center">
              {renderQuadrant(currentTeeth.q1)}
              <div className="w-px bg-gray-200 row-span-2" />
              {renderQuadrant(currentTeeth.q2)}
              {renderQuadrant(currentTeeth.q4, true)}
              {renderQuadrant(currentTeeth.q3, true)}
            </div>
          )}

          {activeTab === 'upper' && (
            <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 justify-items-center items-center">
              {renderQuadrant(currentTeeth.q1)}
              <div className="w-px bg-gray-200 h-full" />
              {renderQuadrant(currentTeeth.q2)}
            </div>
          )}

          {activeTab === 'lower' && (
            <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 justify-items-center items-center">
              {renderQuadrant(currentTeeth.q4, true)}
              <div className="w-px bg-gray-200 h-full" />
              {renderQuadrant(currentTeeth.q3, true)}
            </div>
          )}

          {activeTab === 'arch' && (
            <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 gap-y-3 justify-items-center">
              {renderQuadrant(currentTeeth.q1)}
              <div className="w-px bg-gray-200 row-span-2" />
              {renderQuadrant(currentTeeth.q2)}
              {renderQuadrant(currentTeeth.q4, true)}
              {renderQuadrant(currentTeeth.q3, true)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1976d2] border border-[#1976d2] rounded hover:bg-[#1565c0]"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
