/**
 * @crossref:domain[ctv]
 * @crossref:used-in[account settings panel rendered by website/src/pages/CTV/tabs/CtvMeTab.tsx (CTV portal "Me" tab)]
 * @crossref:uses[website/src/lib/api.ts (updateCtvSelfProfile, changeCtvSelfPassword), product-map/domains/ctv.yaml]
 */
import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LockKeyhole, Save } from 'lucide-react';

import { changeCtvSelfPassword, updateCtvSelfProfile, type CtvProfile } from '@/lib/api';

interface CtvAccountSettingsProps {
  readonly displayName: string;
  readonly onProfileUpdated?: (profile: CtvProfile) => void;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function CtvAccountSettings({ displayName, onProfileUpdated }: CtvAccountSettingsProps) {
  const { t } = useTranslation('ctv');

  function getErrorMessage(err: unknown) {
    if (err instanceof Error) return err.message;
    return t('errors.genericRetry');
  }
  const [nameValue, setNameValue] = useState(displayName);
  const [nameStatus, setNameStatus] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setNameValue(displayName);
  }, [displayName]);

  async function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = nameValue.trim().replace(/\s+/g, ' ');
    setNameError(null);
    setNameStatus(null);

    if (!nextName) {
      setNameError(t('me.profileRequired'));
      return;
    }

    setSavingName(true);
    try {
      const updated = await updateCtvSelfProfile({ name: nextName });
      onProfileUpdated?.(updated);
      setNameValue(updated.name);
      setNameStatus(t('me.profileSaved'));
    } catch (err) {
      setNameError(getErrorMessage(err));
    } finally {
      setSavingName(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordStatus(null);

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError(t('me.passwordRequired'));
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError(t('me.passwordMin'));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('me.passwordMismatch'));
      return;
    }

    setSavingPassword(true);
    try {
      await changeCtvSelfPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStatus(t('me.passwordSaved'));
    } catch (err) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <>
      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600">
            <Save className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900">{t('me.profileSettings')}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{t('me.profileHelp')}</p>
          </div>
        </div>

        <form onSubmit={handleNameSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="ctv-profile-name" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('me.displayName')}
            </label>
            <input
              id="ctv-profile-name"
              type="text"
              value={nameValue}
              onChange={(event) => setNameValue(event.target.value)}
              placeholder={t('me.displayNamePlaceholder')}
              autoComplete="name"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
            />
          </div>
          {nameError ? <p className="text-xs font-medium text-red-600">{nameError}</p> : null}
          {nameStatus ? <p className="text-xs font-medium text-emerald-600">{nameStatus}</p> : null}
          <button
            type="submit"
            disabled={savingName}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition active:scale-[0.99] disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {savingName ? t('actions.saving') : t('actions.saveName')}
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gray-50 text-gray-700">
            <LockKeyhole className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900">{t('me.security')}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{t('me.passwordHelp')}</p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="ctv-current-password" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('me.currentPassword')}
            </label>
            <input
              id="ctv-current-password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
              autoComplete="current-password"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
            />
          </div>
          <div>
            <label htmlFor="ctv-new-password" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('me.newPassword')}
            </label>
            <input
              id="ctv-new-password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
              autoComplete="new-password"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
            />
          </div>
          <div>
            <label htmlFor="ctv-confirm-password" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('me.confirmPassword')}
            </label>
            <input
              id="ctv-confirm-password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              autoComplete="new-password"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
            />
          </div>
          {passwordError ? <p className="text-xs font-medium text-red-600">{passwordError}</p> : null}
          {passwordStatus ? <p className="text-xs font-medium text-emerald-600">{passwordStatus}</p> : null}
          <button
            type="submit"
            disabled={savingPassword}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 transition active:scale-[0.99] disabled:opacity-60"
          >
            <LockKeyhole className="h-4 w-4" />
            {savingPassword ? t('actions.saving') : t('actions.changePassword')}
          </button>
        </form>
      </section>
    </>
  );
}
