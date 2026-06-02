import { getUploadUrl } from '@/lib/api';

interface FeedbackAttachment {
  readonly url: string;
  readonly originalName: string;
  readonly sizeBytes: number;
}

interface AttachmentThumbnailsProps {
  readonly attachments?: FeedbackAttachment[];
}

export function AttachmentThumbnails({ attachments }: AttachmentThumbnailsProps) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((att) => {
        const src = getUploadUrl(att.url);
        return (
          <a
            key={att.url}
            href={src}
            target="_blank"
            rel="noreferrer"
            className="group relative block w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
            title={att.originalName}
          >
            <img
              src={src}
              alt={att.originalName}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                console.error('Failed to load attachment image:', src);
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </a>
        );
      })}
    </div>
  );
}
