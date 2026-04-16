import { Globe, Users, UserPlus, Link } from 'lucide-react';

export type TabId = 'basic' | 'medical' | 'einvoice';

export const TABS: { id: TabId; labelKey: string }[] = [
  { id: 'basic', labelKey: 'tabs.basic' },
  { id: 'medical', labelKey: 'tabs.medical' },
  { id: 'einvoice', labelKey: 'tabs.einvoice' },
];

export const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);

export const TYPE_ICONS: Record<string, React.ReactNode> = {
  online: <Globe className="w-3.5 h-3.5" />,
  offline: <Users className="w-3.5 h-3.5" />,
  referral: <UserPlus className="w-3.5 h-3.5" />,
  other: <Link className="w-3.5 h-3.5" />,
};

export const TYPE_COLORS: Record<string, string> = {
  online: 'text-blue-600 bg-blue-50 border-blue-200',
  offline: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  referral: 'text-purple-600 bg-purple-50 border-purple-200',
  other: 'text-gray-600 bg-gray-50 border-gray-200',
};
