import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  readonly title: string;
  readonly contentHtml: string;
  readonly accepted: boolean;
  readonly onAccept: (accepted: boolean) => void;
}

export function TermsViewer({ title, contentHtml, accepted, onAccept }: Props) {
  const { t } = useTranslation('ctv');
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {t('signup.termsLabel')}
        </label>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="text-xs text-primary hover:underline"
        >
          {t('signup.viewTerms')}
        </button>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAccept(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm text-gray-600">
          {t('signup.acceptTerms')}
        </span>
      </label>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            <div
              className="prose prose-sm max-w-none text-gray-600"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                {t('signup.closeTerms')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
