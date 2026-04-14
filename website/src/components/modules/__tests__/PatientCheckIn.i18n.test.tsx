import { describe, it, expect, beforeAll } from 'vitest';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enOverview from '@/i18n/locales/en/overview.json';
import viOverview from '@/i18n/locales/vi/overview.json';

describe('PatientCheckIn / Overview zone1 i18n keys', () => {
  beforeAll(async () => {
    if (!i18n.isInitialized) {
      await i18n.use(initReactI18next).init({
        lng: 'en',
        fallbackLng: 'en',
        ns: ['overview'],
        defaultNS: 'overview',
        resources: {
          en: { overview: enOverview },
          vi: { overview: viOverview },
        },
        interpolation: { escapeValue: false },
      });
    } else {
      i18n.addResourceBundle('en', 'overview', enOverview, true, true);
      i18n.addResourceBundle('vi', 'overview', viOverview, true, true);
    }
  });

  const requiredKeys = [
    'zone1.filterAll',
    'zone1.filterWaiting',
    'zone1.filterInProgress',
    'zone1.filterCompleted',
    'zone1.noPatients',
    'zone1.noPatientsHint',
    'zone1.changeStatus',
    'zone1.searchPlaceholder',
  ];

  it.each(requiredKeys)('EN: "%s" resolves to a non-key string', (key) => {
    const v = i18n.t(key, { ns: 'overview', lng: 'en' }) as string;
    expect(v).not.toBe(key);
    expect(v.length).toBeGreaterThan(0);
  });

  it.each(requiredKeys)('VI: "%s" resolves to a non-key string', (key) => {
    const v = i18n.t(key, { ns: 'overview', lng: 'vi' }) as string;
    expect(v).not.toBe(key);
    expect(v.length).toBeGreaterThan(0);
  });
});
