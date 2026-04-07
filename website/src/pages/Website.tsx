import { Globe, FileText, Palette, Search, LayoutList } from 'lucide-react';
import { useWebsiteData } from '@/hooks/useWebsiteData';
import type { WebsiteTab } from '@/hooks/useWebsiteData';
import { PageList } from '@/components/website/PageList';
import { PageEditor } from '@/components/website/PageEditor';
import { ServiceCatalogManager } from '@/components/website/ServiceCatalogManager';
import { SEOManager } from '@/components/website/SEOManager';

/**
 * Website Page — CMS for managing public website pages
 * @crossref:route[/website]
 * @crossref:used-in[App]
 * @crossref:uses[PageEditor, PageList, SEOManager, ServiceCatalogManager]
 */

interface TabConfig {
  readonly id: WebsiteTab;
  readonly label: string;
  readonly icon: React.ComponentType<{ className?: string }>;
}

const TABS: readonly TabConfig[] = [
  { id: 'pages', label: 'Pages', icon: FileText },
  { id: 'editor', label: 'Editor', icon: Palette },
  { id: 'services', label: 'Services', icon: LayoutList },
  { id: 'seo', label: 'SEO', icon: Search },
];

export function Website() {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    setSelectedPageId,
    editingPage,
    filteredPages,
    selectedPage,
    filteredServices,
    serviceSearch,
    setServiceSearch,
    serviceCategoryFilter,
    setServiceCategoryFilter,
    pageStats,
    openEditor,
    openSEO,
    clearFilters,
    clearServiceFilters,
  } = useWebsiteData();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Website</h1>
            <p className="text-sm text-gray-500">Content management, services catalog, and SEO</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium">
          New Page
        </button>
      </div>

      {/* Tab navigation */}
      <div className="bg-white rounded-xl shadow-card p-1 flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'pages' && (
        <PageList
          pages={filteredPages}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onSearchChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
          onEdit={openEditor}
          onViewSEO={openSEO}
          onClearFilters={clearFilters}
          stats={pageStats}
        />
      )}

      {activeTab === 'editor' && editingPage && (
        <PageEditor
          page={editingPage}
          onBack={() => setActiveTab('pages')}
        />
      )}

      {activeTab === 'editor' && !editingPage && (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <Palette className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No page selected for editing</p>
          <button
            onClick={() => setActiveTab('pages')}
            className="mt-2 text-sm text-primary hover:text-primary-dark transition-colors"
          >
            Go to Pages to select one
          </button>
        </div>
      )}

      {activeTab === 'services' && (
        <ServiceCatalogManager
          services={filteredServices}
          searchQuery={serviceSearch}
          categoryFilter={serviceCategoryFilter}
          onSearchChange={setServiceSearch}
          onCategoryChange={setServiceCategoryFilter}
          onClearFilters={clearServiceFilters}
        />
      )}

      {activeTab === 'seo' && (
        <SEOManager
          selectedPage={selectedPage}
          onSelectPage={(id) => {
            setSelectedPageId(id);
          }}
          onBack={() => setSelectedPageId(null)}
        />
      )}
    </div>
  );
}
