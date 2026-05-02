/**
 * HealthCheckupGallery - Displays external health-checkup images from hosoonline.com
 * @crossref:used-in[CustomerProfile]
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Image as ImageIcon, Plus } from 'lucide-react';
import type { ExternalCheckupsResponse } from '@/lib/api';
import { AuthenticatedCheckupImage } from './AuthenticatedCheckupImage';
import { HealthCheckupEmptyState } from './HealthCheckupEmptyState';
import { HealthCheckupLightbox } from './HealthCheckupLightbox';
import { HealthCheckupUploadForm } from './HealthCheckupUploadForm';

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
          <HealthCheckupUploadForm
            customerCode={customerCode}
            onCancel={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              onUploaded?.();
            }}
            onError={setFormError}
            onSaving={setSaving}
            saving={saving}
          />
        )}

        {formError && (
          <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">
            {formError}
          </div>
        )}

        {checkups.length === 0 ? (
          <HealthCheckupEmptyState source={data?.source} message={data?.message} />
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
                    <span className="w-36 text-gray-400 shrink-0">{t('service')}</span>
                    <span className="font-medium text-gray-700">{checkup.title || '—'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-gray-400 shrink-0">{t('examiningDoctor')}</span>
                    <span className="font-medium text-gray-700">{checkup.doctor || '—'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-gray-400 shrink-0">{t('examDate')}</span>
                    <span className="font-medium text-gray-700">{formatDate(checkup.date)}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-gray-400 shrink-0">{t('examContent')}</span>
                    <span className="font-medium text-gray-700">{checkup.notes || '—'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-36 text-gray-400 shrink-0">{t('nextAppointmentDate')}</span>
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
                        <AuthenticatedCheckupImage
                          src={img.thumbnailUrl || img.url}
                          alt={img.label || 'Checkup image'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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

      {currentImage && (
        <HealthCheckupLightbox
          currentImage={currentImage}
          imageIndex={lightboxIndex}
          imageCount={currentImages.length}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}
    </>
  );
}
