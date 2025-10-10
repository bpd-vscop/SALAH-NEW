import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  featuredShowcaseApi,
  type FeaturedShowcaseItem,
} from '../../api/featuredShowcase';

const StyledShopNow = ({ text }: { text: string }) => (
  <div className="inline-block mt-1.5 border-b border-red-600 group-hover:border-red-600 transition-colors duration-200 md:mt-2 md:border-b-2">
    <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-white transition-colors duration-200 group-hover:text-red-600 md:text-xs">
      {text}
    </span>
  </div>
);

const PriceTag = ({ price }: { price: string | null }) => {
  if (!price) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-2 right-2 z-10 rounded bg-black/70 px-1.5 py-0 text-white shadow-sm backdrop-blur-sm md:bottom-4 md:right-4 md:rounded-md md:px-3 md:py-1 md:text-sm">
      <span className="text-[0.7rem] font-semibold md:text-inherit">{price}</span>
    </div>
  );
};

type ArrowDirection = 'left' | 'right';

const NavArrow = ({
  direction,
  onClick,
  disabled = false,
}: {
  direction: ArrowDirection;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick(event);
    }}
    disabled={disabled}
    className={`absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-xl backdrop-blur-md transition-all duration-300 md:h-12 md:w-12 lg:h-14 lg:w-14 ${
      direction === 'left' ? 'left-3 md:left-4 lg:left-6' : 'right-3 md:right-4 lg:right-6'
    } ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-105 hover:border-white/40 hover:bg-black/60'}`}
  >
    <svg
      className={`h-4 w-4 transition-colors duration-200 md:h-5 md:w-5 lg:h-6 lg:w-6 ${
        direction === 'left' ? 'rotate-180' : ''
      }`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  </button>
);

const CarouselIndicators = ({
  total,
  current,
  onSelect,
}: {
  total: number;
  current: number;
  onSelect: (index: number) => void;
}) => {
  if (total <= 1) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 space-x-1.5 md:bottom-6 lg:bottom-8">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSelect(index);
          }}
          className={`h-2 rounded-full transition-all duration-300 md:h-2.5 lg:h-3 ${
            current === index
              ? 'w-6 bg-white shadow-lg md:w-8 lg:w-10'
              : 'w-2 bg-white/50 hover:w-4 hover:bg-white/70 md:w-2.5 md:hover:w-5 lg:w-3 lg:hover:w-6'
          }`}
        />
      ))}
    </div>
  );
};

const MAX_FEATURE_SLIDES = 3;

const sortByOrder = (items: FeaturedShowcaseItem[]) =>
  [...items].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return (a.title ?? '').localeCompare(b.title ?? '');
  });

