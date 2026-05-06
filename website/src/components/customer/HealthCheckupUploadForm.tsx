import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { createExternalCheckup } from '@/lib/api';
import { formatUploadBytes, prepareImageForUpload } from '@/lib/imageUpload';

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
  const [files, setFiles] = useState<File[]>([]);
  const [fileSummary, setFileSummary] = useState('');
  const [processingFiles, setProcessingFiles] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFileSummary('');
    if (selectedFiles.length === 0) {
      setFiles([]);
      return;
    }

    setProcessingFiles(true);
    try {
      const prepared = await Promise.all(selectedFiles.map((file) => prepareImageForUpload(file)));
      const preparedFiles = prepared.map((item) => item.file);
      const originalSize = prepared.reduce((sum, item) => sum + item.originalSize, 0);
      const preparedSize = prepared.reduce((sum, item) => sum + item.preparedSize, 0);
      const changedCount = prepared.filter((item) => item.changed).length;

      setFiles(preparedFiles);
      setFileSummary(
        changedCount > 0
          ? t('imageUploadOptimized', {
              count: selectedFiles.length,
              original: formatUploadBytes(originalSize),
              prepared: formatUploadBytes(preparedSize),
            })
          : t('imageUploadReady', {
              count: selectedFiles.length,
              size: formatUploadBytes(preparedSize),
            }),
      );
    } catch {
      setFiles(selectedFiles);
      setFileSummary(t('imageUploadReady', {
        count: selectedFiles.length,
        size: formatUploadBytes(selectedFiles.reduce((sum, file) => sum + file.size, 0)),
      }));
    } finally {
      setProcessingFiles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processingFiles) return;
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
        files: files.length > 0 ? files : undefined,
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
          accept="image/jpeg,image/jpg,image/pjpeg,image/png,image/heic,image/heif,image/webp,.jpg,.jpeg,.png,.heic,.heif,.webp"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-white hover:file:bg-primary-dark"
        />
        {(processingFiles || fileSummary) && (
          <p className="mt-1 text-xs text-gray-500">
            {processingFiles ? t('imageUploadPreparing') : fileSummary}
          </p>
        )}
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
          disabled={saving || processingFiles}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50"
        >
          {(saving || processingFiles) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {t('addCheckup')}
        </button>
      </div>
    </form>
  );
}
