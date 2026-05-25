import { Stethoscope, Sparkles } from 'lucide-react';

interface PillProps {
  lob: 'dental' | 'cosmetic' | string;
}

export function Pill({ lob }: PillProps) {
  const isDen = lob === 'dental' || lob === 'den';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
        isDen
          ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
          : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
      }`}
    >
      {isDen ? <Stethoscope className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
      {isDen ? 'Dental' : 'Cosmetic'}
    </span>
  );
}
