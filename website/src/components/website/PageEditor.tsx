/**
 * PageEditor — Rich text editor for page content
 * @crossref:used-in[Website]
 */
import { useState } from 'react';
import {
  ArrowLeft, Save, Eye, Bold, Italic, Underline, List, ListOrdered,
  Heading1, Heading2, Link, Image, AlignLeft, AlignCenter, AlignRight, Code,
} from 'lucide-react';
import type { WebsitePage } from '@/data/mockWebsite';
import { PAGE_STATUS_LABELS, PAGE_STATUS_STYLES, PAGE_TEMPLATES } from '@/data/mockWebsite';

interface PageEditorProps {
  readonly page: WebsitePage;
  readonly onBack: () => void;
}

interface ToolbarButton {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly label: string;
  readonly action: string;
}

const TOOLBAR_GROUPS: readonly (readonly ToolbarButton[])[] = [
  [
    { icon: Bold, label: 'Bold', action: 'bold' },
    { icon: Italic, label: 'Italic', action: 'italic' },
    { icon: Underline, label: 'Underline', action: 'underline' },
    { icon: Code, label: 'Code', action: 'code' },
  ],
  [
    { icon: Heading1, label: 'Heading 1', action: 'h1' },
    { icon: Heading2, label: 'Heading 2', action: 'h2' },
  ],
  [
    { icon: List, label: 'Bullet List', action: 'ul' },
    { icon: ListOrdered, label: 'Ordered List', action: 'ol' },
  ],
  [
    { icon: AlignLeft, label: 'Align Left', action: 'left' },
    { icon: AlignCenter, label: 'Align Center', action: 'center' },
    { icon: AlignRight, label: 'Align Right', action: 'right' },
  ],
  [
    { icon: Link, label: 'Insert Link', action: 'link' },
    { icon: Image, label: 'Insert Image', action: 'image' },
  ],
];

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function PageEditor({ page, onBack }: PageEditorProps) {
  const [content, setContent] = useState(stripHtml(page.content));
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [template, setTemplate] = useState(page.template);
  const [isPreview, setIsPreview] = useState(false);

  return (
    <div className="space-y-4">
      {/* Editor header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Page</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAGE_STATUS_STYLES[page.status]}`}>
                {PAGE_STATUS_LABELS[page.status]}
              </span>
              <span className="text-xs text-gray-400">Last saved: {new Date(page.lastModified).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isPreview ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Page metadata */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Page Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">URL Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Template</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              {PAGE_TEMPLATES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Editor area */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {/* Toolbar */}
        {!isPreview && (
          <div className="flex items-center gap-1 p-2 border-b border-gray-100 bg-gray-50/50 flex-wrap">
            {TOOLBAR_GROUPS.map((group, gi) => (
              <div key={gi} className="flex items-center gap-0.5">
                {gi > 0 && <div className="w-px h-6 bg-gray-200 mx-1" />}
                {group.map((btn) => (
                  <button
                    key={btn.action}
                    title={btn.label}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                  >
                    <btn.icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Content area */}
        {isPreview ? (
          <div className="p-6 min-h-[400px] prose prose-sm max-w-none">
            <h1>{title}</h1>
            {content.split('\n').filter(Boolean).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-6 min-h-[400px] text-sm text-gray-900 resize-y focus:outline-none leading-relaxed"
            placeholder="Start writing your page content..."
          />
        )}
      </div>
    </div>
  );
}
