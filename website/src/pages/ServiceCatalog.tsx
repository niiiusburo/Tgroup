/**
 * Service Catalog Page — Displays all dental services organized by category with inline editing
 * @crossref:route[/services-catalog]
 * @crossref:uses[fetchProducts]
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Stethoscope, Search, Filter, Package, DollarSign, Tag, ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react';
import { fetchProducts } from '@/lib/api';
import type { ApiProduct } from '@/lib/api';

interface ServiceItem {
  id: string;
  code: string;
  name: string;
  canOrderLab: boolean;
  category: string;
  unit: string;
  price: number;
  cost: number;
}

function mapProduct(p: ApiProduct): ServiceItem {
  return {
    id: p.id,
    code: p.defaultcode ?? '',
    name: p.name,
    canOrderLab: p.canorderlab,
    category: p.categname ?? 'Uncategorized',
    unit: p.uomname ?? '',
    price: p.listprice ? parseFloat(p.listprice) : 0,
    cost: p.purchaseprice ? parseFloat(p.purchaseprice) : 0,
  };
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' \u20ab';
}

interface ServiceRowProps {
  service: ServiceItem;
  editingId: string | null;
  editPrice: string;
  onStartEdit: (id: string, price: number) => void;
  onPriceChange: (price: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
}

function ServiceRow({
  service,
  editingId,
  editPrice,
  onStartEdit,
  onPriceChange,
  onSaveEdit,
  onCancelEdit,
}: ServiceRowProps) {
  const isEditing = editingId === service.id;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-3 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {service.code}
        </span>
      </td>
      <td className="px-6 py-3">
        <span className="text-sm font-medium text-gray-900">
          {service.name}
        </span>
      </td>
      <td className="px-6 py-3 whitespace-nowrap">
        <span className="text-sm text-gray-600">{service.unit}</span>
      </td>
      <td className="px-6 py-3 whitespace-nowrap text-right">
        {isEditing ? (
          <div className="flex items-center justify-end gap-1">
            <input
              type="number"
              value={editPrice}
              onChange={(e) => onPriceChange(e.target.value)}
              className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary text-right"
              autoFocus
            />
            <button
              type="button"
              onClick={() => onSaveEdit(service.id)}
              title="Save"
              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              title="Cancel"
              className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onStartEdit(service.id, service.price)}
            title="Edit price"
            className="inline-flex items-center gap-1 text-primary hover:bg-primary/5 px-2 py-1 rounded transition-colors group"
          >
            <span className="text-sm font-semibold">
              {formatVND(service.price)}
            </span>
            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </td>
      <td className="px-6 py-3 whitespace-nowrap text-center">
        {service.canOrderLab ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            Yes
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            No
          </span>
        )}
      </td>
    </tr>
  );
}

interface ServiceGroupProps {
  category: string;
  services: ServiceItem[];
  isExpanded: boolean;
  onToggle: () => void;
  searchQuery: string;
  editingId: string | null;
  editPrice: string;
  onStartEdit: (id: string, price: number) => void;
  onPriceChange: (price: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
}

function ServiceGroup({
  category,
  services,
  isExpanded,
  onToggle,
  searchQuery,
  editingId,
  editPrice,
  onStartEdit,
  onPriceChange,
  onSaveEdit,
  onCancelEdit,
}: ServiceGroupProps) {
  const filteredServices = useMemo(() => {
    if (!searchQuery) return services;
    const query = searchQuery.toLowerCase();
    return services.filter(
      s =>
        s.name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query)
    );
  }, [services, searchQuery]);

  if (filteredServices.length === 0) return null;

  const totalServices = services.length;
  const showingCount = filteredServices.length;

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{category}</h3>
            <p className="text-sm text-gray-500">
              {showingCount < totalServices
                ? `Showing ${showingCount} of ${totalServices} services`
                : `${totalServices} services`}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lab Order
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredServices.map((service) => (
                  <ServiceRow
                    key={service.id}
                    service={service}
                    editingId={editingId}
                    editPrice={editPrice}
                    onStartEdit={onStartEdit}
                    onPriceChange={onPriceChange}
                    onSaveEdit={onSaveEdit}
                    onCancelEdit={onCancelEdit}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function ServiceCatalog() {
  const [products, setProducts] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchProducts({ limit: 200 })
      .then((res) => {
        const mapped = res.items.map(mapProduct);
        setProducts(mapped);
        // Auto-expand first category
        const cats = [...new Set(mapped.map((p) => p.category))].sort();
        if (cats.length > 0) {
          setExpandedCategories(new Set([cats[0]]));
        }
      })
      .catch(() => {
        // Keep empty state on error
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products]
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const expandAll = () => setExpandedCategories(new Set(categories));
  const collapseAll = () => setExpandedCategories(new Set());

  const filteredCategories = useMemo(() => {
    if (selectedCategory === 'all') return categories;
    return categories.filter(c => c === selectedCategory);
  }, [categories, selectedCategory]);

  // Edit handlers
  const startEdit = useCallback((id: string, price: number) => {
    setEditingId(id);
    setEditPrice(String(price));
  }, []);

  const priceChange = useCallback((price: string) => {
    setEditPrice(price);
  }, []);

  const saveEdit = useCallback((id: string) => {
    const parsed = parseInt(editPrice, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setProducts(prev =>
        prev.map(p => (p.id === id ? { ...p, price: parsed } : p))
      );
      setIsDirty(true);
    }
    setEditingId(null);
  }, [editPrice]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditPrice('');
  }, []);

  const saveAllChanges = useCallback(() => {
    // In a real app, this would save to backend
    console.log('Saving all price changes:', products);
    setIsDirty(false);
  }, [products]);

  const resetChanges = useCallback(() => {
    // Reload from API to reset
    setLoading(true);
    fetchProducts({ limit: 200 })
      .then((res) => {
        const mapped = res.items.map(mapProduct);
        setProducts(mapped);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setIsDirty(false);
      });
  }, []);

  const stats = useMemo(() => {
    const totalServices = products.length;
    const categoriesCount = categories.length;
    const avgPrice =
      totalServices > 0
        ? products.reduce((sum, s) => sum + s.price, 0) / totalServices
        : 0;
    const labOrderableServices = products.filter(s => s.canOrderLab).length;

    return {
      totalServices,
      categoriesCount,
      avgPrice: Math.round(avgPrice),
      labOrderableServices,
    };
  }, [products, categories]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Catalog</h1>
            <p className="text-sm text-gray-500">
              Manage dental services and pricing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={expandAll}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Collapse All
          </button>
          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium">
            + Add Service
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Services</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalServices}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Tag className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Categories</p>
              <p className="text-xl font-bold text-gray-900">{stats.categoriesCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Average Price</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.avgPrice.toLocaleString('en-US')} VND
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Stethoscope className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Lab Orderable</p>
              <p className="text-xl font-bold text-gray-900">{stats.labOrderableServices}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and filter */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search services by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white min-w-[180px]"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Save/Reset actions bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Click on a price to edit it
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetChanges}
            disabled={!isDirty}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isDirty
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={saveAllChanges}
            disabled={!isDirty}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isDirty
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300 animate-pulse" />
          <p className="text-gray-500 font-medium">Loading services...</p>
        </div>
      )}

      {/* Service groups */}
      {!loading && (
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <ServiceGroup
              key={category}
              category={category}
              services={products.filter((s) => s.category === category)}
              isExpanded={expandedCategories.has(category)}
              onToggle={() => toggleCategory(category)}
              searchQuery={searchQuery}
              editingId={editingId}
              editPrice={editPrice}
              onStartEdit={startEdit}
              onPriceChange={priceChange}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
            />
          ))}

          {filteredCategories.length === 0 && (
            <div className="bg-white rounded-xl shadow-card p-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No services found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try changing your search query or filters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ServiceCatalog;
