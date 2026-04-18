import { useCallback, type ClipboardEvent } from 'react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface UsePasteImageOptions {
  onFiles: (files: File[]) => void;
  onError: (message: string) => void;
  /** Max total files allowed (including existing). Default 5 */
  maxFiles?: number;
  /** Current file count to enforce maxFiles against */
  currentCount?: number;
}

/**
 * Returns an onPaste handler that extracts images from the clipboard
 * and passes them through validation before handing them to the parent.
 *
 * Usage:
 * ```tsx
 * const handlePaste = usePasteImage({
 *   onFiles: (validated) => setFiles(prev => [...prev, ...validated]),
 *   onError: (msg) => setFileError(msg),
 *   currentCount: files.length,
 * });
 *
 * <textarea onPaste={handlePaste} ... />
 * ```
 */
export function usePasteImage({
  onFiles,
  onError,
  maxFiles = 5,
  currentCount = 0,
}: UsePasteImageOptions) {
  return useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length === 0) return;

      // Validate types
      const invalid = imageFiles.find((f) => !ALLOWED_TYPES.includes(f.type));
      if (invalid) {
        onError('Only JPG, PNG, GIF, and WEBP images are allowed.');
        return;
      }

      // Validate size
      const oversized = imageFiles.find((f) => f.size > MAX_FILE_SIZE);
      if (oversized) {
        onError('Each image must be smaller than 5 MB.');
        return;
      }

      // Validate count
      const total = currentCount + imageFiles.length;
      if (total > maxFiles) {
        onError(`You can only attach up to ${maxFiles} images.`);
        return;
      }

      onFiles(imageFiles);
    },
    [onFiles, onError, maxFiles, currentCount],
  );
}
