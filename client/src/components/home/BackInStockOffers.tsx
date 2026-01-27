import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { productsApi } from '../../api/products';
import type { Product } from '../../types/api';
import { ProductCard } from '../product/ProductCard';
import { isInStock } from '../../utils/productStatus';

const MAX_BACK_IN_STOCK_PRODUCTS = 24;
const SCROLL_SPEED = 0.5; // pixels per frame (scrolls LEFT - opposite direction)
const ITEMS_PER_SCROLL = 3; // items to scroll when arrow clicked

type ArrowDirection = 'left' | 'right';

const CarouselArrow: React.FC<{
  direction: ArrowDirection;
  onClick: () => void;
  disabled?: boolean;
}> = ({ direction, onClick, disabled = false }) => {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  const label = direction === 'left' ? 'Previous products' : 'Next products';

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      aria-label={label}
      className={[
        'flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-md backdrop-blur transition',
        'hover:bg-white hover:shadow-lg hover:border-slate-300',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/90 disabled:hover:shadow-md',
      ].join(' ')}
    >
      <Icon className="h-5 w-5 text-red-600" />
    </button>
  );
};

export const BackInStockOffers: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isAtStart, setIsAtStart] = useState(false);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const scrollPositionRef = useRef(0);
  const initializedRef = useRef(false);
  const itemWidthRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const loadBackInStockProducts = async () => {
      try {
        const response = await productsApi.list({
          backInStock: true,
          sort: 'restocked',
          limit: MAX_BACK_IN_STOCK_PRODUCTS,
        });

        const list = (response.products ?? []).filter(isInStock).slice(0, MAX_BACK_IN_STOCK_PRODUCTS);

        if (isMounted) {
          setProducts(list);
        }
      } catch (error) {
        console.error('Failed to load back in stock products', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadBackInStockProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const shouldScroll = products.length > 5;

  // Calculate item width for arrow navigation
  useEffect(() => {
    const updateItemWidth = () => {
      const scrollContainer = scrollRef.current;
      if (!scrollContainer) return;
      const firstItem = scrollContainer.querySelector('[data-product-item]') as HTMLElement;
      if (firstItem) {
        // Include gap (16px = gap-4)
        itemWidthRef.current = firstItem.offsetWidth + 16;
      }
    };

    updateItemWidth();
    window.addEventListener('resize', updateItemWidth);
    return () => window.removeEventListener('resize', updateItemWidth);
  }, [products]);

  // Continuous scroll animation (only when > 5 products, scrolls LEFT)
  useEffect(() => {
    if (!shouldScroll || isPaused) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    // Initialize position to start from the middle for reverse scrolling
    if (!initializedRef.current) {
      const halfWidth = scrollContainer.scrollWidth / 2;
      scrollPositionRef.current = halfWidth;
      initializedRef.current = true;
    }

    const animate = () => {
      if (!scrollContainer) return;

      const halfWidth = scrollContainer.scrollWidth / 2;

      // Scroll in opposite direction (decrease position)
      scrollPositionRef.current -= SCROLL_SPEED;

      if (scrollPositionRef.current <= 0) {
        scrollPositionRef.current = halfWidth;
      }

      scrollContainer.style.transform = `translateX(-${scrollPositionRef.current}px)`;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [shouldScroll, isPaused]);

  const handleArrowClick = useCallback((direction: 'left' | 'right') => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || !shouldScroll) return;

    // Pause auto-scroll for 3 seconds to distinguish from continuous scroll
    setIsPaused(true);

    const scrollAmount = itemWidthRef.current * ITEMS_PER_SCROLL;
    const halfWidth = scrollContainer.scrollWidth / 2;

    let newPosition = scrollPositionRef.current;
    if (direction === 'right') {
      newPosition += scrollAmount;
    } else {
      newPosition -= scrollAmount;
    }

    // Clamp to boundaries (no wrap-around for manual scrolling)
    const minPosition = 0;
    const maxPosition = halfWidth;

    // Check if we're at boundaries and show visual feedback
    if (newPosition <= minPosition) {
      newPosition = minPosition;
      setIsAtStart(true);
      setIsAtEnd(false);
      // Bounce effect at start
      scrollContainer.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
      scrollContainer.style.transform = `translateX(${Math.min(20, scrollAmount * 0.1)}px)`;
      setTimeout(() => {
        if (scrollContainer) {
          scrollContainer.style.transition = 'transform 0.3s ease-out';
          scrollContainer.style.transform = `translateX(-${minPosition}px)`;
        }
      }, 200);
      scrollPositionRef.current = minPosition;
    } else if (newPosition >= maxPosition) {
      newPosition = maxPosition;
      setIsAtStart(false);
      setIsAtEnd(true);
      // Bounce effect at end
      scrollContainer.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
      scrollContainer.style.transform = `translateX(-${maxPosition + Math.min(20, scrollAmount * 0.1)}px)`;
      setTimeout(() => {
        if (scrollContainer) {
          scrollContainer.style.transition = 'transform 0.3s ease-out';
          scrollContainer.style.transform = `translateX(-${maxPosition}px)`;
        }
      }, 200);
      scrollPositionRef.current = maxPosition;
    } else {
      // Normal scroll within boundaries
      setIsAtStart(newPosition <= minPosition + 1);
      setIsAtEnd(newPosition >= maxPosition - 1);
      scrollPositionRef.current = newPosition;
      scrollContainer.style.transition = 'transform 0.4s ease-out';
      scrollContainer.style.transform = `translateX(-${newPosition}px)`;
    }

    // Remove transition after animation and resume auto-scroll after 3 seconds
    setTimeout(() => {
      if (scrollContainer) {
        scrollContainer.style.transition = '';
      }
      setIsPaused(false);
    }, 3000);
  }, [shouldScroll]);

  if (loading) {
    return (
      <section className="mb-8 w-[88%] mx-auto py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">Back in stock</h2>
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </section>
    );
  }

  if (!products.length) {
    return null;
  }

  // Duplicate products for seamless infinite scroll (only if scrolling)
  const displayProducts = shouldScroll ? [...products, ...products] : products;

  return (
    <section className="mb-8 w-[88%] mx-auto py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-slate-900">Back in stock</h2>
        <div className="flex items-center gap-3">
          {shouldScroll && (
            <div className="flex items-center gap-2">
              <CarouselArrow
                direction="left"
                onClick={() => handleArrowClick('left')}
                disabled={isAtStart}
              />
              <CarouselArrow
                direction="right"
                onClick={() => handleArrowClick('right')}
                disabled={isAtEnd}
              />
            </div>
          )}
          <Link
            to="/products?backInStock=true"
            className="hidden sm:inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
          >
            See all products
          </Link>
        </div>
      </div>

      {shouldScroll ? (
        <div
          className="overflow-hidden pb-8"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <div
            ref={scrollRef}
            className="flex gap-4 will-change-transform"
            style={{ width: 'max-content' }}
          >
            {displayProducts.map((product, index) => (
              <div
                key={`${product.id}-${index}`}
                data-product-item
                className="w-[calc(50vw-2rem)] sm:w-[calc(33.333vw-2rem)] md:w-[calc(25vw-2rem)] lg:w-[calc(16.666vw-2rem)] flex-shrink-0"
              >
                <ProductCard
                  product={product}
                  badge={{ label: 'Back in stock', variant: 'backInStock' }}
                  hideTags
                  imageFit="contain"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 pb-8">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              badge={{ label: 'Back in stock', variant: 'backInStock' }}
              hideTags
              imageFit="contain"
            />
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-center sm:hidden">
        <Link
          to="/products?backInStock=true"
          className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
        >
          See all products
        </Link>
      </div>
    </section>
  );
};
