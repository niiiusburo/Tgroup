import { useState } from 'react';
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Tag,
  User, AlertCircle, Edit2, Plus, Clock,
} from 'lucide-react';
import { DepositWallet } from '@/components/payment/DepositWallet';
import { DepositHistory } from '@/components/payment/DepositHistory';
import type { DepositTransaction } from '@/hooks/useDeposits';
import type { CustomerProfileData } from '@/hooks/useCustomerProfile';
import type { ApiAppointment } from '@/lib/api';

interface CustomerProfileProps {
  readonly profile: CustomerProfileData;
  readonly appointments: readonly ApiAppointment[];
  readonly depositTransactions?: DepositTransaction[];
  readonly onBack: () => void;
  readonly onEdit?: () => void;
  readonly onAddDeposit?: (amount: number, method: 'cash' | 'bank', note?: string) => Promise<void>;
  readonly loadingDeposits?: boolean;
}

type ProfileTab = 'profile' | 'appointments' | 'records' | 'payment';

const TABS: readonly { readonly value: ProfileTab; readonly label: string }[] = [
  { value: 'profile', label: 'Profile' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'records', label: 'Records' },
  { value: 'payment', label: 'Payment' },
];

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
}

export function CustomerProfile({ 
  profile, 
  appointments, 
  depositTransactions = [],
  onBack, 
  onEdit,
  onAddDeposit,
  loadingDeposits = false,
}: CustomerProfileProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');

  const getStatusConfig = (state: string | null | undefined) => {
    if (state === 'done') return { label: 'Completed', className: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' };
    if (state === 'cancelled' || state === 'cancel') return { label: 'Cancelled', className: 'text-red-600 bg-red-50', dot: 'bg-red-500' };
    if (state === 'no_show') return { label: 'No Show', className: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' };
    if (state === 'confirmed') return { label: 'Confirmed', className: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' };
    return { label: 'Scheduled', className: 'text-gray-600 bg-gray-50', dot: 'bg-gray-400' };
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
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.value ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
          </div>
          <div className="bg-white rounded-xl shadow-card p-6">
            {appointments.length === 0 ? (
              <p className="text-center py-8 text-gray-400">No appointments found</p>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 20).map((apt) => {
                  const statusConfig = getStatusConfig(apt.state ?? undefined);
                  const time = apt.time || apt.datetimeappointment?.slice(11, 16) || '00:00';
                  return (
                    <div key={apt.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                      <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{apt.partnername || apt.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${statusConfig.className}`}>{statusConfig.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{time}</span>
                          <span>{apt.doctorname || 'N/A'}</span>
                          <span>{formatDate(apt.date ?? '')}</span>
                        </div>
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
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Add Service
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-card p-6">
            <p className="text-sm text-gray-500 text-center py-8">
              Service records will be loaded from the database when available.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Payment & Deposits</h3>
          <DepositWallet
            depositBalance={profile.depositBalance}
            outstandingBalance={profile.outstandingBalance}
            onAddDeposit={onAddDeposit}
            loading={loadingDeposits}
          />
          <DepositHistory transactions={depositTransactions} loading={loadingDeposits} />
        </div>
      )}
    </div>
  );
}
