/**
 * @crossref:domain[investor-portal reports-analytics]
 * @crossref:used-in[InvestorDashboard CSV extraction]
 * @crossref:uses[InvestorPortfolioResponse]
 */
import type { InvestorPortfolioResponse } from '@/lib/api/investor';

function csvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? '' : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export function downloadInvestorPortfolioCsv(portfolio: InvestorPortfolioResponse) {
  const range = `${portfolio.dateFrom}:${portfolio.dateTo}`;
  const empty = '';
  const rows = [
    ['section', 'date', 'client', 'appointments', 'orders', 'service_total', 'paid_total', 'collected_total', 'outstanding_total', 'status'],
    ...portfolio.reports.daily.map((row) => ['daily', row.date, empty, row.appointment_count, row.order_count, row.service_total, row.paid_total, row.collected_total, row.outstanding_total, empty]),
    ...portfolio.reports.byCustomer.map((row) => ['customer', range, row.client_name, row.appointment_count, row.order_count, row.service_total, row.paid_total, empty, row.outstanding_total, empty]),
    ...portfolio.reports.appointmentStatus.map((row) => ['appointment-status', range, row.status, row.appointment_count, empty, empty, empty, empty, empty, empty]),
    ...portfolio.reports.byDoctor.map((row) => ['doctor', range, row.label, row.appointment_count, row.order_count, row.service_total, empty, empty, empty, empty]),
    ...portfolio.reports.byLocation.map((row) => ['location', range, row.label, row.appointment_count, row.order_count, row.service_total, empty, empty, empty, empty]),
    ...portfolio.reports.byService.map((row) => ['service', range, row.label, row.appointment_count, row.order_count, row.service_total, empty, empty, empty, empty]),
    ...portfolio.calendar.items.map((row) => ['calendar', row.date, row.client_name, empty, empty, empty, empty, empty, empty, row.status || empty]),
    ...portfolio.clients.map((row) => ['client', empty, row.name, row.appointment_count, row.order_count, empty, empty, empty, row.outstanding_balance, row.status]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `investor-${portfolio.dateFrom}-${portfolio.dateTo}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
