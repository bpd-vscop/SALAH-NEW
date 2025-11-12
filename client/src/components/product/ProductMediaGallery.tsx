import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../utils/cn';

interface ProductMediaGalleryProps {
  name: string;
  images?: string[];
  videoUrls?: string[];
}

type MediaItem = {
  id: string;
  type: 'image' | 'video';
  url: string;
  label: string;
};

const PLACEHOLDER = 'https://placehold.co/800x600?text=No+Image';

const parseYouTubeTimestamp = (value: string | null): number | null => {
  if (!value) return null;
  if (/^\d+$/.test(value)) {
    return Number(value);
  }
  const match = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
  if (!match) {
    return null;
  }
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  if (!hours && !minutes && !seconds) {
    return null;
  }
  return hours * 3600 + minutes * 60 + seconds;
};

const extractYouTubeVideo = (raw: string): { id: string; start?: number } | null => {
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    let videoId: string | null = null;

    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/')[2] ?? null;
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/')[2] ?? null;
      } else {
        videoId = parsed.searchParams.get('v');
      }
    }

    if (!videoId) {
      return null;
    }

    const start =
      parseYouTubeTimestamp(parsed.searchParams.get('t')) ??
      parseYouTubeTimestamp(parsed.searchParams.get('start'));

    return start ? { id: videoId, start } : { id: videoId };
  } catch {
    return null;
  }
};

const ensureYouTubeEmbedUrl = (raw: string): string => {
  const parsed = extractYouTubeVideo(raw);
  if (!parsed) {
    return raw;
  }
  const params = new URLSearchParams();
  if (parsed.start && parsed.start > 0) {
    params.set('start', String(parsed.start));
  }
  const query = params.toString();
  return `https://www.youtube.com/embed/${parsed.id}${query ? `?${query}` : ''}`;
};

const isYouTubeUrl = (raw: string): boolean => {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return (
      host === 'youtu.be' ||
      host.endsWith('.youtu.be') ||
      host === 'youtube.com' ||
      host.endsWith('.youtube.com')
    );
  } catch {
    return false;
  }
};

const buildMediaItems = (images?: string[], videoUrls?: string[]): MediaItem[] => {
  const media: MediaItem[] = [];

  if (Array.isArray(images) && images.length) {
    media.push(
      ...images.map((url, index) => ({
        id: `image-${index}`,
        type: 'image' as const,
        url,
        label: `Image ${index + 1}`,
      }))
    );
  }

  if (Array.isArray(videoUrls) && videoUrls.length) {
    media.push(
      ...videoUrls.map((url, index) => ({
        id: `video-${index}`,
        type: 'video' as const,
        url: ensureYouTubeEmbedUrl(url),
        label: `Video ${index + 1}`,
      }))
    );
  }

  if (!media.length) {
    media.push({
      id: 'placeholder',
      type: 'image',
      url: PLACEHOLDER,
      label: 'Placeholder image',
    });
  }

  return media;
};

export const ProductMediaGallery: React.FC<ProductMediaGalleryProps> = ({ name, images, videoUrls }) => {
  const mediaItems = useMemo(() => buildMediaItems(images, videoUrls), [images, videoUrls]);
  const [activeId, setActiveId] = useState<string>(mediaItems[0]?.id ?? 'placeholder');

  useEffect(() => {
    if (!mediaItems.find((item) => item.id === activeId)) {
      setActiveId(mediaItems[0]?.id ?? 'placeholder');
    }
  }, [activeId, mediaItems]);

  const activeItem = mediaItems.find((item) => item.id === activeId) ?? mediaItems[0];

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-black/5">
        {activeItem?.type === 'video' ? (
          <div className="aspect-[4/3] w-full bg-black">
            {isYouTubeUrl(activeItem.url) ? (
              <iframe
                src={activeItem.url}
                title={`${name} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full border-0"
              />
            ) : (
              <video src={activeItem.url} controls className="h-full w-full object-contain" />
            )}
          </div>
        ) : (
          <img
            src={activeItem?.url ?? PLACEHOLDER}
            alt={`${name} preview`}
            className="aspect-[4/3] w-full object-cover"
          />
        )}

        {activeItem?.type === 'video' && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3h9A1.5 1.5 0 0 1 16 4.5v11a1.5 1.5 0 0 1-2.238 1.306l-6.724-3.862A1.5 1.5 0 0 1 6 11.616V4.5Z" />
            </svg>
            Video
          </span>
        )}
      </div>

      {mediaItems.length > 1 && (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {mediaItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              className={cn(
                'group relative overflow-hidden rounded-xl border border-border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                activeId === item.id ? 'border-primary ring-2 ring-primary/40' : 'hover:border-primary'
              )}
              aria-label={item.label}
            >
              {item.type === 'video' ? (
                <div className="flex aspect-square items-center justify-center bg-black/70 text-white">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6 text-white"
                  >
                    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3h9A1.5 1.5 0 0 1 16 4.5v15a1.5 1.5 0 0 1-2.238 1.306l-9-5.167A1.5 1.5 0 0 1 4 14.333V4.5Z" />
                  </svg>
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={item.label}
                  loading="lazy"
                  className="aspect-square w-full object-cover transition group-hover:scale-[1.02]"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
