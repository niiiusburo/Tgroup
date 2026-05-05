/**
 * AddCustomerForm - TG Clinic "Thêm khách hàng" modular card-based form
 * Supports both create and edit modes.
 *
 * NOW USES FormShell module for unified modal structure.
 *
 * @crossref:used-in[Customers]
 *
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

import { useAddCustomerForm } from './useAddCustomerForm';
import { FaceCaptureModal } from '@/components/shared/FaceCaptureModal';
import { FormShell, FormHeader } from '@/components/modules/FormShell';
import { TABS } from './constants';
import { LeftPanel } from './LeftPanel';
import { BasicInfoTab } from './BasicInfoTab';
import { MedicalTab } from './MedicalTab';
import { EInvoiceTab } from './EInvoiceTab';
import { CardSection } from './CardSection';
import { FileText, Edit2, CalendarPlus } from 'lucide-react';
import type { CustomerFormData } from '@/data/mockCustomerForm';

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
    phoneCheck, emailCheck, apiErrorDetail
  } = formApi;

  const isSubmitDisabled =
    isSubmitting ||
    phoneCheck.status === 'checking' ||
    phoneCheck.status === 'duplicate' ||
    emailCheck.status === 'checking' ||
    emailCheck.status === 'duplicate';

  return (
    <FormShell onClose={onCancel} maxWidth="4xl">
      <FormHeader
        title={isEdit ? t('editCustomer') : t('addCustomer')}
        subtitle={isEdit ? t('subtitle.edit', 'Cập nhật thông tin hồ sơ bệnh nhân') : t('subtitle.create', 'Tạo hồ sơ bệnh nhân mới')}
        icon={isEdit ? <Edit2 className="w-5 h-5 text-white" /> : <CalendarPlus className="w-5 h-5 text-white" />}
        onClose={onCancel}
        isEdit={isEdit}
      />

      <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col overflow-y-auto overscroll-contain md:flex-row md:overflow-hidden" onWheel={(e) => e.stopPropagation()}>
        <LeftPanel formApi={formApi} />

        {/* RIGHT PANEL */}
        <div className="flex flex-shrink-0 flex-col overflow-visible bg-white md:min-h-0 md:flex-1 md:overflow-hidden">
          {/* Tabs */}
          <div className="flex flex-shrink-0 overflow-x-auto border-b border-gray-200 bg-gray-50/30 px-4 sm:px-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-4 text-sm font-medium border-b-2 transition-all -mb-px sm:px-6 ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>

          {/* API Error Detail Panel */}
          {apiErrorDetail && (
            <div className="mx-6 mt-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                <p className="font-semibold text-red-700">{t('errors.saveFailedTitle', 'Lỗi lưu dữ liệu')}</p>
                <p className="text-red-600 mt-1">{apiErrorDetail.message}</p>
                {apiErrorDetail.detail && (
                  <p className="text-red-500 mt-1">{apiErrorDetail.detail}</p>
                )}
                {apiErrorDetail.field && (
                  <p className="text-red-500 mt-1">
                    <code className="bg-red-100 px-1 rounded">{apiErrorDetail.field}</code>
                  </p>
                )}
                {apiErrorDetail.hint && (
                  <p className="text-orange-600 mt-1">{apiErrorDetail.hint}</p>
                )}
              </div>
            </div>
          )}

          {/* Tab content */}
          <div className="overflow-visible px-4 py-5 custom-scrollbar sm:px-6 md:flex-1 md:overflow-y-auto md:overscroll-contain lg:px-8 lg:py-6">
            {activeTab === 'basic' && (
              <>
                <BasicInfoTab formApi={formApi} />
                {/* Notes */}
                <CardSection title={t('form.notes')} icon={FileText} maxHeight="180px">
                  <textarea
                    value={formData.note}
                    onChange={(e) => set('note', e.target.value)}
                    placeholder={t('notesPlaceholder', 'Ghi chú về khách hàng...')}
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary resize-none transition-all hover:border-gray-300"
                  />
                </CardSection>
              </>
            )}
            {activeTab === 'medical' && <MedicalTab formApi={formApi} />}
            {activeTab === 'einvoice' && <EInvoiceTab formApi={formApi} />}
          </div>

          {/* Footer - Custom for AddCustomerForm due to special submit disabled logic */}
          <div className="px-4 py-4 border-t border-gray-200 flex-shrink-0 bg-gray-50 flex flex-wrap items-center justify-end gap-3 sm:px-6 sm:py-5">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
            >
              {t('close', 'Close')}
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-dark transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
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
        onCancel={() => setShowRegisterModal(false)}
      />
    </FormShell>
  );
}
