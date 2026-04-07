/**
 * Website CMS state management hook
 * @crossref:used-in[Website]
 */
import { useState, useMemo, useCallback } from 'react';
import { MOCK_PAGES, MOCK_SERVICES } from '@/data/mockWebsite';
import type { PageStatus } from '@/data/mockWebsite';

export type WebsiteTab = 'pages' | 'editor' | 'services' | 'seo';

export function useWebsiteData() {
  const [activeTab, setActiveTab] = useState<WebsiteTab>('pages');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PageStatus | 'all'>('all');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>('all');

  const filteredPages = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return MOCK_PAGES.filter((page) => {
      const matchesSearch = !query
        || page.title.toLowerCase().includes(query)
        || page.slug.toLowerCase().includes(query)
        || page.author.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const selectedPage = useMemo(
    () => MOCK_PAGES.find((p) => p.id === selectedPageId) ?? null,
    [selectedPageId],
  );

  const editingPage = useMemo(
    () => MOCK_PAGES.find((p) => p.id === editingPageId) ?? null,
    [editingPageId],
  );

  const filteredServices = useMemo(() => {
    const query = serviceSearch.toLowerCase();
    return MOCK_SERVICES.filter((svc) => {
      const matchesSearch = !query
        || svc.name.toLowerCase().includes(query)
        || svc.category.toLowerCase().includes(query);
      const matchesCategory = serviceCategoryFilter === 'all' || svc.category === serviceCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [serviceSearch, serviceCategoryFilter]);

  const pageStats = useMemo(() => ({
    total: MOCK_PAGES.length,
    published: MOCK_PAGES.filter((p) => p.status === 'published').length,
    draft: MOCK_PAGES.filter((p) => p.status === 'draft').length,
    scheduled: MOCK_PAGES.filter((p) => p.status === 'scheduled').length,
  }), []);

  const openEditor = useCallback((pageId: string) => {
    setEditingPageId(pageId);
    setActiveTab('editor');
  }, []);

  const openSEO = useCallback((pageId: string) => {
    setSelectedPageId(pageId);
    setActiveTab('seo');
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
  }, []);

  const clearServiceFilters = useCallback(() => {
    setServiceSearch('');
    setServiceCategoryFilter('all');
  }, []);

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedPageId,
    setSelectedPageId,
    editingPageId,
    setEditingPageId,
    serviceSearch,
    setServiceSearch,
    serviceCategoryFilter,
    setServiceCategoryFilter,
    filteredPages,
    selectedPage,
    editingPage,
    filteredServices,
    pageStats,
    openEditor,
    openSEO,
    clearFilters,
    clearServiceFilters,
  } as const;
}
