import { User, Tag, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import type { CustomerProfileData } from '@/hooks/useCustomerProfile';

interface ProfileHeaderProps {
  profile: CustomerProfileData;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex-shrink-0">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">{profile.name.charAt(0)}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                profile.gender === 'female' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'
              }`}>
                <User className="w-3 h-3" />
                {profile.gender === 'male' ? 'Male' : 'Female'}
              </span>
            </div>
            {profile.code && (
              <span className="self-start inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <Tag className="w-3 h-3 text-slate-400" />
                {profile.code}
              </span>
            )}
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
                  {tag.includes('Allergy') ? <>❗</> : <Tag className="w-3 h-3" />}
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-col gap-3 sm:gap-3 flex-shrink-0 sm:text-right">
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
            <p className="text-sm font-bold text-emerald-600">{profile.depositBalance.toLocaleString('vi-VN')} ₫</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Outstanding</p>
            <p className="text-sm font-bold text-red-600">{profile.outstandingBalance.toLocaleString('vi-VN')} ₫</p>
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
  );
}
