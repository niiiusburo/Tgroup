/**
 * Service Catalog Page — "Thông tin sản phẩm" with service groups sidebar + services table
 * @crossref:route[/website]
 * @crossref:uses[fetchProducts, fetchProductCategories, fetchCompanies]
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, X } from 'lucide-react';
import {
  fetchProducts, fetchProductCategories, fetchCompanies,
  createProduct, updateProduct, deleteProduct,
  createProductCategory,
} from '@/lib/api';
import type { ApiProduct, ApiProductCategory, ApiCompany } from '@/lib/api';
import { useLocationFilter } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeText } from '@/lib/utils';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { ExportPreviewModal } from '@/components/shared/ExportPreviewModal';
import { useExport } from '@/hooks/useExport';
import { CategoryAddModal, ServiceFormModal, type ServiceFormData } from '@/components/services/ServiceCatalogModals';
import { ServiceCatalogTable } from '@/components/services/ServiceCatalogTable';

// ─── Main Page ───────────────────────────────────────────────────

export function ServiceCatalog() {
  const { t } = useTranslation('services');
  const { t: tc } = useTranslation('common');
  const { hasPermission } = useAuth();
  const canEditServices = hasPermission('services.edit');
  const canExportProducts = hasPermission('products.export');

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
        active: activeFilter === 'all' ? 'all' : activeFilter === 'active' ? 'true' : 'false',
      });
      setProducts(res.items);
      setTotalProducts(res.totalItems);
    } catch {
      setProducts([]);
      setTotalProducts(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, catalogSearch, selectedCategoryId, selectedLocationId, activeFilter]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [catalogSearch, selectedCategoryId, activeFilter, selectedLocationId]);

  // ── Filtered categories for sidebar ──
  const filteredCategories = useMemo(() => {
    if (!catalogSearch) return categories;
    const q = normalizeText(catalogSearch);
    return categories.filter((c) => normalizeText(c.name).includes(q));
  }, [categories, catalogSearch]);

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

  // ── Export ──
  const exportFilters = useMemo(() => ({
    search: catalogSearch,
    categId: selectedCategoryId ?? '',
    active: activeFilter === 'all' ? '' : activeFilter === 'active' ? 'true' : 'false',
    companyId: selectedLocationId !== 'all' ? selectedLocationId : 'all',
  }), [catalogSearch, selectedCategoryId, activeFilter, selectedLocationId]);

  const {
    previewOpen,
    previewData,
    loading: exportLoading,
    downloading: exportDownloading,
    error: exportError,
    openPreview,
    closePreview,
    handleDownload,
    handleDirectExport,
  } = useExport({ type: 'service-catalog', filters: exportFilters });

  // ── Handlers ──
  async function handleAddCategory(name: string) {
    if (!canEditServices) return;
    const created = await createProductCategory({ name });
    setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function handleCreateService(data: ServiceFormData) {
    if (!canEditServices) return;
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
    if (!editingProduct || !canEditServices) return;
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
    if (!canEditServices) return;
    await updateProduct(product.id, { active: !product.active });
    await loadProducts();
    fetchProductCategories().then((res) => setCategories(res.items)).catch(() => {});
  }

  async function handleDelete(product: ApiProduct) {
    if (!canEditServices) return;
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
        <div className="flex gap-1 mt-3 bg-gray-100 p-1 rounded-lg w-fit">
          <button type="button" className="px-4 py-2 text-sm font-medium text-gray-900 bg-white rounded-lg shadow-sm">
            {t('tabs.services')}
          </button>
          <button type="button" className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:text-gray-900 hover:bg-white/50 transition-colors">
            {t('tabs.supplies')}
          </button>
          <button type="button" className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:text-gray-900 hover:bg-white/50 transition-colors">
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
            {canEditServices && (
              <button
                type="button"
                onClick={() => setShowAddCategory(true)}
                className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title={tc('add')}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
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
              {canEditServices && (
                <button
                  type="button"
                  onClick={() => { setEditingProduct(null); setShowServiceForm(true); }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
                >
                  <Plus className="w-4 h-4" />
                  {tc('add')}
                </button>
              )}
              {canExportProducts && (
                <ExportMenu
                  onExport={handleDirectExport}
                  onPreview={openPreview}
                  loading={exportDownloading}
                />
              )}
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

          <ServiceCatalogTable
            products={products}
            loading={loading}
            totalProducts={totalProducts}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            pageNumbers={pageNumbers()}
            canEditServices={canEditServices}
            onPageChange={(updater) => setPage(updater)}
            onEdit={(product) => { setEditingProduct(product); setShowServiceForm(true); }}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        </div>
      </div>

      {/* Export Preview Modal */}
      {canExportProducts && (
        <ExportPreviewModal
          isOpen={previewOpen}
          onClose={closePreview}
          onDownload={handleDownload}
          preview={previewData}
          loading={exportLoading}
          error={exportError}
        />
      )}

      {/* Modals */}
      {canEditServices && (
        <>
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
        </>
      )}
    </div>
  );
}

export default ServiceCatalog;
