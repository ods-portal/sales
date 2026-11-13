import { memo } from 'react';
import { ImageIcon, Video } from 'lucide-react';

interface TicketAttachmentsProps {
  images: string[];
  videos: string[];
}

function EmptyAttachment({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-3 text-[13px] text-slate-500">
      {icon} {text}
    </div>
  );
}

function TicketAttachments({ images, videos }: TicketAttachmentsProps) {
  return (
    <div className="space-y-5">
      <section aria-labelledby="ticket-images-heading">
        <h4 id="ticket-images-heading" className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          Images ({images.length})
        </h4>
        {images.length === 0 ? (
          <EmptyAttachment icon={<ImageIcon className="h-4 w-4" />} text="No images attached" />
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:gap-3">
            {images.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-square overflow-hidden rounded-xl border border-border bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                aria-label={`Open image ${i + 1} in a new tab`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Firebase URLs are not configured for next/image */}
                <img src={url} alt={`Ticket attachment ${i + 1}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </a>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="ticket-videos-heading">
        <h4 id="ticket-videos-heading" className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          Videos ({videos.length})
        </h4>
        {videos.length === 0 ? (
          <EmptyAttachment icon={<Video className="h-4 w-4" />} text="No videos attached" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {videos.map((url, i) => (
              <video
                key={url}
                src={url}
                controls
                preload="metadata"
                className="aspect-video w-full rounded-xl border border-border bg-slate-900"
                aria-label={`Ticket video ${i + 1}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default memo(TicketAttachments);
