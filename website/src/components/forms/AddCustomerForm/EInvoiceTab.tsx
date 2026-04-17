import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';
import { FieldLabel } from './FieldLabel';
import { inputClass } from './styles';
import type { UseAddCustomerFormResult } from './useAddCustomerForm';

interface EInvoiceTabProps {
  formApi: UseAddCustomerFormResult;
}

export function EInvoiceTab({ formApi }: EInvoiceTabProps) {
  const { t } = useTranslation('customers');
  const { formData, set } = formApi;
  return (
<div className="max-w-4xl">
  <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl mb-5">
    <input
      type="checkbox"
      id="isbusinessinvoice"
      checked={formData.isbusinessinvoice}
      onChange={(e) => set('isbusinessinvoice', e.target.checked)}
      className="accent-orange-500 w-5 h-5 rounded"
    />
    <label htmlFor="isbusinessinvoice" className="text-sm font-medium text-gray-800 cursor-pointer flex-1">
      {t('einvoice.businessInvoice', 'Xuất hóa đơn doanh nghiệp')}
    </label>
  </div>

  {formData.isbusinessinvoice && (
    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="col-span-2">
        <FieldLabel>{t('einvoice.companyName', 'Tên công ty')}</FieldLabel>
        <input
          type="text"
          value={formData.unitname}
          onChange={(e) => set('unitname', e.target.value)}
          placeholder={t('einvoice.companyPlaceholder', 'Công ty TNHH...')}
          className={inputClass(false)}
        />
      </div>
      <div className="col-span-2">
        <FieldLabel>{t('einvoice.companyAddress', 'Company Address')}</FieldLabel>
        <input
          type="text"
          value={formData.unitaddress}
          onChange={(e) => set('unitaddress', e.target.value)}
          placeholder={t('einvoice.addressPlaceholder', '123 Đường...')}
          className={inputClass(false)}
        />
      </div>
      <div>
        <FieldLabel>{t('einvoice.taxCode', 'Mã số thuế')}</FieldLabel>
        <input
          type="text"
          value={formData.taxcode}
          onChange={(e) => set('taxcode', e.target.value)}
          placeholder="0123456789"
          className={inputClass(false)}
        />
      </div>
      <div>
        <FieldLabel>{t('einvoice.recipientName', 'Họ tên ngưới nhận')}</FieldLabel>
        <input
          type="text"
          value={formData.personalname}
          onChange={(e) => set('personalname', e.target.value)}
          placeholder={t('einvoice.namePlaceholder', 'Nguyễn Văn A')}
          className={inputClass(false)}
        />
      </div>
      <div>
        <FieldLabel>{t('einvoice.recipientId', 'CCCD ngưới nhận')}</FieldLabel>
        <input
          type="text"
          value={formData.personalidentitycard}
          onChange={(e) => set('personalidentitycard', e.target.value)}
          placeholder="0xxxxxxxxx"
          className={inputClass(false)}
        />
      </div>
      <div>
        <FieldLabel>{t('einvoice.personalTaxCode', 'MST cá nhân')}</FieldLabel>
        <input
          type="text"
          value={formData.personaltaxcode}
          onChange={(e) => set('personaltaxcode', e.target.value)}
          placeholder="0xxxxxxxxx"
          className={inputClass(false)}
        />
      </div>
      <div className="col-span-2">
        <FieldLabel>{t('einvoice.recipientAddress', 'Recipient Address')}</FieldLabel>
        <input
          type="text"
          value={formData.personaladdress}
          onChange={(e) => set('personaladdress', e.target.value)}
          placeholder={t('einvoice.addressPlaceholder', '123 Đường...')}
          className={inputClass(false)}
        />
      </div>
    </div>
  )}

  {!formData.isbusinessinvoice && (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <Building2 className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500">{t('einvoice.toggleHint', 'Bật tùy chọn trên để nhập thông tin hóa đơn doanh nghiệp.')}</p>
    </div>
  )}
</div>

  );
}
