import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Stethoscope } from 'lucide-react';
import type { CustomerService } from '@/types/customer';
import type { PaymentWithAllocations } from '@/hooks/useCustomerPayments';
import { formatVND } from '@/lib/formatting';
import { ServiceHistoryRow } from './ServiceHistoryRow';
import { resolveServiceFinancials } from './ServiceHistoryUtils';

/**
 * Service History - Treatment history table (Lịch sử điều trị)
 * @crossref:used-in[CustomerProfile, Services]
 */

interface ServiceHistoryProps {
  readonly services: readonly CustomerService[];
  readonly limit?: number;
  readonly payments?: readonly PaymentWithAllocations[];
  readonly onEditService?: (service: CustomerService) => void;
  readonly onDeleteService?: (service: CustomerService) => void;
  readonly onUpdateStatus?: (serviceId: string, newStatus: string) => Promise<void>;
  readonly onPayForService?: (service: CustomerService) => void;
  readonly onDeletePayment?: (id: string) => void | Promise<void>;
}

export function ServiceHistory({
  services,
  limit,
  payments,
  onEditService,
  onDeleteService,
  onUpdateStatus: _onUpdateStatus,
  onPayForService,
  onDeletePayment: _onDeletePayment
}: ServiceHistoryProps) {
  const { t } = useTranslation('services');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const displayServices = limit ? services.slice(0, limit) : services;

  const totalCost = services
    .filter((s) => s.status !== 'cancelled')
    .reduce((sum, s) => sum + s.cost, 0);
  const totalPaid = services
    .filter((s) => s.status !== 'cancelled')
    .reduce((sum, s) => sum + resolveServiceFinancials(s).paidAmount, 0);
  const zeroCostCount = services.filter((s) => s.cost === 0 && s.status !== 'cancelled').length;

  if (services.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-gray-900">{t('history.title')}</h3>
        </div>
        <div className="text-center py-8 text-gray-400 text-sm">{t('history.noHistory')}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-gray-900">{t('history.title')}</h3>
          <span className="text-xs text-gray-400">({services.length}{limit && services.length > limit ? '+' : ''} {t('treatment')})</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-left sm:text-right">
          {zeroCostCount > 0 && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              ⚠ {zeroCostCount} {t('noPrice')}
            </span>
          )}
          <div>
            <p className="text-xs text-gray-400">{t('totalCost')} / {t('collected')}</p>
            <p className="text-sm font-bold text-gray-900">{formatVND(totalCost)} <span className="text-gray-400 font-normal">/ {formatVND(totalPaid)}</span></p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="pb-3 pr-4">{t('table.date')}</th>
              <th className="pb-3 pr-4">{t('table.service')}</th>
              <th className="pb-3 pr-4 text-right">Số lượng</th>
              <th className="pb-3 pr-4 text-right">{t('table.amount')}</th>
              <th className="pb-3 pr-4 text-right">{t('table.paid')}</th>
              <th className="pb-3 pr-4 text-right">{t('table.remaining')}</th>
              <th className="pb-3 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayServices.map((svc) => {
              const isExpanded = expandedId === svc.id;
              return (
                <ServiceHistoryRow
                  key={svc.id}
                  service={svc}
                  isExpanded={isExpanded}
                  payments={payments}
                  onToggle={() => setExpandedId(isExpanded ? null : svc.id)}
                  onEditService={onEditService}
                  onDeleteService={onDeleteService}
                  onPayForService={onPayForService}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
