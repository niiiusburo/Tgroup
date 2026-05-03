import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enOverview from './locales/en/overview.json';
import enCalendar from './locales/en/calendar.json';
import enCustomers from './locales/en/customers.json';
import enAppointments from './locales/en/appointments.json';
import enServices from './locales/en/services.json';
import enPayment from './locales/en/payment.json';
import enEmployees from './locales/en/employees.json';
import enLocations from './locales/en/locations.json';
import enReports from './locales/en/reports.json';
import enSettings from './locales/en/settings.json';
import enAuth from './locales/en/auth.json';
import enWebsite from './locales/en/website.json';
import enCommission from './locales/en/commission.json';
import enFeedback from './locales/en/feedback.json';
import enNotifications from './locales/en/notifications.json';
import enRelationships from './locales/en/relationships.json';
import enServiceCatalog from './locales/en/serviceCatalog.json';
import enPermissions from './locales/en/permissions.json';
import enExports from './locales/en/exports.json';

import viCommon from './locales/vi/common.json';
import viNav from './locales/vi/nav.json';
import viOverview from './locales/vi/overview.json';
import viCalendar from './locales/vi/calendar.json';
import viCustomers from './locales/vi/customers.json';
import viAppointments from './locales/vi/appointments.json';
import viServices from './locales/vi/services.json';
import viPayment from './locales/vi/payment.json';
import viEmployees from './locales/vi/employees.json';
import viLocations from './locales/vi/locations.json';
import viReports from './locales/vi/reports.json';
import viSettings from './locales/vi/settings.json';
import viAuth from './locales/vi/auth.json';
import viWebsite from './locales/vi/website.json';
import viCommission from './locales/vi/commission.json';
import viFeedback from './locales/vi/feedback.json';
import viNotifications from './locales/vi/notifications.json';
import viRelationships from './locales/vi/relationships.json';
import viServiceCatalog from './locales/vi/serviceCatalog.json';
import viPermissions from './locales/vi/permissions.json';
import viExports from './locales/vi/exports.json';

const STORAGE_KEY = 'tg-lang';
const DEFAULT_LANG = 'vi';

export const SUPPORTED_LANGS = ['en', 'vi'] as const;
export type SupportedLang = typeof SUPPORTED_LANGS[number];

export const LANG_LABELS: Record<SupportedLang, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
};

const savedLang = localStorage.getItem(STORAGE_KEY) as SupportedLang | null;

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      nav: enNav,
      overview: enOverview,
      calendar: enCalendar,
      customers: enCustomers,
      appointments: enAppointments,
      services: enServices,
      payment: enPayment,
      employees: enEmployees,
      locations: enLocations,
      reports: enReports,
      settings: enSettings,
      auth: enAuth,
      website: enWebsite,
      commission: enCommission,
      feedback: enFeedback,
      notifications: enNotifications,
      relationships: enRelationships,
      serviceCatalog: enServiceCatalog,
      permissions: enPermissions,
      exports: enExports,
    },
    vi: {
      common: viCommon,
      nav: viNav,
      overview: viOverview,
      calendar: viCalendar,
      customers: viCustomers,
      appointments: viAppointments,
      services: viServices,
      payment: viPayment,
      employees: viEmployees,
      locations: viLocations,
      reports: viReports,
      settings: viSettings,
      auth: viAuth,
      website: viWebsite,
      commission: viCommission,
      feedback: viFeedback,
      notifications: viNotifications,
      relationships: viRelationships,
      serviceCatalog: viServiceCatalog,
      permissions: viPermissions,
      exports: viExports,
    },
  },
  lng: savedLang && SUPPORTED_LANGS.includes(savedLang) ? savedLang : DEFAULT_LANG,
  fallbackLng: 'vi',
  fallbackNS: 'common',
  ns: [
    'common', 'nav', 'overview', 'calendar', 'customers',
    'appointments', 'services', 'payment', 'employees',
    'locations', 'reports', 'settings', 'auth', 'website', 'permissions',
    'commission', 'feedback', 'notifications', 'relationships', 'serviceCatalog', 'exports',
  ],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  debug: import.meta.env.DEV,
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: (lng, ns, key) => {
    console.warn(`[i18n missing key] ${lng}.${ns}.${key}`);
  },
});

export { STORAGE_KEY, DEFAULT_LANG };
export default i18n;
