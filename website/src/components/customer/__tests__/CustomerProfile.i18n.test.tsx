import { describe, it, expect, beforeAll } from 'vitest';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCustomers from '@/i18n/locales/en/customers.json';
import viCustomers from '@/i18n/locales/vi/customers.json';

describe('CustomerProfile i18n keys resolve', () => {
  beforeAll(async () => {
    if (!i18n.isInitialized) {
      await i18n.use(initReactI18next).init({
        lng: 'en',
        fallbackLng: 'en',
        ns: ['customers'],
        defaultNS: 'customers',
        resources: {
          en: { customers: enCustomers },
          vi: { customers: viCustomers },
        },
        interpolation: { escapeValue: false },
      });
    }
  });

  const expectedKeys = [
    'customerProfile',
    'viewAndManage',
    'assignments',
    'profile',
    'appointments',
    'records',
    'payment',
  ];

  it.each(expectedKeys)('English: key "%s" must resolve to a non-key string', (key) => {
    const value = i18n.t(key, { ns: 'customers', lng: 'en' });
    expect(value).not.toBe(key);
    expect(value).not.toContain('.');
    expect(value.length).toBeGreaterThan(0);
  });

  it.each(expectedKeys)('Vietnamese: key "%s" must resolve to a non-key string', (key) => {
    const value = i18n.t(key, { ns: 'customers', lng: 'vi' });
    expect(value).not.toBe(key);
    expect(value).not.toContain('.');
    expect(value.length).toBeGreaterThan(0);
  });
});
