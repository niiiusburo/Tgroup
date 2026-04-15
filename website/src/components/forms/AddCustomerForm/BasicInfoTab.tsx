import { useTranslation } from 'react-i18next';
import {
  MapPin, Briefcase, Building2, Calendar, Clock, Mail, User, Info,
  Scale, ShieldCheck, CreditCard, Plus, Globe,
} from 'lucide-react';
import { FieldLabel } from './FieldLabel';
import { AddressAutocomplete } from '@/components/shared/AddressAutocomplete';
import { ComboboxInput } from '@/components/shared/ComboboxInput';
import { DAYS, MONTHS, YEARS } from './constants';
import { inputClass, selectClass } from './styles';
import type { UseAddCustomerFormResult } from './useAddCustomerForm';
import type { CustomerFormData } from '@/data/mockCustomerForm';
import { VIET_CITIES, VIET_DISTRICTS, VIET_WARDS, TITLE_OPTIONS } from '@/data/mockCustomerForm';

interface BasicInfoTabProps {
  formApi: UseAddCustomerFormResult;
}

export function BasicInfoTab({ formApi }: BasicInfoTabProps) {
  const { t } = useTranslation('customers');
  const {
    formData, set, getError, isFieldEditable, isEdit, displayRef,
    findBestMatch, districtsForCity, wardsForDistrict, today,
    emailCheck, setFormData, setErrors,
  } = formApi;
  return (
<div className="max-w-4xl">
  <h3 className="text-sm font-semibold text-gray-800 pb-2 border-b border-gray-100 flex items-center gap-2 mb-5">
    <Info className="w-4 h-4 text-orange-500" />
    {t('section.detailInfo', 'Thông tin chi tiết')}
  </h3>

  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
    {/* DOB */}
    <div>
      <FieldLabel icon={Calendar}>{t('form.dateOfBirth')}</FieldLabel>
      <div className="flex gap-2">
        <select
          value={formData.birthday ?? ''}
          onChange={(e) => set('birthday', e.target.value ? Number(e.target.value) : null)}
          disabled={!isFieldEditable}
          className={`flex-1 ${selectClass(!isFieldEditable)}`}
        >
          <option value="">{t('date.day', 'Ngày')}</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={formData.birthmonth ?? ''}
          onChange={(e) => set('birthmonth', e.target.value ? Number(e.target.value) : null)}
          disabled={!isFieldEditable}
          className={`flex-1 ${selectClass(!isFieldEditable)}`}
        >
          <option value="">{t('date.month', 'Tháng')}</option>
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={formData.birthyear ?? ''}
          onChange={(e) => set('birthyear', e.target.value ? Number(e.target.value) : null)}
          disabled={!isFieldEditable}
          className={`flex-1 ${selectClass(!isFieldEditable)}`}
        >
          <option value="">{t('date.year', 'Năm')}</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* Created date */}
    <div>
      <FieldLabel icon={Clock}>{t('createdDate', 'Ngày tạo')}</FieldLabel>
      <input
        type="text"
        value={today}
        readOnly
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-default"
      />
    </div>

    {/* Title */}
    <div>
      <div className="flex items-center justify-between mb-2">
        <FieldLabel icon={User}>{t('form.titleLabel', 'Danh xưng')}</FieldLabel>
        <button
          type="button"
          onClick={() => alert(t('messages.titleComingSoon', 'Tính năng thêm danh xưng tuỳ chỉnh sẽ được phát triển sau'))}
          className="p-1 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <select value={formData.title} onChange={(e) => set('title', e.target.value)} className={selectClass()}>
        <option value="">-- {t('select.title', 'Chọn danh xưng')} --</option>
        {TITLE_OPTIONS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>

    {/* Customer code */}
    <div>
      <FieldLabel icon={Building2}>{t('form.customerCode', 'Mã khách hàng')}</FieldLabel>
      <input
        type="text"
        value={isEdit ? (formData.ref || displayRef || '') : (displayRef ?? t('auto', '(Tự động)'))}
        onChange={isEdit ? (e) => set('ref', e.target.value) : undefined}
        readOnly={!isEdit}
        placeholder={t('auto', '(Tự động)')}
        className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm ${
          isEdit
            ? 'bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all'
            : 'bg-gray-50 text-gray-500 cursor-default'
        }`}
      />
    </div>

    {/* Email */}
    <div>
      <FieldLabel icon={Mail}>{t('form.email')}</FieldLabel>
      <input
        type="email"
        value={formData.email}
        onChange={(e) => set('email', e.target.value)}
        placeholder="email@example.com"
        className={inputClass(!!getError('email'))}
      />
      {getError('email') && <p className="mt-1 text-xs text-red-500">{getError('email')}</p>}
      {emailCheck.status === 'error' && !getError('email') && (
        <p className="mt-1 text-xs text-gray-400">{emailCheck.message}</p>
      )}
    </div>

    {/* Country */}
    <div>
      <FieldLabel icon={Globe}>{t('form.country', 'Quốc gia')}</FieldLabel>
      <input type="text" defaultValue="Viet Nam" className={inputClass(false)} />
    </div>

    {/* Weight */}
    <div>
      <FieldLabel icon={Scale}>{t('form.weight', 'Cân nặng (Kg)')}</FieldLabel>
      <input
        type="number"
        value={formData.weight ?? ''}
        onChange={(e) => set('weight', e.target.value ? Number(e.target.value) : null)}
        placeholder="0"
        min={0}
        className={inputClass(false)}
      />
    </div>

    {/* Street */}
    <div>
      <FieldLabel icon={MapPin}>{t('form.street', 'Số nhà / Địa chỉ')}</FieldLabel>
      <AddressAutocomplete
        value={formData.street}
        onChange={(address, details) => {
          // Batch all address updates into a single setFormData call
          const updates: Partial<CustomerFormData> = {
            street: address,
          };

          if (details) {
            const matchedCity = details.city ? findBestMatch(details.city, VIET_CITIES) : null;
            if (matchedCity) {
              updates.cityname = matchedCity;

              const districts = VIET_DISTRICTS[matchedCity] || [];
              const matchedDistrict = details.district ? findBestMatch(details.district, districts) : null;
              if (matchedDistrict) {
                updates.districtname = matchedDistrict;

                const wards = VIET_WARDS[matchedDistrict] || [];
                const matchedWard = details.ward ? findBestMatch(details.ward, wards) : null;
                if (matchedWard) {
                  updates.wardname = matchedWard;
                }
              }
            }
          }

          // Update all fields at once
          setFormData((prev) => ({ ...prev, ...updates }));
          // Clear any address-related errors
          setErrors((prev) => prev.filter((e) => !['street', 'cityname', 'districtname', 'wardname'].includes(e.field)));
        }}
        placeholder={t('addressPlaceholder', 'Nhập địa chỉ (ví dụ: 123 Nguyễn Huệ...)')}
      />
      <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
        <MapPin className="w-3 h-3 text-orange-500" />
        {t('addressHint', 'Gõ địa chỉ để tự động điền Tỉnh/Thành, Quận/Huyện, Phường/Xã')}
      </p>
    </div>

    {/* Occupation */}
    <div>
      <FieldLabel icon={Briefcase}>{t('form.jobTitle', 'Nghề nghiệp')}</FieldLabel>
      <input
        type="text"
        value={formData.jobtitle}
        onChange={(e) => set('jobtitle', e.target.value)}
        placeholder={t('jobPlaceholder', 'Nhân viên văn phòng')}
        className={inputClass(false)}
      />
    </div>

    {/* Province/City */}
    <div>
      <FieldLabel icon={MapPin}>{t('form.city', 'Tỉnh/Thành')}</FieldLabel>
      <select
        value={formData.cityname}
        onChange={(e) => {
          set('cityname', e.target.value);
          set('districtname', '');
          set('wardname', '');
        }}
        className={selectClass()}
      >
        <option value="">-- {t('select.city', 'Chọn Tỉnh/Thành')} --</option>
        {VIET_CITIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>

    {/* Health insurance */}
    <div>
      <FieldLabel icon={ShieldCheck}>{t('form.healthInsurance', 'Số thẻ bảo hiểm y tế')}</FieldLabel>
      <input
        type="text"
        value={formData.healthinsurancecardnumber}
        onChange={(e) => set('healthinsurancecardnumber', e.target.value)}
        placeholder="DN4xxxxxxxx"
        className={inputClass(false)}
      />
    </div>

    {/* District */}
    <div>
      <FieldLabel icon={MapPin}>{t('form.district', 'Quận/Huyện')}</FieldLabel>
      <ComboboxInput
        value={formData.districtname}
        onChange={(value) => {
          set('districtname', value);
          // Clear ward if district changes
          if (value !== formData.districtname) {
            set('wardname', '');
          }
        }}
        options={districtsForCity}
        placeholder={t('select.districtPlaceholder', '-- Chọn hoặc nhập Quận/Huyện --')}
        disabled={!formData.cityname}
      />
      {formData.cityname && !formData.districtname && (
        <p className="mt-1 text-xs text-orange-600">
          {t('districtHint', 'Nhập hoặc chọn Quận/Huyện từ danh sách')}
        </p>
      )}
    </div>

    {/* ID / Passport */}
    <div>
      <FieldLabel icon={CreditCard}>{t('form.identity', 'Căn cước / Hộ chiếu')}</FieldLabel>
      <input
        type="text"
        value={formData.identitynumber}
        onChange={(e) => set('identitynumber', e.target.value)}
        placeholder="0xxxxxxxxx"
        className={inputClass(false)}
      />
    </div>

    {/* Ward */}
    <div>
      <FieldLabel icon={MapPin}>{t('form.ward', 'Phường/Xã')}</FieldLabel>
      <ComboboxInput
        value={formData.wardname}
        onChange={(value) => set('wardname', value)}
        options={wardsForDistrict}
        placeholder={t('select.wardPlaceholder', '-- Chọn hoặc nhập Phường/Xã --')}
        disabled={!formData.districtname}
      />
      {formData.districtname && !formData.wardname && wardsForDistrict.length > 0 && (
        <p className="mt-1 text-xs text-orange-600">
          {t('wardHint', 'Nhập hoặc chọn Phường/Xã từ danh sách')}
        </p>
      )}
    </div>
  </div>
</div>

  );
}
