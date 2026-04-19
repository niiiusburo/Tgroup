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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="text-primary">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
