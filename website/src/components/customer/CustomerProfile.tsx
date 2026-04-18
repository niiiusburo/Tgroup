import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Calendar, Edit2, Plus, Clock, CalendarPlus, Receipt,
  Trash2, ChevronDown, Coins, Wallet, HandCoins } from
'lucide-react';
import { CustomerDeposits } from '@/components/payment/CustomerDeposits';
import { AppointmentForm, type AppointmentFormData } from '@/components/appointments/AppointmentForm';
import { ServiceForm } from '@/components/services/ServiceForm';
import { PaymentForm, type PaymentFormData } from '@/components/payment/PaymentForm';
import { PaymentSourceBadges } from '@/components/payment/PaymentSourceBadges';
import { type ServicePaymentContext } from '@/components/payment/ServicePaymentCard';
import { ServiceHistory } from '@/components/customer/ServiceHistory';
import { CustomerAssignments } from '@/components/customer/CustomerAssignments';
import type { DepositTransaction, DepositBalance } from '@/hooks/useDeposits';
import type { CustomerProfileData } from '@/hooks/useCustomerProfile';
import type { CustomerService } from '@/types/customer';
import type { ApiAppointment, ExternalCheckupsResponse } from '@/lib/api';
import type { PaymentWithAllocations } from '@/hooks/useCustomerPayments';
import { HealthCheckupGallery } from './HealthCheckupGallery';
import { useAuth } from '@/contexts/AuthContext';
import { formatVND, parseDisplayDate } from '@/lib/formatting';
import { TabBadge } from './CustomerProfile/TabBadge';
import { formatDate } from './CustomerProfile/formatDate';
import { ProfileHeader } from './CustomerProfile/ProfileHeader';
import { DeletePaymentDialog } from './CustomerProfile/DeletePaymentDialog';

interface CustomerProfileProps {
  readonly profile: CustomerProfileData;
  readonly appointments: readonly ApiAppointment[];
  readonly services?: readonly CustomerService[];
  readonly depositList?: DepositTransaction[];
  readonly usageHistory?: DepositTransaction[];
  readonly depositBalance?: DepositBalance;
  readonly payments?: PaymentWithAllocations[];
  readonly activeTab?: ProfileTab;
  readonly onTabChange?: (tab: ProfileTab) => void;
  readonly onBack: () => void;
  readonly onEdit?: () => void;
  readonly onAddDeposit?: (customerId: string, amount: number, method: 'cash' | 'bank_transfer' | 'vietqr', date?: string, note?: string) => Promise<void>;
  readonly onAddRefund?: (customerId: string, amount: number, method: 'cash' | 'bank_transfer', date?: string, note?: string) => Promise<void>;
  readonly onVoidDeposit?: (id: string) => Promise<void>;
  readonly onDeleteDeposit?: (id: string) => Promise<void>;
  readonly onEditDeposit?: (id: string, data: Partial<{amount: number;method: 'cash' | 'bank_transfer';notes: string;paymentDate: string;}>) => Promise<void>;
  readonly onRefreshDeposits?: () => void;
  readonly onCreateAppointment?: (data: AppointmentFormData) => Promise<void>;
  readonly onUpdateAppointment?: (id: string, data: AppointmentFormData) => Promise<void>;
  readonly onCreateService?: (data: {
    catalogItemId: string;
    serviceName: string;
    doctorId: string | null;
    doctorName: string;
    assistantId?: string | null;
    assistantName?: string;
    dentalAideId?: string | null;
    dentalAideName?: string;
    locationId: string;
    locationName: string;
    startDate: string;
    notes: string;
    totalCost: number;
    toothNumbers: readonly string[];
    sourceId?: string | null;
  }) => Promise<void>;
  readonly onUpdateService?: (data: {
    id: string;
    catalogItemId: string;
    serviceName: string;
    doctorId: string | null;
    doctorName: string;
    assistantId?: string | null;
    assistantName?: string;
    dentalAideId?: string | null;
    dentalAideName?: string;
    locationId: string;
    locationName: string;
    startDate: string;
    notes: string;
    totalCost: number;
    toothNumbers: readonly string[];
    sourceId?: string | null;
  }) => Promise<void>;
  readonly onMakePayment?: (data: PaymentFormData) => Promise<void>;
  readonly onDeletePayment?: (id: string) => Promise<void>;
  readonly onSoftDelete?: () => void;
  readonly onHardDelete?: () => void;
  readonly canSoftDelete?: boolean;
  readonly canHardDelete?: boolean;
  readonly loadingDeposits?: boolean;
  readonly loadingPayments?: boolean;
  readonly checkupData?: ExternalCheckupsResponse | null;
  readonly checkupsLoading?: boolean;
  readonly checkupsError?: string | null;
  readonly onRefetchCheckups?: () => void;
  readonly onUpdateServiceStatus?: (serviceId: string, newStatus: string) => Promise<void>;
}

