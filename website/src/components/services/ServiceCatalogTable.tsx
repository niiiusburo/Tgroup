import { ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatVND } from '@/lib/formatting';
import type { ApiProduct } from '@/lib/api';

interface ServiceCatalogTableProps {
  readonly products: ApiProduct[];
  readonly loading: boolean;
  readonly totalProducts: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly pageNumbers: (number | '...')[];
  readonly canEditServices: boolean;
  readonly onPageChange: (updater: (page: number) => number) => void;
  readonly onEdit: (product: ApiProduct) => void;
  readonly onDelete: (product: ApiProduct) => void;
  readonly onToggleActive: (product: ApiProduct) => void;
}

export function ServiceCatalogTable({
  products,
  loading,
  totalProducts,
  page,
  pageSize,
  totalPages,
  pageNumbers,
  canEditServices,
  onPageChange,
  onEdit,
  onDelete,
  onToggleActive,
}: ServiceCatalogTableProps) {
  const { t } = useTranslation('services');
  const { t: tc } = useTranslation('common');

  return (
    <div className="bg-white rounded-xl shadow-card overflow-x-auto">
      <table className="w-full min-w-[820px]">
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
          ) : products.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-16 text-center">
                <p className="text-sm text-gray-500">{t('noServicesFound')}</p>
              </td>
            </tr>
          ) : (
            products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <input type="checkbox" className="rounded border-gray-300" disabled={!canEditServices} />
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
                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 whitespace-nowrap">
                  {product.listprice && parseFloat(product.listprice) > 1 ? formatVND(parseFloat(product.listprice)) : '-'}
                </td>
                <td className="px-4 py-3">
                  {canEditServices && (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(product)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title={tc('edit')}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(product)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title={tc('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleActive(product)}
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
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalProducts > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageNumbers.map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400">...</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(() => p)}
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
              onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
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
  );
}
