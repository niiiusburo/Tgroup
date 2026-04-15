import type { PermissionGroup } from '@/lib/api';

interface TierSelectorProps {
  readonly value: string;
  readonly onChange: (tierId: string) => void;
  readonly tiers: PermissionGroup[];
  readonly counts?: Record<string, number>;
}

export function TierSelector({ value, onChange, tiers, counts }: TierSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange('all')}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          value === 'all'
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        All Tiers
        {counts && <span className="ml-1.5 text-[10px] opacity-70">({counts['all'] ?? 0})</span>}
      </button>
      {tiers.map((tier) => {
        const isSelected = value === tier.id;
        return (
          <button
            key={tier.id}
            onClick={() => onChange(tier.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isSelected
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={isSelected ? { backgroundColor: tier.color } : undefined}
          >
            {tier.name}
            {counts && <span className="ml-1.5 text-[10px] opacity-70">({counts[tier.id] ?? 0})</span>}
          </button>
        );
      })}
    </div>
  );
}
