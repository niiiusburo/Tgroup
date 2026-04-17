import { Plus } from 'lucide-react';

interface EmptyTimeSlotProps {
  readonly time: string;
  readonly onClick: (time: string) => void;
}

export function EmptyTimeSlot({ time, onClick }: EmptyTimeSlotProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(time)}
      aria-label={`Thêm lịch hẹn lúc ${time}`}
      className="w-full h-6 flex items-center justify-between px-3 rounded hover:bg-gray-50 transition-colors group"
    >
      <span className="text-xs text-gray-300 font-medium">{time}</span>
      <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <Plus className="w-3 h-3" />
        Thêm lịch hẹn
      </span>
    </button>
  );
}
