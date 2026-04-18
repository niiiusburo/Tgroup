/**
 * Feedback Admin Page
 * @crossref:route[/feedback]
 * @crossref:used-in[App]
 * @crossref:uses[FeedbackAdminContent]
 */

import { MessageSquare } from 'lucide-react';
import { FeedbackAdminContent } from '@/components/settings/FeedbackAdminContent';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';

export function Feedback() {
  const { t } = useTranslation('feedback');
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={<MessageSquare className="w-6 h-6 text-primary" />}
      />

      <FeedbackAdminContent />
    </div>
  );
}
