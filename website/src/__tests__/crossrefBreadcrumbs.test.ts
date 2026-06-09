import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

function expectCrossrefTriad(source: string) {
  expect(source).toContain('@crossref:domain[');
  expect(source).toContain('@crossref:used-in[');
  expect(source).toContain('@crossref:uses[');
}

const srcRoot = `${process.cwd()}/src`;
const sourceFiles = {
  'App.tsx': readFileSync(`${srcRoot}/App.tsx`, 'utf8'),
  'components/Layout.tsx': readFileSync(`${srcRoot}/components/Layout.tsx`, 'utf8'),
  'components/shared/Breadcrumbs.tsx': readFileSync(`${srcRoot}/components/shared/Breadcrumbs.tsx`, 'utf8'),
  'constants/index.ts': readFileSync(`${srcRoot}/constants/index.ts`, 'utf8'),
  'pages/Overview.tsx': readFileSync(`${srcRoot}/pages/Overview.tsx`, 'utf8'),
  'pages/Login.tsx': readFileSync(`${srcRoot}/pages/Login.tsx`, 'utf8'),
  'pages/Landing/Landing.tsx': readFileSync(`${srcRoot}/pages/Landing/Landing.tsx`, 'utf8'),
  'pages/CTV/CtvDashboard.tsx': readFileSync(`${srcRoot}/pages/CTV/CtvDashboard.tsx`, 'utf8'),
  'pages/CTV/JoinCtv.tsx': readFileSync(`${srcRoot}/pages/CTV/JoinCtv.tsx`, 'utf8'),
  'pages/Calendar.tsx': readFileSync(`${srcRoot}/pages/Calendar.tsx`, 'utf8'),
  'pages/Customers.tsx': readFileSync(`${srcRoot}/pages/Customers.tsx`, 'utf8'),
  'pages/Employees/index.tsx': readFileSync(`${srcRoot}/pages/Employees/index.tsx`, 'utf8'),
  'pages/Locations.tsx': readFileSync(`${srcRoot}/pages/Locations.tsx`, 'utf8'),
  'pages/Services/index.tsx': readFileSync(`${srcRoot}/pages/Services/index.tsx`, 'utf8'),
  'pages/ServiceCatalog.tsx': readFileSync(`${srcRoot}/pages/ServiceCatalog.tsx`, 'utf8'),
  'pages/Website.tsx': readFileSync(`${srcRoot}/pages/Website.tsx`, 'utf8'),
  'pages/Settings/index.tsx': readFileSync(`${srcRoot}/pages/Settings/index.tsx`, 'utf8'),
  'pages/Relationships.tsx': readFileSync(`${srcRoot}/pages/Relationships.tsx`, 'utf8'),
  'pages/Commission.tsx': readFileSync(`${srcRoot}/pages/Commission.tsx`, 'utf8'),
  'pages/Reports.tsx': readFileSync(`${srcRoot}/pages/Reports.tsx`, 'utf8'),
  'pages/reports/ReportsDashboard.tsx': readFileSync(`${srcRoot}/pages/reports/ReportsDashboard.tsx`, 'utf8'),
  'pages/reports/ReportsRevenue.tsx': readFileSync(`${srcRoot}/pages/reports/ReportsRevenue.tsx`, 'utf8'),
  'pages/reports/ReportsAppointments.tsx': readFileSync(`${srcRoot}/pages/reports/ReportsAppointments.tsx`, 'utf8'),
  'pages/reports/ReportsDoctors.tsx': readFileSync(`${srcRoot}/pages/reports/ReportsDoctors.tsx`, 'utf8'),
  'pages/reports/ReportsCustomers.tsx': readFileSync(`${srcRoot}/pages/reports/ReportsCustomers.tsx`, 'utf8'),
  'pages/reports/ReportsLocations.tsx': readFileSync(`${srcRoot}/pages/reports/ReportsLocations.tsx`, 'utf8'),
  'pages/reports/ReportsServices.tsx': readFileSync(`${srcRoot}/pages/reports/ReportsServices.tsx`, 'utf8'),
  'pages/reports/ReportsEmployees.tsx': readFileSync(`${srcRoot}/pages/reports/ReportsEmployees.tsx`, 'utf8'),
  'pages/Notifications.tsx': readFileSync(`${srcRoot}/pages/Notifications.tsx`, 'utf8'),
  'pages/PermissionBoard/PermissionBoard.tsx': readFileSync(`${srcRoot}/pages/PermissionBoard/PermissionBoard.tsx`, 'utf8'),
  'pages/Payment.tsx': readFileSync(`${srcRoot}/pages/Payment.tsx`, 'utf8'),
  'pages/Feedback.tsx': readFileSync(`${srcRoot}/pages/Feedback.tsx`, 'utf8'),
} as const;

