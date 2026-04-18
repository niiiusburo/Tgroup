/**
 * Feedback Admin Page
 * @crossref:route[/feedback]
 * @crossref:used-in[App]
 * @crossref:uses[FeedbackAdminContent]
 */

import { MessageSquare } from 'lucide-react';
import { FeedbackAdminContent } from '@/components/settings/FeedbackAdminContent';
import { useTranslation } from 'react-i18next';

export function Feedback() {
  const { t } = useTranslation('feedback');
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <MessageSquare className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500">{t('subtitle')}</p>
        </div>
      </div>

      <FeedbackAdminContent />
    </div>
  );
}
