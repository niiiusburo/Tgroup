import { useTranslation } from 'react-i18next';
import { User, Users, MapPin, Briefcase, Building2, Plus, ScanFace, X, Phone } from 'lucide-react';
import { CardSection } from './CardSection';
import { FieldLabel } from './FieldLabel';
import { CustomerCameraWidget } from '@/components/customer/CustomerCameraWidget';
import { inputClass, selectClass } from './styles';
import type { UseAddCustomerFormResult } from './useAddCustomerForm';

interface LeftPanelProps {
  formApi: UseAddCustomerFormResult;
}

export function LeftPanel({ formApi }: LeftPanelProps) {
  const { t } = useTranslation('customers');
  const {
    isFieldEditable, isEdit, customerId, formData, setFormData, setErrors, set, getError,
    nameUppercase, setNameUppercase, phoneCheck,
    pendingFaceImage, setPendingFaceImage, setShowRegisterModal, registerState, resetFace,
    companies, employees, referrerQuery, referrerResults, referrerLoading, referrerOpen,
    setReferrerOpen, referrerContainerRef, handleReferrerInputChange, handleSelectReferrer,
    handleClearReferrer, salesQuery, salesResults, salesLoading, salesOpen, setSalesOpen,
    salesContainerRef, handleSalesInputChange, handleSelectSales, handleClearSales,
    cskhQuery, cskhResults, cskhLoading, cskhOpen, setCskhOpen, cskhContainerRef,
    handleCskhInputChange, handleSelectCskh, handleClearCskh
  } = formApi;
  // LEFT PANEL
  return (
    <div className="w-full flex-shrink-0 overflow-y-auto border-b border-gray-200 bg-gray-50/30 px-4 py-4 custom-scrollbar sm:px-5 sm:py-5 md:w-72 md:border-b-0 md:border-r xl:w-80">
      {/* Card 1: Personal Info */}
      <CardSection title={t('profileSection.personalInfo', { ns: 'customers' })} icon={User} maxHeight="280px">
        <div className="flex justify-center mb-4">
          <CustomerCameraWidget
            disabled={!isFieldEditable}
            onQuickAddResult={(fields) => {
              setFormData((prev) => ({ ...prev, ...fields }));
              setErrors((prev) =>
              prev.filter((e) => !Object.keys(fields).includes(e.field))
              );
            }}
            onFaceIdResult={(customer, imageBlob) => {
              if (customer) {
                setFormData((prev) => ({ ...prev, ...customer }));
                setErrors((prev) =>
                prev.filter((e) => !Object.keys(customer).includes(e.field))
                );
                setPendingFaceImage(null);
              } else {
                setPendingFaceImage(imageBlob ?? null);
              }
            }} />
          
        </div>

        {/* Register Face button */}
        {isEdit && customerId &&
        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              resetFace();
              setShowRegisterModal(true);
            }}
            disabled={!isFieldEditable || registerState.status === 'processing'}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-all disabled:opacity-50">
            
            <ScanFace className="w-4 h-4" />
            {registerState.status === 'processing' ? t('face.registering', 'Registering...') : t('face.register', 'Register Face')}
          </button>
          {registerState.status === 'success' &&
          <p className="mt-1.5 text-[10px] text-emerald-600 text-center">{t('face.registerSuccess', 'Registration successful!')}</p>
          }
          {registerState.status === 'error' &&
          <p className="mt-1.5 text-[10px] text-red-500 text-center">
              {t((registerState as {message: string;}).message)}
            </p>
          }
        </div>
        }

      {/* No-match hint in add mode */}
      {!isEdit && pendingFaceImage &&
        <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-[10px] text-amber-700 text-center">
            {t('face.savedHint', 'Face photo saved. Fill in information and save to register.')}
          </p>
        </div>
        }

        <div className="space-y-4">
          {/* Name */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel icon={User} required>
                {t('form.fullName')}
              </FieldLabel>
              <button
                type="button"
                onClick={() => setNameUppercase((v) => !v)}
                className={`text-[10px] px-2 py-1 rounded-md border font-medium transition-colors ${
                nameUppercase ?
                'bg-orange-500 text-white border-orange-500' :
                'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`
                }>
                
                {t('uppercase', 'IN HOA')}
              </button>
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => set('name', nameUppercase ? e.target.value.toUpperCase() : e.target.value)}
              placeholder={t('form.fullName', { ns: 'customers' })}
              disabled={!isFieldEditable}
              className={inputClass(!!getError('name'), !isFieldEditable)}
              style={nameUppercase ? { textTransform: 'uppercase' } : {}} />
            
            {getError('name') && <p className="mt-1 text-xs text-red-500">{getError('name')}</p>}
          </div>

          {/* Gender */}
          <div>
            <FieldLabel icon={Users}>{t('form.gender')}</FieldLabel>
            <div className="flex gap-4">
              {(['male', 'female', 'other'] as const).map((g) =>
              <label
                key={g}
                className={`flex items-center gap-2 text-sm ${
                !isFieldEditable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`
                }>
                
                  <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={formData.gender === g}
                  onChange={() => isFieldEditable && set('gender', g)}
                  disabled={!isFieldEditable}
                  className="accent-orange-500 w-4 h-4" />
                
                  <span className="text-gray-700">{t(`form.${g}`)}</span>
                </label>
              )}
            </div>
          </div>

          {/* Phone */}
          <div>
            <FieldLabel icon={Phone} required>
              {t('form.phone')}
            </FieldLabel>
            <div className="flex gap-2">
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="0901 111 222"
                className={`${inputClass(!!getError('phone'))} flex-1`} />
              
              <button
                type="button"
                title={t("sKhnCp")}
                className="px-3 py-2 border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {getError('phone') && <p className="mt-1 text-xs text-red-500">{getError('phone')}</p>}
            {phoneCheck.status === 'error' && !getError('phone') && phoneCheck.message &&
            <p className="mt-1 text-xs text-gray-400">{t(phoneCheck.message)}</p>
            }
          </div>
        </div>
      </CardSection>

      {/* Card 2: Assignment */}
      <CardSection
        title={t('profileSection.assignments', { ns: 'customers' })}
        icon={Briefcase}
        action={<span className="text-xs text-gray-400">{employees.length} {t('employeeCount', 'nhân viên')}</span>}
        className="flex-1 min-h-0">
        
        <div className="space-y-4">
          {/* Branch */}
          <div>
            <FieldLabel icon={MapPin} required>
              {t('form.location')}
            </FieldLabel>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={formData.companyid}
                onChange={(e) => set('companyid', e.target.value)}
                className={`${selectClass()} pl-9`}>
                
                <option value="">-- {t('select.branch', 'Chọn chi nhánh')} --</option>
                {companies.map((c) =>
                <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                )}
              </select>
            </div>
            {getError('companyid') && <p className="mt-1 text-xs text-red-500">{getError('companyid')}</p>}
          </div>

          {/* Sales staff */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel icon={Users}>{t('form.salesStaff', 'Nhân viên sale')}</FieldLabel>
            </div>
            <div ref={salesContainerRef} className="relative">
              <input
                type="text"
                value={salesQuery}
                onChange={handleSalesInputChange}
                onFocus={() => setSalesOpen(true)}
                placeholder={t('salesPlaceholder', 'Nhập tên nhân viên sale...')}
                className={inputClass(false)} />
              
              {salesQuery &&
              <button
                type="button"
                onClick={handleClearSales}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                tabIndex={-1}>
                
                  <X className="w-3.5 h-3.5" />
                </button>
              }
              {salesOpen &&
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[100] max-h-60 overflow-y-auto">
                  {salesLoading ?
                <div className="px-4 py-3 text-sm text-gray-500 text-center">{t('loading', 'Searching...')}</div> :
                salesResults.length > 0 ?
                salesResults.map((emp) =>
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleSelectSales(emp)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 text-gray-700 flex flex-col gap-0.5">
                  
                        <span className="font-medium">{emp.name}</span>
                        {emp.phone && <span className="text-xs text-gray-400">{emp.phone}</span>}
                      </button>
                ) :
                salesQuery.trim().length > 0 ?
                <div className="px-4 py-3 text-sm text-gray-500 text-center">{t('noResults', 'Không tìm thấy kết quả')}</div> :
                null}
                </div>
              }
            </div>
          </div>

          {/* CSKH */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel icon={Phone}>{t('form.cskh', 'CSKH')}</FieldLabel>
            </div>
            <div ref={cskhContainerRef} className="relative">
              <input
                type="text"
                value={cskhQuery}
                onChange={handleCskhInputChange}
                onFocus={() => setCskhOpen(true)}
                placeholder={t('cskhPlaceholder', 'Nhập tên CSKH...')}
                className={inputClass(false)} />
              
              {cskhQuery &&
              <button
                type="button"
                onClick={handleClearCskh}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                tabIndex={-1}>
                
                  <X className="w-3.5 h-3.5" />
                </button>
              }
              {cskhOpen &&
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[100] max-h-60 overflow-y-auto">
                  {cskhLoading ?
                <div className="px-4 py-3 text-sm text-gray-500 text-center">{t('loading', 'Searching...')}</div> :
                cskhResults.length > 0 ?
                cskhResults.map((emp) =>
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleSelectCskh(emp)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 text-gray-700 flex flex-col gap-0.5">
                  
                        <span className="font-medium">{emp.name}</span>
                        {emp.phone && <span className="text-xs text-gray-400">{emp.phone}</span>}
                      </button>
                ) :
                cskhQuery.trim().length > 0 ?
                <div className="px-4 py-3 text-sm text-gray-500 text-center">{t('noResults', 'Không tìm thấy kết quả')}</div> :
                null}
                </div>
              }
            </div>
          </div>

          {/* Referral */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel icon={Users}>{t('form.referrer', 'Ngưới giới thiệu')}</FieldLabel>
            </div>
            <div ref={referrerContainerRef} className="relative">
              <input
                type="text"
                value={referrerQuery}
                onChange={handleReferrerInputChange}
                onFocus={() => setReferrerOpen(true)}
                placeholder={t('referrerPlaceholder', 'Nhập tên hoặc số điện thoại...')}
                className={inputClass(false)} />
              
              {referrerQuery &&
              <button
                type="button"
                onClick={handleClearReferrer}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                tabIndex={-1}>
                
                  <X className="w-3.5 h-3.5" />
                </button>
              }
              {referrerOpen &&
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[100] max-h-60 overflow-y-auto">
                  {referrerLoading ?
                <div className="px-4 py-3 text-sm text-gray-500 text-center">{t('loading', 'Searching...')}</div> :
                referrerResults.length > 0 ?
                referrerResults.map((partner) =>
                <button
                  key={partner.id}
                  type="button"
                  onClick={() => handleSelectReferrer(partner)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 text-gray-700 flex flex-col gap-0.5">
                  
                        <span className="font-medium">{partner.name}</span>
                        {partner.phone && <span className="text-xs text-gray-400">{partner.phone}</span>}
                      </button>
                ) :
                referrerQuery.trim().length > 0 ?
                <div className="px-4 py-3 text-sm text-gray-500 text-center">{t('noResults', 'Không tìm thấy kết quả')}</div> :
                null}
                </div>
              }
            </div>
          </div>

        </div>
      </CardSection>

    </div>);

}