export const FeaturedProducts: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [items, setItems] = useState<FeaturedShowcaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setHasError(false);
      try {
        const response = await featuredShowcaseApi.list();
        if (isMounted) {
          setItems(response.items);
        }
      } catch (error) {
        console.error('Failed to load featured products', error);
        if (isMounted) {
          setHasError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const featureSlides = useMemo(() => {
    return sortByOrder(items.filter((item) => item.variant === 'feature')).slice(0, MAX_FEATURE_SLIDES);
  }, [items]);

  const tileItems = useMemo(() => {
    return sortByOrder(items.filter((item) => item.variant === 'tile')).slice(0, MAX_FEATURE_SLIDES);
  }, [items]);

  useEffect(() => {
    if (currentSlide >= featureSlides.length) {
      setCurrentSlide(0);
    }
  }, [currentSlide, featureSlides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.max(featureSlides.length, 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) =>
      (prev - 1 + Math.max(featureSlides.length, 1)) % Math.max(featureSlides.length, 1)
    );
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  if (loading) {
    return (
      <section aria-label="Featured products loading state" className="w-[88%] mx-auto">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6">
          <div className="aspect-square rounded-2xl bg-slate-200 animate-pulse" />
          <div className="grid grid-cols-2 gap-3 md:gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="aspect-square rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (hasError) {
    return (
      <section aria-label="Featured products unavailable" className="w-[88%] mx-auto">
        <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
          Featured products are temporarily unavailable. Please try again later.
        </div>
      </section>
    );
  }

  if (!featureSlides.length && !tileItems.length) {
    return (
      <section aria-label="Featured products" className="mx-auto mb-12 w-[88%] space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Featured Highlights</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6">
          <div className="aspect-square rounded-2xl bg-slate-200 animate-pulse" />
          <div className="grid grid-cols-2 gap-3 md:gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="aspect-square rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const gridColumnsClass = featureSlides.length ? 'md:grid-cols-2' : 'md:grid-cols-1';

  return (
    <section aria-label="Featured products" className="mx-auto mb-12 w-[88%] space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Featured Highlights</h2>
          <p className="text-sm text-muted">Showcase curated promos and spotlighted gear.</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-3 md:gap-6 ${gridColumnsClass}`}>
        {featureSlides.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl shadow-md">
            <div className="relative h-full w-full overflow-hidden bg-slate-800">
            <div
              className="flex h-full transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {featureSlides.map((card) => (
                <Link
                  key={card.id}
                  to={card.linkUrl}
                  className="group relative block h-full min-w-full"
                >
                  <img
                    src={card.image}
                    alt={card.altText || card.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-all duration-300 ease-in-out group-hover:scale-105 group-hover:brightness-75 group-hover:contrast-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-1 p-4 text-white md:p-6 lg:p-8">
                    {card.offer && (
                      <p className="text-2xl font-bold text-red-500 md:text-4xl lg:text-5xl">
                        {card.offer}
                      </p>
                    )}
                    <h3 className="text-lg font-semibold md:text-2xl lg:text-3xl">{card.title}</h3>
                    {card.subtitle && (
                      <p className="text-xs text-slate-200 md:text-sm">{card.subtitle}</p>
                    )}
                    <StyledShopNow text={card.ctaText ?? 'Shop Now'} />
                  </div>
                  <PriceTag price={card.price ? card.price : null} />
                </Link>
              ))}
            </div>

            <NavArrow direction="left" onClick={prevSlide} disabled={featureSlides.length <= 1} />
            <NavArrow direction="right" onClick={nextSlide} disabled={featureSlides.length <= 1} />

            <CarouselIndicators total={featureSlides.length} current={currentSlide} onSelect={goToSlide} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:gap-6">
          {tileItems.map((card) => (
            <Link
              key={card.id}
              to={card.linkUrl}
              className="group relative block overflow-hidden rounded-2xl border border-transparent shadow-md transition-all duration-300 hover:border-red-600 md:border-2"
            >
              <div className="relative h-full w-full overflow-hidden bg-slate-700">
                <img
                  src={card.image}
                  alt={card.altText || card.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-all duration-300 ease-in-out group-hover:scale-105 group-hover:brightness-75 group-hover:contrast-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                {card.badgeText && (
                  <div className="absolute right-2 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-center shadow md:right-3 md:top-3 md:h-14 md:w-14 lg:right-4 lg:top-4 lg:h-16 lg:w-16">
                    <span className="text-[0.55rem] font-bold uppercase text-white leading-tight md:text-xs">
                      {card.badgeText}
                    </span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-1 p-3 text-white md:p-4">
                  {card.category && (
                    <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-200 md:text-xs">
                      {card.category}
                    </p>
                  )}
                  {card.offer && !card.title && (
                    <h3 className="text-sm font-bold text-red-500 md:text-lg">{card.offer}</h3>
                  )}
                  {card.offer && card.title && (
                    <h3 className="text-sm font-bold text-white md:text-lg">
                      <span className="text-red-500">{card.offer}</span> {card.title}
                    </h3>
                  )}
                  {!card.offer && card.title && (
                    <h3 className="text-sm font-bold text-white md:text-lg">{card.title}</h3>
                  )}
                  <StyledShopNow text={card.ctaText ?? 'Shop Now'} />
                </div>
                <PriceTag price={card.price ? card.price : null} />
              </div>
            </Link>
          ))}
          {!tileItems.length && featureSlides.length > 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
              Add featured tiles from the admin dashboard to populate this grid.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
