import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { LoadingState } from './LoadingState';
import { getPaginationItems } from './dataTablePagination';

/**
 * DataTable - Sortable, paginated data table
 * @crossref:used-in[Customers, Employees, Services, Locations, Reports]
 */

export interface Column<T> {
  readonly key: string;
  readonly header: string;
  readonly sortable?: boolean;
  readonly render?: (row: T) => React.ReactNode;
  readonly width?: string;
}

interface DataTableProps<T> {
  readonly columns: readonly Column<T>[];
  readonly data: readonly T[];
  readonly keyExtractor: (row: T) => string;
  readonly pageSize?: number;
  readonly totalItems?: number;
  readonly currentPage?: number;
  readonly onPageChange?: (page: number) => void;
  readonly onRowClick?: (row: T) => void;
  readonly emptyMessage?: string;
  readonly loading?: boolean;
  readonly loadingMessage?: string;
  readonly selection?: {
    readonly selectedIds: Set<string>;
    readonly onSelect: (id: string, selected: boolean) => void;
    readonly onSelectAll: (selected: boolean) => void;
  };
}

type SortDirection = 'asc' | 'desc';

interface SortState {
  readonly key: string;
  readonly direction: SortDirection;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  pageSize = 20,
  totalItems,
  currentPage: controlledPage,
  onPageChange,
  onRowClick,
  emptyMessage = 'No data found',
  loading = false,
  loadingMessage = 'Loading data...',
  selection,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [uncontrolledPage, setUncontrolledPage] = useState(0);
  const isServerPaginated = typeof totalItems === 'number' && typeof onPageChange === 'function';

  const sortedData = useMemo(() => {
    if (!sort) return data;
    const sorted = [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sort.key];
      const bVal = (b as Record<string, unknown>)[sort.key];
      if (aVal == null || bVal == null) return 0;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [data, sort]);

  const displayTotalItems = totalItems ?? sortedData.length;
  const totalPages = Math.max(1, Math.ceil(displayTotalItems / pageSize));
  const requestedPage = isServerPaginated ? (controlledPage ?? 0) : uncontrolledPage;
  const safePage = Math.max(0, Math.min(requestedPage, totalPages - 1));
  const paginationItems = getPaginationItems(totalPages, safePage);

  const pageData = useMemo(() => {
    if (isServerPaginated) return sortedData;
    const start = safePage * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [isServerPaginated, sortedData, safePage, pageSize]);

  const allPageIdsSelected = pageData.length > 0 && pageData.every((row) => selection?.selectedIds.has(keyExtractor(row)));
  const somePageIdsSelected = pageData.some((row) => selection?.selectedIds.has(keyExtractor(row))) && !allPageIdsSelected;

  function handleSort(key: string) {
    setSort((prev) => {
      if (prev?.key === key) {
        return prev.direction === 'asc'
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
    goToPage(0);
  }

  function goToPage(page: number) {
    const nextPage = Math.max(0, Math.min(page, totalPages - 1));
    if (isServerPaginated) {
      onPageChange?.(nextPage);
      return;
    }
    setUncontrolledPage(nextPage);
  }

  const pageStart = displayTotalItems === 0 ? 0 : safePage * pageSize + 1;
  const pageEnd = Math.min((safePage + 1) * pageSize, displayTotalItems);

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {selection && (
                <th className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={allPageIdsSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageIdsSelected;
                    }}
                    onChange={(e) => selection.onSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`
                    px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide
                    ${col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''}
                  `}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sort?.key === col.key && (
                      sort.direction === 'asc'
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selection ? 1 : 0)} className="px-4 py-8">
                  <LoadingState title={loadingMessage} variant="inline" className="py-2" />
                </td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selection ? 1 : 0)} className="px-4 py-8 text-center text-sm text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row) => {
                const rowId = keyExtractor(row);
                const isSelected = selection?.selectedIds.has(rowId) ?? false;
                return (
                  <tr
                    key={rowId}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`
                      border-b border-gray-50 last:border-b-0
                      ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                      ${isSelected ? 'bg-primary/[0.03]' : ''}
                      transition-colors duration-100
                    `}
                  >
                    {selection && (
                      <td
                        className="px-4 py-3 text-sm text-gray-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => selection.onSelect(rowId, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sm text-gray-700" style={col.width ? { width: col.width } : undefined}>
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Showing {pageStart}–{pageEnd} of {displayTotalItems}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous page"
              disabled={safePage === 0}
              onClick={() => goToPage(safePage - 1)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {paginationItems.map((item) => (
              typeof item === 'number' ? (
                <button
                  key={item}
                  type="button"
                  aria-current={item === safePage ? 'page' : undefined}
                  onClick={() => goToPage(item)}
                  className={`
                    w-8 h-8 rounded-md text-xs font-medium transition-colors
                    ${item === safePage
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'}
                  `}
                >
                  {item + 1}
                </button>
              ) : (
                <span key={item} className="w-8 text-center text-xs text-gray-400">
                  ...
                </span>
              )
            ))}
            <button
              type="button"
              aria-label="Next page"
              disabled={safePage >= totalPages - 1}
              onClick={() => goToPage(safePage + 1)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
