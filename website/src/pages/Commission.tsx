/**
 * Commission Page — Admin commission configuration and CTV management
 * @crossref:route[/commission]
 * @crossref:used-in[App, Employees, Reports]
 */

import { useState } from 'react';
import { Percent, Users, BarChart3, Loader, AlertCircle, X, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';
import { fetchCommissionConfig, saveCommissionConfig, type CommissionConfig, type CommissionLevel } from '@/lib/api/commission';
import { fetchCtvs, setCtvActive, createCtv, type CtvRecord, type CreateCtvInput } from '@/lib/api/ctv';
import { ApiError } from '@/lib/api/core';

type TabType = 'config' | 'ctvs';

export function Commission() {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState<TabType>('config');

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('commission', { ns: 'nav' })}
        subtitle={t('commission:subtitle')}
        icon={<Percent className="w-6 h-6 text-primary" />}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Commissions (MTD)', value: '₫12,450,000', icon: Percent, color: '#EC4899' },
          { label: 'Eligible Employees', value: '14', icon: Users, color: '#10B981' },
          { label: 'Avg. Commission Rate', value: '8.5%', icon: BarChart3, color: '#8B5CF6' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium text-gray-500">{stat.label}</div>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Segmented tab control */}
      <div className="flex gap-2 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
            activeTab === 'config'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Config
        </button>
        <button
          onClick={() => setActiveTab('ctvs')}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
            activeTab === 'ctvs'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          CTVs
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'config' && <ConfigTab />}
      {activeTab === 'ctvs' && <CtvTab />}
    </div>
  );
}

// ─── CONFIG TAB ────────────────────────────────────────────

function ConfigTab() {
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
        Loading commission config...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card p-6 border-l-4 border-red-500">
        <div className="flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-900">Error</h4>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={handleLoad}
              className="mt-3 px-3 py-1 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="bg-white rounded-xl shadow-card p-12 text-center text-gray-500">
        No commission config found
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
  const enabledLevels = config.levels.filter((l) => l.enabled);
  const enabledSum = enabledLevels.reduce((sum, l) => sum + l.share_percent, 0);
  const isValid = enabledSum <= 100;

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
        <label className="block text-sm font-medium text-gray-900">Global Default Referral %</label>
        <input
          type="number"
          min="0"
          max="100"
          value={config.defaultReferralPercent}
          onChange={(e) =>
            onConfigChange({
              ...config,
              defaultReferralPercent: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Levels table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Commission Levels</h3>
          <button
            onClick={handleAddLevel}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Level
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Level</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Label</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Enabled</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Share %</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
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
                      value={level.share_percent}
                      onChange={(e) =>
                        handleUpdateLevel(level.level, {
                          share_percent: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                        })
                      }
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
        <span className="text-gray-600">Enabled total: {enabledSum}%</span>
        {!isValid && <span className="text-red-600 font-medium">Enabled levels exceed 100%</span>}
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
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

// ─── CTV TAB ────────────────────────────────────────────

function CtvTab() {
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
        Loading CTVs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card p-6 border-l-4 border-red-500">
        <div className="flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-900">Error</h4>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={handleLoad}
              className="mt-3 px-3 py-1 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
            >
              Retry
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
        <p className="text-gray-600 font-medium mb-4">No CTVs yet</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
        >
          Add First CTV
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
          Add CTV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">LOB</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Upline</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
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
          {ctv.active ? 'Active' : 'Suspended'}
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
          {toggling ? '...' : ctv.active ? 'Suspend' : 'Reactivate'}
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
          <h3 className="text-lg font-semibold text-gray-900">Add New CTV</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Name</label>
            <input
              type="text"
              value={input.name}
              onChange={(e) => setInput({ ...input, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder="Enter name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Phone</label>
            <input
              type="tel"
              value={input.phone}
              onChange={(e) => setInput({ ...input, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder="Enter phone"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Email</label>
            <input
              type="email"
              value={input.email}
              onChange={(e) => setInput({ ...input, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder="Enter email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Password</label>
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
            Cancel
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
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
