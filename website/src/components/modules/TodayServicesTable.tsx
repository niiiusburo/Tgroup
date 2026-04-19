/**
 * TodayServicesTable - Zone 2: Services performed today
 * @crossref:used-in[Overview]
 *
 * Placeholder for now — will show services/procedures for the day.
 * Data will come from service orders linked to today's appointments.
 */

import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TodayServicesTableProps {
  readonly locationId?: string;
}

export function TodayServicesTable({
  locationId: _locationId }: TodayServicesTableProps) {
  const { t } = useTranslation('overview');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="bg-white rounded-2xl border border-gray-200">
      <div className="px-5 pt-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
            Today's Services / Activity
          </h2>

          {/* Quick search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('overview:zone1.searchPlaceholder')}
              className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
            />
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">Service</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">Patient</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">Qty</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">Doctor</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">Amount</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="text-center text-gray-400 text-sm py-8">
                Services will populate as patients are treated throughout the day.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
