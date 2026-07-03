/**
 * @crossref:domain[investor-portal reports-analytics]
 * @crossref:used-in[InvestorDashboard selected-customer report parity]
 * @crossref:uses[InvestorPortfolioResponse, product-map/domains/investor-portal.yaml]
 */
import { Activity, MapPin, Stethoscope, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { InvestorPortfolioBreakdownRow, InvestorPortfolioResponse } from '@/lib/api/investor';
import { formatVND as formatCurrency } from '@/lib/formatting';

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Activity;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
        <Icon className="h-4 w-4 text-slate-500" />
        {title}
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-slate-500">
        {label}
      </td>
    </tr>
  );
}

function BreakdownTable({
  rows,
  labelHeader,
  emptyLabel,
}: {
  rows: InvestorPortfolioBreakdownRow[];
  labelHeader: string;
  emptyLabel: string;
}) {
  const { t } = useTranslation('investor');
  return (
    <div className="max-h-80 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3 text-left font-medium">{labelHeader}</th>
            <th className="px-4 py-3 text-right font-medium">{t('dashboard.reportColumns.appointments')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('dashboard.reportColumns.orders')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('dashboard.reportColumns.serviceTotal')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={`${row.id || 'unassigned'}-${row.label}`} className="border-t border-slate-100">
              <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
              <td className="px-4 py-3 text-right tabular-nums">{row.appointment_count}</td>
              <td className="px-4 py-3 text-right tabular-nums">{row.order_count}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.service_total)}</td>
            </tr>
          )) : (
            <EmptyRow colSpan={4} label={emptyLabel} />
          )}
        </tbody>
      </table>
    </div>
  );
}

export function InvestorPortfolioBreakdowns({ portfolio }: { portfolio: InvestorPortfolioResponse }) {
  const { t } = useTranslation('investor');
  return (
    <>
      <Section title={t('dashboard.sections.appointmentStatus')} icon={Activity}>
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t('dashboard.reportColumns.status')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('dashboard.reportColumns.appointments')}</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.reports.appointmentStatus.length ? portfolio.reports.appointmentStatus.map((row) => (
                <tr key={row.status} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.status}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.appointment_count}</td>
                </tr>
              )) : (
                <EmptyRow colSpan={2} label={t('dashboard.empty.noBreakdown')} />
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={t('dashboard.sections.doctorReport')} icon={Stethoscope}>
        <BreakdownTable
          rows={portfolio.reports.byDoctor}
          labelHeader={t('dashboard.reportColumns.doctor')}
          emptyLabel={t('dashboard.empty.noBreakdown')}
        />
      </Section>

      <Section title={t('dashboard.sections.locationReport')} icon={MapPin}>
        <BreakdownTable
          rows={portfolio.reports.byLocation}
          labelHeader={t('dashboard.reportColumns.location')}
          emptyLabel={t('dashboard.empty.noBreakdown')}
        />
      </Section>

      <Section title={t('dashboard.sections.serviceReport')} icon={Wrench}>
        <BreakdownTable
          rows={portfolio.reports.byService}
          labelHeader={t('dashboard.reportColumns.service')}
          emptyLabel={t('dashboard.empty.noBreakdown')}
        />
      </Section>
    </>
  );
}
