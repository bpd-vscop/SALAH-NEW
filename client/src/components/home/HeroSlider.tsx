import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { heroSlidesApi, type HeroSlide } from '../../api/heroSlides';

export function HeroSlider() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

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

<<<<<<< HEAD
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
=======
  const effectiveSlides = useMemo(
    () => [...slides].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)),
    [slides]
  );
>>>>>>> 43ec83810162a476f56443fb40697bc1258cc9c4

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
      'object-contain transition-all duration-1000 w-full h-full',
      isAnimating
        ? direction > 0
          ? 'scale-110 blur-sm opacity-80'
          : 'scale-90 blur-sm opacity-80'
        : 'scale-100 blur-0 opacity-100'
    );

  if (loading) {
    return (
      <div className="mx-2 mt-10 mb-6 lg:mx-8">
        <div className="aspect-[16/9] w-full animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="mx-2 mt-10 mb-6 lg:mx-8">
        <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
          Unable to load hero slider content. Please try again later.
        </div>
      </div>
    );
  }

  if (!effectiveSlides.length) {
<<<<<<< HEAD
    return (
      <div className="mx-2 mt-10 mb-6 lg:mx-8">
        <div className="aspect-[16/9] w-full animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
=======
    return null;
>>>>>>> 43ec83810162a476f56443fb40697bc1258cc9c4
  }

  return (
    <div
      className="relative mx-2 mt-10 mb-6 cursor-pointer lg:mx-8"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] isolate">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {effectiveSlides.map((slide, index) => (
            <Link
              key={slide.id}
              to={slide.linkUrl || '#'}
              aria-label={slide.altText || slide.title}
              className="group relative block min-w-full flex-shrink-0"
            >
              <div className="relative h-[40vh] w-full sm:h-auto sm:aspect-[16/9] md:aspect-[3/1]">
                <img
                  src={slide.mobileImage || slide.desktopImage}
                  alt={slide.altText || slide.title}
                  className={cn(getAnimationClasses(), 'block md:hidden sm:rounded-2xl')}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
                <img
                  src={slide.desktopImage || slide.mobileImage}
                  alt={slide.altText || slide.title}
                  className={cn(getAnimationClasses(), 'hidden md:block sm:rounded-2xl')}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-6 text-white md:p-10">
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
