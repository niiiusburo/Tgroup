export type ProgressValue = 0 | 1 | 2 | 3 | 4;

interface ProgressRingProps {
  value: ProgressValue;
  size?: number;
}

const STAGE_COLORS = ['#9ca3af', '#6366f1', '#8b5cf6', '#f97316', '#10b981'];
const STAGE_LABELS = ['0/4', '1/4', '2/4', '3/4', '✓'];
const STAGE_TEXT_COLORS = ['text-gray-400', 'text-indigo-600', 'text-violet-600', 'text-orange-600', 'text-emerald-600'];

export function ProgressRing({ value, size = 52 }: ProgressRingProps) {
  const color = STAGE_COLORS[value];
  const percentage = (value / 4) * 100;

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `conic-gradient(${color} 0% ${percentage}%, #f3f4f6 ${percentage}%)`,
      }}
    >
      <div
        className="bg-white rounded-full flex items-center justify-center font-bold"
        style={{ width: size - 8, height: size - 8, fontSize: value === 4 ? 16 : 12 }}
      >
        <span className={STAGE_TEXT_COLORS[value]}>{STAGE_LABELS[value]}</span>
      </div>
    </div>
  );
}
