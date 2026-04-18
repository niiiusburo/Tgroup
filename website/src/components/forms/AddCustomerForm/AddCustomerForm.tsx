import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Edit2, CalendarPlus, FileText, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import type { CustomerFormData } from '@/data/mockCustomerForm';
import { FaceCaptureModal } from '@/components/shared/FaceCaptureModal';
import { TABS } from './constants';
import { CardSection } from './CardSection';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                    ⛔  D O   N O T   T O U C H   T H I S   M O D U L E  ⛔          ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════╣
 * ║  This AddCustomerForm is the canonical GOLD STANDARD for all TG Clinic modal forms. ║
 * ║  ANY new form or modal MUST copy this exact visual standard:                        ║
 * ║                                                                                     ║
 * ║  • Header        : orange gradient + icon + title + subtitle                        ║
 * ║  • Labels        : uppercase, semibold, gray-500, tracking-wider, small icon        ║
 * ║  • Inputs        : px-4 py-3, rounded-xl, border-gray-200, focus:ring-orange-500/20 ║
 * ║  • Selects       : same as inputs + custom chevron, appearance-none                 ║
 * ║  • Cards         : rounded-2xl, border-gray-200, overflow-hidden                    ║
 * ║  • Footer        : border-t border-gray-200, gradient bg, rounded-xl buttons        ║
 * ║                                                                                     ║
 * ║  This component is the single source of truth for TG Clinic form styling.            ║
 * ║  Every new modal/form MUST visually match this exact standard.                      ║
 * ║  BEFORE modifying this file, you MUST run Playwright visual regression.             ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * AddCustomerForm - TG Clinic "Thêm khách hàng" modular card-based form
 * Supports both create and edit modes.
 * @crossref:used-in[Customers]
 */

import { useAddCustomerForm, type ApiErrorDetail } from './useAddCustomerForm';

function ApiErrorPanel({ detail, onDismiss }: {detail: ApiErrorDetail;onDismiss: () => void;}) {
  const [showRaw, setShowRaw] = useState(false);
  const { t } = useTranslation('customers');
  return (
    <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm flex-shrink-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-red-700">{t('liLuDLiu')}</p>
            <p className="text-red-600 mt-1 break-words">{detail.message}</p>
            {detail.detail &&
            <p className="text-red-500 mt-1 break-words">{detail.detail}</p>
            }
            {detail.field &&
            <p className="text-red-500 mt-1"><code className="bg-red-100 px-1 rounded">{detail.field}</code></p>
            }
            {detail.hint &&
            <p className="text-orange-600 mt-1">{detail.hint}</p>
            }
            <button
              type="button"
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1 mt-2 text-xs text-red-400 hover:text-red-600">
              
              {showRaw ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Technical Details
            </button>
            {showRaw &&
            <pre className="mt-1 p-2 bg-red-100/50 rounded text-xs text-red-700 overflow-x-auto max-h-32 overflow-y-auto">
                {detail.status && <span>Status: {detail.status}
</span>}
                {detail.code && <span>Code: {detail.code}
</span>}
                {JSON.stringify(detail.raw, null, 2)}
              </pre>
            }
          </div>
        </div>
        <button type="button" onClick={onDismiss} className="text-red-400 hover:text-red-600 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>);

}
import { LeftPanel } from './LeftPanel';
import { BasicInfoTab } from './BasicInfoTab';
import { MedicalTab } from './MedicalTab';
import { EInvoiceTab } from './EInvoiceTab';
export interface AddCustomerFormProps {
  readonly initialData?: Partial<CustomerFormData>;
  readonly customerRef?: string | null;
  readonly customerId?: string;
  readonly onSubmit: (data: CustomerFormData) => void | Promise<void>;
  readonly onCancel: () => void;
  readonly onPendingFaceImage?: (image: Blob | null) => void;
  readonly isEdit?: boolean;
  readonly canEdit?: boolean;
}


export function AddCustomerForm(props: AddCustomerFormProps) {
  const formApi = useAddCustomerForm(props);
  const {
    t, isEdit, customerId, formData, set, activeTab, setActiveTab, isSubmitting,
    showRegisterModal, setShowRegisterModal, register, handleSubmit, onCancel,
    phoneCheck, emailCheck, apiErrorDetail, setApiErrorDetail
  } = formApi;
  return (
    <div className="flex flex-col bg-gray-50/50 overflow-hidden flex-1" onWheel={(e) => e.stopPropagation()}>
      {/* ═══════════════════════════════════════════════════════════════════════════════
           HEADER — Appointment module style (icon + title + subtitle)
          ═══════════════════════════════════════════════════════════════════════════════ */}
      <div className="relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 flex-shrink-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              {isEdit ?
              <Edit2 className="w-5 h-5 text-white" /> :

              <CalendarPlus className="w-5 h-5 text-white" />
              }
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEdit ? t('editCustomer') : t('addCustomer')}
              </h2>
              <p className="text-sm text-orange-100 mt-0.5">
                {isEdit ? t('subtitle.edit', 'Cập nhật thông tin hồ sơ bệnh nhân') : t('subtitle.create', 'Tạo hồ sơ bệnh nhân mới')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
            
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 overflow-hidden">
        <LeftPanel formApi={formApi} />
        {/* ══ RIGHT PANEL ═══════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 flex-shrink-0 px-6 bg-gray-50/30">
            {TABS.map((tab) =>
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === tab.id ?
              'border-orange-500 text-orange-600' :
              'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
              }>
              
                {t(tab.labelKey)}
              </button>
            )}
          </div>

          {/* API Error Detail Panel */}
          {apiErrorDetail &&
          <ApiErrorPanel detail={apiErrorDetail} onDismiss={() => setApiErrorDetail(null)} />
          }

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-8 py-6 custom-scrollbar">
            {activeTab === 'basic' &&
            <>
                <BasicInfoTab formApi={formApi} />
                {/* Notes — moved from left panel for better balance */}
                <CardSection title={t('form.notes')} icon={FileText} maxHeight="180px">
                  <textarea
                  value={formData.note}
                  onChange={(e) => set('note', e.target.value)}
                  placeholder={t('notesPlaceholder', 'Ghi chú về khách hàng...')}
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none transition-all hover:border-gray-300" />
                
                </CardSection>
              </>
            }
            {activeTab === 'medical' &&
            <MedicalTab formApi={formApi} />
            }
            {activeTab === 'einvoice' &&
            <EInvoiceTab formApi={formApi} />
            }
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-gray-200 flex-shrink-0 bg-gradient-to-b from-gray-50 to-white flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
              
              {t('close', 'Close')}
            </button>
            <button
              type="submit"
              disabled={
              isSubmitting ||
              phoneCheck.status === 'checking' ||
              phoneCheck.status === 'duplicate' ||
              emailCheck.status === 'checking' ||
              emailCheck.status === 'duplicate'
              }
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25">
              
              {isSubmitting ? t('saving', 'Saving...') : isEdit ? t('update', 'Update') : t('save', 'Save')}
            </button>
          </div>
        </div>
      </form>

      <FaceCaptureModal
        isOpen={showRegisterModal}
        title={t('face.registerTitle', 'Register Face')}
        onCapture={async (imageBlob) => {
          setShowRegisterModal(false);
          if (customerId) {
            await register(customerId, imageBlob);
          }
        }}
        onCancel={() => setShowRegisterModal(false)} />
      
    </div>);

}