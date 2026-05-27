import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function CtvThankYou() {
  const { t } = useTranslation('ctv');
  const location = useLocation();
  const name = (location.state as { name?: string } | null)?.name;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('thankYou.title', 'Registration Submitted')}
        </h1>
        <p className="text-gray-600 mb-6">
          {name
            ? t('thankYou.bodyWithName', 'Thank you, {{name}}! Your registration has been received and is being reviewed.', { name })
            : t('thankYou.body', 'Thank you! Your registration has been received and is being reviewed.')}
        </p>
        <Link
          to="/login"
          className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          {t('thankYou.goToLogin', 'Go to Login')}
        </Link>
      </div>
    </div>
  );
}
