import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { manufacturersApi, type Manufacturer } from '../../api/manufacturers';

export function ManufacturerLogos() {
  const [items, setItems] = useState<Manufacturer[]>([]);
  const [paused, setPaused] = useState(false);
  const [shouldSlide, setShouldSlide] = useState(false);
  const [slideWidth, setSlideWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevShouldSlideRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { manufacturers } = await manufacturersApi.list();
        if (mounted) {
          // unique by slug
          const seen = new Set<string>();
          const unique = manufacturers
            .filter((m) => m.isActive !== false)
            .filter((m) => {
              if (seen.has(m.slug)) return false;
              seen.add(m.slug);
              return true;
            });
          setItems(unique);
        }
      } catch {
        // ignore
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  // Build or update keyframes dynamically for the measured slide width
  useEffect(() => {
    const styleId = 'manu-logos-keyframes';
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `@keyframes manuSlide {0% {transform: translateX(0);} 100% {transform: translateX(-${Math.max(0, slideWidth)}px);}} .manu-slide{animation: manuSlide 40s linear infinite;} .manu-slide.paused{animation-play-state:paused;}`;
    return () => {
      // Keep style tag for reuse; do not remove on unmount to avoid flicker when navigating
    };
  }, [slideWidth]);

  const clearResumeTimeout = () => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  };

  const scheduleResume = (delay = 500) => {
    clearResumeTimeout();
    resumeTimeoutRef.current = setTimeout(() => {
      setPaused(false);
      resumeTimeoutRef.current = null;
    }, delay);
  };

  useEffect(() => {
    return () => clearResumeTimeout();
  }, []);

  // Recalculate when items, container width, or sliding state changes
  useEffect(() => {
    const recalc = () => {
      const container = containerRef.current;
      const track = trackRef.current;
      if (!container || !track) return;
      const copies = shouldSlide ? 3 : 1;
      const totalWidth = track.scrollWidth;
      const baseWidth = copies > 0 ? totalWidth / copies : 0;
      const enable = baseWidth > container.clientWidth + 40 && items.length > 0;

      setShouldSlide((prev) => (prev === enable ? prev : enable));
      setHasOverflow((prev) => (prev === enable ? prev : enable));
      setSlideWidth(enable ? Math.max(0, baseWidth) : 0);
    };
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [items.length, shouldSlide]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (shouldSlide && !prevShouldSlideRef.current && slideWidth) {
      container.scrollLeft = slideWidth;
    } else if (!shouldSlide && prevShouldSlideRef.current) {
      container.scrollLeft = 0;
    }

    prevShouldSlideRef.current = shouldSlide;
  }, [shouldSlide, slideWidth]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !shouldSlide || !slideWidth) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const max = slideWidth * 2;
        if (container.scrollLeft <= 0) {
          container.scrollLeft += slideWidth;
        } else if (container.scrollLeft >= max) {
          container.scrollLeft -= slideWidth;
        }
        ticking = false;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [shouldSlide, slideWidth]);

  const trackItems = useMemo(
    () => (shouldSlide ? [...items, ...items, ...items] : items),
    [items, shouldSlide]
  );

  // No per-item opacity — fades handled by gradient overlays

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    clearResumeTimeout();
    setPaused(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    scheduleResume();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
    }
    scheduleResume();
  };

  // Mouse wheel horizontal scroll
  const handleWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    containerRef.current.scrollLeft += e.deltaY;
    clearResumeTimeout();
    setPaused(true);
    scheduleResume(1500);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    clearResumeTimeout();
    setPaused(true);
    setStartX(e.touches[0].pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const x = e.touches[0].pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    scheduleResume();
  };

  if (!items.length) return null;

  return (
    <section className="mb-8 w-[88%] mx-auto py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">Manufacturers</h2>
        <Link
          to="/manufacturers"
          className="hidden sm:inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
        >
          See all manufacturers
        </Link>
      </div>

      {/* No background, borders or shadow; images only */}
      <div className="relative">
        {hasOverflow && (
          <>
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-[#fafafa] to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-[#fafafa] to-transparent" />
          </>
        )}
        <div
          ref={containerRef}
          className="overflow-x-auto overflow-y-hidden select-none scrollbar-hide"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div
            ref={trackRef}
            className={`flex items-center ${shouldSlide ? 'manu-slide' : ''} ${paused ? 'paused' : ''}`}
            style={{ width: 'max-content' }}
          >
          {trackItems.map((m, idx) => (
            <Link
              key={`${m.slug}-${idx}`}
              to={`/products?manufacturerId=${m.id}`}
              className="group mx-1 sm:mx-2 flex h-16 flex-shrink-0 items-center justify-center px-4"
              aria-label={`View ${m.name}`}
              onDragStart={(e) => e.preventDefault()}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => !isDragging && setPaused(false)}
            >
              <img
                src={m.logoImage}
                alt={`${m.name} logo`}
                className="h-12 w-auto max-w-none object-contain transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                draggable={false}
              />
            </Link>
          ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center sm:hidden">
        <Link
          to="/manufacturers"
          className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
        >
          See all manufacturers
        </Link>
      </div>
    </section>
  );
}
