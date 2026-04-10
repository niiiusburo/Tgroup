/**
 * SEOManager — meta tags and descriptions per page
 * @crossref:used-in[Website]
 */
import { useState } from 'react';
import { ArrowLeft, Save, Search, Globe, Tag, Image, Link2, AlertTriangle, CheckCircle } from 'lucide-react';
import type { WebsitePage } from '@/data/mockWebsite';
import { MOCK_PAGES } from '@/data/mockWebsite';

interface SEOManagerProps {
  readonly selectedPage: WebsitePage | null;
  readonly onSelectPage: (pageId: string) => void;
  readonly onBack: () => void;
}

function SEOScoreIndicator({ score }: { readonly score: number }) {
  const color = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';
  const bgColor = score >= 80 ? 'bg-green-100' : score >= 50 ? 'bg-yellow-100' : 'bg-red-100';
  const label = score >= 80 ? 'Good' : score >= 50 ? 'Needs Work' : 'Poor';

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${bgColor}`}>
      {score >= 80 ? (
        <CheckCircle className={`w-4 h-4 ${color}`} />
      ) : (
        <AlertTriangle className={`w-4 h-4 ${color}`} />
      )}
      <span className={`text-sm font-medium ${color}`}>{score}/100 — {label}</span>
    </div>
  );
}

function computeSEOScore(page: WebsitePage): number {
  let score = 0;
  if (page.seo.title.length > 10 && page.seo.title.length <= 60) score += 25;
  else if (page.seo.title.length > 0) score += 10;
  if (page.seo.description.length > 50 && page.seo.description.length <= 160) score += 25;
  else if (page.seo.description.length > 0) score += 10;
  if (page.seo.keywords.length >= 3) score += 20;
  else if (page.seo.keywords.length > 0) score += 10;
  if (page.seo.ogImage) score += 15;
  if (page.seo.canonicalUrl) score += 15;
  return score;
}

export function SEOManager({ selectedPage, onSelectPage, onBack }: SEOManagerProps) {
  const [seoTitle, setSeoTitle] = useState(selectedPage?.seo.title ?? '');
  const [seoDescription, setSeoDescription] = useState(selectedPage?.seo.description ?? '');
  const [seoKeywords, setSeoKeywords] = useState(selectedPage?.seo.keywords.join(', ') ?? '');
  const [ogImage, setOgImage] = useState(selectedPage?.seo.ogImage ?? '');
  const [canonicalUrl, setCanonicalUrl] = useState(selectedPage?.seo.canonicalUrl ?? '');

  if (!selectedPage) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500 mb-4">Select a page to manage its SEO settings</p>

        {/* SEO overview table */}
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Page</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">SEO Title</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Description</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Score</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PAGES.map((page) => {
                  const score = computeSEOScore(page);
                  const scoreColor = score >= 80 ? 'text-green-600 bg-green-100' : score >= 50 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100';
                  return (
                    <tr key={page.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{page.title}</td>
                      <td className="py-3 px-4 text-gray-500 max-w-[200px] truncate">{page.seo.title}</td>
                      <td className="py-3 px-4 text-gray-500 max-w-[250px] truncate">{page.seo.description}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${scoreColor}`}>
                          {score}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectPage(page.id)}
                          className="text-sm text-primary hover:text-primary-dark transition-colors"
                        >
                          Edit SEO
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const score = computeSEOScore(selectedPage);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900">SEO Settings — {selectedPage.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{selectedPage.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SEOScoreIndicator score={score} />
          <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* SEO fields */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-card p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Meta Tags</h3>

            {/* Title */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                <Search className="w-3.5 h-3.5" />
                SEO Title
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                maxLength={60}
              />
              <p className={`text-xs mt-1 ${seoTitle.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>
                {seoTitle.length}/60 characters
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                <Globe className="w-3.5 h-3.5" />
                Meta Description
              </label>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                maxLength={160}
              />
              <p className={`text-xs mt-1 ${seoDescription.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                {seoDescription.length}/160 characters
              </p>
            </div>

            {/* Keywords */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                <Tag className="w-3.5 h-3.5" />
                Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={seoKeywords}
                onChange={(e) => setSeoKeywords(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="dental, HCMC, dentist..."
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {seoKeywords.split(',').filter((k) => k.trim()).map((keyword, i) => (
                  <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                    {keyword.trim()}
                  </span>
                ))}
              </div>
            </div>

            {/* OG Image */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                <Image className="w-3.5 h-3.5" />
                Open Graph Image
              </label>
              <input
                type="text"
                value={ogImage}
                onChange={(e) => setOgImage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="/images/og-image.jpg"
              />
            </div>

            {/* Canonical URL */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                <Link2 className="w-3.5 h-3.5" />
                Canonical URL
              </label>
              <input
                type="text"
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="https://tgclinic.vn/page"
              />
            </div>
          </div>
        </div>

        {/* Search preview */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-card p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Google Search Preview</h3>
            <div className="border border-gray-200 rounded-lg p-4 space-y-1">
              <p className="text-sm text-blue-700 font-medium truncate">
                {seoTitle || 'Page Title — TG Clinic'}
              </p>
              <p className="text-xs text-green-700 truncate">
                {canonicalUrl || 'https://tgclinic.vn/page'}
              </p>
              <p className="text-xs text-gray-600 line-clamp-2">
                {seoDescription || 'Add a meta description to improve search visibility.'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">SEO Checklist</h3>
            <div className="space-y-2">
              {[
                { check: seoTitle.length > 10 && seoTitle.length <= 60, label: 'Title between 10–60 chars' },
                { check: seoDescription.length > 50 && seoDescription.length <= 160, label: 'Description between 50–160 chars' },
                { check: seoKeywords.split(',').filter((k) => k.trim()).length >= 3, label: 'At least 3 keywords' },
                { check: !!ogImage, label: 'OG image set' },
                { check: !!canonicalUrl, label: 'Canonical URL set' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${item.check ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <div className={`w-2 h-2 rounded-full ${item.check ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                  <span className={`text-xs ${item.check ? 'text-gray-700' : 'text-gray-400'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
