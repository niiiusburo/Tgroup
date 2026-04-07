import { useState, useCallback } from 'react';
import { Save, X } from 'lucide-react';
import { LocationSelector } from '@/components/shared/LocationSelector';
import { ReferralCodeInput } from '@/components/shared/ReferralCodeInput';
import { CustomerSourceDropdown } from '@/components/shared/CustomerSourceDropdown';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { MOCK_LOCATIONS } from '@/data/mockDashboard';
import {
  EMPTY_CUSTOMER_FORM,
  validateCustomerForm,
} from '@/data/mockCustomerForm';
import type { CustomerFormData, FormValidationError } from '@/data/mockCustomerForm';

/**
 * AddCustomerForm - Full customer creation/edit form
 * @crossref:used-in[Customers, QuickActionsBar]
 */

interface AddCustomerFormProps {
  readonly initialData?: CustomerFormData;
  readonly onSubmit: (data: CustomerFormData) => void;
  readonly onCancel: () => void;
  readonly isEdit?: boolean;
}

export function AddCustomerForm({
  initialData,
  onSubmit,
  onCancel,
  isEdit = false,
}: AddCustomerFormProps) {
  const [formData, setFormData] = useState<CustomerFormData>(
    initialData ?? EMPTY_CUSTOMER_FORM,
  );
  const [errors, setErrors] = useState<readonly FormValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getError = useCallback(
    (field: keyof CustomerFormData) => errors.find((e) => e.field === field)?.message,
    [errors],
  );

  const updateField = useCallback(
    <K extends keyof CustomerFormData>(field: K, value: CustomerFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => prev.filter((e) => e.field !== field));
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const validationErrors = validateCustomerForm(formData);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }
      setIsSubmitting(true);
      // Simulate API call
      setTimeout(() => {
        onSubmit(formData);
        setIsSubmitting(false);
      }, 500);
    },
    [formData, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEdit ? 'Edit Customer' : 'Add New Customer'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Profile Photo
        </label>
        <ImageUpload
          value={formData.photoUrl}
          onChange={(url) => updateField('photoUrl', url)}
        />
      </div>

      {/* Name Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            placeholder="Nguyen"
            className={`
              w-full px-3 py-2 rounded-lg border text-sm transition-colors
              focus:outline-none focus:ring-1
              ${getError('firstName')
                ? 'border-red-400 focus:ring-red-400'
                : 'border-gray-300 focus:ring-primary focus:border-primary'
              }
            `}
          />
          {getError('firstName') && (
            <p className="mt-1 text-xs text-red-500">{getError('firstName')}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            placeholder="Van A"
            className={`
              w-full px-3 py-2 rounded-lg border text-sm transition-colors
              focus:outline-none focus:ring-1
              ${getError('lastName')
                ? 'border-red-400 focus:ring-red-400'
                : 'border-gray-300 focus:ring-primary focus:border-primary'
              }
            `}
          />
          {getError('lastName') && (
            <p className="mt-1 text-xs text-red-500">{getError('lastName')}</p>
          )}
        </div>
      </div>

      {/* Contact Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="0901-111-222"
            className={`
              w-full px-3 py-2 rounded-lg border text-sm transition-colors
              focus:outline-none focus:ring-1
              ${getError('phone')
                ? 'border-red-400 focus:ring-red-400'
                : 'border-gray-300 focus:ring-primary focus:border-primary'
              }
            `}
          />
          {getError('phone') && (
            <p className="mt-1 text-xs text-red-500">{getError('phone')}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="customer@email.com"
            className={`
              w-full px-3 py-2 rounded-lg border text-sm transition-colors
              focus:outline-none focus:ring-1
              ${getError('email')
                ? 'border-red-400 focus:ring-red-400'
                : 'border-gray-300 focus:ring-primary focus:border-primary'
              }
            `}
          />
          {getError('email') && (
            <p className="mt-1 text-xs text-red-500">{getError('email')}</p>
          )}
        </div>
      </div>

      {/* Personal Info Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth
          </label>
          <input
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => updateField('dateOfBirth', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          <select
            value={formData.gender}
            onChange={(e) => updateField('gender', e.target.value as CustomerFormData['gender'])}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option value="">Select gender...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Branch Location <span className="text-red-500">*</span>
        </label>
        <LocationSelector
          locations={MOCK_LOCATIONS}
          selectedId={formData.locationId}
          onChange={(id) => updateField('locationId', id)}
          placeholder="Select branch..."
          excludeAll
        />
        {getError('locationId') && (
          <p className="mt-1 text-xs text-red-500">{getError('locationId')}</p>
        )}
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => updateField('address', e.target.value)}
          placeholder="123 Nguyen Hue, District 1, HCMC"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Source & Referral Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Source
          </label>
          <CustomerSourceDropdown
            selectedId={formData.sourceId}
            onChange={(id) => updateField('sourceId', id)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Referral Code
          </label>
          <ReferralCodeInput
            value={formData.referralCode}
            onChange={(code) => updateField('referralCode', code)}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Any additional notes about the customer..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? 'Saving...' : isEdit ? 'Update Customer' : 'Add Customer'}
        </button>
      </div>
    </form>
  );
}
