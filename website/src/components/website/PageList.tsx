/**
 * PageList — DataTable of website pages with status badges
 * @crossref:used-in[Website]
 * @crossref:uses[DataTable, StatusBadge]
 */
import { FileText, Eye, Pencil, Search as SearchIcon, Globe, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { WebsitePage, PageStatus } from '@/data/mockWebsite';
import { PAGE_STATUS_LABELS, PAGE_STATUS_STYLES } from '@/data/mockWebsite';

interface PageListProps {
  readonly pages: readonly WebsitePage[];
  readonly searchQuery: string;
  readonly statusFilter: PageStatus | 'all';
  readonly onSearchChange: (query: string) => void;
  readonly onStatusFilterChange: (status: PageStatus | 'all') => void;
  readonly onEdit: (pageId: string) => void;
  readonly onViewSEO: (pageId: string) => void;
  readonly onClearFilters: () => void;
  readonly stats: {
    readonly total: number;
    readonly published: number;
    readonly draft: number;
    readonly scheduled: number;
  };
}

function StatusBadge({ status }: { readonly status: PageStatus }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAGE_STATUS_STYLES[status]}`}>
      {PAGE_STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatViews(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function PageList({
  pages,
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onEdit,
  onViewSEO,
  onClearFilters,
  stats,
}: PageListProps) {
  const { t } = useTranslation('website');
  const hasFilters = searchQuery || statusFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Pages', value: stats.total, color: 'bg-gray-100 text-gray-700' },
          { label: 'Published', value: stats.published, color: 'bg-green-100 text-green-700' },
          { label: 'Drafts', value: stats.draft, color: 'bg-gray-100 text-gray-600' },
          { label: 'Scheduled', value: stats.scheduled, color: 'bg-blue-100 text-blue-700' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className={`text-xs font-medium mt-1 inline-block px-2 py-0.5 rounded-full ${stat.color}`}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-xl shadow-card p-4 space-y-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder', { ns: 'website' })}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 w-14 shrink-0">Status:</span>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'published', 'draft', 'scheduled', 'archived'] as const).map((s) => (
              <button
                key={s}
                onClick={() => onStatusFilterChange(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? s === 'all' ? 'bg-gray-900 text-white'
                    : s === 'published' ? 'bg-green-100 text-green-700'
                    : s === 'draft' ? 'bg-gray-200 text-gray-600'
                    : s === 'scheduled' ? 'bg-blue-100 text-blue-700'
                    : 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'All' : PAGE_STATUS_LABELS[s]}
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

      {/* DataTable */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {pages.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No pages match your filters</p>
            <button
              onClick={onClearFilters}
              className="mt-2 text-sm text-primary hover:text-primary-dark transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">
                    <span className="flex items-center gap-1">Page <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Slug</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Template</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Author</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Views</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Modified</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-medium text-gray-900">{page.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-mono text-xs">{page.slug}</td>
                    <td className="py-3 px-4"><StatusBadge status={page.status} /></td>
                    <td className="py-3 px-4 text-gray-500">{page.template}</td>
                    <td className="py-3 px-4 text-gray-500">{page.author}</td>
                    <td className="py-3 px-4 text-right text-gray-500">
                      <span className="flex items-center justify-end gap-1">
                        <Eye className="w-3 h-3" />
                        {formatViews(page.views)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(page.lastModified)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(page.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                          title="Edit page"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onViewSEO(page.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="SEO settings"
                        >
                          <SearchIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
