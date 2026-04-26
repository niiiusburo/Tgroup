import { useTranslation } from 'react-i18next';
import { Plus, Coins, Wallet, HandCoins, Receipt } from 'lucide-react';
import { ServiceHistory } from '../ServiceHistory';
import { formatVND } from '@/lib/formatting';
import type { RecordsTabProps } from './types';

export function RecordsTab({
  profile,
  services,
  loadingServices,
  payments,
  onCreateService,
  onEditService,
  onDeleteService,
  onPayForService,
  onDeletePayment,
  onUpdateServiceStatus,
}: RecordsTabProps) {
  const { t } = useTranslation('customers');

  const totalServiceCost = services.reduce((sum, s) => sum + (s.cost || 0), 0);
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('profileSection.serviceHistory', { ns: 'customers' })}
        </h3>
        <button
          onClick={onCreateService}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          {t('thmLchKhm')}
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinancialCard icon={Coins} iconColor="sky" label={t('profileSection.totalCost')} value={formatVND(totalServiceCost)} />
        <FinancialCard icon={Wallet} iconColor="purple" label={t('collected', { ns: 'services' })} value={formatVND(totalRevenue)} />
        <FinancialCard icon={Receipt} iconColor="rose" label={t('profileSection.expectedRevenue', { ns: 'customers' })} value={formatVND(profile.outstandingBalance)} />
        <FinancialCard icon={HandCoins} iconColor="orange" label={t('profileSection.deposit', { ns: 'customers' })} value={formatVND(profile.depositBalance)} />
      </div>

      {loadingServices ? (
        <div className="bg-white rounded-xl shadow-card p-6 text-center text-sm text-gray-500">
          {t('angTi', { ns: 'common' })}…
        </div>
      ) : (
        <ServiceHistory
          services={services}
          payments={payments}
          onEditService={onEditService}
          onDeleteService={onDeleteService}
          onUpdateStatus={onUpdateServiceStatus}
          onPayForService={onPayForService}
          onDeletePayment={onDeletePayment}
        />
      )}
    </div>
  );
}

function FinancialCard({
  icon: Icon,
  iconColor,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: 'sky' | 'purple' | 'rose' | 'orange';
  label: string;
  value: string;
}) {
  const colorMap = {
    sky: { bg: 'bg-sky-50', text: 'text-sky-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-500' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-500' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-500' },
  };
  const c = colorMap[iconColor];

  return (
    <div className="bg-white rounded-xl shadow-card p-4 border border-gray-100">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 truncate">{label}</p>
          <p className="text-base sm:text-lg font-bold text-gray-900 truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}
