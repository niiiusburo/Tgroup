import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SignaturePad } from '@/components/ctv/SignaturePad';
import { TermsViewer } from '@/components/ctv/TermsViewer';
import { OcrUploader } from '@/components/ctv/OcrUploader';
import { fetchSignupTerms, checkReferrerPhone, submitCtvSignup } from '@/lib/api/ctvSignup';
import type { SignupTerms } from '@/lib/api/ctvSignup';

export default function CtvSignup() {
  const { t, i18n } = useTranslation('ctv');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terms, setTerms] = useState<SignupTerms | null>(null);
  const [referrerInfo, setReferrerInfo] = useState<{ name: string; phone: string } | null>(null);

  const [form, setForm] = useState({
    phone: '',
    name: '',
    email: '',
    dob: '',
    address: '',
    idNumber: '',
    password: '',
    confirmPassword: '',
    referrerPhone: '',
    signatureImage: null as string | null,
    termsAccepted: false,
  });

  // Fetch terms on mount
  useEffect(() => {
    fetchSignupTerms(i18n.language === 'vi' ? 'vi' : 'en')
      .then(setTerms)
      .catch(() => setError(t('signup.termsLoadError')));
  }, [i18n.language, t]);

  const handleChange = useCallback(
    (field: string, value: string) => {
      setForm((f) => ({ ...f, [field]: value }));
    },
    []
  );

  const handleReferrerLookup = useCallback(async () => {
    if (!form.referrerPhone.trim()) return;
    try {
      const result = await checkReferrerPhone(form.referrerPhone.trim());
      if (result.found && result.name && result.phone) {
        setReferrerInfo({ name: result.name, phone: result.phone });
      } else {
        setReferrerInfo(null);
      }
    } catch {
      setReferrerInfo(null);
    }
  }, [form.referrerPhone]);

  const handleOcrExtract = useCallback(
    (data: { name?: string; dob?: string; idNumber?: string }) => {
      setForm((f) => ({
        ...f,
        name: data.name || f.name,
        dob: data.dob || f.dob,
        idNumber: data.idNumber || f.idNumber,
      }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!form.termsAccepted) {
        setError(t('signup.termsRequired'));
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError(t('signup.passwordMismatch'));
        return;
      }
      if (form.password.length < 6) {
        setError(t('signup.passwordTooShort'));
        return;
      }
      if (!form.signatureImage) {
        setError(t('signup.signatureRequired'));
        return;
      }

      setLoading(true);
      try {
        const result = await submitCtvSignup({
          phone: form.phone,
          name: form.name,
          email: form.email || undefined,
          dob: form.dob || undefined,
          address: form.address || undefined,
          idNumber: form.idNumber || undefined,
          password: form.password,
          referrerPhone: form.referrerPhone || undefined,
          signatureImage: form.signatureImage,
          signupTermsId: terms?.id,
        });
        if (result.success) {
          navigate('/ctv/thank-you', { state: { name: form.name } });
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [form, terms, t, navigate]
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {t('signup.title')}
          </h1>
          <p className="text-sm text-gray-500 text-center mb-8">
            {t('signup.subtitle')}
          </p>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* OCR Upload */}
            <OcrUploader onExtract={handleOcrExtract} disabled={loading} />

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('signup.phone')} *
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="0xxxxxxxxxx"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('signup.name')} *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('signup.email')}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* DOB */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('signup.dob')}
              </label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => handleChange('dob', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('signup.address')}
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* ID Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('signup.idNumber')}
              </label>
              <input
                type="text"
                value={form.idNumber}
                onChange={(e) => handleChange('idNumber', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Referrer Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('signup.referrerPhone')}
              </label>
              <div className="flex gap-2 mt-1">
                <input
                  type="tel"
                  value={form.referrerPhone}
                  onChange={(e) => handleChange('referrerPhone', e.target.value)}
                  placeholder="0xxxxxxxxxx"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleReferrerLookup}
                  disabled={loading}
                  className="shrink-0 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  {t('signup.checkReferrer')}
                </button>
              </div>
              {referrerInfo && (
                <p className="mt-1 text-xs text-green-600">
                  {t('signup.referrerFound', { name: referrerInfo.name, phone: referrerInfo.phone })}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('signup.password')} *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('signup.confirmPassword')} *
              </label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Signature */}
            <SignaturePad
              onChange={(sig) => setForm((f) => ({ ...f, signatureImage: sig }))}
            />

            {/* Terms */}
            {terms && (
              <TermsViewer
                title={terms.title}
                contentHtml={terms.contentHtml}
                accepted={form.termsAccepted}
                onAccept={(acc) => setForm((f) => ({ ...f, termsAccepted: acc }))}
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? t('signup.submitting') : t('signup.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