export type ProfileTab = 'profile' | 'appointments' | 'records' | 'payment';

interface TabConfig {
  readonly value: ProfileTab;
  readonly label: string;
  readonly getCount?: (props: CustomerProfileProps) => number;
}

const TABS: readonly TabConfig[] = [
{ value: 'profile', label: 'profile' },
{ value: 'appointments', label: 'appointments', getCount: (p) => p.appointments.length },
{ value: 'records', label: 'records', getCount: (p) => p.services?.length ?? 0 },
{ value: 'payment', label: 'payment', getCount: (p) => p.payments?.length ?? 0 }];



export function CustomerProfile({
  profile,
  appointments,
  services = [],
  depositList = [],
  usageHistory = [],
  depositBalance,
  payments = [],
  activeTab: controlledActiveTab,
  onTabChange,
  onBack,
  onEdit,
  onAddDeposit,
  onAddRefund,
  onVoidDeposit,
  onDeleteDeposit,
  onEditDeposit,
  onRefreshDeposits,
  onCreateAppointment,
  onUpdateAppointment,
  onCreateService,
  onUpdateService,
  onMakePayment,
  onSoftDelete,
  onHardDelete,
  canSoftDelete,
  canHardDelete,
  loadingDeposits = false,
  loadingPayments = false,
  checkupData,
  checkupsLoading,
  checkupsError,
  onRefetchCheckups,
  onUpdateServiceStatus,
  onDeletePayment
}: CustomerProfileProps) {
  const { t } = useTranslation();
  const [internalActiveTab, setInternalActiveTab] = useState<ProfileTab>('profile');
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = (tab: ProfileTab) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(tab);
    }
    onTabChange?.(tab);
  };
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payTargetService, setPayTargetService] = useState<CustomerService | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<ApiAppointment | null>(null);
  const [editingService, setEditingService] = useState<CustomerService | null>(null);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
  const { hasPermission } = useAuth();
  const canViewHealthCheckups = hasPermission('external_checkups.view');

  const totalServiceCost = services.reduce((sum, s) => sum + (s.cost || 0), 0);
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const amountPaid = totalServiceCost - profile.outstandingBalance;

  const getStatusConfig = (state: string | null | undefined) => {
    const s = (state || '').toLowerCase();
    if (s === 'done') return { label: 'completed', className: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' };
    if (s === 'cancelled' || s === 'cancel') return { label: 'cancelled', className: 'text-red-600 bg-red-50', dot: 'bg-red-500' };
    if (s === 'no_show') return { label: 'noShow', className: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' };
    if (s === 'confirmed') return { label: 'confirmed', className: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' };
    return { label: 'scheduled', className: 'text-gray-600 bg-gray-50', dot: 'bg-gray-400' };
  };

  const canEditAppointment = (state: string | null | undefined) => {
    const s = (state || '').toLowerCase();
    return s !== 'done' && s !== 'cancelled' && s !== 'cancel';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('customerProfile', { ns: 'customers' })}</h1>
            <p className="text-sm text-gray-500">{t('viewAndManage', { ns: 'customers' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          {onEdit &&
          <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          }
          {(canSoftDelete || canHardDelete) &&
          <div className="relative flex items-center">
              <button
              onClick={() => {if (canSoftDelete) {onSoftDelete?.();} else {onHardDelete?.();}}}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-l-lg hover:bg-red-700 transition-colors">
              
                <Trash2 className="w-4 h-4" />

            </button>
              <button
              onClick={() => setShowDeleteMenu((v) => !v)}
              className="px-2 py-2 bg-red-600 text-white rounded-r-lg border-l border-red-500 hover:bg-red-700 transition-colors">
              
                <ChevronDown className="w-4 h-4" />
              </button>
              {showDeleteMenu &&
            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                  {canSoftDelete &&
              <button
                onClick={() => {setShowDeleteMenu(false);onSoftDelete?.();}}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                

              </button>
              }
                  {canHardDelete &&
              <button
                onClick={() => {setShowDeleteMenu(false);onHardDelete?.();}}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                

              </button>
              }
                </div>
            }
            </div>
          }
        </div>
      </div>

      <ProfileHeader profile={profile} />

      <CustomerAssignments
        companyName={profile.companyName}
        salestaffId={profile.salestaffid}
        cskhId={profile.cskhid}
        cskhName={profile.cskhname}
        referralUserId={profile.referraluserid} />
      

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => {
            const count = tab.getCount?.({
              profile,
              appointments,
              services,
              depositList,
              usageHistory,
              depositBalance,
              payments,
              onBack,
              onEdit,
              onAddDeposit,
              onAddRefund,
              onVoidDeposit,
              onDeleteDeposit,
              onEditDeposit,
              onRefreshDeposits,
              onCreateAppointment,
              onUpdateAppointment,
              onCreateService,
              onMakePayment,
              loadingDeposits,
              loadingPayments
            }) ?? 0;
            const showBadge = tab.getCount !== undefined;
            const isActive = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`group flex items-center px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`
                }>
                
                {t(tab.label, { ns: 'customers' })}
                {showBadge && <TabBadge count={count} isActive={isActive} />}
              </button>);

          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' &&
      <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-400">Full Name</p><p className="text-sm font-medium text-gray-900">{profile.name}</p></div>
              <div><p className="text-xs text-gray-400">Phone</p><p className="text-sm font-medium text-gray-900">{profile.phone || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-400">Email</p><p className="text-sm font-medium text-gray-900">{profile.email || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-400">Date of Birth</p><p className="text-sm font-medium text-gray-900">{profile.dateOfBirth}</p></div>
              <div><p className="text-xs text-gray-400">Gender</p><p className="text-sm font-medium text-gray-900">{profile.gender === 'male' ? 'Male' : 'Female'}</p></div>
              <div><p className="text-xs text-gray-400">Address</p><p className="text-sm font-medium text-gray-900">{profile.address || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-400">Location</p><p className="text-sm font-medium text-gray-900">{profile.companyName || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-400">Member Since</p><p className="text-sm font-medium text-gray-900">{profile.memberSince}</p></div>
            </div>
          </div>
          {canViewHealthCheckups &&
        <HealthCheckupGallery
          data={checkupData ?? null}
          isLoading={checkupsLoading}
          error={checkupsError}
          customerCode={profile.code}
          onUploaded={onRefetchCheckups} />

        }
        </div>
      }

      {activeTab === 'appointments' &&
      <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">{t('profileSection.appointmentHistory', { ns: 'customers' })} ({appointments.length})</h3>
            <button
            onClick={() => {setEditingAppointment(null);setShowAppointmentModal(true);}}
            disabled={!onCreateAppointment}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm ${
            onCreateAppointment ?
            'bg-primary hover:bg-primary-dark cursor-pointer' :
            'bg-gray-300 cursor-not-allowed'}`
            }>
            
              <CalendarPlus className="w-4 h-4" />
              Add Appointment
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-card p-6">
            {appointments.length === 0 ?
          <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 mb-3">No appointments found</p>
                {onCreateAppointment &&
            <button
              onClick={() => {setEditingAppointment(null);setShowAppointmentModal(true);}}
              className="text-primary hover:text-primary-dark text-sm font-medium">
              
                    Schedule your first appointment
                  </button>
            }
              </div> :

          <div className="space-y-3">
                {appointments.slice(0, 20).map((apt) => {
              const statusConfig = getStatusConfig(apt.state ?? undefined);
              // Extract time from either time field or datetimeappointment
              const time = apt.time || (apt.datetimeappointment?.includes('T') ?
              apt.datetimeappointment.split('T')[1]?.slice(0, 5) :
              null) || '--:--';
              const isEditable = canEditAppointment(apt.state ?? undefined) && !!onUpdateAppointment;
              return (
                <div
                  key={apt.id}
                  onClick={() => {if (isEditable) {setEditingAppointment(apt);setShowAppointmentModal(true);}}}
                  className={`group flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all ${isEditable ? 'cursor-pointer pr-2' : ''}`}>
                  
                      <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{apt.name || 'Appointment'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${statusConfig.className}`}>{t(`status.${statusConfig.label}`, { ns: 'appointments' })}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{time}</span>
                          <span>{apt.doctorname || 'N/A'}</span>
                          <span>{formatDate(apt.date ?? '')}</span>
                        </div>
                        {apt.note &&
                    <p className="text-xs text-gray-400 mt-1 truncate">{apt.note}</p>
                    }
                      </div>
                    </div>);

            })}
              </div>
          }
          </div>
        </div>
      }

      {activeTab === 'records' &&
      <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">{t('profileSection.serviceHistory', { ns: 'customers' })}</h3>
            {onCreateService &&
          <button
            onClick={() => setShowServiceModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm">
            
                <Plus className="w-4 h-4" />
                Add Service
              </button>
          }
          </div>

          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-card p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center flex-shrink-0">
                  <Coins className="w-5 h-5 text-sky-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate"></p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 truncate">{formatVND(totalServiceCost)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-card p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-purple-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">Doanh thu</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 truncate">{formatVND(totalRevenue)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-card p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-5 h-5 text-rose-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{t('profileSection.expectedRevenue', { ns: 'customers' })}</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 truncate">{formatVND(profile.outstandingBalance)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-card p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <HandCoins className="w-5 h-5 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{t('profileSection.deposit', { ns: 'customers' })}</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 truncate">{formatVND(profile.depositBalance)}</p>
                </div>
              </div>
            </div>
          </div>

          <ServiceHistory services={services} payments={payments} onEditService={setEditingService} onUpdateStatus={onUpdateServiceStatus} onPayForService={onMakePayment ? (svc) => {
          setPayTargetService(svc);
          setShowPaymentModal(true);
        } : undefined} onDeletePayment={onDeletePayment ? (id) => setPaymentToDelete(id) : undefined} />
        </div>
      }

      {activeTab === 'payment' &&
      <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Payment & Deposits</h3>
  
          </div>

          {/* Bill summary — 3 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-card p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">{t('profileSection.totalCost', { ns: 'customers' })}</p>
              <p className="text-lg font-bold text-gray-900">{formatVND(totalServiceCost)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-card p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1"></p>
              <p className="text-lg font-bold text-emerald-600">{formatVND(amountPaid)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-card p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1"></p>
              <p className="text-lg font-bold text-red-600">{formatVND(profile.outstandingBalance)}</p>
            </div>
          </div>

          {/* Payments with Allocations */}
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-gray-500" />
                Payment History
                {payments.length > 0 && <span className="text-xs font-normal text-gray-500 ml-1">({payments.length})</span>}
              </h4>
            </div>
            {loadingPayments ?
          <div className="p-6 text-center text-sm text-gray-500">Loading payments...</div> :
          payments.length === 0 ?
          <div className="p-6 text-center text-sm text-gray-400">No payment records found</div> :

          <div className="divide-y divide-gray-100">
                {payments.map((p) => {
              const isVoided = p.status === 'voided';
              const isNegative = p.amount < 0;
              const dateInfo = parseDisplayDate(p.paymentDate || p.createdAt);
              const dd = dateInfo?.day ?? '—';
              const mmm = dateInfo?.month ?? '';
              const yyyy = dateInfo?.year ?? '';

              const isExpanded = expandedPaymentId === p.id;
              return (
                <div
                  key={p.id}
                  className={`transition-all duration-200 group ${isNegative ? 'bg-red-50/20' : ''}`}>
                  
                      <button
                    type="button"
                    onClick={() => {
                      if (isVoided) {
                        setExpandedPaymentId(isExpanded ? null : p.id);
                      }
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all duration-200 ${
                    isVoided ?
                    'cursor-default opacity-60' :
                    'hover:bg-gray-50 hover:ring-2 hover:ring-primary/20 hover:ring-inset hover:shadow-sm hover:-translate-y-px'}`
                    }>
                    
                        {/* Date tear-off block */}
                        <div className={`flex-shrink-0 flex flex-col items-center justify-center w-11 h-12 rounded-lg border text-center ${isNegative ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                          <span className={`text-sm font-bold leading-none ${isNegative ? 'text-red-600' : 'text-orange-600'}`}>{dd}</span>
                          {mmm && <span className="text-[9px] text-gray-500 leading-tight mt-0.5">{mmm}</span>}
                          {yyyy && <span className="text-[8px] text-gray-400 leading-tight">{yyyy}</span>}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <PaymentSourceBadges method={p.method} cashAmount={p.cashAmount} bankAmount={p.bankAmount} depositUsed={p.depositUsed} />
                            {p.referenceCode && <span className="text-[10px] text-gray-700 font-medium">{p.referenceCode}</span>}
                            {!p.referenceCode && p.receiptNumber && <span className="text-[10px] text-gray-400 font-mono">{p.receiptNumber}</span>}
                            {p.referenceCode && p.receiptNumber && <span className="text-[10px] text-gray-400 font-mono">{p.receiptNumber}</span>}
                          </div>
                          <p className={`text-sm font-semibold ${isNegative ? 'text-red-600' : 'text-gray-900'} ${isVoided ? 'line-through' : ''}`}>
                            {formatVND(p.amount)}
                          </p>
                          {p.notes &&
                      <p className="text-[10px] text-gray-400 truncate max-w-[140px] sm:max-w-[200px]" title={p.notes}>{p.notes}</p>
                      }
                        </div>
                        {/* Status + delete */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isVoided ?
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Voided</span> :

                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Posted</span>
                      }
                          {!isVoided && onDeletePayment &&
                      <button
                        type="button"
                        onClick={(e) => {e.stopPropagation();setPaymentToDelete(p.id);}}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600"
                        title="Delete payment">
                        
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                      }
                        </div>
                      </button>
                      {isVoided && isExpanded &&
                  <div className="px-4 pb-3">
                          {p.notes && <p className="text-xs text-gray-500">Note: {p.notes}</p>}
                        </div>
                  }
                    </div>);

            })}
              </div>
          }
          </div>

          <CustomerDeposits
          depositList={depositList}
          usageHistory={usageHistory}
          balance={depositBalance ?? {
            depositBalance: profile.depositBalance,
            outstandingBalance: profile.outstandingBalance,
            totalDeposited: 0,
            totalUsed: 0,
            totalRefunded: 0
          }}
          loading={loadingDeposits}
          onAddDeposit={onAddDeposit ? (amount, method, date, note) => onAddDeposit(profile.id, amount, method, date, note) : undefined}
          onAddRefund={onAddRefund ? (amount, method, date, note) => onAddRefund(profile.id, amount, method, date, note) : undefined}
          onVoidDeposit={onVoidDeposit}
          onDeleteDeposit={onDeleteDeposit}
          onEditDeposit={onEditDeposit}
          onRefresh={onRefreshDeposits} />
        
        </div>
      }

      {/* Appointment Modal */}
      {showAppointmentModal && (onCreateAppointment || editingAppointment && onUpdateAppointment) &&
      <AppointmentForm
        isEdit={!!editingAppointment}
        initialData={editingAppointment ? {
          customerId: profile.id,
          customerName: profile.name,
          customerPhone: profile.phone,
          doctorId: editingAppointment.doctorid ?? undefined,
          locationId: editingAppointment.companyid ?? undefined,
          serviceName: editingAppointment.name ?? '',
          date: editingAppointment.date,
          startTime: editingAppointment.time ?? '',
          endTime: '',
          notes: editingAppointment.note ?? ''
        } : {
          customerId: profile.id,
          customerName: profile.name,
          customerPhone: profile.phone,
          locationId: profile.companyId
        }}
        onSubmit={async (data) => {
          try {
            if (editingAppointment && onUpdateAppointment) {
              await onUpdateAppointment(editingAppointment.id, data);
            } else if (onCreateAppointment) {
              await onCreateAppointment(data);
            }
            setShowAppointmentModal(false);
            setEditingAppointment(null);
          } catch (error) {
            console.error('Failed to save appointment:', error);
          }
        }}
        onClose={() => {
          setShowAppointmentModal(false);
          setEditingAppointment(null);
        }} />

      }

      {/* Service Modal */}
      {showServiceModal && onCreateService &&
      <ServiceForm
        customerId={profile.id}
        initialData={{
          customerId: profile.id,
          customerName: profile.name,
          locationId: profile.companyId
        }}
        onSubmit={async (data) => {
          try {
            if (onCreateService) {
              await onCreateService({
                catalogItemId: data.catalogItemId,
                serviceName: data.serviceName,
                doctorId: data.doctorId,
                doctorName: data.doctorName,
                assistantId: data.assistantId,
                assistantName: data.assistantName,
                dentalAideId: data.dentalAideId,
                dentalAideName: data.dentalAideName,
                locationId: data.locationId,
                locationName: data.locationName,
                startDate: data.startDate,
                notes: data.notes,
                totalCost: data.totalCost,
                toothNumbers: data.toothNumbers,
                sourceId: data.sourceId ?? null
              });
            }
            setShowServiceModal(false);
          } catch (error) {
            console.error('Failed to create service:', error);
          }
        }}
        onClose={() => setShowServiceModal(false)} />

      }

      {/* Edit Service Modal */}
      {editingService &&
      <ServiceForm
        customerId={profile.id}
        isEdit={true}
        initialData={{
          id: editingService.id,
          customerId: profile.id,
          customerName: profile.name,
          catalogItemId: editingService.catalogItemId,
          serviceName: editingService.service,
          doctorId: editingService.doctorId,
          assistantId: editingService.assistantId,
          dentalAideId: editingService.dentalAideId,
          locationId: profile.companyId,
          startDate: editingService.date,
          notes: editingService.notes || '',
          totalCost: editingService.cost,
          toothNumbers: editingService.tooth ?
          editingService.tooth.split(',').map((t) => t.trim()).filter(Boolean) :
          []
        }}
        onSubmit={async (data) => {
          try {
            if (onUpdateService && data.id) {
              await onUpdateService({
                id: data.id,
                catalogItemId: data.catalogItemId,
                serviceName: data.serviceName,
                doctorId: data.doctorId,
                doctorName: data.doctorName,
                assistantId: data.assistantId,
                assistantName: data.assistantName,
                dentalAideId: data.dentalAideId,
                dentalAideName: data.dentalAideName,
                locationId: data.locationId,
                locationName: data.locationName,
                startDate: data.startDate,
                notes: data.notes,
                totalCost: data.totalCost,
                toothNumbers: data.toothNumbers,
                sourceId: data.sourceId ?? null
              });
            }
            setEditingService(null);
          } catch (error) {
            console.error('Failed to update service:', error);
          }
        }}
        onClose={() => setEditingService(null)} />

      }

      <DeletePaymentDialog
        paymentToDelete={paymentToDelete}
        isDeleting={isDeletingPayment}
        onCancel={() => setPaymentToDelete(null)}
        onConfirm={async () => {
          if (!onDeletePayment || !paymentToDelete) return;
          setIsDeletingPayment(true);
          try {
            await onDeletePayment(paymentToDelete);
          } catch (err) {
            console.error('Failed to delete payment:', err);
          } finally {
            setIsDeletingPayment(false);
            setPaymentToDelete(null);
          }
        }} />
      
      {/* Payment Modal */}
      {showPaymentModal && onMakePayment && payTargetService && (() => {
        const svcCtx: ServicePaymentContext = {
          recordId: payTargetService.id,
          recordName: payTargetService.orderCode || payTargetService.orderName || payTargetService.service,
          recordType: 'saleorder',
          totalCost: payTargetService.cost,
          paidAmount: payTargetService.paidAmount ?? Math.max(0, payTargetService.cost - (payTargetService.residual ?? payTargetService.cost)),
          residual: payTargetService.residual ?? payTargetService.cost,
          locationName: payTargetService.locationName ?? profile.companyName ?? '',
          orderName: payTargetService.orderName
        };
        return (
          <PaymentForm
            defaultCustomerName={profile.name}
            defaultCustomerId={profile.id}
            depositBalance={profile.depositBalance}
            outstandingBalance={profile.outstandingBalance}
            serviceContext={svcCtx}
            onSubmit={async (data) => {
              try {
                if (onMakePayment) {
                  await onMakePayment(data);
                }
                setShowPaymentModal(false);
                setPayTargetService(null);
              } catch (error) {
                console.error('Failed to make payment:', error);
              }
            }}
            onClose={() => {
              setShowPaymentModal(false);
              setPayTargetService(null);
            }} />);


      })()}
    </div>);

}