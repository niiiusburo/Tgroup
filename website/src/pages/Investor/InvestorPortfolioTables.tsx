/**
 * @crossref:domain[investor-portal reports-analytics appointments-calendar customers-partners]
 * @crossref:used-in[InvestorDashboard selected-customer tables]
 * @crossref:uses[InvestorPortfolioResponse, InvestorPortfolioBreakdowns]
 */
import { BarChart3, CalendarDays, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { InvestorClient, InvestorPortfolioResponse } from '@/lib/api/investor';
import { formatVND as formatCurrency } from '@/lib/formatting';
import { InvestorPortfolioBreakdowns } from './InvestorPortfolioBreakdowns';

export function InvestorPortfolioTables({
  portfolio,
  clients,
}: {
  portfolio: InvestorPortfolioResponse;
  clients: InvestorClient[];
}) {
  const { t } = useTranslation('investor');
  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
          <FileText className="h-4 w-4 text-slate-500" />
          {t('dashboard.sections.dailyReport')}
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t('dashboard.reportColumns.date')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('dashboard.reportColumns.appointments')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('dashboard.reportColumns.orders')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('dashboard.reportColumns.serviceTotal')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('dashboard.reportColumns.collected')}</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.reports.daily.map((row) => (
                <tr key={row.date} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.date}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.appointment_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.order_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.service_total)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.collected_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          {t('dashboard.sections.calendar')}
        </div>
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t('dashboard.calendarColumns.date')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('dashboard.calendarColumns.client')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('dashboard.calendarColumns.service')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('dashboard.calendarColumns.doctor')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('dashboard.calendarColumns.status')}</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.calendar.items.length ? portfolio.calendar.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.date}{item.time ? ` ${item.time}` : ''}</td>
                  <td className="px-4 py-3 text-slate-700">{item.client_name}</td>
                  <td className="px-4 py-3 text-slate-700">{item.service_name || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{item.doctor_name || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{item.status || '-'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    {t('dashboard.empty.noCalendar')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
          {t('dashboard.clientCount', { count: clients.length })}
        </div>
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t('dashboard.columns.name')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('dashboard.columns.gender')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('dashboard.columns.appointments')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('dashboard.columns.orders')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('dashboard.columns.deposit')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('dashboard.columns.outstanding')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('dashboard.columns.status')}</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{client.name}</td>
                  <td className="px-4 py-3 text-slate-600">{client.gender || '-'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{client.appointment_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{client.order_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(client.deposit_balance)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(client.outstanding_balance)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      client.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {t(`dashboard.status.${client.status}`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
          <BarChart3 className="h-4 w-4 text-slate-500" />
          {t('dashboard.sections.customerReport')}
        </div>
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t('dashboard.reportColumns.customer')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('dashboard.reportColumns.appointments')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('dashboard.reportColumns.orders')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('dashboard.reportColumns.serviceTotal')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('dashboard.reportColumns.outstanding')}</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.reports.byCustomer.map((row) => (
                <tr key={row.client_id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.client_name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.appointment_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.order_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.service_total)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.outstanding_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <InvestorPortfolioBreakdowns portfolio={portfolio} />
    </>
  );
}
