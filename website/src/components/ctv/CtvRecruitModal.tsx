import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { createCtv } from '@/lib/api/ctv';
import { CTV_CREATE_AUTO_CLOSE_MS } from '@/constants';
import { CtvModalSheet } from './CtvModalSheet';
import { CtvCreationForm, useCtvCreationForm } from '@/components/shared/CtvCreationForm';

/**
 * CtvRecruitModal — CTV logged-in portal "recruit/refer a new CTV" sheet.
 * Now delegates entirely to the shared CtvCreationForm + useCtvCreationForm (mode: 'portal-recruit').
 * Email optional (consistent with admin Add + public Join); per-field errors + specific messages.
 *
 * @crossref:used-in[CTV portal recruit flow (logged-in CTV creating downline); website/src/pages/CTV/CtvDashboard.tsx]
 * @crossref:uses[shared/CtvCreationForm (SSOT for validation, LOB dental-forced, payload shape, error UI), createCtv, CtvModalSheet, product-map/domains/ctv.yaml]
 * @crossref:domain[ctv-creation — one of 3 call sites; change here or in hook affects all via import]
 */

interface CtvRecruitModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

export function CtvRecruitModal({ open, onClose, onSuccess }: CtvRecruitModalProps) {
  const { t } = useTranslation('ctv');

  const formApi = useCtvCreationForm({
    config: { mode: 'portal-recruit' }, // email optional by default (converged); dental forced
    onSubmit: async (payload) => {
      await createCtv({
        name: payload.name,
        phone: payload.phone,
        email: payload.email || undefined,
        password: payload.password,
        lob_scope: payload.lob_scope,
      });
    },
  });

  // Auto-notify parent on success (refreshes network list etc). UI checkmark shown inline until manual close.
  useEffect(() => {
    if (formApi.success) {
      const id = setTimeout(() => {
        onSuccess();
      }, CTV_CREATE_AUTO_CLOSE_MS);
      return () => clearTimeout(id);
    }
  }, [formApi.success, onSuccess]);

  // Reset on close (matches prior useEffect behavior)
  useEffect(() => {
    if (!open) {
      formApi.reset();
    }
  }, [open, formApi]);

  if (!open) return null;

  return (
    <CtvModalSheet title={t('forms.recruitCtv.title')} closeLabel={t('forms.close')} onClose={onClose}>
      {formApi.success ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-7 w-7" />
          </span>
          <p className="text-sm font-bold text-gray-900">{t('forms.recruitCtv.success')}</p>
        </div>
      ) : (
        <CtvCreationForm
          hookResult={formApi}
          labels={{
            name: t('forms.recruitCtv.name'),
            phone: t('forms.recruitCtv.phone'),
            email: t('forms.recruitCtv.email'),
            password: t('forms.recruitCtv.password'),
            lobs: t('forms.recruitCtv.lobs'),
            submit: t('forms.recruitCtv.submit'),
            submitting: t('forms.recruitCtv.submitting'),
          }}
          showLobs
          onCancel={onClose}
          submitLabel={t('forms.recruitCtv.submit')}
          className="space-y-4"
        />
      )}
    </CtvModalSheet>
  );
}
