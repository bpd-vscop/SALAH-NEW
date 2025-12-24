import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { productsApi } from '../../api/products';
import type { Product } from '../../types/api';
import { ProductCard } from '../product/ProductCard';

const MAX_ON_SALE_PRODUCTS = 24;

const getItemsPerPage = () => {
  if (typeof window === 'undefined') {
    return 5;
  }

  const width = window.innerWidth;
  if (width >= 1024) return 5; // lg
  if (width >= 768) return 4; // md
  if (width >= 640) return 3; // sm
  return 2;
};

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

export const OnSaleOffers: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState(() => getItemsPerPage());
  const [page, setPage] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    isHorizontal: false,
    preventClick: false,
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
    width: 0,
    startPage: 0,
    lastPage: 0,
  });
  const [dragging, setDragging] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadOnSaleProducts = async () => {
      try {
        const response = await productsApi.list({ onSale: true, limit: MAX_ON_SALE_PRODUCTS, sort: 'newest' });

        const isInStock = (product: Product) => {
          const quantity = product.inventory?.quantity ?? null;
          const status = product.inventory?.status ?? 'in_stock';
          return status !== 'out_of_stock' && typeof quantity === 'number' && quantity > 0;
        };

        const list = (response.products ?? []).filter(isInStock).slice(0, MAX_ON_SALE_PRODUCTS);

        if (isMounted) {
          setProducts(list);
        }
      } catch (error) {
        console.error('Failed to load on sale products', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadOnSaleProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setItemsPerPage(getItemsPerPage());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const clearResumeTimeout = () => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  };

  const scheduleResume = (delay = 2200) => {
    clearResumeTimeout();
    resumeTimeoutRef.current = setTimeout(() => {
      setAutoPaused(false);
      resumeTimeoutRef.current = null;
    }, delay);
  };

  const pauseAuto = (delay = 2200) => {
    setAutoPaused(true);
    scheduleResume(delay);
  };

  useEffect(() => {
    return () => clearResumeTimeout();
  }, []);

  const pages = useMemo(() => {
    if (!products.length) return [] as Product[][];
    const chunked: Product[][] = [];
    for (let i = 0; i < products.length; i += itemsPerPage) {
      chunked.push(products.slice(i, i + itemsPerPage));
    }
    return chunked;
  }, [products, itemsPerPage]);

  useEffect(() => {
    if (page >= pages.length) {
      setPage(0);
    }
  }, [page, pages.length]);

  const shouldLoop = products.length > 5;

  useEffect(() => {
    if (!shouldLoop || autoPaused || pages.length <= 1) return;
    const interval = setInterval(() => {
      setPage((current) => (current <= 0 ? pages.length - 1 : current - 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [autoPaused, pages.length, shouldLoop]);

  const canGoPrev = shouldLoop ? pages.length > 1 : pages.length > 1 && page > 0;
  const canGoNext = shouldLoop ? pages.length > 1 : pages.length > 1 && page < pages.length - 1;

  const beginDrag = (x: number, y: number) => {
    if (pages.length <= 1) return;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    clearResumeTimeout();
    setAutoPaused(true);
    dragRef.current.active = true;
    dragRef.current.isHorizontal = false;
    dragRef.current.preventClick = false;
    dragRef.current.startX = x;
    dragRef.current.startY = y;
    dragRef.current.deltaX = 0;
    dragRef.current.deltaY = 0;
    dragRef.current.width = viewport.clientWidth || 0;
    dragRef.current.startPage = page;
    dragRef.current.lastPage = Math.max(0, pages.length - 1);

    track.style.transition = 'none';
  };

  const updateDrag = (x: number, y: number) => {
    const track = trackRef.current;
    if (!dragRef.current.active || !track) return;

    const dx = x - dragRef.current.startX;
    const dy = y - dragRef.current.startY;
    dragRef.current.deltaX = dx;
    dragRef.current.deltaY = dy;

    if (!dragRef.current.isHorizontal) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        return;
      }
      if (Math.abs(dy) > Math.abs(dx)) {
        dragRef.current.active = false;
        track.style.transition = '';
        track.style.transform = `translateX(-${dragRef.current.startPage * 100}%)`;
        setDragging(false);
        return;
      }
      dragRef.current.isHorizontal = true;
      setDragging(true);
    }

    dragRef.current.preventClick = Math.abs(dx) > 6;

    let offset = dx;
    if (dragRef.current.startPage === 0 && offset > 0) {
      offset *= 0.35;
    } else if (dragRef.current.startPage === dragRef.current.lastPage && offset < 0) {
      offset *= 0.35;
    }

    const base = -(dragRef.current.startPage * dragRef.current.width);
    track.style.transform = `translateX(${base + offset}px)`;
  };

  const endDrag = () => {
    const track = trackRef.current;
    if (!dragRef.current.active || !track) return;

    dragRef.current.active = false;
    track.style.transition = '';

    const width = dragRef.current.width || viewportRef.current?.clientWidth || 0;
    const threshold = Math.min(160, width * 0.2);
    const dx = dragRef.current.deltaX;

    let nextPage = dragRef.current.startPage;
    if (dx < -threshold && dragRef.current.startPage < dragRef.current.lastPage) {
      nextPage = dragRef.current.startPage + 1;
    } else if (dx > threshold && dragRef.current.startPage > 0) {
      nextPage = dragRef.current.startPage - 1;
    }

    track.style.transform = `translateX(-${nextPage * 100}%)`;
    setDragging(false);

    if (nextPage !== dragRef.current.startPage) {
      setPage(nextPage);
    }
    scheduleResume();
  };

  if (loading) {
    return (
      <section className="mb-8 w-[88%] mx-auto py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">On sale</h2>
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: itemsPerPage }).map((_, index) => (
            <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </section>
    );
  }

  if (!products.length) {
    return null;
  }

  return (
    <section className="mb-8 w-[88%] mx-auto py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-slate-900">On sale</h2>
        <div className="flex items-center gap-3">
          {pages.length > 1 && (
            <div className="flex items-center gap-2">
              <CarouselArrow
                direction="left"
                onClick={() => {
                  pauseAuto();
                  setPage((current) =>
                    shouldLoop ? (current <= 0 ? pages.length - 1 : current - 1) : Math.max(0, current - 1)
                  );
                }}
                disabled={!canGoPrev}
              />
              <CarouselArrow
                direction="right"
                onClick={() => {
                  pauseAuto();
                  setPage((current) =>
                    shouldLoop ? (current >= pages.length - 1 ? 0 : current + 1) : Math.min(pages.length - 1, current + 1)
                  );
                }}
                disabled={!canGoNext}
              />
            </div>
          )}
          <Link
            to="/products?onSale=true"
            className="hidden sm:inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
          >
            See all products
          </Link>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="overflow-hidden select-none pb-8"
        onMouseEnter={() => {
          clearResumeTimeout();
          setAutoPaused(true);
        }}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          beginDrag(event.clientX, event.clientY);
        }}
        onMouseMove={(event) => updateDrag(event.clientX, event.clientY)}
        onMouseUp={endDrag}
        onMouseLeave={() => {
          endDrag();
          setAutoPaused(false);
        }}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          if (!touch) return;
          beginDrag(touch.clientX, touch.clientY);
        }}
        onTouchMove={(event) => {
          const touch = event.touches[0];
          if (!touch) return;
          updateDrag(touch.clientX, touch.clientY);
        }}
        onTouchEnd={endDrag}
        onClickCapture={(event) => {
          if (dragRef.current.preventClick) {
            event.preventDefault();
            event.stopPropagation();
            dragRef.current.preventClick = false;
          }
        }}
        style={{
          cursor: dragging ? 'grabbing' : pages.length > 1 ? 'grab' : undefined,
          userSelect: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          ref={trackRef}
          className="flex w-full transition-transform duration-500 ease-in-out will-change-transform"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {pages.map((pageProducts, index) => (
            <div key={index} className="min-w-full">
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {pageProducts.map((product) => (
                  <ProductCard key={product.id} product={product} badge={{ label: 'On sale', variant: 'onSale' }} hideTags />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-center sm:hidden">
        <Link
          to="/products?onSale=true"
          className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
        >
          See all products
        </Link>
      </div>
    </section>
  );
};
