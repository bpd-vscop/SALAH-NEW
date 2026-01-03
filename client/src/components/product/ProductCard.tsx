import { Heart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/api';
import { formatCurrency } from '../../utils/format';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { cn } from '../../utils/cn';
import { getProductStatusTags, isOnSale } from '../../utils/productStatus';

type ProductCardBadgeVariant = 'inStock' | 'onSale' | 'backInStock' | 'newArrival' | 'comingSoon' | 'outOfStock';

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
  newArrival: {
    container: 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 shadow-[0_10px_30px_rgba(245,158,11,0.25)]',
    dot: 'bg-white',
    ping: 'bg-white/70',
    text: 'text-white',
  },
  comingSoon: {
    container: 'bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 shadow-[0_10px_30px_rgba(14,116,144,0.25)]',
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

export const ProductCard: React.FC<ProductCardProps> = ({ product, className, badge, hideTags = false }) => {
  const { addItem } = useCart();
  const { user } = useAuth();
  const { items: wishlistItems, addItem: addWishlistItem, removeItem: removeWishlistItem } = useWishlist();
  const isSignedInClient = user?.role === 'client';
  const isStaffUser = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'staff';
  const showWishlistAction = !isStaffUser;

  const managesStock = product.manageStock !== false;
  const allowBackorder = managesStock ? (product.inventory?.allowBackorder ?? false) : false;
  const availableQuantity = managesStock ? product.inventory?.quantity ?? null : null;
  const inventoryStatus = managesStock ? product.inventory?.status ?? 'in_stock' : 'in_stock';
  const outOfStock =
    managesStock &&
    (inventoryStatus === 'out_of_stock' ||
      (!allowBackorder && typeof availableQuantity === 'number' && availableQuantity <= 0));

  const handleAddToCart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (outOfStock) {
      return;
    }
    addItem({ productId: product.id, quantity: 1 }, product);
  };

  const isInWishlist = wishlistItems.some((line) => line.productId === product.id);

  const handleToggleWishlist = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isStaffUser) {
      return;
    }
    if (!isSignedInClient) {
      window.dispatchEvent(
        new CustomEvent('openAuthPrompt', {
          detail: {
            title: 'Sign in required',
            message: 'Please sign in or sign up with a client account to add this product to your wishlist.',
          },
        })
      );
      return;
    }
    if (isInWishlist) {
      await removeWishlistItem(product.id);
    } else {
      await addWishlistItem({ productId: product.id, quantity: 1 }, product);
    }
  };

  const saleActive = isOnSale(product);
  const displayPrice = saleActive ? (product.salePrice as number) : product.price;
  const effectiveBadge: ProductCardBadge | null =
    badge ?? (outOfStock ? { label: 'Out of stock', variant: 'outOfStock' } : null);
  const ratingValue = product.reviewsSummary?.averageRating ?? 0;
  const ratingCount = product.reviewsSummary?.reviewCount ?? 0;
  const displayTags = getProductStatusTags(product);

  return (
    <Link
      to={`/products/${product.id}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary',
        className
      )}
    >
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
        ) : !hideTags && displayTags.length > 0 ? (
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {displayTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {showWishlistAction && (
          <button
            type="button"
            onClick={handleToggleWishlist}
            className={cn(
              'absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110',
              isInWishlist ? 'text-rose-500' : 'text-slate-600 hover:text-rose-500'
            )}
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={cn('h-5 w-5', isInWishlist ? 'fill-current' : '')} />
          </button>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45 opacity-0 transition-all duration-300 group-hover:opacity-100">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={outOfStock}
              className={cn(
                'rounded-full px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-md transition',
                outOfStock ? 'cursor-not-allowed bg-slate-400' : 'bg-primary hover:bg-primary-dark'
              )}
            >
              {outOfStock ? 'Out of stock' : 'Add to cart'}
            </button>
            <span className="rounded-full border border-white/70 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white">
              View details
            </span>
          </div>
        </div>
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

        {ratingCount > 0 ? (
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-semibold text-slate-700">{ratingValue.toFixed(1)}</span>
            <span>({ratingCount})</span>
          </div>
        ) : null}

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
