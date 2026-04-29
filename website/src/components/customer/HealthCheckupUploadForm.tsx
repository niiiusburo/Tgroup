import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { createExternalCheckup } from '@/lib/api';

interface HealthCheckupUploadFormProps {
  readonly customerCode: string;
  readonly onCancel: () => void;
  readonly onSuccess: () => void;
  readonly onError: (msg: string | null) => void;
  readonly onSaving: (v: boolean) => void;
  readonly saving: boolean;
}

export function HealthCheckupUploadForm({
  customerCode,
  onCancel,
  onSuccess,
  onError,
  onSaving,
  saving,
}: HealthCheckupUploadFormProps) {
  const { t } = useTranslation('customers');
  const [title, setTitle] = useState('');
  const [doctor, setDoctor] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = formatter.formatToParts(now);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
    return `${get('year')}-${get('month')}-${get('day')}`;
  });
  const [notes, setNotes] = useState('');
  const [nextAppointmentDate, setNextAppointmentDate] = useState('');
  const [nextDescription, setNextDescription] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError(null);
    onSaving(true);
    try {
      await createExternalCheckup(customerCode, {
        title,
        doctor,
        date,
        notes,
        nextAppointmentDate: nextAppointmentDate || undefined,
        nextDescription: nextDescription || undefined,
        files: files ? Array.from(files) : undefined,
      });
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      onSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-50/60 border-b border-gray-100 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('service')}</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={t('form.fullName', { ns: 'customers' })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('examiningDoctor')}</label>
          <input
            type="text"
            required
            value={doctor}
            onChange={(e) => setDoctor(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={t('form.fullName', { ns: 'customers' })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('examDate')}</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('nextAppointmentDate')}</label>
          <input
            type="date"
            value={nextAppointmentDate}
            onChange={(e) => setNextAppointmentDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{t('examContent')}</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder={t('form.notes', { ns: 'appointments' })}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{t('nextAppointmentContent')}</label>
        <input
          type="text"
          value={nextDescription}
          onChange={(e) => setNextDescription(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder=""
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{t('attachments')}</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setFiles(e.target.files)}
          className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-white hover:file:bg-primary-dark"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {t('addCheckup')}
        </button>
      </div>
    </form>
  );
}
