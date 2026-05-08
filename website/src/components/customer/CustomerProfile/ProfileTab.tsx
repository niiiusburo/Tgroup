import { useTranslation } from 'react-i18next';
import { HealthCheckupGallery } from '../HealthCheckupGallery';
import type { ProfileTabProps } from './types';

export function ProfileTab({
  profile,
  checkupData,
  checkupsLoading,
  checkupsError,
  onRefetchCheckups,
  canViewHealthCheckups,
  canCreateExternalPatient,
  canUploadHealthCheckups,
}: ProfileTabProps) {
  const { t } = useTranslation('customers');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('profileSection.personalInfo', { ns: 'customers' })}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400">{t('form.fullName', { ns: 'customers' })}</p>
            <p className="text-sm font-medium text-gray-900">{profile.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">{t('form.phone', { ns: 'customers' })}</p>
            <p className="text-sm font-medium text-gray-900">{profile.phone || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">{t('form.email', { ns: 'customers' })}</p>
            <p className="text-sm font-medium text-gray-900">{profile.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">{t('form.dateOfBirth', { ns: 'customers' })}</p>
            <p className="text-sm font-medium text-gray-900">{profile.dateOfBirth}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">{t('form.gender', { ns: 'customers' })}</p>
            <p className="text-sm font-medium text-gray-900">
              {profile.gender === 'male' ? t('form.male', { ns: 'customers' }) : t('form.female', { ns: 'customers' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">{t('form.address', { ns: 'customers' })}</p>
            <p className="text-sm font-medium text-gray-900">{profile.address || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">{t('form.location', { ns: 'customers' })}</p>
            <p className="text-sm font-medium text-gray-900">{profile.companyName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">{t('memberSince', { ns: 'customers' })}</p>
            <p className="text-sm font-medium text-gray-900">{profile.memberSince}</p>
          </div>
        </div>
      </div>

      {canViewHealthCheckups && (
        <HealthCheckupGallery
          data={checkupData ?? null}
          isLoading={checkupsLoading}
          error={checkupsError}
          customerCode={profile.code}
          onUploaded={onRefetchCheckups}
          canCreateExternalPatient={canCreateExternalPatient}
          canUploadCheckups={canUploadHealthCheckups}
        />
      )}
    </div>
  );
}
