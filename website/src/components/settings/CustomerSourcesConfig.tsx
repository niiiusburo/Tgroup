/**
 * Customer Sources Configuration — manage referral sources
 * @crossref:used-in[Settings, Customers, Reports]
 * @crossref:uses[useCustomerSources]
 */

import { useState } from 'react';
import { Users, Plus, ToggleLeft, ToggleRight, Trash2, Globe, MapPin, UserPlus, X } from 'lucide-react';
import { useCustomerSources } from '@/hooks/useSettings';
import type { CustomerSource } from '@/data/mockSettings';

const TYPE_ICONS: Record<CustomerSource['type'], React.ReactNode> = {
  online: <Globe className="w-4 h-4" />,
  offline: <MapPin className="w-4 h-4" />,
  referral: <UserPlus className="w-4 h-4" />,
};

const TYPE_COLORS: Record<CustomerSource['type'], string> = {
  online: 'bg-blue-100 text-blue-700',
  offline: 'bg-amber-100 text-amber-700',
  referral: 'bg-green-100 text-green-700',
};

const TYPE_FILTERS: { label: string; value: string }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Online', value: 'online' },
  { label: 'Offline', value: 'offline' },
  { label: 'Referral', value: 'referral' },
];

export function CustomerSourcesConfig() {
  const {
    sources,
    stats,
    typeFilter,
    setTypeFilter,
    toggleSourceActive,
    addSource,
    removeSource,
  } = useCustomerSources();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CustomerSource['type']>('online');
  const [newDesc, setNewDesc] = useState('');

  function handleAdd() {
    if (!newName.trim()) return;
    addSource({
      name: newName.trim(),
      type: newType,
      description: newDesc.trim(),
      isActive: true,
    });
    setNewName('');
    setNewDesc('');
    setShowAddForm(false);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Sources', value: stats.total, color: 'bg-blue-50 text-blue-700' },
          { label: 'Active', value: stats.active, color: 'bg-green-50 text-green-700' },
          { label: 'Total Customers', value: stats.totalCustomers, color: 'bg-purple-50 text-purple-700' },
          { label: 'Top Source', value: stats.topSource, color: 'bg-amber-50 text-amber-700', isText: true },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
            <div className={`font-bold ${s.isText ? 'text-sm' : 'text-2xl'}`}>{s.value}</div>
            <div className="text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Add */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                typeFilter === f.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Source
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-card p-4 border-2 border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">New Customer Source</h4>
            <button type="button" onClick={() => setShowAddForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Source name"
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as CustomerSource['type'])}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="referral">Referral</option>
            </select>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description"
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Source
            </button>
          </div>
        </div>
      )}

      {/* Sources list */}
      <div className="space-y-3">
        {sources.map((source) => (
          <div
            key={source.id}
            className={`bg-white rounded-xl shadow-card p-4 flex items-center gap-4 transition-opacity ${
              !source.isActive ? 'opacity-60' : ''
            }`}
          >
            <div className={`p-2 rounded-lg ${TYPE_COLORS[source.type]}`}>
              {TYPE_ICONS[source.type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{source.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[source.type]}`}>
                  {source.type}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{source.description}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-semibold text-gray-900">{source.customerCount}</div>
              <div className="text-xs text-gray-500">customers</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => toggleSourceActive(source.id)}
                title={source.isActive ? 'Deactivate' : 'Activate'}
              >
                {source.isActive ? (
                  <ToggleRight className="w-6 h-6 text-green-500" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
              </button>
              {source.customerCount === 0 && (
                <button
                  type="button"
                  onClick={() => removeSource(source.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove source"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {sources.length === 0 && (
          <div className="bg-white rounded-xl shadow-card p-12 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No sources found for this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
