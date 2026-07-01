import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock Storage APIs for jsdom compatibility
class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: new MockStorage(),
});

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: new MockStorage(),
});

// Import all locale JSON files
import enCommon from '../i18n/locales/en/common.json';
import enNav from '../i18n/locales/en/nav.json';
import enOverview from '../i18n/locales/en/overview.json';
import enCalendar from '../i18n/locales/en/calendar.json';
import enCustomers from '../i18n/locales/en/customers.json';
import enAppointments from '../i18n/locales/en/appointments.json';
import enServices from '../i18n/locales/en/services.json';
import enPayment from '../i18n/locales/en/payment.json';
import enEmployees from '../i18n/locales/en/employees.json';
import enLocations from '../i18n/locales/en/locations.json';
import enReports from '../i18n/locales/en/reports.json';
import enSettings from '../i18n/locales/en/settings.json';
import enAuth from '../i18n/locales/en/auth.json';
import enWebsite from '../i18n/locales/en/website.json';
import enCommission from '../i18n/locales/en/commission.json';
import enFeedback from '../i18n/locales/en/feedback.json';
import enNotifications from '../i18n/locales/en/notifications.json';
import enRelationships from '../i18n/locales/en/relationships.json';
import enServiceCatalog from '../i18n/locales/en/serviceCatalog.json';
import enPermissions from '../i18n/locales/en/permissions.json';
import enExports from '../i18n/locales/en/exports.json';
import enCtv from '../i18n/locales/en/ctv.json';

import viCommon from '../i18n/locales/vi/common.json';
import viNav from '../i18n/locales/vi/nav.json';
import viOverview from '../i18n/locales/vi/overview.json';
import viCalendar from '../i18n/locales/vi/calendar.json';
import viCustomers from '../i18n/locales/vi/customers.json';
import viAppointments from '../i18n/locales/vi/appointments.json';
import viServices from '../i18n/locales/vi/services.json';
import viPayment from '../i18n/locales/vi/payment.json';
import viEmployees from '../i18n/locales/vi/employees.json';
import viLocations from '../i18n/locales/vi/locations.json';
import viReports from '../i18n/locales/vi/reports.json';
import viSettings from '../i18n/locales/vi/settings.json';
import viAuth from '../i18n/locales/vi/auth.json';
import viWebsite from '../i18n/locales/vi/website.json';
import viCommission from '../i18n/locales/vi/commission.json';
import viFeedback from '../i18n/locales/vi/feedback.json';
import viNotifications from '../i18n/locales/vi/notifications.json';
import viRelationships from '../i18n/locales/vi/relationships.json';
import viServiceCatalog from '../i18n/locales/vi/serviceCatalog.json';
import viPermissions from '../i18n/locales/vi/permissions.json';
import viExports from '../i18n/locales/vi/exports.json';
import viCtv from '../i18n/locales/vi/ctv.json';

// Build flattened namespace maps from real locale JSON
const EN_NAMESPACES: Record<string, Record<string, unknown>> = {
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
  ctv: enCtv,
};

const VI_NAMESPACES: Record<string, Record<string, unknown>> = {
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
  ctv: viCtv,
};

// Flatten nested objects to dot-notation keys
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof val === 'string') {
        result[fullKey] = val;
      } else if (val !== null && typeof val === 'object') {
        Object.assign(result, flattenObject(val as Record<string, unknown>, fullKey));
      }
    }
  }
  return result;
}

// Build flat translation maps for each namespace
const enFlat: Record<string, Record<string, string>> = {};
const viFlat: Record<string, Record<string, string>> = {};

for (const ns in EN_NAMESPACES) {
  enFlat[ns] = flattenObject(EN_NAMESPACES[ns]);
  viFlat[ns] = flattenObject(VI_NAMESPACES[ns]);
}

// Interpolate {{var}} placeholders
function interpolate(template: string, options?: Record<string, unknown>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => String(options?.[key] ?? ''));
}

// Resolve a translation key: detect namespace from key (ns:key) or use provided ns/default
function translateForTest(key: string, options?: Record<string, unknown> | string, requestedNs?: string) {
  const savedLang = localStorage.getItem('tg-lang') as string | null;
  const lang = (savedLang && ['en', 'vi'].includes(savedLang)) ? savedLang : 'vi';
  const flatMap = lang === 'en' ? enFlat : viFlat;

  if (typeof options === 'string') {
    const ns = requestedNs || 'common';
    return flatMap[ns]?.[key]
      ?? (ns !== 'common' ? flatMap['common']?.[key] : undefined)
      ?? options;
  }

  const defaultValue = typeof options?.defaultValue === 'string' ? options.defaultValue : undefined;
  // Check if options.ns overrides the requestedNs parameter
  const nsFromOptions = typeof options?.ns === 'string' ? options.ns : undefined;

  // Try to resolve: check namespace-prefixed key first (e.g., 'ctv:card.showFrontFor')
  let resolvedKey = key;
  let resolvedNs = nsFromOptions || requestedNs || 'common';

  if (key.includes(':')) {
    const [nsPrefix, ...keyParts] = key.split(':');
    if (flatMap[nsPrefix]) {
      resolvedNs = nsPrefix;
      resolvedKey = keyParts.join(':');
    }
  }

  // Resolve via the requested namespace, then fall back to the 'common'
  // namespace (mirroring fallbackNS: 'common' in src/i18n/index.ts), then
  // defaultValue, then the raw key.
  const resolved = flatMap[resolvedNs]?.[resolvedKey]
    ?? (resolvedNs !== 'common' ? flatMap['common']?.[resolvedKey] : undefined)
    ?? defaultValue
    ?? key;
  return interpolate(resolved, options);
}

// Mock react-i18next with the small locale surface needed by component tests.
vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => {
    // Respect localStorage language setting for tests
    const savedLang = localStorage.getItem('tg-lang') as string | null;
    const lang = (savedLang && ['en', 'vi'].includes(savedLang)) ? savedLang : 'vi';

    return {
      t: (key: string, options?: Record<string, unknown> | string) =>
        translateForTest(key, options, ns),
      i18n: { language: lang, changeLanguage: vi.fn() },
    };
  },
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ children }: { children: React.ReactNode }) => children,
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}));
