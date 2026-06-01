/**
 * Commission Page — Admin commission configuration and CTV management
 * @crossref:route[/commission]
 * @crossref:used-in[App, Employees, Reports]
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Percent, Loader, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';
import { fetchCommissionConfig, saveCommissionConfig, type CommissionConfig, type CommissionLevel } from '@/lib/api/commission';
import { ApiError } from '@/lib/api/core';
import { EarningsTab, PayoutsTab } from '@/components/commission/EarningsPayoutsTabs';
import { CtvManagementTab } from '@/components/commission/CtvManagementTab';
import { NewClientsTab } from '@/components/commission/NewClientsTab';
import { CommissionFlowTabs, type CommissionTabType } from '@/components/commission/CommissionFlowTabs';
import { isCommissionTab } from '@/components/commission/CommissionNavigation';
import { useBusinessUnit } from '@/contexts/BusinessUnitContext';

export function Commission() {
  const { t } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = isCommissionTab(searchParams.get('tab')) ? searchParams.get('tab') as CommissionTabType : 'config';

  const setActiveTab = useCallback((tab: CommissionTabType) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tab', tab);
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('commission', { ns: 'nav' })}
        subtitle={t('commission:subtitle')}
        icon={<Percent className="w-6 h-6 text-primary" />}
      />

      <CommissionFlowTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === 'config' && <ConfigTab />}
      {activeTab === 'ctvs' && <CtvManagementTab />}
      {activeTab === 'newClients' && <NewClientsTab />}
      {activeTab === 'earnings' && <EarningsTab />}
      {activeTab === 'payouts' && <PayoutsTab />}
    </div>
  );
}

// ─── CONFIG TAB ────────────────────────────────────────────

function ConfigTab() {
  const { t } = useTranslation('common');
  const { t: tc } = useTranslation('commission');
  const { currentLOB } = useBusinessUnit();
  const [config, setConfig] = useState<CommissionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleLoad = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCommissionConfig(currentLOB);
      setConfig(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load commission config';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentLOB]);

  // Load on mount and when LOB changes
  useEffect(() => {
    handleLoad();
  }, [handleLoad]);

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
  const { currentLOB } = useBusinessUnit();
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
      const saved = await saveCommissionConfig(config, currentLOB);
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
      {/* Commission is levels-only (v3): the global referral % was removed. */}

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
