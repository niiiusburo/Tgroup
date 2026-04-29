export type TabId = 'basic' | 'medical' | 'einvoice';

export const TABS: { id: TabId; labelKey: string }[] = [
  { id: 'basic', labelKey: 'tabs.basic' },
  { id: 'medical', labelKey: 'tabs.medical' },
  { id: 'einvoice', labelKey: 'tabs.einvoice' },
];

export const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
export const CURRENT_YEAR = parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(new Date()), 10);
export const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);