type SourceFile = keyof typeof sourceFiles;

function readSource(pathFromSrc: SourceFile) {
  return sourceFiles[pathFromSrc];
}

const routeTargets = [
  ['/', 'Overview', 'pages/Overview.tsx'],
  ['/login', 'LoginRoute', 'pages/Login.tsx'],
  ['/welcome', 'Landing', 'pages/Landing/Landing.tsx'],
  ['/ctv', 'CtvDashboard', 'pages/CTV/CtvDashboard.tsx'],
  ['/ctv/join', 'JoinCtv', 'pages/CTV/JoinCtv.tsx'],
  ['/calendar', 'Calendar', 'pages/Calendar.tsx'],
  ['/customers', 'Customers', 'pages/Customers.tsx'],
  ['/customers/:id', 'Customers', 'pages/Customers.tsx'],
  ['/employees', 'Employees', 'pages/Employees/index.tsx'],
  ['/locations', 'Locations', 'pages/Locations.tsx'],
  ['/services', 'Services', 'pages/Services/index.tsx'],
  ['/service-catalog', 'ServiceCatalog', 'pages/ServiceCatalog.tsx'],
  ['/website', 'Website', 'pages/Website.tsx'],
  ['/settings', 'Settings', 'pages/Settings/index.tsx'],
  ['/relationships', 'Relationships', 'pages/Relationships.tsx'],
  ['/commission', 'Commission', 'pages/Commission.tsx'],
  ['/reports', 'ReportsShell', 'pages/Reports.tsx'],
  ['/reports/dashboard', 'ReportsDashboard', 'pages/reports/ReportsDashboard.tsx'],
  ['/reports/revenue', 'ReportsRevenue', 'pages/reports/ReportsRevenue.tsx'],
  ['/reports/appointments', 'ReportsAppointments', 'pages/reports/ReportsAppointments.tsx'],
  ['/reports/doctors', 'ReportsDoctors', 'pages/reports/ReportsDoctors.tsx'],
  ['/reports/customers', 'ReportsCustomers', 'pages/reports/ReportsCustomers.tsx'],
  ['/reports/locations', 'ReportsLocations', 'pages/reports/ReportsLocations.tsx'],
  ['/reports/services', 'ReportsServices', 'pages/reports/ReportsServices.tsx'],
  ['/reports/employees', 'ReportsEmployees', 'pages/reports/ReportsEmployees.tsx'],
  ['/notifications', 'Notifications', 'pages/Notifications.tsx'],
  ['/permissions', 'PermissionBoard', 'pages/PermissionBoard/PermissionBoard.tsx'],
  ['/payment', 'Payment', 'pages/Payment.tsx'],
  ['/feedback', 'Feedback', 'pages/Feedback.tsx'],
] as const satisfies readonly (readonly [string, string, SourceFile])[];

describe('NK3 crossref breadcrumbs', () => {
  it('keeps every App route paired with a @crossref route marker and page triad', () => {
    const appSource = readSource('App.tsx');

    for (const [route, component, pageFile] of routeTargets) {
      expect(appSource).toContain(`@crossref:route[path="${route}", component=${component}]`);
      expectCrossrefTriad(readSource(pageFile));
    }
  });

  it('keeps the route/navigation spine itself traceable', () => {
    expectCrossrefTriad(readSource('App.tsx'));
    expectCrossrefTriad(readSource('components/Layout.tsx'));
    expectCrossrefTriad(readSource('components/shared/Breadcrumbs.tsx'));
    expectCrossrefTriad(readSource('constants/index.ts'));
  });
});
