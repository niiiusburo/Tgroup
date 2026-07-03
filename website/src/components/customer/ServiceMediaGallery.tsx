/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[ServiceHistoryRow expanded service view]
 * @crossref:uses[website/src/lib/api/patientMedia.ts, website/src/lib/imageUpload.ts, product-map/domains/patient-portal.yaml]
 * ServiceMediaGallery - view and upload patient treatment photos tied to a service line.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import {
  deleteMedia,
  listServiceMedia,
  uploadServiceMedia,
  type PatientMediaItem,
} from '@/lib/api/patientMedia';
import { prepareImageForUpload } from '@/lib/imageUpload';
import { useBusinessUnit } from '@/contexts/BusinessUnitContext';

interface ServiceMediaGalleryProps {
  readonly customerId: string;
  readonly serviceId: string;
  readonly canUpload?: boolean;
  readonly canDelete?: boolean;
}

const CATEGORY_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'before', label: 'Trước điều trị' },
  { key: 'after', label: 'Sau điều trị' },
  { key: 'xray', label: 'X-quang' },
  { key: 'other', label: 'Khác' },
];

function imageUrl(item: PatientMediaItem): string | undefined {
  return item.signedUrl || item.mediaUrl;
}

export function ServiceMediaGallery({
  customerId,
  serviceId,
  canUpload = false,
  canDelete = false,
}: ServiceMediaGalleryProps) {
  const { t } = useTranslation('customers');
  const { currentLOB } = useBusinessUnit();
  const [media, setMedia] = useState<PatientMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('before');
  const [label, setLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listServiceMedia(customerId, serviceId, currentLOB);
      setMedia(res.media || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mediaLoadFailed', 'Could not load images'));
    } finally {
      setLoading(false);
    }
  }, [customerId, serviceId, currentLOB, t]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const prepared = await prepareImageForUpload(selected);
    setFile(prepared.file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      await uploadServiceMedia(customerId, serviceId, file, category, label || undefined, currentLOB);
      setFile(null);
      setLabel('');
      setCategory('before');
      setShowForm(false);
      await loadMedia();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mediaUploadFailed', 'Could not upload image'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    try {
      await deleteMedia(id, currentLOB);
      await loadMedia();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mediaDeleteFailed', 'Could not delete image'));
    }
  };

  if (loading) {
    return (
      <div className="py-3 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        {t('mediaLoading', 'Loading images...')}
      </div>
    );
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <ImageIcon className="w-4 h-4 text-gray-500" />
          {t('mediaTitle', 'Treatment photos')}
          <span className="text-xs font-normal text-gray-400">({media.length})</span>
        </div>
        {canUpload && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('mediaAdd', 'Add photo')}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 text-red-700 hover:text-red-800"
          >
            <X className="w-3 h-3 inline" />
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleUpload} className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('mediaCategory', 'Type')}
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setCategory(opt.key)}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                      category === opt.key
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('mediaLabel', 'Note (optional)')}
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t('mediaLabelPlaceholder', 'e.g. Before extraction')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('mediaFile', 'Image')}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {file ? t('mediaChangeFile', 'Change image') : t('mediaChooseFile', 'Choose image')}
                </button>
                {file && (
                  <span className="text-xs text-gray-600 truncate max-w-[200px]">
                    {file.name}
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={!file || uploading}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {t('mediaUpload', 'Upload')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFile(null);
                  setLabel('');
                  setError(null);
                }}
                className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {t('cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </form>
      )}

      {media.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          {t('mediaEmpty', 'No photos for this service yet')}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {media.map((item) => {
            const url = imageUrl(item);
            const categoryLabel = CATEGORY_OPTIONS.find((c) => c.key === item.type)?.label || item.type;
            return (
              <div
                key={item.id}
                className="relative group w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-100"
              >
                {url ? (
                  <img
                    src={url}
                    alt={item.label || categoryLabel}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate">
                  {categoryLabel}
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="absolute top-1 right-1 p-1 bg-white/90 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={t('mediaDelete', 'Delete image')}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
