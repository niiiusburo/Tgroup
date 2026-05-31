import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Loader, Pencil, Plus, Search, Users, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBusinessUnit } from '@/contexts/BusinessUnitContext';
import {
  createCtv,
  fetchCtvHierarchyForCtv,
  fetchCtvs,
  setCtvActive,
  updateCtv,
  type CreateCtvInput,
  type CtvHierarchyResponse,
  type CtvRecord,
  type UpdateCtvInput,
} from '@/lib/api/ctv';
import { ApiError } from '@/lib/api/core';
import { CtvHierarchyPanel } from '@/components/ctv/CtvHierarchyPanel';

const TABLE_COL_COUNT = 8;

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
}

function CtvRow({ ctv, onStatusChange, onEdit }: CtvRowProps) {
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

  return (
    <>
      <tr className="hover:bg-gray-50">
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
              ctv.active
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {ctv.active ? tc('ctv.active') : tc('ctv.suspended')}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(ctv)}
              className="flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              <Pencil className="w-3.5 h-3.5" />
              {tc('ctv.edit')}
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
  const [input, setInput] = useState<CreateCtvInput>({
    name: '',
    phone: '',
    email: '',
    password: '',
    lob_scope: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await createCtv(input);
      onSuccess();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create CTV';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLob = (lob: string) => {
    setInput({
      ...input,
      lob_scope: input.lob_scope?.includes(lob)
        ? input.lob_scope.filter((l) => l !== lob)
        : [...(input.lob_scope || []), lob],
    });
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

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">{tc('ctv.name')}</label>
            <input
              type="text"
              value={input.name}
              onChange={(e) => setInput({ ...input, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder={tc('ctv.namePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">{tc('ctv.phone')}</label>
            <input
              type="tel"
              value={input.phone}
              onChange={(e) => setInput({ ...input, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder={tc('ctv.phonePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">{tc('ctv.email')}</label>
            <input
              type="email"
              value={input.email}
              onChange={(e) => setInput({ ...input, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder={tc('ctv.emailPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">{t('password', { ns: 'auth' })}</label>
            <input
              type="password"
              value={input.password}
              onChange={(e) => setInput({ ...input, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder={tc('ctv.passwordPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">{tc('ctv.lobScope')}</label>
            <div className="space-y-2">
              {['dental', 'cosmetic'].map((lob) => (
                <label key={lob} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={input.lob_scope?.includes(lob) || false}
                    onChange={() => handleToggleLob(lob)}
                    className="w-4 h-4 rounded border-gray-300 text-primary"
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
            disabled={submitting || !input.name || !input.email || !input.password}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              submitting || !input.name || !input.email || !input.password
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Only send fields the admin actually filled in. Sending an empty phone/email
      // would be rejected by the API (they are login identifiers), which would make
      // a CTV that has no phone/email on record impossible to edit at all.
      const payload: UpdateCtvInput = { name: name.trim() };
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

export function CtvManagementTab() {
  const { t } = useTranslation('common');
  const { t: tc } = useTranslation('commission');
  const { currentLOB } = useBusinessUnit();
  const [ctvs, setCtvs] = useState<CtvRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCtv, setEditingCtv] = useState<CtvRecord | null>(null);
  const [search, setSearch] = useState('');

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

  const handleLoad = async () => {
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
  };

  useEffect(() => {
    handleLoad();
  }, [currentLOB]);

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
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('ctv.status')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('ctv.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((ctv) => (
                <CtvRow key={ctv.id} ctv={ctv} onStatusChange={() => handleLoad()} onEdit={setEditingCtv} />
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
    </div>
  );
}
