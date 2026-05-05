import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, X } from 'lucide-react';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import type { ApiCompany, ApiProduct, ApiProductCategory } from '@/lib/api';

export interface ServiceFormData {
  name: string;
  defaultcode: string;
  listprice: number;
  categid: string;
  uomname: string;
  companyid: string;
}

interface ServiceFormModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: ServiceFormData) => Promise<void>;
  readonly categories: ApiProductCategory[];
  readonly companies: ApiCompany[];
  readonly initialData?: ApiProduct | null;
  readonly title: string;
}

export function ServiceFormModal({ isOpen, onClose, onSubmit, categories, companies, initialData, title }: ServiceFormModalProps) {
  const { t } = useTranslation('services');
  const { t: tc } = useTranslation('common');
  const [form, setForm] = useState<ServiceFormData>({
    name: '',
    defaultcode: '',
    listprice: 0,
    categid: '',
    uomname: t('defaultUnit'),
    companyid: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        defaultcode: initialData.defaultcode ?? '',
        listprice: initialData.listprice ? parseFloat(initialData.listprice) : 0,
        categid: initialData.categid ?? '',
        uomname: initialData.uomname ?? t('defaultUnit'),
        companyid: initialData.companyid ?? '',
      });
    } else {
      setForm({ name: '', defaultcode: '', listprice: 0, categid: '', uomname: t('defaultUnit'), companyid: '' });
    }
  }, [initialData, isOpen, t]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden bg-black/40 sm:items-center sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-4 space-y-4 sm:p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.name')} *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('columns.serviceCode')}</label>
              <input
                type="text"
                value={form.defaultcode}
                onChange={(e) => setForm({ ...form, defaultcode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('columns.uom')}</label>
              <input
                type="text"
                value={form.uomname}
                onChange={(e) => setForm({ ...form, uomname: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('columns.listPrice')}</label>
            <CurrencyInput
              value={form.listprice}
              onChange={(v) => setForm({ ...form, listprice: v ?? 0 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('columns.category')}</label>
            <select
              value={form.categid}
              onChange={(e) => setForm({ ...form, categid: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
            >
              <option value="">-- {tc('form.selectOption')} --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.location')}</label>
            <select
              value={form.companyid}
              onChange={(e) => setForm({ ...form, companyid: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
            >
              <option value="">{t('allLocations')}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="sticky bottom-[-1rem] -mx-4 -mb-4 mt-auto flex flex-col-reverse justify-end gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:static sm:mx-0 sm:mb-0 sm:flex-row sm:border-t-0 sm:bg-transparent sm:p-0 sm:pt-2">
            <button type="button" onClick={onClose} className="min-h-11 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              {tc('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialData ? tc('update') : tc('add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modal, document.body);
  }
  return modal;
}

interface CategoryAddModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (name: string) => Promise<void>;
}

export function CategoryAddModal({ isOpen, onClose, onSubmit }: CategoryAddModalProps) {
  const { t } = useTranslation('services');
  const { t: tc } = useTranslation('common');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (isOpen) setName(''); }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit(name.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden bg-black/40 sm:items-center sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full max-w-sm flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
          <h3 className="text-lg font-semibold text-gray-900">{t('addCategory')}</h3>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-4 space-y-4 sm:p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('categoryName')} *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
              autoFocus
              required
            />
          </div>
          <div className="sticky bottom-[-1rem] -mx-4 -mb-4 mt-auto flex flex-col-reverse justify-end gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:static sm:mx-0 sm:mb-0 sm:flex-row sm:border-t-0 sm:bg-transparent sm:p-0">
            <button type="button" onClick={onClose} className="min-h-11 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              {tc('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {tc('add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modal, document.body);
  }
  return modal;
}
