import { Tag, Check, X, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import { MOCK_REFERRAL_CODES } from '@/data/mockCustomerForm';
import type { ReferralCode } from '@/data/mockCustomerForm';

/**
 * ReferralCodeInput - Input with validation for employee referral codes
 * @crossref:used-in[CustomerForm, EmployeeProfile]
 */

interface ReferralCodeInputProps {
  readonly value: string;
  readonly onChange: (code: string) => void;
  readonly disabled?: boolean;
  readonly error?: string;
}

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

export function ReferralCodeInput({
  value,
  onChange,
  disabled = false,
  error,
}: ReferralCodeInputProps) {
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [matchedReferral, setMatchedReferral] = useState<ReferralCode | null>(null);

  const validateCode = useCallback((code: string) => {
    if (!code.trim()) {
      setValidationState('idle');
      setMatchedReferral(null);
      return;
    }

    setValidationState('validating');

    // Simulate async validation
    setTimeout(() => {
      const found = MOCK_REFERRAL_CODES.find(
        (r) => r.code.toLowerCase() === code.trim().toLowerCase() && r.isActive,
      );
      if (found) {
        setValidationState('valid');
        setMatchedReferral(found);
      } else {
        setValidationState('invalid');
        setMatchedReferral(null);
      }
    }, 400);
  }, []);

  return (
    <div className="space-y-1">
      <div className="relative">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            validateCode(e.target.value);
          }}
          onBlur={() => validateCode(value)}
          disabled={disabled}
          placeholder="Enter referral code (optional)"
          className={`
            w-full pl-9 pr-9 py-2 rounded-lg border text-sm transition-colors duration-150
            focus:outline-none focus:ring-1
            ${disabled
              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
              : validationState === 'valid'
                ? 'border-green-400 focus:ring-green-400 focus:border-green-400'
                : validationState === 'invalid'
                  ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
                  : 'border-gray-300 focus:ring-primary focus:border-primary'
            }
          `}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {validationState === 'validating' && (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          )}
          {validationState === 'valid' && (
            <Check className="w-4 h-4 text-green-500" />
          )}
          {validationState === 'invalid' && (
            <X className="w-4 h-4 text-red-400" />
          )}
        </div>
      </div>

      {validationState === 'valid' && matchedReferral && (
        <p className="text-xs text-green-600">
          Referred by: {matchedReferral.employeeName}
        </p>
      )}
      {validationState === 'invalid' && value.trim() && (
        <p className="text-xs text-red-500">
          Invalid or inactive referral code
        </p>
      )}
      {error && validationState === 'idle' && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
