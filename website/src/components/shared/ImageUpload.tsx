import { Camera, X, Upload } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';

/**
 * ImageUpload - Photo upload with preview for customer profiles
 * @crossref:used-in[AddCustomerForm, EmployeeForm, WebsiteCMS]
 */

interface ImageUploadProps {
  readonly value: string;
  readonly onChange: (url: string) => void;
  readonly disabled?: boolean;
  readonly size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
} as const;

export function ImageUpload({
  value,
  onChange,
  disabled = false,
  size = 'md',
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          onChange(result);
        }
      };
      reader.readAsDataURL(file);
    },
    [onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  return (
    <div className="flex items-center gap-4">
      <div
        className={`
          ${SIZE_MAP[size]} rounded-full relative overflow-hidden
          border-2 border-dashed transition-colors duration-150 flex-shrink-0
          ${isDragOver
            ? 'border-primary bg-primary/5'
            : value
              ? 'border-transparent'
              : 'border-gray-300 bg-gray-50'
          }
        `}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={disabled ? undefined : handleDrop}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Customer photo"
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-full opacity-0 hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>

      {!disabled && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            {value ? 'Change Photo' : 'Upload Photo'}
          </button>
          <p className="text-xs text-gray-400">JPG, PNG. Max 5MB</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
