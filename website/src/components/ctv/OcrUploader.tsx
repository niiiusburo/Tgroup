import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { submitOcr } from '@/lib/api/ctvSignup';

interface Props {
  readonly onExtract: (data: { name?: string; dob?: string; idNumber?: string }) => void;
  readonly disabled?: boolean;
}

export function OcrUploader({ onExtract, disabled }: Props) {
  const { t } = useTranslation('ctv');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        setError(t('signup.ocrImageTooLarge'));
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const result = await submitOcr(base64);
        onExtract({
          name: result.name || undefined,
          dob: result.dob || undefined,
          idNumber: result.id_number || undefined,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    },
    [onExtract, t]
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {t('signup.idCardLabel')}
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={handleFile}
        disabled={disabled || isLoading}
        className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary-dark disabled:opacity-50"
      />
      {isLoading && (
        <p className="text-xs text-gray-500">{t('signup.ocrLoading')}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
