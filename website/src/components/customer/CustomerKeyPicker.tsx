import { useNavigate } from "react-router-dom";
import type { PartnerResolveCandidate } from "@/lib/api/partners";

interface CustomerKeyPickerProps {
  searchedKey: string;
  matchedBy: 'ref' | 'phone';
  candidates: PartnerResolveCandidate[];
}

/**
 * Shown when /customers/:key resolves to multiple patients (rare — usually
 * siblings on a shared family phone line). Staff picks the right one;
 * the URL bar then canonicalizes to /customers/<uuid>.
 */
export function CustomerKeyPicker({ searchedKey, matchedBy, candidates }: CustomerKeyPickerProps) {
  const navigate = useNavigate();
  const matchLabel = matchedBy === 'phone' ? 'số điện thoại' : 'mã khách hàng';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">
          Có nhiều bệnh nhân khớp với {matchLabel}
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          Đang tìm: <span className="font-mono text-slate-800">{searchedKey}</span>. Vui lòng chọn đúng bệnh nhân.
        </p>

        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {candidates.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => navigate(`/customers/${c.id}`, { replace: true })}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">{c.name || '(không tên)'}</div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                    {c.code && <span className="font-mono">{c.code}</span>}
                    {c.phone && <span>{c.phone}</span>}
                  </div>
                </div>
                {c.lastUpdated && (
                  <span className="text-xs text-slate-400 shrink-0">
                    Cập nhật: {new Date(c.lastUpdated).toLocaleDateString('vi-VN')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    </div>
  );
}
