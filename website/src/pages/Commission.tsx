/**
 * Commission Page — Admin commission configuration and CTV management
 * @crossref:route[/commission]
 * @crossref:used-in[App, Employees, Reports]
 */

import { useState } from 'react';
import { Percent, Users, Loader, AlertCircle, X, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';
import { fetchCommissionConfig, saveCommissionConfig, type CommissionConfig, type CommissionLevel } from '@/lib/api/commission';
import { fetchCtvs, setCtvActive, createCtv, type CtvRecord, type CreateCtvInput } from '@/lib/api/ctv';
import { ApiError } from '@/lib/api/core';
import { EarningsTab, PayoutsTab } from '@/components/commission/EarningsPayoutsTabs';

type TabType = 'config' | 'ctvs' | 'earnings' | 'payouts';

export function Commission() {
  const { t } = useTranslation('common');
  const { t: tc } = useTranslation('commission');
  const [activeTab, setActiveTab] = useState<TabType>('config');

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('commission', { ns: 'nav' })}
        subtitle={t('commission:subtitle')}
        icon={<Percent className="w-6 h-6 text-primary" />}
      />

      {/* Segmented tab control */}
      <div className="flex gap-2 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          ['config', tc('tabs.config')],
          ['ctvs', tc('tabs.ctvs')],
          ['earnings', tc('tabs.earnings')],
          ['payouts', tc('tabs.payouts')],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as TabType)}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
              activeTab === key
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'config' && <ConfigTab />}
      {activeTab === 'ctvs' && <CtvTab />}
      {activeTab === 'earnings' && <EarningsTab />}
      {activeTab === 'payouts' && <PayoutsTab />}
    </div>
  );
}

// ─── CONFIG TAB ────────────────────────────────────────────

function ConfigTab() {
  const { t } = useTranslation('common');
  const { t: tc } = useTranslation('commission');
  const [config, setConfig] = useState<CommissionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCommissionConfig();
      setConfig(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load commission config';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  const [hasLoaded, setHasLoaded] = useState(false);
  if (!hasLoaded) {
    setHasLoaded(true);
    handleLoad();
  }

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

  if (!config) {
    return (
      <div className="bg-white rounded-xl shadow-card p-12 text-center text-gray-500">
        {tc('config.loadError')}
      </div>
    );
  }

  return (
    <>
      {saveError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {saveError}
        </div>
      )}
      <ConfigTabContent config={config} onConfigChange={setConfig} onSaveError={setSaveError} saving={saving} setSaving={setSaving} />
    </>
  );
}

interface ConfigTabContentProps {
  config: CommissionConfig;
  onConfigChange: (cfg: CommissionConfig) => void;
  onSaveError: (err: string | null) => void;
  saving: boolean;
  setSaving: (s: boolean) => void;
}

