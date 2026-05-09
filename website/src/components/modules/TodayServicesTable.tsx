/**
 * TodayServicesTable - Zone 2: Services performed today
 * @crossref:used-in[Overview]
 *
 * Shows services/procedures recorded for the current day.
 */

import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTodayServices, type TodayServiceStatus } from '@/hooks/useTodayServices';
import { cn } from '@/lib/utils';

interface TodayServicesTableProps {
  readonly locationId?: string;
}

const STATUS_CLASS_NAMES: Record<TodayServiceStatus, string> = {
  active: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function TodayServicesTable({
  locationId }: TodayServicesTableProps) {
  const { t } = useTranslation('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const { services, allServices, isLoading, error } = useTodayServices(locationId, searchTerm);

  const statusLabels: Record<TodayServiceStatus, string> = {
    active: t('todayServices.status.active', { defaultValue: 'Active' }),
    completed: t('todayServices.status.completed', { defaultValue: 'Completed' }),
    cancelled: t('todayServices.status.cancelled', { defaultValue: 'Cancelled' }),
  };

  const emptyMessage = allServices.length > 0
    ? t('todayServices.filteredEmpty', { defaultValue: 'No services match this search.' })
    : t('todayServices.empty', { defaultValue: 'Services will populate as patients are treated throughout the day.' });

  return (
    <div className="bg-white rounded-2xl border border-gray-200">
      <div className="px-5 pt-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
            {t('todayServices.title', { defaultValue: "Today's Services / Activity" })}
          </h2>

          {/* Quick search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('todayServices.searchPlaceholder', { defaultValue: 'Search services...' })}
              className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
            />
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b-2 border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">{t('todayServices.columns.service', { defaultValue: 'Service' })}</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">{t('todayServices.columns.patient', { defaultValue: 'Patient' })}</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">{t('todayServices.columns.qty', { defaultValue: 'Qty' })}</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">{t('todayServices.columns.doctor', { defaultValue: 'Doctor' })}</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">{t('todayServices.columns.amount', { defaultValue: 'Amount' })}</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">{t('todayServices.columns.status', { defaultValue: 'Status' })}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 text-sm py-8">
                  {t('todayServices.loading', { defaultValue: "Loading today's services..." })}
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="text-center text-red-500 text-sm py-8">
                  {t('todayServices.error', { defaultValue: "Today's services could not load." })}
                </td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 text-sm py-8">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50">
                  <td className="py-3 px-3 text-sm font-medium text-gray-800">
                    <span className="line-clamp-2">{service.serviceName}</span>
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-700">
                    <span className="line-clamp-1">{service.patientName}</span>
                    {service.patientCode ? (
                      <span className="block text-xs text-gray-400">{service.patientCode}</span>
                    ) : null}
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-600">{service.quantity ?? '-'}</td>
                  <td className="py-3 px-3 text-sm text-gray-600">
                    <span className="line-clamp-1">{service.doctorName}</span>
                  </td>
                  <td className="py-3 px-3 text-sm font-semibold text-gray-800">{formatCurrency(service.amount)}</td>
                  <td className="py-3 px-3">
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                      STATUS_CLASS_NAMES[service.status],
                    )}>
                      {statusLabels[service.status]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
