import { Copy, Check, Users, TrendingUp } from 'lucide-react';
import { useState, useCallback } from 'react';

/**
 * ReferralCodeDisplay — shows employee referral code and stats
 * @crossref:used-in[EmployeeProfile, CustomerForm]
 */

interface ReferralStats {
  readonly code: string;
  readonly totalReferrals: number;
  readonly activeReferrals: number;
  readonly conversionRate: number;
}

interface ReferralCodeDisplayProps {
  readonly employeeId: string;
  readonly employeeName: string;
}

function generateReferralStats(employeeId: string, name: string): ReferralStats {
  const initials = name
    .split(' ')
    .filter((p) => p.length > 1)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
  const num = employeeId.replace(/\D/g, '').padStart(3, '0');
  return {
    code: `REF-${initials}${num}`,
    totalReferrals: Math.floor(Math.random() * 30) + 5,
    activeReferrals: Math.floor(Math.random() * 15) + 2,
    conversionRate: Math.floor(Math.random() * 40) + 40,
  };
}

export function ReferralCodeDisplay({
  employeeId,
  employeeName,
}: ReferralCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const stats = generateReferralStats(employeeId, employeeName);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(stats.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [stats.code]);

  return (
    <div className="space-y-3">
      {/* Code display */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm text-gray-800 tracking-wide">
          {stats.code}
        </div>
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          title="Copy referral code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-3 h-3 text-blue-500" />
          </div>
          <p className="text-sm font-semibold text-blue-700">{stats.totalReferrals}</p>
          <p className="text-[10px] text-blue-500">Total</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-3 h-3 text-green-500" />
          </div>
          <p className="text-sm font-semibold text-green-700">{stats.activeReferrals}</p>
          <p className="text-[10px] text-green-500">Active</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-purple-500" />
          </div>
          <p className="text-sm font-semibold text-purple-700">{stats.conversionRate}%</p>
          <p className="text-[10px] text-purple-500">Convert</p>
        </div>
      </div>
    </div>
  );
}
