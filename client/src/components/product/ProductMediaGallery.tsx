import { useEffect, useMemo, useRef, useState } from 'react';
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
  thumbnail?: string;
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

const buildYouTubeEmbedUrl = (id: string, start?: number) => {
  const params = new URLSearchParams();
  if (start && start > 0) {
    params.set('start', String(start));
  }
  params.set('autoplay', '1');
  params.set('mute', '1');
  params.set('controls', '0');
  params.set('rel', '0');
  params.set('modestbranding', '1');
  params.set('playsinline', '1');
  params.set('enablejsapi', '1');
  params.set('fs', '0');
  params.set('iv_load_policy', '3');
  params.set('showinfo', '0');
  params.set('disablekb', '1');
  const query = params.toString();
  return `https://www.youtube.com/embed/${id}?${query}`;
};

const ensureYouTubeEmbedUrl = (raw: string): { embed: string; thumbnail?: string } => {
  const parsed = extractYouTubeVideo(raw);
  if (!parsed) {
    return { embed: raw };
  }
  return {
    embed: buildYouTubeEmbedUrl(parsed.id, parsed.start),
    thumbnail: `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`,
  };
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
      ...videoUrls.map((url, index) => {
        const normalized = ensureYouTubeEmbedUrl(url);
        return {
          id: `video-${index}`,
          type: 'video' as const,
          url: normalized.embed,
          label: `Video ${index + 1}`,
          thumbnail: normalized.thumbnail,
        };
      })
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
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const mainMediaRef = useRef<HTMLDivElement>(null);
  const mainImageRef = useRef<HTMLImageElement>(null);
  const [lensState, setLensState] = useState<{
    visible: boolean;
    left: number;
    top: number;
    bgX: number;
    bgY: number;
    bgW: number;
    bgH: number;
  }>({
    visible: false,
    left: 0,
    top: 0,
    bgX: 0,
    bgY: 0,
    bgW: 0,
    bgH: 0,
  });

  useEffect(() => {
    if (!mediaItems.find((item) => item.id === activeId)) {
      setActiveId(mediaItems[0]?.id ?? 'placeholder');
    }
  }, [activeId, mediaItems]);

  const activeItem = mediaItems.find((item) => item.id === activeId) ?? mediaItems[0];
  const isVideoActive = activeItem?.type === 'video';
  const isVideoPlaying = isVideoActive && playingVideoId === activeItem.id;
  const LENS_SIZE = 200;
  const ZOOM_SCALE = 1.4;

  const handleSelectMedia = (item: MediaItem) => {
    setActiveId(item.id);
    if (item.type === 'video') {
      setPlayingVideoId(item.id);
    } else {
      setPlayingVideoId(null);
    }
  };

  const renderVideoFrame = () => {
    if (!isVideoActive) {
      return null;
    }

    if (!isVideoPlaying) {
      return (
        <button
          type="button"
          onClick={() => setPlayingVideoId(activeItem.id)}
          className="group relative flex h-full w-full items-center justify-center"
        >
          <img
            src={activeItem.thumbnail || PLACEHOLDER}
            alt={`${name} video preview`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <span className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg transition group-hover:scale-105">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      );
    }

    return (
      <iframe
        src={activeItem.url}
        title={`${name} video`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="h-full w-full border-0"
      />
    );
  };

  const hasThumbnails = mediaItems.length > 1;
  const showLens = lensState.visible && !isVideoActive;

  const handleLensMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!mainMediaRef.current || !mainImageRef.current || isVideoActive) {
      return;
    }
    const container = mainMediaRef.current;
    const rect = container.getBoundingClientRect();
    const img = mainImageRef.current;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    if (!naturalWidth || !naturalHeight) {
      return;
    }

    const containerWidth = rect.width;
    const containerHeight = rect.height;
    const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
    const displayWidth = naturalWidth * scale;
    const displayHeight = naturalHeight * scale;
    const offsetX = (containerWidth - displayWidth) / 2;
    const offsetY = (containerHeight - displayHeight) / 2;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const maxLeft = Math.max(0, containerWidth - LENS_SIZE);
    const left = clamp(x - LENS_SIZE / 2, 0, maxLeft);
    const minTop = Math.max(0, offsetY);
    const maxTop = Math.min(containerHeight - LENS_SIZE, offsetY + displayHeight - LENS_SIZE);
    const safeMaxTop = Math.max(minTop, maxTop);
    const top = clamp(y - LENS_SIZE / 2, minTop, safeMaxTop);

    const clampedCenterX = clamp(x, offsetX, offsetX + displayWidth);
    const clampedCenterY = clamp(y, offsetY, offsetY + displayHeight);
    const imgX = clampedCenterX - offsetX;
    const imgY = clampedCenterY - offsetY;
    const bgX = -(imgX * ZOOM_SCALE - LENS_SIZE / 2);
    const bgY = -(imgY * ZOOM_SCALE - LENS_SIZE / 2);
    const bgMinX = Math.min(0, LENS_SIZE - displayWidth * ZOOM_SCALE);
    const bgMinY = Math.min(0, LENS_SIZE - displayHeight * ZOOM_SCALE);
    const clampedBgX = clamp(bgX, bgMinX, 0);
    const clampedBgY = clamp(bgY, bgMinY, 0);

    setLensState({
      visible: true,
      left,
      top,
      bgX: clampedBgX,
      bgY: clampedBgY,
      bgW: displayWidth * ZOOM_SCALE,
      bgH: displayHeight * ZOOM_SCALE,
    });
  };

  const handleLensLeave = () => {
    setLensState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  };

  return (
    <div
      className={cn(
        'grid gap-4',
        hasThumbnails ? 'lg:grid-cols-[88px_minmax(0,1fr)]' : 'lg:grid-cols-1'
      )}
    >
      {hasThumbnails && (
        <div className="order-2 lg:order-1">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-1 lg:gap-3 lg:max-h-[520px] lg:overflow-y-auto lg:pr-1">
            {mediaItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectMedia(item)}
                className={cn(
                  'group relative overflow-hidden rounded-xl border border-border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  activeId === item.id ? 'border-primary ring-2 ring-primary/40' : 'hover:border-primary'
                )}
                aria-label={item.label}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-white">
                  <img
                    src={item.type === 'video' ? item.thumbnail || PLACEHOLDER : item.url}
                    alt={item.label}
                    loading="lazy"
                    className="h-full w-full object-contain transition group-hover:scale-[1.02]"
                  />
                  {item.type === 'video' && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={cn('order-1', hasThumbnails ? 'lg:order-2' : undefined)}>
        <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-white p-4">
          <div
            ref={mainMediaRef}
            onMouseMove={handleLensMove}
            onMouseLeave={handleLensLeave}
            className="relative flex h-[320px] w-full items-center justify-center overflow-hidden cursor-none sm:h-[420px] lg:h-[520px]"
          >
            {activeItem?.type === 'video' ? (
              <div className="h-full w-full overflow-hidden rounded-xl bg-black">{renderVideoFrame()}</div>
            ) : (
              <img
                src={activeItem?.url ?? PLACEHOLDER}
                alt={`${name} preview`}
                className="h-full w-full object-contain"
                ref={mainImageRef}
              />
            )}

            {showLens && (
              <div
                className="pointer-events-none absolute rounded-xl border-[1px] border-red-500 shadow-[0_12px_30px_rgba(15,23,42,0.25)]"
                style={{
                  left: lensState.left,
                  top: lensState.top,
                  width: LENS_SIZE,
                  height: LENS_SIZE,
                  backgroundImage: `url(${activeItem?.url ?? PLACEHOLDER})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: `${lensState.bgW}px ${lensState.bgH}px`,
                  backgroundPosition: `${lensState.bgX}px ${lensState.bgY}px`,
                }}
              />
            )}
          </div>

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
      </div>
    </div>
  );
};
