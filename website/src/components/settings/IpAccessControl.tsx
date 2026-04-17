/**
 * IP Access Control Component - Settings panel for managing IP whitelist/blacklist
 * @crossref:used-in[Settings]
 * @crossref:uses[useIpAccessControl]
 */

import React, { useState, useMemo } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Check,
  X,
  AlertCircle,
  Globe,
  Lock,
  Unlock,
  Server,
  Ban,
  Loader2,
} from 'lucide-react';
import { useIpAccessControl } from '@/hooks/useIpAccessControl';
import type { IpEntryType, IpEntry } from '@/types/ipAccessControl';

/**
 * IP Access Control Settings Component
 * Allows administrators to manage IP whitelist and blacklist
 */
export function IpAccessControl() {
  const {
    mode,
    setMode,
    entries,
    stats,
    loading,
    error: hookError,
    addEntry,
    removeEntry,
    toggleEntryActive,
  } = useIpAccessControl();

  // Form state
  const [ipInput, setIpInput] = useState('');
  const [selectedType, setSelectedType] = useState<IpEntryType>('whitelist');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<'all' | 'whitelist' | 'blacklist'>('all');

  // Filtered entries
  const filteredEntries = useMemo(() => {
    if (activeFilter === 'all') return entries;
    return entries.filter((e) => e.type === activeFilter);
  }, [entries, activeFilter]);

  // Handle add entry
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!ipInput.trim()) {
      setFormError('Please enter an IP address');
      return;
    }

    setActionLoading(true);
    const result = await addEntry(ipInput, selectedType, description);
    setActionLoading(false);

    if (result.success) {
      setIpInput('');
      setDescription('');
    } else {
      setFormError(result.error || 'Failed to add entry');
    }
  };

  // Handle remove with confirmation
  const handleRemove = async (entry: IpEntry) => {
    if (!window.confirm(`Are you sure you want to remove ${entry.ipAddress}?`)) return;
    setActionLoading(true);
    await removeEntry(entry.id);
    setActionLoading(false);
  };

  // Handle toggle
  const handleToggle = async (id: string) => {
    setActionLoading(true);
    await toggleEntryActive(id);
    setActionLoading(false);
  };

  // Mode options
  const modeOptions = [
    {
      value: 'allow_all' as const,
      label: 'Allow All',
      description: 'No IP restrictions - all addresses can access',
      icon: Unlock,
    },
    {
      value: 'block_all' as const,
      label: 'Block All',
      description: 'Deny access from all IP addresses',
      icon: Ban,
    },
    {
      value: 'whitelist_only' as const,
      label: 'Whitelist Only',
      description: 'Only allow access from whitelisted IPs',
      icon: Lock,
    },
    {
      value: 'blacklist_block' as const,
      label: 'Blacklist Block',
      description: 'Block access from blacklisted IPs only',
      icon: Shield,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-gray-600">Loading IP access settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hookError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {hookError}
        </div>
      )}

      {/* Mode Selector */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-6 py-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Access Control Mode
          </label>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <label
                  key={option.value}
                  className={`relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    mode === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="accessMode"
                    value={option.value}
                    checked={mode === option.value}
                    onChange={(e) => setMode(e.target.value as typeof mode)}
                    className="sr-only"
                    aria-label={option.label}
                  />
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${mode === option.value ? 'text-primary' : 'text-gray-400'}`} />
                    <span className={`font-medium ${mode === option.value ? 'text-primary' : 'text-gray-700'}`}>
                      {option.label}
                    </span>
                    {mode === option.value && (
                      <Check className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{option.description}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEntries}</p>
              <p className="text-xs text-gray-500">Total Entries</p>
            </div>
            <Server className="w-8 h-8 text-gray-300" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.whitelistCount}</p>
              <p className="text-xs text-gray-500">Whitelist</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.blacklistCount}</p>
              <p className="text-xs text-gray-500">Blacklist</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <X className="w-4 h-4 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.activeCount}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Globe className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Add Entry Form */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-900">Add New IP Entry</h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleAddEntry} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="ip-address" className="block text-sm font-medium text-gray-700 mb-1">
                IP Address
              </label>
              <input
                id="ip-address"
                type="text"
                value={ipInput}
                onChange={(e) => {
                  setIpInput(e.target.value);
                  setFormError(null);
                }}
                placeholder="e.g., 192.168.1.100"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary ${
                  formError ? 'border-red-300' : 'border-gray-200'
                }`}
              />
              {formError && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formError}
                </p>
              )}
            </div>

            <div className="w-40">
              <label htmlFor="ip-type" className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                id="ip-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as IpEntryType)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="whitelist">Whitelist</option>
                <option value="blacklist">Blacklist</option>
              </select>
            </div>

            <div className="flex-[2] min-w-[200px]">
              <label htmlFor="ip-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                id="ip-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Main office network"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-colors disabled:opacity-60"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add IP
            </button>
          </form>
        </div>
      </div>

      {/* IP Entries List */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-gray-900">IP Entries</h3>

          {/* Filter Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1" role="tablist">
            {(['all', 'whitelist', 'blacklist'] as const).map((filter) => (
              <button
                key={filter}
                role="tab"
                aria-selected={activeFilter === filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 text-sm rounded-md capitalize transition-colors ${
                  activeFilter === filter
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {filter === 'all' ? `All (${entries.length})` : filter}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredEntries.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Server className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No IP entries found</p>
              <p className="text-sm text-gray-400 mt-1">
                {activeFilter === 'all'
                  ? 'Add your first IP entry above'
                  : `No ${activeFilter} entries`}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-mono text-sm text-gray-900">
                      {entry.ipAddress}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          entry.type === 'whitelist'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {entry.type === 'whitelist' ? (
                          <Check className="w-3 h-3 mr-1" />
                        ) : (
                          <X className="w-3 h-3 mr-1" />
                        )}
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {entry.description || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggle(entry.id)}
                        disabled={actionLoading}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          entry.isActive ? 'bg-green-500' : 'bg-gray-300'
                        } disabled:opacity-60`}
                        aria-label={entry.isActive ? 'Active' : 'Inactive'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            entry.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemove(entry)}
                        disabled={actionLoading}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-60"
                        aria-label={`Remove ${entry.ipAddress}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
