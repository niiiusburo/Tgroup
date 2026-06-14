import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronRight, KeyRound, Loader, Pencil, Plus, Search, Users, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBusinessUnit } from '@/contexts/BusinessUnitContext';
import {
  createCtv,
  fetchCtvHierarchyForCtv,
  fetchCtvs,
  moveCtv,
  setCtvActive,
  updateCtv,
  type CtvHierarchyResponse,
  type CtvRecord,
  type UpdateCtvInput,
} from '@/lib/api/ctv';
import { CtvCreationForm, useCtvCreationForm } from '@/components/shared/CtvCreationForm';
import { ApiError } from '@/lib/api/core';
import { CtvHierarchyPanel } from '@/components/ctv/CtvHierarchyPanel';

/**
 * CtvManagementTab (and nested AddCtvModal / EditCtvModal) — admin CTV list + create/edit.
 * AddCtvModal now uses shared CtvCreationForm domain (mode 'admin').
 * This ensures admin create, portal-recruit, and public-join share validation, email-optional rule,
 * LOB dental-forced, specific per-field errors, and payload shape.
 *
 * @crossref:used-in[admin /commission or CTV mgmt tab for "Add CTV"; website/src/pages/Commission.tsx]
 * @crossref:uses[shared/CtvCreationForm (SSOT), createCtv from @/lib/api/ctv, useBusinessUnit for LOB context, website/src/components/ctv/CtvHierarchyPanel.tsx, website/src/lib/api/core.ts, product-map/domains/ctv.yaml]
 * @crossref:domain[ctv-creation — primary admin call site; see also CtvRecruitModal + JoinCtv]
 */

const TABLE_COL_COUNT = 9;

// Combining diacritical marks (U+0300–U+036F). Built from an ASCII string so the
// source contains no invisible combining characters.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

function isLegacyCtv(ctv: CtvRecord) {
  return ctv.source === 'legacy_ctv' || ctv.created_via?.startsWith('legacy_ctv_import');
}

/** Lowercase + strip Vietnamese diacritics so "kien" matches "Kiên" and "dang" matches "Đặng". */
function normalizeText(value: string | null | undefined): string {
  return (value || '')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
}

function SourceBadge({ ctv }: { ctv: CtvRecord }) {
  const { t } = useTranslation('commission');
  const legacy = isLegacyCtv(ctv);

  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={`px-2 py-1 text-xs rounded-full font-medium ${
          legacy
            ? 'bg-amber-100 text-amber-800'
            : 'bg-gray-100 text-gray-600'
        }`}
      >
        {legacy ? t('ctv.legacySource') : t('ctv.tmvSource')}
      </span>
      {legacy && ctv.legacy_code && (
        <span className="text-[11px] font-mono text-gray-500">{ctv.legacy_code}</span>
      )}
    </div>
  );
}

interface CtvRowProps {
  ctv: CtvRecord;
  onStatusChange: () => void;
  onEdit: (ctv: CtvRecord) => void;
  onResetPassword: (ctv: CtvRecord) => void;
  // §12 drag-drop hierarchy: drag a CTV row onto another to re-parent it under that CTV.
  draggedCtvId: string | null;
  onDragStartCtv: (id: string | null) => void;
  onMoveCtv: (draggedId: string, targetId: string) => void;
}

