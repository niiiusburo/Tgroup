import { useState } from 'react';
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Tag,
  User, AlertCircle, Edit2,
} from 'lucide-react';
import { PhotoGallery } from './PhotoGallery';
import { DepositCard } from './DepositCard';
import { AppointmentHistory } from './AppointmentHistory';
import { ServiceHistory } from './ServiceHistory';
import type { CustomerProfileData, CustomerPhoto, CustomerDeposit, CustomerAppointment, CustomerService } from '@/data/mockCustomerProfile';

/**
 * Customer Profile - Main profile layout with tabs
 * @crossref:used-in[Customers]
 */

interface CustomerProfileProps {
  readonly profile: CustomerProfileData;
  readonly photos: readonly CustomerPhoto[];
  readonly deposit: CustomerDeposit;
  readonly appointments: readonly CustomerAppointment[];
  readonly services: readonly CustomerService[];
  readonly onBack: () => void;
}

type ProfileTab = 'profile' | 'appointments' | 'records' | 'payment';

const TABS: readonly { readonly value: ProfileTab; readonly label: string }[] = [
  { value: 'profile', label: 'Profile' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'records', label: 'Records' },
  { value: 'payment', label: 'Payment' },
];

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' \u20ab';
}

export function CustomerProfile({ profile, photos, deposit, appointments, services, onBack }: CustomerProfileProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Customer Profile</h1>
          <p className="text-sm text-gray-500">View and manage patient details</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {profile.name.charAt(0)}
              </span>
            </div>
          </div>

          {/* Info */}
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
                {profile.phone}
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                {profile.email}
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                {profile.address}
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                DOB: {profile.dateOfBirth}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.tags.map((tag) => (
                <span
                  key={tag}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    tag.includes('Allergy')
                      ? 'bg-red-50 text-red-600'
                      : tag === 'VIP'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tag.includes('Allergy') ? (
                    <AlertCircle className="w-3 h-3" />
                  ) : (
                    <Tag className="w-3 h-3" />
                  )}
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
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
              <p className="text-xs text-gray-400">Total spent</p>
              <p className="text-sm font-bold text-primary">{formatVND(profile.totalSpent)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Last visit</p>
              <p className="text-sm font-medium text-gray-900">{profile.lastVisit}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
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
                activeTab === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Personal Info Card */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Full Name</p>
                <p className="text-sm font-medium text-gray-900">{profile.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p className="text-sm font-medium text-gray-900">{profile.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-900">{profile.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Date of Birth</p>
                <p className="text-sm font-medium text-gray-900">{profile.dateOfBirth}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Gender</p>
                <p className="text-sm font-medium text-gray-900">{profile.gender === 'male' ? 'Male' : 'Female'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Address</p>
                <p className="text-sm font-medium text-gray-900">{profile.address}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Location</p>
                <p className="text-sm font-medium text-gray-900">{profile.locationName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Member Since</p>
                <p className="text-sm font-medium text-gray-900">{profile.memberSince}</p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-card p-4 border-l-4 border-primary">
              <p className="text-xs text-gray-400">Total Visits</p>
              <p className="text-xl font-bold text-gray-900">{profile.totalVisits}</p>
            </div>
            <div className="bg-white rounded-xl shadow-card p-4 border-l-4 border-green-500">
              <p className="text-xs text-gray-400">Deposit Balance</p>
              <p className="text-xl font-bold text-green-600">{formatVND(deposit.balance)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-card p-4 border-l-4 border-blue-500">
              <p className="text-xs text-gray-400">Total Spent</p>
              <p className="text-xl font-bold text-blue-600">{formatVND(profile.totalSpent)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-card p-4 border-l-4 border-gray-400">
              <p className="text-xs text-gray-400">Last Visit</p>
              <p className="text-xl font-bold text-gray-700">{profile.lastVisit}</p>
            </div>
          </div>

          {/* Photo Gallery */}
          <PhotoGallery photos={photos} />

          {/* Recent Activity Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AppointmentHistory appointments={appointments.slice(0, 3)} />
            <ServiceHistory services={services.slice(0, 3)} />
          </div>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">All Appointments</h3>
            <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm">
              + Add Appointment
            </button>
          </div>
          <AppointmentHistory appointments={appointments} />
        </div>
      )}

      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Treatment Records</h3>
            <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm">
              + Add Service
            </button>
          </div>
          <ServiceHistory services={services} />
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Payment & Deposits</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DepositCard deposit={deposit} />
            <div className="bg-white rounded-xl shadow-card p-6">
              <p className="text-sm text-gray-500">Outstanding balances and payment history will be integrated here.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
