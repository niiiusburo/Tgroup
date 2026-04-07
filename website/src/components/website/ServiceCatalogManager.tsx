/**
 * ServiceCatalogManager — manage public service listings
 * @crossref:used-in[Website, Settings]
 */
import { useState } from 'react';
import { Search, Star, EyeOff, Eye, GripVertical, Pencil, Plus } from 'lucide-react';
import type { ServiceListing } from '@/data/mockWebsite';
import { SERVICE_CATEGORIES } from '@/data/mockWebsite';

interface ServiceCatalogManagerProps {
  readonly services: readonly ServiceListing[];
  readonly searchQuery: string;
  readonly categoryFilter: string;
  readonly onSearchChange: (query: string) => void;
  readonly onCategoryChange: (category: string) => void;
  readonly onClearFilters: () => void;
}

export function ServiceCatalogManager({
  services,
  searchQuery,
  categoryFilter,
  onSearchChange,
  onCategoryChange,
  onClearFilters,
}: ServiceCatalogManagerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const hasFilters = searchQuery || categoryFilter !== 'all';

  const visibleCount = services.filter((s) => s.visible).length;
  const featuredCount = services.filter((s) => s.featured).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{services.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Services</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{visibleCount}</p>
          <p className="text-xs text-gray-500 mt-1">Visible</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{featuredCount}</p>
          <p className="text-xs text-gray-500 mt-1">Featured</p>
        </div>
      </div>

      {/* Search and category filter */}
      <div className="bg-white rounded-xl shadow-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shrink-0">
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 w-16 shrink-0">Category:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onCategoryChange('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-primary/10 text-primary'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Service list */}
      <div className="space-y-2">
        {services.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card p-12 text-center">
            <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No services match your filters</p>
            <button
              onClick={onClearFilters}
              className="mt-2 text-sm text-primary hover:text-primary-dark transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          services.map((svc) => (
            <div
              key={svc.id}
              className="bg-white rounded-xl shadow-card overflow-hidden transition-all hover:shadow-card-hover"
            >
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === svc.id ? null : svc.id)}
              >
                <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">#{svc.sortOrder}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{svc.name}</span>
                    {svc.featured && (
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{svc.category}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium text-gray-900">{svc.price}</span>
                  <span className="text-xs text-gray-400">{svc.duration}</span>
                  {svc.visible ? (
                    <Eye className="w-4 h-4 text-green-500" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-300" />
                  )}
                </div>
              </div>

              {expandedId === svc.id && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                      <p className="text-sm text-gray-700">{svc.description}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Slug</span>
                        <span className="text-xs font-mono text-gray-600">/{svc.slug}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Visible on Website</span>
                        <span className={`text-xs font-medium ${svc.visible ? 'text-green-600' : 'text-gray-400'}`}>
                          {svc.visible ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Featured</span>
                        <span className={`text-xs font-medium ${svc.featured ? 'text-amber-600' : 'text-gray-400'}`}>
                          {svc.featured ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                      Edit Service
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
