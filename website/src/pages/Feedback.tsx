/**
 * @crossref:domain[feedback-cms]
 * @crossref:used-in[routed at /feedback (ProtectedRoute) from website/src/App.tsx]
 * @crossref:uses[website/src/components/settings/FeedbackAdminContent.tsx (all data fetching/mutation lives there), website/src/contexts/AuthContext.tsx (hasPermission feedback.*), product-map/domains/feedback-cms.yaml]
 */
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
import { useAuth } from '@/contexts/AuthContext';

export function Feedback() {
  const { t } = useTranslation('feedback');
  const { hasPermission } = useAuth();
  const canEditFeedback =
    hasPermission('feedback.edit')
    || hasPermission('feedback.delete')
    || hasPermission('feedback.reply')
    || hasPermission('permissions.edit');
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={<MessageSquare className="w-6 h-6 text-primary" />}
      />

      <FeedbackAdminContent canEdit={canEditFeedback} />
    </div>
  );
}
