import type { ReactNode } from 'react';

interface PageHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly icon?: ReactNode;
  readonly actions?: ReactNode;
  readonly breadcrumbs?: ReactNode;
}

/**
 * PageHeader — Consistent page header layout across all pages
 * @crossref:used-in[Appointments, Services, Customers, Employees, Locations, Payment, Commission, Notifications, Relationships, Feedback, Settings, Reports, Calendar]
 */
export function PageHeader({ title, subtitle, icon, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      {breadcrumbs && <div className="text-sm text-gray-500">{breadcrumbs}</div>}
      <div className="flex items-start justify-between flex-wrap gap-3 md:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <div className="mt-0.5 flex-shrink-0 text-primary">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900 leading-snug">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 leading-relaxed">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 md:gap-3">{actions}</div>}
      </div>
    </div>
  );
}
