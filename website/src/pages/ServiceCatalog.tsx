/**
 * Service Catalog Page — "Thông tin sản phẩm" with service groups sidebar + services table
 * @crossref:route[/website]
 * @crossref:uses[fetchProducts, fetchProductCategories, fetchCompanies]
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, Plus, Pencil, Trash2, EyeOff, Eye, ChevronLeft, ChevronRight,
  X, Loader2,
} from 'lucide-react';
import {
  fetchProducts, fetchProductCategories, fetchCompanies,
  createProduct, updateProduct, deleteProduct,
  createProductCategory,
} from '@/lib/api';
import type { ApiProduct, ApiProductCategory, ApiCompany } from '@/lib/api';
import { useLocationFilter } from '@/contexts/LocationContext';
import { formatVND } from '@/lib/formatting';
import { normalizeText } from '@/lib/utils';
import { CurrencyInput } from '@/components/shared/CurrencyInput';

// ─── Types ───────────────────────────────────────────────────────

interface ServiceFormData {
  name: string;
  defaultcode: string;
  listprice: number;
  categid: string;
  uomname: string;
  companyid: string;
}

// ─── Service Form Modal ──────────────────────────────────────────

interface ServiceFormModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: ServiceFormData) => Promise<void>;
  readonly categories: ApiProductCategory[];
  readonly companies: ApiCompany[];
  readonly initialData?: ApiProduct | null;
  readonly title: string;
}

function ServiceFormModal({ isOpen, onClose, onSubmit, categories, companies, initialData, title }: ServiceFormModalProps) {
  const { t } = useTranslation('services');
  const { t: tc } = useTranslation('common');
  const [form, setForm] = useState<ServiceFormData>({
    name: '',
    defaultcode: '',
    listprice: 0,
    categid: '',
    uomname: t('defaultUnit'),
    companyid: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        defaultcode: initialData.defaultcode ?? '',
        listprice: initialData.listprice ? parseFloat(initialData.listprice) : 0,
        categid: initialData.categid ?? '',
        uomname: initialData.uomname ?? t('defaultUnit'),
        companyid: initialData.companyid ?? '',
      });
    } else {
      setForm({ name: '', defaultcode: '', listprice: 0, categid: '', uomname: t('defaultUnit'), companyid: '' });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.name')} *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-blue-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('columns.serviceCode')}</label>
              <input
                type="text"
                value={form.defaultcode}
                onChange={(e) => setForm({ ...form, defaultcode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('columns.uom')}</label>
              <input
                type="text"
                value={form.uomname}
                onChange={(e) => setForm({ ...form, uomname: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('columns.listPrice')}</label>
            <CurrencyInput
              value={form.listprice}
              onChange={(v) => setForm({ ...form, listprice: v ?? 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('columns.category')}</label>
            <select
              value={form.categid}
              onChange={(e) => setForm({ ...form, categid: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-blue-500"
            >
              <option value="">-- {tc('form.selectOption')} --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.location')}</label>
            <select
              value={form.companyid}
              onChange={(e) => setForm({ ...form, companyid: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-blue-500"
            >
              <option value="">{t('allLocations')}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              {tc('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialData ? tc('update') : tc('add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Category Add Modal ──────────────────────────────────────────

interface CategoryAddModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (name: string) => Promise<void>;
}

function CategoryAddModal({ isOpen, onClose, onSubmit }: CategoryAddModalProps) {
  const { t } = useTranslation('services');
  const { t: tc } = useTranslation('common');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (isOpen) setName(''); }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit(name.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{t('addCategory')}</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('categoryName')} *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-blue-500"
              autoFocus
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              {tc('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {tc('add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export function ServiceCatalog() {
  const { t } = useTranslation('services');
  const { t: tc } = useTranslation('common');
  // Data state
  const [categories, setCategories] = useState<ApiProductCategory[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { selectedLocationId } = useLocationFilter();

  // Modals
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ApiProduct | null>(null);

  // ── Load categories + companies (once) ──
  useEffect(() => {
    fetchProductCategories().then((res) => setCategories(res.items)).catch(() => {});
    fetchCompanies().then((res) => setCompanies(res.items)).catch(() => {});
  }, []);

  // ── Load products (on filter/page change) ──
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchProducts({
        offset: (page - 1) * pageSize,
        limit: pageSize,
        search: catalogSearch || undefined,
        categId: selectedCategoryId || undefined,
        companyId: selectedLocationId !== 'all' ? selectedLocationId : undefined,
      });
      setProducts(res.items);
      setTotalProducts(res.totalItems);
    } catch {
      setProducts([]);
      setTotalProducts(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, catalogSearch, selectedCategoryId, selectedLocationId]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [catalogSearch, selectedCategoryId, activeFilter, selectedLocationId]);

  // ── Filtered categories for sidebar ──
  const filteredCategories = useMemo(() => {
    if (!catalogSearch) return categories;
    const q = normalizeText(catalogSearch);
    return categories.filter((c) => normalizeText(c.name).includes(q));
  }, [categories, catalogSearch]);

  // ── Filtered products by active status (client-side since API defaults active=true) ──
  const displayProducts = useMemo(() => {
    if (activeFilter === 'all') return products;
    if (activeFilter === 'active') return products.filter((p) => p.active);
    return products.filter((p) => !p.active);
  }, [products, activeFilter]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));

  function pageNumbers(): (number | '...')[] {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  // ── Handlers ──
  async function handleAddCategory(name: string) {
    const created = await createProductCategory({ name });
    setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function handleCreateService(data: ServiceFormData) {
    await createProduct({
      name: data.name,
      defaultcode: data.defaultcode || undefined,
      listprice: data.listprice,
      categid: data.categid || undefined,
      uomname: data.uomname || undefined,
      companyid: data.companyid || undefined,
    });
    await loadProducts();
    // Refresh categories to update counts
    fetchProductCategories().then((res) => setCategories(res.items)).catch(() => {});
  }

  async function handleUpdateService(data: ServiceFormData) {
    if (!editingProduct) return;
    await updateProduct(editingProduct.id, {
      name: data.name,
      defaultcode: data.defaultcode || undefined,
      listprice: data.listprice,
      categid: data.categid || undefined,
      uomname: data.uomname || undefined,
      companyid: data.companyid || undefined,
    });
    setEditingProduct(null);
    await loadProducts();
  }

  async function handleToggleActive(product: ApiProduct) {
    await updateProduct(product.id, { active: !product.active });
    await loadProducts();
    fetchProductCategories().then((res) => setCategories(res.items)).catch(() => {});
  }

  async function handleDelete(product: ApiProduct) {
    if (!window.confirm(t('confirmDeleteService', { name: product.name }))) return;
    await deleteProduct(product.id);
    await loadProducts();
    fetchProductCategories().then((res) => setCategories(res.items)).catch(() => {});
  }

  // ── Selected category name ──
  const selectedCategoryName = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId)?.name ?? null
    : null;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('serviceCatalog')}</h1>
        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          <button type="button" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg">
            {t('tabs.services')}
          </button>
          <button type="button" className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
            {t('tabs.supplies')}
          </button>
          <button type="button" className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
            {t('tabs.medicine')}
          </button>
        </div>
      </div>

      {/* Main two-panel layout */}
      <div className="flex gap-4">
        {/* ── Left Sidebar: Service Groups ── */}
        <div className="w-80 shrink-0 bg-white rounded-xl shadow-card">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-900">{t('serviceGroups')}</h2>
            <button
              type="button"
              onClick={() => setShowAddCategory(true)}
              className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title={tc('add')}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Category search */}
          <div className="px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder={t('catalog.searchPlaceholder', { ns: 'website' })}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Category header */}
          <div className="px-4 py-2 border-b">
            <span className="text-xs font-medium text-gray-500 uppercase">{t('groupName')}</span>
          </div>

          {/* Category list */}
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {/* "All" option */}
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className={`w-full px-4 py-2.5 text-left text-sm border-b border-gray-50 transition-colors ${
                selectedCategoryId === null
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tc('all')} ({totalProducts})
            </button>

            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`w-full px-4 py-2.5 text-left text-sm border-b border-gray-50 transition-colors flex items-center justify-between ${
                  selectedCategoryId === cat.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="truncate">{cat.name}</span>
                <span className="text-xs text-gray-400 ml-2">{cat.product_count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Right Panel: Services Table ── */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setEditingProduct(null); setShowServiceForm(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                {tc('add')}
              </button>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="active">{t('filters.active')}</option>
                <option value="inactive">{t('filters.inactive')}</option>
                <option value="all">{tc('all')}</option>
              </select>
            </div>
          </div>

          {/* Selected category indicator */}
          {selectedCategoryName && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm text-gray-500">{t('groupLabel')}:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg">
                {selectedCategoryName}
                <button type="button" onClick={() => setSelectedCategoryId(null)} className="ml-1 hover:text-blue-900">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                    <input type="checkbox" className="rounded border-gray-300" disabled />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('columns.name')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('columns.category')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('form.location')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('columns.price')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    {tc('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <Loader2 className="w-8 h-8 mx-auto mb-2 text-gray-300 animate-spin" />
                      <p className="text-sm text-gray-500">{tc('loading')}</p>
                    </td>
                  </tr>
                ) : displayProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <p className="text-sm text-gray-500">{t('noServicesFound')}</p>
                    </td>
                  </tr>
                ) : (
                  displayProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" className="rounded border-gray-300" />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500">
                          {t('uomLabel')}: {product.uomname ?? t('defaultUnit')}
                          {product.defaultcode && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                              {product.defaultcode}
                            </span>
                          )}
                        </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {product.categname ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {product.companyname ?? t('allLocations')}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {product.listprice && parseFloat(product.listprice) > 1 ? formatVND(parseFloat(product.listprice)) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => { setEditingProduct(product); setShowServiceForm(true); }}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title={tc('edit')}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title={tc('delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(product)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              product.active
                                ? 'text-gray-400 hover:bg-gray-100'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={product.active ? tc('hide') : tc('show')}
                          >
                            {product.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalProducts > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {pageNumbers().map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400">...</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                          page === p
                            ? 'bg-blue-600 text-white font-medium'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">
                    {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalProducts)} {tc('of')} {totalProducts} {tc('rows')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CategoryAddModal
        isOpen={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onSubmit={handleAddCategory}
      />
      <ServiceFormModal
        isOpen={showServiceForm}
        onClose={() => { setShowServiceForm(false); setEditingProduct(null); }}
        onSubmit={editingProduct ? handleUpdateService : handleCreateService}
        categories={categories}
        companies={companies}
        initialData={editingProduct}
        title={editingProduct ? t('editService') : t('addService')}
      />
    </div>
  );
}

export default ServiceCatalog;
