import { useState } from 'react';
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Tag,
  User, AlertCircle, Edit2, Plus, Clock, CalendarPlus, Receipt,
  Trash2, ChevronDown,
} from 'lucide-react';
import { DepositWallet } from '@/components/payment/DepositWallet';
import { DepositHistory } from '@/components/payment/DepositHistory';
import { AppointmentForm, type AppointmentFormData } from '@/components/appointments/AppointmentForm';
import { ServiceForm } from '@/components/services/ServiceForm';
import { PaymentForm, type PaymentFormData } from '@/components/payment/PaymentForm';
import { ServiceHistory } from '@/components/customer/ServiceHistory';
import type { DepositTransaction } from '@/hooks/useDeposits';
import type { CustomerProfileData } from '@/hooks/useCustomerProfile';
import type { CustomerService } from '@/types/customer';
import type { ApiAppointment, ExternalCheckupsResponse } from '@/lib/api';
import type { PaymentWithAllocations } from '@/hooks/useCustomerPayments';
import { HealthCheckupGallery } from './HealthCheckupGallery';

interface CustomerProfileProps {
  readonly profile: CustomerProfileData;
  readonly appointments: readonly ApiAppointment[];
  readonly services?: readonly CustomerService[];
  readonly depositTransactions?: DepositTransaction[];
  readonly payments?: PaymentWithAllocations[];
  readonly activeTab?: ProfileTab;
  readonly onTabChange?: (tab: ProfileTab) => void;
  readonly onBack: () => void;
  readonly onEdit?: () => void;
  readonly onAddDeposit?: (customerId: string, amount: number, method: 'cash' | 'bank_transfer' | 'vietqr', date?: string, note?: string) => Promise<void>;
  readonly onCreateAppointment?: (data: AppointmentFormData) => Promise<void>;
  readonly onUpdateAppointment?: (id: string, data: AppointmentFormData) => Promise<void>;
  readonly onCreateService?: (data: {
    catalogItemId: string;
    serviceName: string;
    doctorId: string;
    doctorName: string;
    locationId: string;
    locationName: string;
    startDate: string;
    notes: string;
    totalCost: number;
    toothNumbers: readonly string[];
  }) => Promise<void>;
  readonly onMakePayment?: (data: PaymentFormData) => Promise<void>;
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
}

export type ProfileTab = 'profile' | 'appointments' | 'records' | 'payment';

interface TabConfig {
  readonly value: ProfileTab;
  readonly label: string;
  readonly getCount?: (props: CustomerProfileProps) => number;
}

const TABS: readonly TabConfig[] = [
  { value: 'profile', label: 'Profile' },
  { value: 'appointments', label: 'Appointments', getCount: (p) => p.appointments.length },
  { value: 'records', label: 'Records', getCount: (p) => p.services?.length ?? 0 },
  { value: 'payment', label: 'Payment', getCount: (p) => (p.payments?.length ?? 0) + (p.depositTransactions?.length ?? 0) },
];

