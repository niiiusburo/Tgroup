/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[Settings investors tab]
 * @crossref:uses[investorAdmin API client, DataTable]
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, Loader2, Plus, UserX, UserCheck } from 'lucide-react';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { useBusinessUnit } from '@/contexts/BusinessUnitContext';
import {
  createAdminInvestor,
  fetchAdminInvestors,
  updateAdminInvestor,
  type InvestorAdminItem,
} from '@/lib/api/investorAdmin';
import { ApiError } from '@/lib/api/core';

interface InvestorManagementProps {
  readonly canEdit?: boolean;
}

export function InvestorManagement({ canEdit = false }: InvestorManagementProps) {
  const { t } = useTranslation('investorAdmin');
  const { currentLOB } = useBusinessUnit();
  const [items, setItems] = useState<InvestorAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [investorName, setInvestorName] = useState('');
  const [lob, setLob] = useState<'dental' | 'cosmetic'>(currentLOB);
  const [creating, setCreating] = useState(false);
  const [initialPassword, setInitialPassword] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminInvestors(currentLOB);
      setItems(res.items);
    } catch {
      setError(t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [currentLOB, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setCreating(true);
    setError(null);
    try {
      const res = await createAdminInvestor({ email: email.trim(), investorName: investorName.trim(), lob });
      setItems((prev) => [res.investor, ...prev]);
      setInitialPassword(res.initialPassword || null);
      setShowCreate(false);
      setEmail('');
      setInvestorName('');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'U_DUPLICATE_EMAIL') {
        setError(t('duplicateEmail'));
      } else {
        setError(t('createError'));
      }
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(row: InvestorAdminItem) {
    if (!canEdit) return;
    const next = !row.is_active;
    if (!next && !window.confirm(t('confirmDeactivate', { email: row.email }))) return;
    setActionId(row.id);
    try {
      const res = await updateAdminInvestor(row.id, { isActive: next }, row.lob);
      setItems((prev) => prev.map((i) => (i.id === row.id ? { ...i, ...res.investor } : i)));
    } catch {
      setError(t('updateError'));
    } finally {
      setActionId(null);
    }
  }

  const columns: Column<InvestorAdminItem>[] = [
    { key: 'email', header: t('columns.email'), sortable: true, width: '22%', render: (r) => r.email },
    { key: 'name', header: t('columns.name'), sortable: true, width: '18%', render: (r) => r.investor_name || '—' },
    { key: 'lob', header: t('columns.lob'), width: '10%', render: (r) => t(`lob.${r.lob}`) },
    {
      key: 'active',
      header: t('columns.status'),
      width: '10%',
      render: (r) => (
        <span className={r.is_active ? 'text-emerald-700' : 'text-gray-500'}>
          {r.is_active ? t('status.active') : t('status.inactive')}
        </span>
      ),
    },
    {
      key: 'clients',
      header: t('columns.clients'),
      width: '10%',
      render: (r) => String(r.client_count ?? 0),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (r) =>
        canEdit ? (
          <button
            type="button"
            disabled={actionId === r.id}
            onClick={() => toggleActive(r)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
            title={r.is_active ? t('deactivate') : t('reactivate')}
          >
            {actionId === r.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : r.is_active ? (
              <UserX className="w-4 h-4" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <Briefcase className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">{t('title')}</h3>
            <p className="text-sm text-gray-500">{t('subtitle')}</p>
          </div>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => { setShowCreate(true); setLob(currentLOB); setInitialPassword(null); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            {t('create')}
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      {initialPassword && (
        <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="font-medium text-amber-900">{t('initialPasswordTitle')}</p>
          <p className="font-mono mt-1 text-amber-800">{initialPassword}</p>
          <p className="text-xs text-amber-700 mt-1">{t('initialPasswordHint')}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          keyExtractor={(row) => row.id}
          emptyMessage={t('empty')}
        />
      )}

      {showCreate && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <h4 className="text-lg font-semibold">{t('createTitle')}</h4>
            <div>
              <label className="block text-sm font-medium mb-1">{t('form.email')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('form.name')}</label>
              <input
                type="text"
                required
                value={investorName}
                onChange={(e) => setInvestorName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('form.lob')}</label>
              <select
                value={lob}
                onChange={(e) => setLob(e.target.value as 'dental' | 'cosmetic')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
              >
                <option value="dental">{t('lob.dental')}</option>
                <option value="cosmetic">{t('lob.cosmetic')}</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-primary text-white text-sm rounded-lg disabled:opacity-60"
              >
                {creating ? t('creating') : t('create')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}