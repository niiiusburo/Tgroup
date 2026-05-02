import { useEffect, useState } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { Image as ImageIcon } from 'lucide-react';

import { fetchExternalCheckupImageBlob } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AuthenticatedCheckupImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  readonly src: string;
}

export function AuthenticatedCheckupImage({
  src,
  alt,
  className,
  ...imgProps
}: AuthenticatedCheckupImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let nextBlobUrl: string | null = null;
    setBlobUrl(null);
    setFailed(false);

    fetchExternalCheckupImageBlob(src, controller.signal)
      .then((blob) => {
        nextBlobUrl = URL.createObjectURL(blob);
        setBlobUrl(nextBlobUrl);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error('External checkup image load failed:', error);
        setFailed(true);
      });

    return () => {
      controller.abort();
      if (nextBlobUrl) URL.revokeObjectURL(nextBlobUrl);
    };
  }, [src]);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          'flex items-center justify-center bg-red-50 text-red-500 text-xs',
          className,
        )}
      >
        <ImageIcon className="h-5 w-5" aria-hidden="true" />
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn('animate-pulse bg-gray-100', className)}
      />
    );
  }

  return <img {...imgProps} src={blobUrl} alt={alt} className={className} />;
}
