import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Stethoscope, Loader2, FileText } from 'lucide-react';
import { fetchPartnerById, type ApiPartner } from '@/lib/api/partners';
import { fetchDotKhams, type ApiDotKham } from '@/lib/api/dotKhams';
import { cn } from '@/lib/utils';

interface MedicalHistoryTooltipProps {
  readonly customerId: string;
  readonly customerName: string;
  readonly children: React.ReactNode;
}

const MEDICAL_CONDITIONS = [
  { key: 'diabetes', matchLabel: 'Tiểu đường', icon: '🩸', bg: 'bg-orange-100/80 text-orange-800 ring-1 ring-orange-200' },
  { key: 'cardiovascular', matchLabel: 'Tim mạch', icon: '❤️', bg: 'bg-red-100/80 text-red-800 ring-1 ring-red-200' },
  { key: 'drugAllergy', matchLabel: 'Dị ứng thuốc', icon: '💊', bg: 'bg-purple-100/80 text-purple-800 ring-1 ring-purple-200' },
  { key: 'hypertension', matchLabel: 'Huyết áp cao', icon: '🔺', bg: 'bg-pink-100/80 text-pink-800 ring-1 ring-pink-200' },
  { key: 'asthma', matchLabel: 'Hen suyễn', icon: '🌬️', bg: 'bg-sky-100/80 text-sky-800 ring-1 ring-sky-200' },
  { key: 'pregnant', matchLabel: 'Đang mang thai', icon: '🤰', bg: 'bg-emerald-100/80 text-emerald-800 ring-1 ring-emerald-200' }
];

export function MedicalHistoryTooltip({
  customerId,
  customerName,
  children
}: MedicalHistoryTooltipProps) {
  const { t } = useTranslation('calendar');
  const [isVisible, setIsVisible] = useState(false);
  const [partner, setPartner] = useState<ApiPartner | null>(null);
  const [recentDotKhams, setRecentDotKhams] = useState<ApiDotKham[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  const loadData = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const [partnerRes, dotKhamRes] = await Promise.all([
      fetchPartnerById(customerId).catch(() => null),
      fetchDotKhams({ partnerId: customerId, limit: 3 }).catch(() => null)]
      );
      setPartner(partnerRes);
      setRecentDotKhams(dotKhamRes?.items ?? []);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [customerId, loaded]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsVisible(true);
    void loadData();
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, 150);
  };

  const raw = partner?.medicalhistory?.trim() ?? '';
  const activeConditions = MEDICAL_CONDITIONS.filter((c) => raw.includes(c.matchLabel));
  const conditionLabels = new Set(MEDICAL_CONDITIONS.map((c) => c.matchLabel));
  const freeText = raw.
  split('\n').
  map((l) => l.trim()).
  filter((l) => l && !conditionLabels.has(l)).
  join(', ');

  const hasContent = raw || recentDotKhams.length > 0;

  return (
    <span
      ref={wrapperRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      
      {children}

      {isVisible &&
      <div
        className={cn(
          'fixed z-[100] w-72 rounded-xl shadow-xl border border-amber-200/60',
          'bg-gradient-to-br from-amber-50 to-orange-50',
          'animate-in fade-in zoom-in-95 duration-150'
        )}
        style={{


          // Position will be set by a parent effect if needed; default to letting browser flow handle it.
          // We use inline styles for dynamic positioning computed below.
        }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
        ref={(el) => {
          if (el && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const tooltipWidth = 288; // w-72 = 18rem = 288px
            const tooltipHeight = el.offsetHeight;
            const gap = 8;

            let left = rect.right + gap;
            let top = rect.top;

            // If overflows right, show on the left
            if (left + tooltipWidth > window.innerWidth - gap) {
              left = rect.left - tooltipWidth - gap;
            }
            // If overflows bottom, align to bottom of viewport
            if (top + tooltipHeight > window.innerHeight - gap) {
              top = window.innerHeight - tooltipHeight - gap;
            }
            // If overflows top
            if (top < gap) {
              top = gap;
            }

            el.style.left = `${left}px`;
            el.style.top = `${top}px`;
          }
        }}>
        
          {/* Header */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-amber-200/40">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/20">
              <Stethoscope className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide block truncate">
                {t('tiuSBnh')}
            </span>
              <span className="text-[10px] text-amber-600/80 truncate block">{customerName}</span>
            </div>
          </div>

          {/* Content */}
          <div className="px-3.5 py-3 max-h-72 overflow-y-auto">
            {loading ?
          <div className="flex items-center justify-center gap-2 py-4 text-amber-700/70">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">{t('angTi')}</span>
              </div> :
          !hasContent ?
          <div className="py-3 text-center">
                <p className="text-xs text-amber-700/60 italic">{t('chaCThngTinTiuSBnh')}</p>
              </div> :

          <div className="space-y-3">
                {/* Free text */}
                {freeText &&
            <div>
                    <p className="text-xs text-amber-900/80 italic leading-relaxed">{freeText}</p>
                  </div>
            }

                {/* Condition badges */}
                {activeConditions.length > 0 &&
            <div className="flex flex-wrap gap-1.5">
                    {activeConditions.map((c) =>
              <span
                key={c.key}
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full',
                  c.bg
                )}>
                
                        <span className="text-[10px]">{c.icon}</span>
                        {t(`medicalConditions.${c.key}`)}
                      </span>
              )}
                  </div>
            }

                {/* Raw text fallback when no parsed conditions but text exists */}
                {raw && !freeText && activeConditions.length === 0 &&
            <p className="text-xs text-amber-900/80 italic leading-relaxed">{raw}</p>
            }

                {/* Recent dotkhams */}
                {recentDotKhams.length > 0 &&
            <div className="pt-2 border-t border-amber-200/40">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <FileText className="w-3 h-3 text-amber-600" />
                      <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                        {t('tKhmGnY')}
                </span>
                    </div>
                    <div className="space-y-1.5">
                      {recentDotKhams.map((dk) =>
                <div
                  key={dk.id}
                  className="flex items-start justify-between gap-2 text-[11px] text-amber-900/80 bg-white/40 rounded-md px-2 py-1">
                  
                          <span className="truncate flex-1">{dk.name || t('checkup')}</span>
                          <span className="text-[10px] text-amber-600/80 shrink-0">
                            {dk.date ? new Date(dk.date).toLocaleDateString('vi-VN') : ''}
                          </span>
                        </div>
                )}
                    </div>
                  </div>
            }
              </div>
          }
          </div>
        </div>
      }
    </span>);

}