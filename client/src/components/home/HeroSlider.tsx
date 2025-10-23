import { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { heroSlidesApi, type HeroSlide } from '../../api/heroSlides';

// FIXED MARGIN CONFIGURATION
// No margin needed - handled by SiteLayout padding for fixed header
const HERO_SLIDER_TOP_MARGIN = 25; // pixels

export function HeroSlider() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const loadSlides = async () => {
      setLoading(true);
      setHasError(false);
      try {
        const response = await heroSlidesApi.list();
        if (isMounted) {
          setSlides(response.slides);
          if (response.slides.length === 0) {
            setCurrentSlide(0);
          }
        }
      } catch (error) {
        console.error('Failed to fetch hero slides', error);
        if (isMounted) {
          setHasError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSlides();

    return () => {
      isMounted = false;
    };
  }, []);

  const effectiveSlides = useMemo(() => {
    return [...slides].sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.title ?? '').localeCompare(b.title ?? '');
    });
  }, [slides]);

  useEffect(() => {
    if (!effectiveSlides.length) {
      return;
    }
    if (isHovering || isAnimating) {
      return;
    }

    const interval = setInterval(() => changeSlide(1), 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide, isHovering, isAnimating, effectiveSlides.length]);

  const changeSlide = (dir: number) => {
    if (isAnimating || !effectiveSlides.length) {
      return;
    }

    setIsAnimating(true);
    setDirection(dir);

    setTimeout(() => {
      setCurrentSlide((prev) => (prev + dir + effectiveSlides.length) % effectiveSlides.length);
      setTimeout(() => setIsAnimating(false), 800);
    }, 400);
  };

  const nextSlide = () => changeSlide(1);
  const prevSlide = () => changeSlide(-1);

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentSlide || !effectiveSlides.length) {
      return;
    }
    const dir = index > currentSlide ? 1 : -1;
    setDirection(dir);
    setCurrentSlide(index);
  };

  useEffect(() => {
    if (currentSlide >= effectiveSlides.length) {
      setCurrentSlide(0);
    }
  }, [currentSlide, effectiveSlides.length]);

  const getAnimationClasses = () =>
    cn(
      'transition-all duration-1000 w-full h-full',
      isAnimating
        ? direction > 0
          ? 'scale-110 blur-sm opacity-80'
          : 'scale-90 blur-sm opacity-80'
        : 'scale-100 blur-0 opacity-100'
    );

  if (loading) {
    return (
      <div
        ref={sliderRef}
        className="w-full animate-pulse bg-slate-200 aspect-[4/3] md:aspect-[21/8] mb-6"
        style={{ marginTop: `${HERO_SLIDER_TOP_MARGIN}px` }}
      />
    );
  }

  if (hasError) {
    return (
      <div
        ref={sliderRef}
        className="border border-dashed border-border bg-background px-4 py-6 text-sm text-muted aspect-[4/3] md:aspect-[21/8] flex items-center justify-center mb-6"
        style={{ marginTop: `${HERO_SLIDER_TOP_MARGIN}px` }}
      >
        Unable to load hero slider content. Please try again later.
      </div>
    );
  }

  if (!effectiveSlides.length) {
    return (
      <div
        ref={sliderRef}
        className="w-full animate-pulse bg-slate-200 aspect-[4/3] md:aspect-[21/8] mb-6"
        style={{ marginTop: `${HERO_SLIDER_TOP_MARGIN}px` }}
      />
    );
  }

  return (
    <div
      ref={sliderRef}
      className="relative w-full cursor-pointer mb-6"
      style={{ marginTop: `${HERO_SLIDER_TOP_MARGIN}px` }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] isolate">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {effectiveSlides.map((slide, index) => (
            <Link
              key={slide.id}
              to={slide.linkUrl || '#'}
              aria-label={slide.altText || slide.title}
              className="group relative block min-w-full flex-shrink-0 overflow-hidden"
            >
              <div className="relative w-full overflow-hidden aspect-[4/3] md:aspect-[21/8]">
                <img
                  src={slide.mobileImage || slide.desktopImage}
                  alt={slide.altText || slide.title}
                  className={cn(
                    getAnimationClasses(),
                    'absolute inset-0 h-full w-full object-cover md:hidden'
                  )}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
                <img
                  src={slide.desktopImage || slide.mobileImage}
                  alt={slide.altText || slide.title}
                  className={cn(
                    getAnimationClasses(),
                    'absolute inset-0 hidden h-full w-full object-cover md:block'
                  )}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 px-6 pb-6 text-white md:px-10 md:pb-10">
                {slide.subtitle && (
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-300 md:text-sm">
                    {slide.subtitle}
                  </p>
                )}
                <h2 className="text-2xl font-semibold md:text-4xl">{slide.title}</h2>
                {slide.caption && <p className="text-sm text-slate-200 md:text-base">{slide.caption}</p>}
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-md transition-colors duration-300 group-hover:bg-white/20">
                  {slide.ctaText || 'Shop Now'}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {effectiveSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                prevSlide();
              }}
              className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 md:h-12 md:w-12"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                nextSlide();
              }}
              className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 md:h-12 md:w-12"
              aria-label="Next slide"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
              {effectiveSlides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goToSlide(index);
                  }}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300 ease-in-out',
                    currentSlide === index
                      ? 'w-6 bg-white'
                      : 'w-3 bg-white/60 hover:w-4 hover:bg-white/90'
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
