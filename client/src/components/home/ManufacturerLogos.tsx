import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { manufacturersApi, type Manufacturer } from '../../api/manufacturers';

const ITEM_TOTAL_WIDTH = 185; // px, approximate (image width + smaller gap)

export function ManufacturerLogos() {
  const [items, setItems] = useState<Manufacturer[]>([]);
  const [paused, setPaused] = useState(false);
  const [shouldSlide, setShouldSlide] = useState(false);
  const [slideWidth, setSlideWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [itemOpacities, setItemOpacities] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

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

  // Recalculate when items or container width changes
  useEffect(() => {
    const recalc = () => {
      const container = containerRef.current;
      if (!container) return;
      const containerWidth = container.clientWidth;
      const width = items.length * ITEM_TOTAL_WIDTH;
      const enable = width > containerWidth + 40; // small buffer
      setShouldSlide(enable);
      setSlideWidth(width);
    };
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [items.length]);

  const trackItems = useMemo(() => (shouldSlide ? [...items, ...items] : items), [items, shouldSlide]);

  // Calculate opacity based on distance from edges
  const calculateOpacities = () => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const fadeDistance = 100; // pixels from edge where fade starts

    const opacities = itemRefs.current.map((item) => {
      if (!item) return 0.6;

      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.left + itemRect.width / 2;
      const containerLeft = containerRect.left;
      const containerRight = containerRect.right;

      // Calculate distance from left edge
      const distFromLeft = itemCenter - containerLeft;
      // Calculate distance from right edge
      const distFromRight = containerRight - itemCenter;

      // Get minimum distance from either edge
      const minDist = Math.min(distFromLeft, distFromRight);

      // Calculate opacity: 0 at edge, 1 at fadeDistance or more
      let opacity = 0.6;
      if (minDist < 0) {
        opacity = 0;
      } else if (minDist < fadeDistance) {
        opacity = 0.6 * (minDist / fadeDistance);
      }

      return opacity;
    });

    setItemOpacities(opacities);
  };

  // Update opacities on scroll or animation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    calculateOpacities();

    const handleScroll = () => {
      calculateOpacities();
    };

    container.addEventListener('scroll', handleScroll);

    // Update opacities periodically during auto-scroll
    const interval = setInterval(calculateOpacities, 50);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, [trackItems.length]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
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
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
    }
    setPaused(false);
  };

  // Mouse wheel horizontal scroll
  const handleWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    containerRef.current.scrollLeft += e.deltaY;
    setPaused(true);

    // Resume auto-scroll after 2 seconds of no wheel activity
    const resumeTimeout = setTimeout(() => setPaused(false), 2000);
    return () => clearTimeout(resumeTimeout);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
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
    setPaused(false);
  };

  if (!items.length) return null;

  return (
    <section className="mb-12 w-[88%] mx-auto py-8">
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
      <div
        ref={containerRef}
        className="relative overflow-x-auto overflow-y-hidden select-none scrollbar-hide"
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
          style={{ width: shouldSlide ? `${trackItems.length * ITEM_TOTAL_WIDTH}px` : 'auto' }}
        >
          {trackItems.map((m, idx) => {
            const baseOpacity = itemOpacities[idx] ?? 0.6;

            return (
              <Link
                key={`${m.slug}-${idx}`}
                ref={(el) => { itemRefs.current[idx] = el; }}
                to={`/manufacturers/${m.slug}`}
                className="group mx-1 sm:mx-2 flex h-16 w-44 flex-shrink-0 items-center justify-center"
                aria-label={`View ${m.name}`}
                onDragStart={(e) => e.preventDefault()}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => !isDragging && setPaused(false)}
              >
                <img
                  src={m.logoImage}
                  alt={`${m.name} logo`}
                  className="h-12 w-full object-contain transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                  style={{ opacity: baseOpacity }}
                  draggable={false}
                />
              </Link>
            );
          })}
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