function TabBadge({ count, isActive }: { count: number; isActive: boolean }) {
  if (count === 0) {
    return (
      <span className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full transition-colors ${
        isActive 
          ? 'bg-primary/20 text-primary' 
          : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
      }`}>
        0
      </span>
    );
  }
  
  return (
    <span className={`ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold rounded-full transition-colors ${
      isActive 
        ? 'bg-primary text-white shadow-sm' 
        : 'bg-primary/10 text-primary group-hover:bg-primary/20'
    }`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    // Handle ISO date strings (e.g., "2024-03-15T00:00:00") by extracting just the date part
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    
    // Parse as local date to avoid timezone shifts
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return '-';
    
    const date = new Date(year, month - 1, day); // month is 0-indexed
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
}

export function CustomerProfile({
  profile,
  appointments,
  services = [],
  depositTransactions = [],
  payments = [],
  activeTab: controlledActiveTab,
  onTabChange,
  onBack,
  onEdit,
  onAddDeposit,
  onCreateAppointment,
  onUpdateAppointment,
  onCreateService,
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
}: CustomerProfileProps) {
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
  const [editingAppointment, setEditingAppointment] = useState<ApiAppointment | null>(null);
  const [editingService, setEditingService] = useState<CustomerService | null>(null);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentWithAllocations | null>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  const getStatusConfig = (state: string | null | undefined) => {
    const s = (state || '').toLowerCase();
    if (s === 'done') return { label: 'Completed', className: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' };
    if (s === 'cancelled' || s === 'cancel') return { label: 'Cancelled', className: 'text-red-600 bg-red-50', dot: 'bg-red-500' };
    if (s === 'no_show') return { label: 'No Show', className: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' };
    if (s === 'confirmed') return { label: 'Confirmed', className: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' };
    return { label: 'Scheduled', className: 'text-gray-600 bg-gray-50', dot: 'bg-gray-400' };
  };

  const canEditAppointment = (state: string | null | undefined) => {
    const s = (state || '').toLowerCase();
    return s !== 'done' && s !== 'cancelled' && s !== 'cancel';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Customer Profile</h1>
          <p className="text-sm text-gray-500">View and manage patient details</p>
        </div>
        {onEdit && (
          <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        )}
        {(canSoftDelete || canHardDelete) && (
          <div className="relative flex items-center">
            <button
              onClick={() => { if (canSoftDelete) { onSoftDelete?.(); } else { onHardDelete?.(); } }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-l-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Xóa
            </button>
            <button
              onClick={() => setShowDeleteMenu((v) => !v)}
              className="px-2 py-2 bg-red-600 text-white rounded-r-lg border-l border-red-500 hover:bg-red-700 transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            {showDeleteMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                {canSoftDelete && (
                  <button
                    onClick={() => { setShowDeleteMenu(false); onSoftDelete?.(); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Xóa mềm
                  </button>
                )}
                {canHardDelete && (
                  <button
                    onClick={() => { setShowDeleteMenu(false); onHardDelete?.(); }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Xóa vĩnh viễn
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{profile.name.charAt(0)}</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                <User className="w-3 h-3" />
                {profile.gender === 'male' ? 'Male' : 'Female'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                {profile.phone || 'No phone'}
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                {profile.email || 'No email'}
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                {profile.address || 'No address'}
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                DOB: {profile.dateOfBirth}
              </span>
            </div>

            {profile.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {profile.tags.map((tag) => (
                  <span key={tag} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    tag.includes('Allergy') ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tag.includes('Allergy') ? <AlertCircle className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex sm:flex-col gap-4 sm:gap-3 flex-shrink-0 sm:text-right">
            <div>
              <p className="text-xs text-gray-400">Member since</p>
              <p className="text-sm font-medium text-gray-900">{profile.memberSince}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total visits</p>
              <p className="text-sm font-medium text-gray-900">{profile.totalVisits}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Deposit Balance</p>
              <p className="text-sm font-bold text-emerald-600">{formatVND(profile.depositBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Outstanding</p>
              <p className="text-sm font-bold text-red-600">{formatVND(profile.outstandingBalance)}</p>
            </div>
          </div>
        </div>

        {profile.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Notes</p>
            <p className="text-sm text-gray-600">{profile.notes}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const count = tab.getCount?.({
              profile,
              appointments,
              services,
              depositTransactions,
              payments,
              onBack,
              onEdit,
              onAddDeposit,
              onCreateAppointment,
              onUpdateAppointment,
              onCreateService,
              onMakePayment,
              loadingDeposits,
              loadingPayments,
            }) ?? 0;
            const showBadge = tab.getCount !== undefined;
            const isActive = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`group flex items-center px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {showBadge && <TabBadge count={count} isActive={isActive} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-400">Customer Code</p><p className="text-sm font-medium text-gray-900">{profile.code || 'N/A'}</p></div>
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
          <HealthCheckupGallery
            data={checkupData ?? null}
            isLoading={checkupsLoading}
            error={checkupsError}
            customerCode={profile.code}
            onUploaded={onRefetchCheckups}
          />
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Appointments ({appointments.length})</h3>
            <button
              onClick={() => { setEditingAppointment(null); setShowAppointmentModal(true); }}
              disabled={!onCreateAppointment}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm ${
                onCreateAppointment
                  ? 'bg-primary hover:bg-primary-dark cursor-pointer'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              <CalendarPlus className="w-4 h-4" />
              Add Appointment
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-card p-6">
            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 mb-3">No appointments found</p>
                {onCreateAppointment && (
                  <button
                    onClick={() => { setEditingAppointment(null); setShowAppointmentModal(true); }}
                    className="text-primary hover:text-primary-dark text-sm font-medium"
                  >
                    Schedule your first appointment
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 20).map((apt) => {
                  const statusConfig = getStatusConfig(apt.state ?? undefined);
                  // Extract time from either time field or datetimeappointment
                  const time = apt.time || (apt.datetimeappointment?.includes('T') 
                    ? apt.datetimeappointment.split('T')[1]?.slice(0, 5) 
                    : null) || '--:--';
                  const isEditable = canEditAppointment(apt.state ?? undefined) && !!onUpdateAppointment;
                  return (
                    <div
                      key={apt.id}
                      onClick={() => { if (isEditable) { setEditingAppointment(apt); setShowAppointmentModal(true); } }}
                      className={`group flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all ${isEditable ? 'cursor-pointer pr-2' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{apt.name || 'Appointment'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${statusConfig.className}`}>{statusConfig.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{time}</span>
                          <span>{apt.doctorname || 'N/A'}</span>
                          <span>{formatDate(apt.date ?? '')}</span>
                        </div>
                        {apt.note && (
                          <p className="text-xs text-gray-400 mt-1 truncate">{apt.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Treatment Records</h3>
            {onCreateService && (
              <button
                onClick={() => setShowServiceModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Service
              </button>
            )}
          </div>
          <ServiceHistory services={services} onSelect={setEditingService} />
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Payment & Deposits</h3>
            {onMakePayment && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Make Payment
              </button>
            )}
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
            {loadingPayments ? (
              <div className="p-6 text-center text-sm text-gray-500">Loading payments...</div>
            ) : payments.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">No payment records found</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {payments.map((p) => {
                  const isExpanded = expandedPaymentId === p.id;
                  const methodColor =
                    p.method === 'cash' ? 'text-amber-600 bg-amber-50' :
                    p.method === 'bank_transfer' ? 'text-blue-600 bg-blue-50' :
                    p.method === 'deposit' ? 'text-emerald-600 bg-emerald-50' :
                    'text-gray-600 bg-gray-50';
                  return (
                    <div key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      <button
                        type="button"
                        onClick={() => setExpandedPaymentId(isExpanded ? null : p.id)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${methodColor}`}>
                            {p.method === 'bank_transfer' ? 'Bank' : p.method === 'deposit' ? 'Deposit' : 'Cash'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{formatVND(p.amount)}</p>
                            <p className="text-xs text-gray-400">{p.paymentDate || p.createdAt?.slice(0, 10)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {p.referenceCode && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{p.referenceCode}</span>
                          )}
                          {p.status === 'voided' && (
                            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">Voided</span>
                          )}
                          <span className={`text-xs text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4">
                          {p.notes && (
                            <p className="text-xs text-gray-500 mb-2">Note: {p.notes}</p>
                          )}
                          {(p.allocations && p.allocations.length > 0) ? (
                            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                              <p className="text-xs font-medium text-gray-600">Allocated to invoices:</p>
                              {p.allocations.map((a) => (
                                <div key={a.id} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-600">{a.invoiceName || a.invoiceId?.slice(0, 8)}</span>
                                    <span className="text-xs text-gray-400">Total {formatVND(a.invoiceTotal || 0)}</span>
                                  </div>
                                  <span className="font-medium text-gray-900">{formatVND(a.allocatedAmount)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">No invoice allocations recorded.</p>
                          )}
                          {(p.depositUsed || p.cashAmount || p.bankAmount) ? (
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              {(p.depositUsed || 0) > 0 && <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Deposit {formatVND(p.depositUsed || 0)}</span>}
                              {(p.cashAmount || 0) > 0 && <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Cash {formatVND(p.cashAmount || 0)}</span>}
                              {(p.bankAmount || 0) > 0 && <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Bank {formatVND(p.bankAmount || 0)}</span>}
                            </div>
                          ) : null}
                          {onMakePayment && (
                            <div className="mt-3 flex justify-end">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setEditingPayment(p); setExpandedPaymentId(null); }}
                                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                                Sửa
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DepositWallet
            depositBalance={profile.depositBalance}
            outstandingBalance={profile.outstandingBalance}
            onAddDeposit={onAddDeposit ? (amount, method, date, note) => onAddDeposit(profile.id, amount, method, date, note) : undefined}
            loading={loadingDeposits}
          />
          <DepositHistory transactions={depositTransactions} loading={loadingDeposits} />
        </div>
      )}

      {/* Appointment Modal */}
      {showAppointmentModal && (onCreateAppointment || (editingAppointment && onUpdateAppointment)) && (
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
            notes: editingAppointment.note ?? '',
          } : {
            customerId: profile.id,
            customerName: profile.name,
            customerPhone: profile.phone,
            locationId: profile.companyId,
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
          }}
        />
      )}

      {/* Service Modal */}
      {showServiceModal && onCreateService && (
        <ServiceForm
          customerId={profile.id}
          initialData={{
            customerId: profile.id,
            customerName: profile.name,
            locationId: profile.companyId,
          }}
          onSubmit={async (data) => {
            try {
              if (onCreateService) {
                await onCreateService({
                  catalogItemId: data.catalogItemId,
                  serviceName: data.serviceName,
                  doctorId: data.doctorId,
                  doctorName: data.doctorName,
                  locationId: data.locationId,
                  locationName: data.locationName,
                  startDate: data.startDate,
                  notes: data.notes,
                  totalCost: data.totalCost,
                  toothNumbers: data.toothNumbers,
                });
              }
              setShowServiceModal(false);
            } catch (error) {
              console.error('Failed to create service:', error);
            }
          }}
          onClose={() => setShowServiceModal(false)}
        />
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <ServiceForm
          customerId={profile.id}
          isEdit={true}
          initialData={{
            id: editingService.id,
            customerId: profile.id,
            customerName: profile.name,
            locationId: profile.companyId,
            serviceName: editingService.service,
            startDate: editingService.date,
            notes: editingService.notes || '',
            totalCost: editingService.cost,
            toothNumbers: editingService.tooth
              ? editingService.tooth.split(',').map((t) => t.trim()).filter(Boolean)
              : [],
          }}
          onSubmit={async (data) => {
            try {
              if (onCreateService) {
                await onCreateService({
                  catalogItemId: data.catalogItemId,
                  serviceName: data.serviceName,
                  doctorId: data.doctorId,
                  doctorName: data.doctorName,
                  locationId: data.locationId,
                  locationName: data.locationName,
                  startDate: data.startDate,
                  notes: data.notes,
                  totalCost: data.totalCost,
                  toothNumbers: data.toothNumbers,
                });
              }
              setEditingService(null);
            } catch (error) {
              console.error('Failed to update service:', error);
            }
          }}
          onClose={() => setEditingService(null)}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && onMakePayment && (
        <PaymentForm
          defaultCustomerName={profile.name}
          defaultCustomerId={profile.id}
          depositBalance={profile.depositBalance}
          outstandingBalance={profile.outstandingBalance}
          onSubmit={async (data) => {
            try {
              if (onMakePayment) {
                await onMakePayment(data);
              }
              setShowPaymentModal(false);
            } catch (error) {
              console.error('Failed to make payment:', error);
            }
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {/* Edit Payment Modal */}
      {editingPayment && onMakePayment && (
        <PaymentForm
          isEdit={true}
          defaultCustomerId={profile.id}
          defaultCustomerName={profile.name}
          defaultAmount={editingPayment.amount}
          defaultNotes={editingPayment.notes || ''}
          defaultPaymentDate={editingPayment.paymentDate || editingPayment.createdAt?.slice(0, 10)}
          defaultReferenceCode={editingPayment.referenceCode || ''}
          depositBalance={profile.depositBalance}
          outstandingBalance={profile.outstandingBalance}
          onSubmit={async (data) => {
            try {
              await onMakePayment(data);
              setEditingPayment(null);
            } catch (error) {
              console.error('Failed to update payment:', error);
            }
          }}
          onClose={() => setEditingPayment(null)}
        />
      )}
    </div>
  );
}
