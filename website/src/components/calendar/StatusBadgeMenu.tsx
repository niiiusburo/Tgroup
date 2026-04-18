import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { WaitTimer } from '@/components/appointments/WaitTimer';
import { PHASE_STYLES, getPhaseLabel, type CalendarPhase } from '@/lib/appointmentStatusMapping';

interface StatusBadgeMenuProps {
  readonly phase: CalendarPhase;
  readonly arrivalTime: string | null;
  readonly treatmentStartTime: string | null;
  readonly onPhaseChange: (phase: CalendarPhase) => void;
}

const DROPDOWN_PHASES: CalendarPhase[] = ['waiting', 'in-treatment', 'done'];

export function StatusBadgeMenu({
  phase,
  arrivalTime,
  treatmentStartTime,
  onPhaseChange
}: StatusBadgeMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const styles = PHASE_STYLES[phase];

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer',
          styles.bg,
          styles.text,
          styles.border
        )}>
        
        {getPhaseLabel(t, phase)} <span className="text-[10px] opacity-60">▾</span>
      </button>

      {phase === 'waiting' && arrivalTime &&
      <div className="mt-1">
          <WaitTimer arrivalTime={arrivalTime} treatmentStartTime={treatmentStartTime} compact />
        </div>
      }

      {open &&
      <div
        className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl p-3 shadow-lg z-20 min-w-[160px]"
        onClick={(e) => e.stopPropagation()}>
        
          <div className="text-xs font-bold text-gray-700 mb-2">{t('iTrngThi')}</div>
          {DROPDOWN_PHASES.map((p) => {
          const selected = phase === p;
          return (
            <label
              key={p}
              className="flex items-center gap-2 py-1.5 text-sm text-gray-600 cursor-pointer hover:text-blue-600"
              onClick={() => {
                onPhaseChange(p);
                setOpen(false);
              }}>
              
                <span
                className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                  selected ? 'border-blue-600' : 'border-gray-300'
                )}>
                
                  {selected && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                </span>
                {getPhaseLabel(t, p)}
              </label>);

        })}
          <div className="border-t border-gray-100 my-2" />
          <label
          className="flex items-center gap-2 py-1.5 text-sm text-red-600 cursor-pointer hover:text-red-700"
          onClick={() => {
            onPhaseChange('cancelled');
            setOpen(false);
          }}>
          
            <span className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0" />
            {getPhaseLabel(t, 'cancelled')}
          </label>
        </div>
      }
    </div>);

}