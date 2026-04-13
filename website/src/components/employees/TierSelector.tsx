import { ALL_TIERS, TIER_LABELS, TIER_STYLES, type EmployeeTier } from '@/data/mockEmployees';

/**
 * Tier/level selector for employees
 * Note: Database doesn't have tier data, but we keep this for future use
 * @crossref:used-in[EmployeeForm, EmployeeProfile, Relationships]
 */

interface TierSelectorProps {
  readonly value: EmployeeTier | 'all';
  readonly onChange: (tier: EmployeeTier | 'all') => void;
  readonly showAll?: boolean;
  readonly counts?: Record<EmployeeTier | 'all', number>;
}

export function TierSelector({ value, onChange, showAll = true }: TierSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {showAll && (
        <button
          onClick={() => onChange('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Tiers
        </button>
      )}
      {ALL_TIERS.map((tier) => (
        <button
          key={tier}
          onClick={() => onChange(tier)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === tier
              ? TIER_STYLES[tier]
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {TIER_LABELS[tier]}
        </button>
      ))}
    </div>
  );
}