function ConfigTabContent({ config, onConfigChange, onSaveError, saving, setSaving }: ConfigTabContentProps) {
  const { t: tc } = useTranslation('commission');
  const enabledLevels = config.levels.filter((l) => l.enabled);
  const enabledSum = enabledLevels.reduce((sum, l) => sum + l.share_percent, 0);
  const isValid = enabledSum <= 100;

  // Raw text drafts so the user can type freely (decimals, clearing the field)
  // without parse-and-clamp on every keystroke fighting them. Key 'default' is
  // the global percent; 'level-N' is each level's share. Cleared on blur.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draftValue = (key: string, modelValue: number) =>
    drafts[key] !== undefined ? drafts[key] : String(modelValue);
  const clampPercent = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
  const commitDraft = (key: string) => setDrafts((d) => { const { [key]: _omit, ...rest } = d; return rest; });

  const handleAddLevel = () => {
    const nextLevel = Math.max(...config.levels.map((l) => l.level), -1) + 1;
    onConfigChange({
      ...config,
      levels: [
        ...config.levels,
        {
          level: nextLevel,
          label: `Level ${nextLevel}`,
          enabled: true,
          share_percent: 0,
        },
      ],
    });
  };

  const handleUpdateLevel = (level: number, updates: Partial<CommissionLevel>) => {
    onConfigChange({
      ...config,
      levels: config.levels.map((l) => (l.level === level ? { ...l, ...updates } : l)),
    });
  };

  const handleDeleteLevel = (level: number) => {
    onConfigChange({
      ...config,
      levels: config.levels.filter((l) => l.level !== level),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    onSaveError(null);
    try {
      const saved = await saveCommissionConfig(config);
      onConfigChange(saved);
      // Success feedback (no toast library, so inline message via save state)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save commission config';
      onSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-6 space-y-6">
      {/* Global referral percent */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">{tc('config.globalReferralPercent')}</label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          inputMode="decimal"
          value={draftValue('default', config.defaultReferralPercent)}
          onChange={(e) => {
            setDrafts((d) => ({ ...d, default: e.target.value }));
            onConfigChange({ ...config, defaultReferralPercent: clampPercent(parseFloat(e.target.value)) });
          }}
          onBlur={() => { commitDraft('default'); onConfigChange({ ...config, defaultReferralPercent: clampPercent(config.defaultReferralPercent) }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Levels table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">{tc('config.commissionLevels')}</h3>
          <button
            onClick={handleAddLevel}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            {tc('config.addLevel')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('config.level')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('config.label')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('config.enabled')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('config.sharePercent')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('config.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {config.levels.map((level) => (
                <tr key={level.level} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{level.level}</td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={level.label}
                      onChange={(e) => handleUpdateLevel(level.level, { label: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={level.enabled}
                      onChange={(e) => handleUpdateLevel(level.level, { enabled: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      inputMode="decimal"
                      value={draftValue(`level-${level.level}`, level.share_percent)}
                      onChange={(e) => {
                        setDrafts((d) => ({ ...d, [`level-${level.level}`]: e.target.value }));
                        handleUpdateLevel(level.level, { share_percent: clampPercent(parseFloat(e.target.value)) });
                      }}
                      onBlur={() => { commitDraft(`level-${level.level}`); handleUpdateLevel(level.level, { share_percent: clampPercent(level.share_percent) }); }}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDeleteLevel(level.level)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation message */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">{tc('config.enabledTotal')}: {enabledSum}%</span>
        {!isValid && <span className="text-red-600 font-medium">{tc('config.exceeds100')}</span>}
      </div>

      {/* Save error */}
      {/* Using external onSaveError prop from parent */}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!isValid || saving}
        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
          !isValid || saving
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
            : 'bg-primary text-white hover:bg-primary-dark'
        }`}
      >
        {saving ? tc('config.saving') : tc('config.save')}
      </button>
    </div>
  );
}

// ─── CTV TAB ────────────────────────────────────────────

function CtvTab() {
  const { t } = useTranslation('common');
  const { t: tc } = useTranslation('commission');
  const [ctvs, setCtvs] = useState<CtvRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCtvs();
      setCtvs(data.ctvs);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load CTVs';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  const [hasLoaded, setHasLoaded] = useState(false);
  if (!hasLoaded) {
    setHasLoaded(true);
    handleLoad();
  }

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
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          {tc('ctv.addCtv')}
        </button>
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('ctv.status')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tc('ctv.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ctvs.map((ctv) => (
                <CtvRow key={ctv.id} ctv={ctv} onStatusChange={() => handleLoad()} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && <AddCtvModal onClose={() => setShowAddModal(false)} onSuccess={() => { handleLoad(); setShowAddModal(false); }} />}
    </div>
  );
}

interface CtvRowProps {
  ctv: CtvRecord;
  onStatusChange: () => void;
}

function CtvRow({ ctv, onStatusChange }: CtvRowProps) {
  const { t: tc } = useTranslation('commission');
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleStatus = async () => {
    setToggling(true);
    setError(null);
    try {
      await setCtvActive(ctv.id, !ctv.active);
      onStatusChange();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update CTV status';
      setError(message);
    } finally {
      setToggling(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-gray-900 font-medium">{ctv.name}</td>
      <td className="px-4 py-3 text-gray-700">{ctv.phone || '—'}</td>
      <td className="px-4 py-3 text-gray-700">{ctv.email || '—'}</td>
      <td className="px-4 py-3 text-gray-700">{ctv.lob_scope?.join(', ') || '—'}</td>
      <td className="px-4 py-3 text-gray-700">{ctv.upline_name || '—'}</td>
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
        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      </td>
    </tr>
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

        {/* Form fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">{tc('ctv.name')}</label>
            <input
              type="text"
              value={input.name}
              onChange={(e) => setInput({ ...input, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder="Enter name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">{tc('ctv.phone')}</label>
            <input
              type="tel"
              value={input.phone}
              onChange={(e) => setInput({ ...input, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder="Enter phone"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">{tc('ctv.email')}</label>
            <input
              type="email"
              value={input.email}
              onChange={(e) => setInput({ ...input, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder="Enter email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">{t('password', { ns: 'auth' })}</label>
            <input
              type="password"
              value={input.password}
              onChange={(e) => setInput({ ...input, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder="Enter password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">LOB Scope</label>
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

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
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
