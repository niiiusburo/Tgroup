const DEFAULT_MAX_EDGE = 2560;
const DEFAULT_JPEG_QUALITY = 0.92;

export interface PreparedImageUpload {
  readonly file: File;
  readonly originalSize: number;
  readonly preparedSize: number;
  readonly changed: boolean;
}

export interface PrepareImageUploadOptions {
  readonly maxEdge?: number;
  readonly quality?: number;
}

function toJpegName(name: string): string {
  const cleanName = name.trim() || 'photo';
  return cleanName.replace(/\.[^.]+$/, '') + '.jpg';
}

function canPrepareInBrowser(file: File): boolean {
  return file.type.startsWith('image/') && file.type !== 'image/heic' && file.type !== 'image/heif';
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return createImageBitmap(file);
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Image preparation failed'));
    }, 'image/jpeg', quality);
  });
}

export async function prepareImageForUpload(
  file: File,
  options: PrepareImageUploadOptions = {},
): Promise<PreparedImageUpload> {
  if (!canPrepareInBrowser(file)) {
    return {
      file,
      originalSize: file.size,
      preparedSize: file.size,
      changed: false,
    };
  }

  try {
    const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE;
    const quality = options.quality ?? DEFAULT_JPEG_QUALITY;
    const bitmap = await decodeImage(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) throw new Error('Image preparation failed');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await canvasToJpeg(canvas, quality);
    const preparedFile = new File([blob], toJpegName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    return {
      file: preparedFile,
      originalSize: file.size,
      preparedSize: preparedFile.size,
      changed: preparedFile.size !== file.size || preparedFile.type !== file.type || preparedFile.name !== file.name,
    };
  } catch {
    return {
      file,
      originalSize: file.size,
      preparedSize: file.size,
      changed: false,
    };
  }
}

export function formatUploadBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}
