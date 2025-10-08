import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { productsApi } from '../../api/products';
import { formatCurrency } from '../../utils/format';

interface CarouselItem {
  id: string | number;
  imageSrc: string;
  altText: string;
  category: string;
  offer: string | null;
  title: string | null;
  caption: string | null;
  ctaText: string;
  ctaLink: string;
  price: string | null;
}

interface SmallCardItem extends CarouselItem {
  badgeText: string | null;
}

const fallbackCarouselData: CarouselItem[] = [
  {
    id: 1,
    imageSrc: 'https://i.postimg.cc/wjQzdm7N/Screenshot-2025-04-22-161755.png',
    altText: 'Professional automotive key cutting equipment',
    category: 'AERO',
    offer: '30% OFF',
    title: 'IN-STOCK SALE',
    caption: 'Check out the great offers',
    ctaText: 'SHOP NOW',
    ctaLink: '/products',
    price: '$149.99',
  },
  {
    id: 2,
    imageSrc: 'https://m.media-amazon.com/images/I/71FzXOP+b-L._AC_UF894,1000_QL80_.jpg',
    altText: 'Advanced diagnostic tools and equipment',
    category: 'DIAGNOSTIC',
    offer: '25% OFF',
    title: 'PRO TOOLS',
    caption: 'Professional grade equipment',
    ctaText: 'SHOP NOW',
    ctaLink: '/products',
    price: '$299.99',
  },
  {
    id: 3,
    imageSrc: 'https://i.ebayimg.com/images/g/GDwAAeSwCfFnvsR7/s-l1200.jpg',
    altText: 'Premium key programming devices',
    category: 'PROGRAMMING',
    offer: '40% OFF',
    title: 'SMART KEYS',
    caption: 'Latest technology solutions',
    ctaText: 'SHOP NOW',
    ctaLink: '/products',
    price: '$459.99',
  },
];

const fallbackSmallCardsData: SmallCardItem[] = [
  {
    id: 4,
    imageSrc:
      'https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/Orange%20and%20Grey%20Modern%20Colorful%20Skinca-dddffcc.png/:/rs=w:982,h:982',
    altText: 'Placeholder graphic for bike lights',
    category: 'BIKE LIGHTING',
    offer: null,
    title: 'STAY IN SIGHT',
    caption: null,
    ctaText: 'SHOP NOW',
    ctaLink: '/products',
    price: '$45.00',
    badgeText: null,
  },
  {
    id: 5,
    imageSrc:
      'https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/Orange%20and%20Grey%20Modern%20Colorful%20Skinca-aa8fe5c.png/:/rs=w:982,h:982',
    altText: 'Placeholder graphic for bike saddle',
    category: 'ELITE BIKE SADDLE',
    offer: '10% OFF',
    title: 'SELECT SADDLE',
    caption: null,
    ctaText: 'SHOP NOW',
    ctaLink: '/products',
    price: '$89.95',
    badgeText: null,
  },
  {
    id: 6,
    imageSrc:
      'https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/Post%20de%20Instagram%20Ubicación%20y%20Horarios-e785029.png/:/rs=w:982,h:982',
    altText: 'Placeholder graphic for urban bike',
    category: 'URBAN BIKES',
    offer: null,
    title: 'FIND YOUR FAST',
    caption: null,
    ctaText: 'SHOP NOW',
    ctaLink: '/products',
    price: '$799.00',
    badgeText: 'BEST DEAL',
  },
  {
    id: 7,
    imageSrc:
      'https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/WhatsApp%20Image%202025-04-22%20at%2011.41.11_83884d2e.jpg/:/rs=w:982,h:982',
    altText: 'Placeholder graphic for pedals',
    category: 'PEDAL SET',
    offer: 'UP TO 15% OFF',
    title: null,
    caption: null,
    ctaText: 'SHOP NOW',
    ctaLink: '/products',
    price: '$64.50',
    badgeText: null,
  },
];

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

export const FeaturedProducts: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselData, setCarouselData] = useState<CarouselItem[]>(fallbackCarouselData);
  const [smallCardData, setSmallCardData] = useState<SmallCardItem[]>(fallbackSmallCardsData);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setHasError(false);
      try {
        const { products } = await productsApi.list({ tags: ['on sale'] });
        if (!isMounted || !products.length) {
          return;
        }

        const normalized = products.map<CarouselItem & { badgeText?: string | null }>((product) => ({
          id: product.id,
          imageSrc: product.images[0] ?? 'https://placehold.co/800x800/1f2937/fff?text=Product',
          altText: product.name,
          category: product.tags[0]?.toUpperCase() ?? 'FEATURED',
          offer: product.tags.includes('on sale') ? 'ON SALE' : null,
          title: product.name,
          caption: product.description ? `${product.description.slice(0, 60)}${
            product.description.length > 60 ? '…' : ''
          }` : null,
          ctaText: 'Shop Now',
          ctaLink: `/products/${product.id}`,
          price: formatCurrency(product.price ?? 0),
        }));

        const nextCarousel = normalized.slice(0, 3);
        const nextCards = normalized.slice(3, 7).map<SmallCardItem>((item) => ({
          ...item,
          badgeText: item.offer ?? null,
        }));

        if (nextCarousel.length) {
          setCarouselData(nextCarousel);
        }
        if (nextCards.length) {
          setSmallCardData(nextCards);
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

  const effectiveCarousel = useMemo(() => carouselData, [carouselData]);
  const effectiveCards = useMemo(() => smallCardData, [smallCardData]);

  useEffect(() => {
    if (currentSlide >= effectiveCarousel.length) {
      setCurrentSlide(0);
    }
  }, [currentSlide, effectiveCarousel.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.max(effectiveCarousel.length, 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) =>
      (prev - 1 + Math.max(effectiveCarousel.length, 1)) % Math.max(effectiveCarousel.length, 1)
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

  return (
    <section aria-label="Featured products" className="mx-auto mb-12 w-[88%] space-y-1">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6">
        <div className="relative overflow-hidden rounded-2xl shadow-md">
          <div className="relative h-full w-full overflow-hidden bg-slate-800">
            <div
              className="flex h-full transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {effectiveCarousel.map((card) => (
                <Link
                  key={card.id}
                  to={card.ctaLink}
                  className="group relative block h-full min-w-full"
                >
                  <img
                    src={card.imageSrc}
                    alt={card.altText}
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
                    {card.title && (
                      <h3 className="text-lg font-semibold md:text-2xl lg:text-3xl">{card.title}</h3>
                    )}
                    {card.caption && (
                      <p className="text-xs text-slate-200 md:text-sm">{card.caption}</p>
                    )}
                    <StyledShopNow text={card.ctaText} />
                  </div>
                  <PriceTag price={card.price} />
                </Link>
              ))}
            </div>

            <NavArrow direction="left" onClick={prevSlide} disabled={effectiveCarousel.length <= 1} />
            <NavArrow direction="right" onClick={nextSlide} disabled={effectiveCarousel.length <= 1} />

            <CarouselIndicators total={effectiveCarousel.length} current={currentSlide} onSelect={goToSlide} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-6">
          {effectiveCards.map((card) => (
            <Link
              key={card.id}
              to={card.ctaLink}
              className="group relative block overflow-hidden rounded-2xl border border-transparent shadow-md transition-all duration-300 hover:border-red-600 md:border-2"
            >
              <div className="relative h-full w-full overflow-hidden bg-slate-700">
                <img
                  src={card.imageSrc}
                  alt={card.altText}
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
                  <StyledShopNow text={card.ctaText} />
                </div>
                <PriceTag price={card.price} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