function CtvRow({ ctv, onStatusChange, onEdit, onResetPassword, draggedCtvId, onDragStartCtv, onMoveCtv }: CtvRowProps) {
  const { t: tc } = useTranslation('commission');
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentLOB } = useBusinessUnit();

  // Lazy, cached hierarchy expansion (downline + upline) for this CTV.
  const [expanded, setExpanded] = useState(false);
  const [hierarchy, setHierarchy] = useState<CtvHierarchyResponse | null>(null);
  const [hierLoading, setHierLoading] = useState(false);
  const [hierError, setHierError] = useState<string | null>(null);

  const loadHierarchy = async () => {
    setHierLoading(true);
    setHierError(null);
    try {
      const data = await fetchCtvHierarchyForCtv(ctv.id, currentLOB);
      setHierarchy(data);
    } catch (err) {
      setHierError(err instanceof ApiError ? err.message : tc('ctv.hierarchyError'));
    } finally {
      setHierLoading(false);
    }
  };

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !hierarchy && !hierLoading) {
      loadHierarchy();
    }
  };

  const handleToggleStatus = async () => {
    setToggling(true);
    setError(null);
    try {
      await setCtvActive(ctv.id, !ctv.active, currentLOB);
      // Drop the cached hierarchy so a re-expand reflects the change (e.g. renamed/suspended nodes).
      setHierarchy(null);
      onStatusChange();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update CTV status';
      setError(message);
    } finally {
      setToggling(false);
    }
  };

  const isDropTarget = !!draggedCtvId && draggedCtvId !== ctv.id;
  return (
    <>
      <tr
        className={`hover:bg-gray-50 ${draggedCtvId === ctv.id ? 'opacity-50' : ''} ${isDropTarget ? 'outline-dashed outline-1 outline-orange-300' : ''}`}
        draggable
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', ctv.id); e.dataTransfer.effectAllowed = 'move'; onDragStartCtv(ctv.id); }}
        onDragEnd={() => onDragStartCtv(null)}
        onDragOver={(e) => { if (isDropTarget) e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault();
          const dragged = e.dataTransfer.getData('text/plain') || draggedCtvId;
          if (dragged && dragged !== ctv.id) onMoveCtv(dragged, ctv.id);
          onDragStartCtv(null);
        }}
        title={tc('ctv.dragToMove', { defaultValue: 'Kéo một CTV thả vào đây để chuyển làm tuyến dưới' })}
      >
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={toggleExpanded}
            title={tc('ctv.viewHierarchy')}
            aria-expanded={expanded}
            className="flex items-center gap-1.5 text-left font-medium text-gray-900 hover:text-primary transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" />
            )}
            <span>{ctv.name}</span>
          </button>
        </td>
        <td className="px-4 py-3 text-gray-700">{ctv.phone || '-'}</td>
        <td className="px-4 py-3 text-gray-700">{ctv.email || '-'}</td>
        <td className="px-4 py-3 text-gray-700">{ctv.lob_scope?.join(', ') || '-'}</td>
        <td className="px-4 py-3 text-gray-700">{ctv.upline_name || '-'}</td>
        <td className="px-4 py-3">
          <SourceBadge ctv={ctv} />
        </td>
        <td className="px-4 py-3">
          <span
            className={`px-2 py-1 text-xs rounded-full font-medium ${
              ctv.is_live
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {ctv.is_live ? tc('ctv.isLive') : '-'}
          </span>
        </td>
        <td className="px-4 py-3">
          <span
            className={`px-2 py-1 text-xs rounded-full font-medium ${
              ctv.active
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {ctv.active ? tc('ctv.active') : tc('ctv.suspended')}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onEdit(ctv)}
              className="flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              <Pencil className="w-3.5 h-3.5" />
              {tc('ctv.edit')}
            </button>
            <button
              onClick={() => onResetPassword(ctv)}
              className="flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100"
              title={tc('ctv.resetPassword')}
            >
              <KeyRound className="w-3.5 h-3.5" />
              {tc('ctv.resetPassword')}
            </button>
            <button
              onClick={handleToggleStatus}
              disabled={toggling}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                ctv.active
                  ? 'bg-red-50 text-red-700 hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400'
                  : 'bg-green-50 text-green-700 hover:bg-green-100 disabled:bg-gray-100 disabled:text-gray-400'
              }`}
            >
              {toggling ? '...' : ctv.active ? tc('ctv.suspend') : tc('ctv.reactivate')}
            </button>
          </div>
          {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50/70">
          <td colSpan={TABLE_COL_COUNT} className="px-4 py-4">
            <CtvHierarchyPanel
              hierarchy={hierarchy}
              isLoading={hierLoading}
              error={hierError}
              onRetry={loadHierarchy}
            />
          </td>
        </tr>
      )}
    </>
  );
}

interface AddCtvModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AddCtvModal({ onClose, onSuccess }: AddCtvModalProps) {
  const { t } = useTranslation('common');
  const { t: tc } = useTranslation('commission');
  const [createdCtv, setCreatedCtv] = useState<CtvRecord | null>(null);
  const [createdPassword, setCreatedPassword] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const formApi = useCtvCreationForm({
    config: { mode: 'admin' },
    onSubmit: async (payload) => {
      const ctv = await createCtv({
        name: payload.name,
        phone: payload.phone,
        email: payload.email || undefined,
        password: payload.password,
        lob_scope: payload.lob_scope,
      });
      setCreatedCtv(ctv);
      setCreatedPassword(payload.password);
    },
  });
  // Auto-close only when credentials were NOT revealed (fallback guard).
  useEffect(() => {
    if (formApi.success && !createdCtv) {
      const id = setTimeout(() => {
        formApi.clearSuccess();
        onSuccess();
      }, 800);
      return () => clearTimeout(id);
    }
  }, [formApi, formApi.success, createdCtv, onSuccess]);
   const handleCopyAll = async () => {
    if (!createdCtv) return;
    const text = [
      `${tc('ctv.loginUrl')}: https://tmv.2checkin.com/login`,
      `${tc('ctv.loginWith')}: ${createdCtv.phone || createdCtv.email || ''}`,
      `${tc('ctv.newTempPassword')}: ${createdPassword}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      /* ignore clipboard errors */
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{tc('ctv.addCtv')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        {createdCtv ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                <Check className="w-7 h-7 text-emerald-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">{tc('ctv.credentialTitle')}</h4>
              <p className="text-sm text-gray-600">{tc('ctv.credentialSubtitle')}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{tc('ctv.name')}:</span>
                <span className="font-medium text-gray-900">{createdCtv.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{tc('ctv.phone')}:</span>
                <span className="font-medium text-gray-900">{createdCtv.phone || '-'}</span>
              </div>
              {createdCtv.email && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{tc('ctv.email')}:</span>
                  <span className="font-medium text-gray-900">{createdCtv.email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">{tc('ctv.newTempPassword')}:</span>
                <span className="font-mono font-bold text-gray-900">{createdPassword}</span>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleCopyAll}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                {copiedAll ? tc('ctv.copied') : tc('ctv.copyAll')}
              </button>
              <button
                onClick={() => { formApi.reset(); onSuccess(); }}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {tc('ctv.done')}
              </button>
            </div>
          </div>
        ) : (
          <CtvCreationForm
            hookResult={formApi}
            labels={{
              name: tc('ctv.name'),
              phone: tc('ctv.phone'),
              email: tc('ctv.email'),
              password: t('password', { ns: 'auth' }),
              lobs: tc('ctv.lobScope'),
              submit: t('save'),
              submitting: t('loading'),
            }}
            showLobs
            onCancel={onClose}
            submitLabel={t('save')}
            className="space-y-3"
          />
        )}
      </div>
    </div>
  );
}

interface EditCtvModalProps {
  ctv: CtvRecord;
  onClose: () => void;
  onSuccess: () => void;
}

function EditCtvModal({ ctv, onClose, onSuccess }: EditCtvModalProps) {
  const { t } = useTranslation('common');
  const { t: tc } = useTranslation('commission');
  const { currentLOB } = useBusinessUnit();
  const [name, setName] = useState(ctv.name || '');
  const [phone, setPhone] = useState(ctv.phone || '');
  const [email, setEmail] = useState(ctv.email || '');
  const [password, setPassword] = useState('');
  const [isLive, setIsLive] = useState(ctv.is_live === true);
  const [lobScope, setLobScope] = useState<string[]>(() => {
    const s = ctv.lob_scope || [];
    return Array.from(new Set(['dental', ...s]));
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Only send fields the admin actually filled in. Sending an empty phone/email
      // would be rejected by the API (they are login identifiers), which would make
      // a CTV that has no phone/email on record impossible to edit at all.
      const payload: UpdateCtvInput = { name: name.trim(), lob_scope: lobScope, is_live: isLive };
      if (phone.trim()) payload.phone = phone.trim();
      if (email.trim()) payload.email = email.trim();
      if (password.trim()) payload.password = password;
      await updateCtv(ctv.id, payload, currentLOB);
      onSuccess();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : tc('ctv.updateError');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLob = (lob: string) => {
    setLobScope((prev) => {
      const has = prev.includes(lob);
      let next = has ? prev.filter((l) => l !== lob) : [...prev, lob];
      // Always keep 'dental' (canonical auth row for CTVs)
      if (!next.includes('dental')) next = ['dental', ...next];
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{tc('ctv.editCtv')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">{tc('ctv.name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder={tc('ctv.namePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">{tc('ctv.phone')}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder={tc('ctv.phonePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">{tc('ctv.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder={tc('ctv.emailPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">{tc('ctv.newPassword')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder={tc('ctv.passwordPlaceholder')}
            />
            <p className="mt-1 text-xs text-gray-500">{tc('ctv.newPasswordHint')}</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div>
              <span className="block text-sm font-medium text-gray-900">{tc('ctv.isLive')}</span>
              <span className="text-xs text-gray-500">{tc('ctv.isLiveHint')}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsLive((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isLive ? 'bg-green-600' : 'bg-gray-300'
              }`}
              aria-pressed={isLive}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isLive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">{tc('ctv.lobScope')}</label>
            <div className="space-y-2">
              {['dental', 'cosmetic'].map((lob) => (
                <label key={lob} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lobScope.includes(lob)}
                    onChange={() => handleToggleLob(lob)}
                    disabled={lob === 'dental'}
                    className="w-4 h-4 rounded border-gray-300 text-primary disabled:opacity-60"
                  />
                  <span className="text-sm text-gray-700 capitalize">{lob}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              submitting || !name.trim()
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            {submitting ? t('loading') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
interface ResetPasswordModalProps {
  ctv: CtvRecord;
  onClose: () => void;
  onSuccess: () => void;
}
function ResetPasswordModal({ ctv, onClose, onSuccess }: ResetPasswordModalProps) {
  const { t } = useTranslation('common');
  const { t: tc } = useTranslation('commission');
  const { currentLOB } = useBusinessUnit();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 8; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
    return pw;
  };

  const handleReset = async () => {
    const pw = generateTempPassword();
    setLoading(true);
    setError(null);
    try {
      await updateCtv(ctv.id, { password: pw }, currentLOB);
      setResult(pw);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('ctv.updateError'));
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">{tc('ctv.resetPassword')}</h3>
        {!result ? (
          <>
            <p className="text-sm text-gray-600">
              {tc('ctv.resetPasswordConfirm', { name: ctv.name })}
            </p>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {loading ? t('loading') : tc('ctv.resetPasswordAction')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-green-700">{tc('ctv.resetPasswordSuccess')}</p>
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-amber-700 mb-1">{tc('ctv.newTempPassword')}</p>
              <p className="text-lg font-mono font-bold text-amber-900 select-all">{result}</p>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={copyPassword}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {copied ? tc('ctv.copied') : tc('ctv.copyAll')}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                {tc('ctv.done')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
export function CtvManagementTab() {
  const { t } = useTranslation('common');
  const { t: tc } = useTranslation('commission');
  const { currentLOB } = useBusinessUnit();
  const [ctvs, setCtvs] = useState<CtvRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCtv, setEditingCtv] = useState<CtvRecord | null>(null);
  const [resettingCtv, setResettingCtv] = useState<CtvRecord | null>(null);
  const [search, setSearch] = useState('');
  // §12 drag-drop hierarchy move state.
  const [draggedCtvId, setDraggedCtvId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moveInfo, setMoveInfo] = useState<string | null>(null);

  const legacyCount = useMemo(() => (ctvs || []).filter(isLegacyCtv).length, [ctvs]);
  const filtered = useMemo(() => {
    const list = ctvs || [];
    const query = normalizeText(search).trim();
    if (!query) return list;
    const terms = query.split(/\s+/).filter(Boolean);
    return list.filter((ctv) => {
      const haystack = normalizeText(
        [ctv.name, ctv.phone, ctv.email, ctv.upline_name, ctv.legacy_code].filter(Boolean).join(' ')
      );
      return terms.every((term) => haystack.includes(term));
    });
  }, [ctvs, search]);

  const handleLoad = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCtvs(undefined, currentLOB);
      setCtvs(data.ctvs);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load CTVs';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentLOB]);

  const handleMoveCtv = async (draggedId: string, targetId: string) => {
    setMoveError(null);
    setMoveInfo(null);
    if (!draggedId || draggedId === targetId) return;
    try {
      await moveCtv(draggedId, targetId);
      setMoveInfo(tc('hierarchy.moveSuccess', { defaultValue: 'CTV moved.' }));
      await handleLoad();
    } catch (err) {
      // 409 B_CTV_HAS_ACTIVITY surfaces here (CTV has referrals/services/earnings).
      setMoveError(err instanceof ApiError ? err.message : 'Failed to move CTV');
    }
  };

  useEffect(() => {
    handleLoad();
  }, [currentLOB, handleLoad]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card p-12 flex items-center justify-center gap-3 text-gray-600">
        <Loader className="w-5 h-5 animate-spin" />
        {t('loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card p-6 border-l-4 border-red-500">
        <div className="flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-900">{t('error')}</h4>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={handleLoad}
              className="mt-3 px-3 py-1 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
            >
              {tc('config.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!ctvs || ctvs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card p-12 text-center">
        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-600 font-medium mb-4">{tc('ctv.noCtvs')}</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
        >
          {tc('ctv.addFirstCtv')}
        </button>
        {showAddModal && <AddCtvModal onClose={() => setShowAddModal(false)} onSuccess={() => { handleLoad(); setShowAddModal(false); }} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          {tc('ctv.totalCount', { count: ctvs.length })} · {tc('ctv.legacyCount', { count: legacyCount })}
          {search.trim() && <> · {tc('ctv.matchCount', { count: filtered.length })}</>}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tc('ctv.searchPlaceholder')}
              aria-label={tc('ctv.searchPlaceholder')}
              className="w-64 max-w-full pl-9 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={t('clear')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            {tc('ctv.addCtv')}
          </button>
        </div>
      </div>

      {/* §12 drag-drop hierarchy: hint + move feedback */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-400">{tc('hierarchy.dragHint', { defaultValue: 'Tip: kéo một CTV và thả vào CTV khác để chuyển làm tuyến trên (chỉ với CTV chưa phát sinh hoạt động).' })}</span>
        {moveError && <span className="rounded bg-red-50 px-2 py-1 font-medium text-red-600">{moveError}</span>}
        {moveInfo && <span className="rounded bg-emerald-50 px-2 py-1 font-medium text-emerald-600">{moveInfo}</span>}
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('ctv.name')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('ctv.phone')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('ctv.email')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('ctv.lob')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('ctv.upline')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('ctv.source')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('ctv.isLive')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('ctv.status')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('ctv.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((ctv) => (
                <CtvRow
                  key={ctv.id}
                  ctv={ctv}
                  onStatusChange={() => handleLoad()}
                  onEdit={setEditingCtv}
                  onResetPassword={setResettingCtv}
                  draggedCtvId={draggedCtvId}
                  onDragStartCtv={setDraggedCtvId}
                  onMoveCtv={handleMoveCtv}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={TABLE_COL_COUNT} className="px-4 py-8 text-center text-gray-500">
                    {tc('ctv.noMatch')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && <AddCtvModal onClose={() => setShowAddModal(false)} onSuccess={() => { handleLoad(); setShowAddModal(false); }} />}
      {editingCtv && (
        <EditCtvModal
          ctv={editingCtv}
          onClose={() => setEditingCtv(null)}
          onSuccess={() => { handleLoad(); setEditingCtv(null); }}
        />
      )}
      {resettingCtv && (
        <ResetPasswordModal
          ctv={resettingCtv}
          onClose={() => setResettingCtv(null)}
          onSuccess={() => { handleLoad(); setResettingCtv(null); }}
        />
      )}
    </div>
  );
}
