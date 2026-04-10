import { useState } from 'react';
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Tag,
  User, AlertCircle, Edit2, Plus, Clock, CalendarPlus,
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
import type { ApiAppointment } from '@/lib/api';

interface CustomerProfileProps {
  readonly profile: CustomerProfileData;
  readonly appointments: readonly ApiAppointment[];
  readonly services?: readonly CustomerService[];
  readonly depositTransactions?: DepositTransaction[];
  readonly activeTab?: ProfileTab;
  readonly onTabChange?: (tab: ProfileTab) => void;
  readonly onBack: () => void;
  readonly onEdit?: () => void;
  readonly onAddDeposit?: (customerId: string, amount: number, method: 'cash' | 'bank' | 'vietqr', note?: string) => Promise<void>;
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
  readonly loadingDeposits?: boolean;
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
  { value: 'payment', label: 'Payment', getCount: (p) => p.depositTransactions?.length ?? 0 },
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
  activeTab: controlledActiveTab,
  onTabChange,
  onBack,
  onEdit,
  onAddDeposit,
  onCreateAppointment,
  onUpdateAppointment,
  onCreateService,
  onMakePayment,
  loadingDeposits = false,
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
              onBack,
              onEdit,
              onAddDeposit,
              onCreateAppointment,
              onUpdateAppointment,
              onCreateService,
              onMakePayment,
              loadingDeposits,
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
                      {isEditable && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingAppointment(apt); setShowAppointmentModal(true); }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="Edit appointment"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
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
          <ServiceHistory services={services} />
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
          <DepositWallet
            depositBalance={profile.depositBalance}
            outstandingBalance={profile.outstandingBalance}
            onAddDeposit={onAddDeposit ? (amount, method, note) => onAddDeposit(profile.id, amount, method, note) : undefined}
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
    </div>
  );
}
