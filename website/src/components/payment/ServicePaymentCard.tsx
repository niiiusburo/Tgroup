/**
 * ServicePaymentCard - Shows service payment context inside the Payment Form.
 * Displays total cost, paid amount, remaining balance, and a progress bar.
 */

import { CheckCircle2, MapPin, Receipt } from 'lucide-react';
import { formatVND } from '@/lib/formatting';
import { useTranslation } from 'react-i18next';

export interface ServicePaymentContext {
  readonly recordId: string;
  readonly recordName: string;
  readonly recordType: 'saleorder' | 'dotkham';
  readonly totalCost: number;
  readonly paidAmount: number;
  readonly residual: number;
  readonly locationName: string;
  readonly orderName?: string;
}

interface ServicePaymentCardProps {
  readonly ctx: ServicePaymentContext;
}

export function ServicePaymentCard({ ctx }: ServicePaymentCardProps) {
  const { t } = useTranslation('payment');
  const pct = ctx.totalCost > 0 ? Math.min(100, Math.round(ctx.paidAmount / ctx.totalCost * 100)) : 0;
  const isFullyPaid = ctx.residual <= 0;

  return (
    <div className={`rounded-xl border-2 p-4 ${isFullyPaid ? 'border-emerald-200 bg-emerald-50/60' : 'border-orange-200 bg-orange-50/40'}`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isFullyPaid ? 'bg-emerald-100' : 'bg-orange-100'}`}>
            <Receipt className={`w-3.5 h-3.5 ${isFullyPaid ? 'text-emerald-600' : 'text-orange-600'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 truncate max-w-[280px]">{ctx.recordName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              ctx.recordType === 'saleorder' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`
              }>
                {ctx.recordType === 'saleorder' ? t("haN") : t("tKhm")}
              </span>
              {ctx.orderName &&
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-gray-100 text-gray-600">
                  {ctx.orderName}
                </span>
              }
              {ctx.locationName &&
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-600">
                  <MapPin className="w-2.5 h-2.5" />
                  {ctx.locationName}
                </span>
              }
            </div>
          </div>
        </div>
        {isFullyPaid &&
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5" />

        </span>
        }
      </div>

      {/* Amounts row */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('tngChiPh')}</p>
          <p className="text-sm font-bold text-gray-900">{formatVND(ctx.totalCost)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('thanhTon1')}</p>
          <p className="text-sm font-bold text-emerald-600">{formatVND(ctx.paidAmount)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('cnN')}</p>
          <p className={`text-sm font-bold ${isFullyPaid ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatVND(ctx.residual)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
          isFullyPaid ? 'bg-emerald-500' : 'bg-orange-500'}`
          }
          style={{ width: `${pct}%` }} />
        
      </div>
      <p className="text-[10px] text-gray-400 mt-1 text-right">{pct}</p>
    </div>);

}