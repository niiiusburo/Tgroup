/**
 * Service Catalog Settings — manage treatment types and pricing
 * @crossref:used-in[Settings, Website]
 * @crossref:uses[useServiceCatalog]
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ToggleLeft, ToggleRight, Pencil, Check, X } from 'lucide-react';
import { useServiceCatalog } from '@/hooks/useSettings';
import { formatVND } from '@/lib/formatting';
import { CurrencyInput } from '@/components/shared/CurrencyInput';

export function ServiceCatalogSettings() {
  const { t } = useTranslation('settings');
  const {
    services,
    loading,
    stats,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    showInactive,
    setShowInactive,
    toggleServiceActive,
    updateService,
  } = useServiceCatalog();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  // Derive category options from fetched services (all, not filtered)
  const categoryOptions = useMemo(() => {
    const cats = [...new Set(services.map((s) => s.category))].sort();
    return cats;
  }, [services]);

  function startEdit(id: string, price: number) {
    setEditingId(id);
    setEditPrice(String(price));
  }

  function saveEdit(id: string) {
    const parsed = parseInt(editPrice, 10);
    if (!isNaN(parsed) && parsed > 0) {
      updateService(id, { price: parsed });
    }
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Services', value: stats.total, color: 'bg-blue-50 text-blue-700' },
          { label: 'Active', value: stats.active, color: 'bg-green-50 text-green-700' },
          { label: 'Inactive', value: stats.inactive, color: 'bg-gray-50 text-gray-600' },
          { label: 'Categories', value: stats.categories, color: 'bg-purple-50 text-purple-700' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('catalog.searchPlaceholder', { ns: 'website' })}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        >
          <option value="all">All Categories</option>
          {categoryOptions.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowInactive(!showInactive)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
            showInactive ? 'bg-gray-100 border-gray-300 text-gray-700' : 'border-gray-200 text-gray-500'
          }`}
        >
          {showInactive ? 'Hide' : 'Show'} Inactive
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-xl shadow-card p-12 text-center text-gray-400 text-sm">
          Loading services...
        </div>
      )}

      {/* Service list */}
      {!loading && (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Service</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Price</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{service.name}</div>
                      {service.description && (
                        <div className="text-xs text-gray-500 mt-0.5">{service.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {service.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === service.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <CurrencyInput
                            value={editPrice ? Number(editPrice) : null}
                            onChange={(v) => setEditPrice(v === null ? '' : String(v))}
                            className="w-32"
                            autoFocus
                          />
                          <button type="button" onClick={() => saveEdit(service.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(service.id, service.price)}
                          className="inline-flex items-center gap-1 text-gray-900 hover:text-primary transition-colors group"
                        >
                          {formatVND(service.price)}
                          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleServiceActive(service.id)}
                        className="inline-flex items-center justify-center"
                        title={service.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {service.isActive ? (
                          <ToggleRight className="w-6 h-6 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-400" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
                {services.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                      No services found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
