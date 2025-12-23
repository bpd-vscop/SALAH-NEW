import { Link } from 'react-router-dom';
import type { Product } from '../../types/api';
import { formatCurrency } from '../../utils/format';
import { useCart } from '../../context/CartContext';
import { cn } from '../../utils/cn';

type ProductCardBadgeVariant = 'inStock' | 'onSale' | 'backInStock' | 'outOfStock';

type ProductCardBadge = {
  label: string;
  variant: ProductCardBadgeVariant;
};

interface ProductCardProps {
  product: Product;
  className?: string;
  badge?: ProductCardBadge;
  hideTags?: boolean;
}

const badgeStyles: Record<
  ProductCardBadgeVariant,
  { container: string; dot: string; ping?: string; text: string }
> = {
  inStock: {
    container: 'bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.25)]',
    dot: 'bg-white',
    ping: 'bg-white/70',
    text: 'text-white',
  },
  backInStock: {
    container: 'bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 shadow-[0_10px_30px_rgba(79,70,229,0.25)]',
    dot: 'bg-white',
    ping: 'bg-white/70',
    text: 'text-white',
  },
  onSale: {
    container: 'bg-gradient-to-r from-rose-600 via-red-600 to-orange-500 shadow-[0_10px_30px_rgba(244,63,94,0.25)]',
    dot: 'bg-white',
    ping: 'bg-white/70',
    text: 'text-white',
  },
  outOfStock: {
    container: 'bg-slate-900/85 shadow-[0_10px_30px_rgba(15,23,42,0.35)]',
    dot: 'bg-red-400',
    text: 'text-white',
  },
};

const ProductBadge: React.FC<{ badge: ProductCardBadge }> = ({ badge }) => {
  const styles = badgeStyles[badge.variant];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm',
        styles.container,
        styles.text
      )}
    >
      <span className="relative flex h-2.5 w-2.5">
        {styles.ping ? (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', styles.ping)} />
        ) : null}
        <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', styles.dot)} />
      </span>
      {badge.label}
    </span>
  );
};

const isSaleActive = (product: Product) => {
  if (typeof product.salePrice !== 'number' || product.salePrice >= product.price) {
    return false;
  }

  const now = new Date();
  const startOk = product.saleStartDate ? now >= new Date(product.saleStartDate) : true;
  const endOk = product.saleEndDate ? now <= new Date(product.saleEndDate) : true;
  return startOk && endOk;
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, className, badge, hideTags = false }) => {
  const { addItem } = useCart();

  const allowBackorder = product.inventory?.allowBackorder ?? false;
  const availableQuantity = product.inventory?.quantity ?? null;
  const inventoryStatus = product.inventory?.status ?? 'in_stock';
  const outOfStock =
    inventoryStatus === 'out_of_stock' ||
    (!allowBackorder && typeof availableQuantity === 'number' && availableQuantity <= 0);

  const handleAddToCart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (outOfStock) {
      return;
    }
    addItem({ productId: product.id, quantity: 1 }, product);
  };

  const saleActive = isSaleActive(product);
  const displayPrice = saleActive ? (product.salePrice as number) : product.price;
  const effectiveBadge: ProductCardBadge | null =
    badge ?? (outOfStock ? { label: 'Out of stock', variant: 'outOfStock' } : null);

  return (
    <Link
      to={`/products/${product.id}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary',
        className
      )}
    >
      {/* Add to Cart Icon - Top Right */}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={outOfStock}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-primary shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-white/90 disabled:hover:text-primary"
        aria-label="Add to cart"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </button>

      {/* Image Container with Hover Zoom */}
      <div className="relative aspect-[10/9] w-full overflow-hidden bg-slate-100">
        <img
          src={product.images[0] ?? 'https://placehold.co/400x300?text=Product'}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
        />

        {/* Badge/Tags Overlay - Top Left */}
        {effectiveBadge ? (
          <div className="absolute left-3 top-3 z-10">
            <ProductBadge badge={effectiveBadge} />
          </div>
        ) : !hideTags && product.tags.length > 0 ? (
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Product Info */}
      <div className="flex flex-col gap-2 p-4">
        {/* Product Name - Max 2 Lines with Ellipsis */}
        <h3
          className="text-base font-semibold text-slate-900 transition-colors group-hover:text-primary overflow-hidden"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            textOverflow: 'ellipsis'
          }}
        >
          {product.name}
        </h3>

        {/* Price - Right to Left Alignment */}
        <div className="flex items-baseline justify-end gap-2">
          {saleActive && (
            <span className="text-sm text-muted line-through">
              {formatCurrency(product.price ?? 0)}
            </span>
          )}
          <span className="text-lg font-bold text-primary">
            {formatCurrency(displayPrice ?? 0)}
          </span>
        </div>
      </div>
    </Link>
  );
};
