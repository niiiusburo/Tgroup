/**
 * HealthCheckupGallery - Displays external health-checkup images from hosoonline.com
 * @crossref:used-in[CustomerProfile]
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Image as ImageIcon, X, ChevronLeft, ChevronRight, ExternalLink, Plus, Loader2 } from 'lucide-react';
import type { ExternalCheckupsResponse } from '@/lib/api';
import { createExternalCheckup } from '@/lib/api';

interface HealthCheckupGalleryProps {
  readonly data: ExternalCheckupsResponse | null;
  readonly isLoading?: boolean;
  readonly error?: string | null;
  readonly customerCode?: string;
  readonly onUploaded?: () => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('vi-VN');
}

export function HealthCheckupGallery({ data, isLoading, error, customerCode, onUploaded }: HealthCheckupGalleryProps) {
  const { t } = useTranslation('customers');
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [lightboxCheckup, setLightboxCheckup] = useState<number>(-1);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-4">
              <div className="h-3 w-32 bg-gray-100 rounded animate-pulse mb-3" />
              <div className="flex gap-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="w-24 h-24 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <ImageIcon className="w-4 h-4 text-red-500" />
          </div>
          <h4 className="text-sm font-semibold text-gray-700">Health Checkup Images</h4>
        </div>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const checkups = data?.checkups || [];

  const openLightbox = (checkupIdx: number, imageIdx: number) => {
    setLightboxCheckup(checkupIdx);
    setLightboxIndex(imageIdx);
  };

  const closeLightbox = () => {
    setLightboxCheckup(-1);
    setLightboxIndex(-1);
  };

  const currentImages = lightboxCheckup >= 0 ? checkups[lightboxCheckup]?.images || [] : [];
  const currentImage = currentImages[lightboxIndex];

  const nextImage = () => {
    if (lightboxIndex < currentImages.length - 1) setLightboxIndex(lightboxIndex + 1);
  };
  const prevImage = () => {
    if (lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-700">Health Checkup Images</h4>
            {data?.source === 'mock' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">Mock</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data?.patientCode && (
              <span className="text-xs text-gray-400">Code: {data.patientCode}</span>
            )}
            {customerCode && (
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('addCheckup')}
              </button>
            )}
          </div>
        </div>

        {showForm && customerCode && (
          <UploadForm
            customerCode={customerCode}
            onCancel={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              onUploaded?.();
            }}
            onError={setFormError}
            onSaving={setSaving}
            saving={saving}
            formError={formError}
          />
        )}

        {checkups.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-gray-400">No health checkup images found on hosoonline.com.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {checkups.map((checkup, cIdx) => (
              <div key={checkup.id} className="p-4 bg-white">
                {/* Title row */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-primary/10 rounded-md">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{checkup.title || t('noCheckupName')}</span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
                  <div className="flex">
                    <span className="w-36 text-gray-400 shrink-0">t('service')</span>
                    <span className="font-medium text-gray-700">{checkup.title || '—'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-gray-400 shrink-0">t('examiningDoctor')</span>
                    <span className="font-medium text-gray-700">{checkup.doctor || '—'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-gray-400 shrink-0">t('examDate')</span>
                    <span className="font-medium text-gray-700">{formatDate(checkup.date)}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-gray-400 shrink-0">t('examContent')</span>
                    <span className="font-medium text-gray-700">{checkup.notes || '—'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-gray-400 shrink-0">t('nextAppointmentDate')</span>
                    <span className="font-medium text-gray-700">{formatDate(checkup.nextAppointmentDate || '') || '—'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-gray-400 shrink-0">{t('nextAppointmentContent')}</span>
                    <span className="font-medium text-gray-700">{checkup.nextDescription || t('noDescription')}</span>
                  </div>
                </div>

                {/* Images */}
                {checkup.images.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {checkup.images.map((img, iIdx) => (
                      <button
                        key={`${cIdx}-${iIdx}`}
                        type="button"
                        onClick={() => openLightbox(cIdx, iIdx)}
                        className="group relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 hover:border-primary transition-colors"
                        title={img.label || 'View image'}
                      >
                        <img
                          src={img.thumbnailUrl || img.url}
                          alt={img.label || 'Checkup image'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        {img.label && (
                          <span className="absolute bottom-0 left-0 right-0 text-[10px] truncate px-1.5 py-0.5 bg-black/50 text-white">
                            {img.label}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {currentImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-8">
          <div className="relative bg-white rounded-xl shadow-2xl p-3 max-w-[min(520px,90vw)]">
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute -top-3 -right-3 z-50 p-1.5 rounded-full bg-white text-gray-600 shadow-lg border border-gray-100 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative">
              <img
                src={currentImage.url}
                alt={currentImage.label || 'Checkup image'}
                className="max-w-full max-h-[55vh] object-contain rounded-lg"
              />

              {lightboxIndex > 0 && (
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-50 p-1.5 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {lightboxIndex < currentImages.length - 1 && (
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-50 p-1.5 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="pt-3 text-center">
              <p className="text-xs text-gray-700 truncate px-2">
                {currentImage.label || 'Image'} ({lightboxIndex + 1} / {currentImages.length})
              </p>
              <a
                href={currentImage.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-1 text-[11px] text-gray-500 hover:text-primary underline"
              >
                <ExternalLink className="w-3 h-3" />
                Open original
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface UploadFormProps {
  readonly customerCode: string;
  readonly onCancel: () => void;
  readonly onSuccess: () => void;
  readonly onError: (msg: string | null) => void;
  readonly onSaving: (v: boolean) => void;
  readonly saving: boolean;
  readonly formError: string | null;
}

function UploadForm({ customerCode, onCancel, onSuccess, onError, onSaving, saving }: UploadFormProps) {
  const { t } = useTranslation('customers');
  const [title, setTitle] = useState('');
  const [doctor, setDoctor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
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
          <label className="block text-xs font-medium text-gray-600 mb-1">t('service')</label>
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
          <label className="block text-xs font-medium text-gray-600 mb-1">t('examiningDoctor')</label>
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
          <label className="block text-xs font-medium text-gray-600 mb-1">t('examDate')</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">t('nextAppointmentDate')</label>
          <input
            type="date"
            value={nextAppointmentDate}
            onChange={(e) => setNextAppointmentDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">t('examContent')</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder={t('form.notes', { ns: 'appointments' })}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">t('nextAppointmentContent')</label>
        <input
          type="text"
          value={nextDescription}
          onChange={(e) => setNextDescription(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder=""
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">t('attachments')</label>
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
