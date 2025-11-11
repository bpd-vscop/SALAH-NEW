import { Link } from 'react-router-dom';
import type { Product } from '../../types/api';
import { formatCurrency } from '../../utils/format';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCart();

  const handleAddToCart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    addItem({ productId: product.id, quantity: 1 }, product);
  };

  const hasSale = typeof product.salePrice === 'number' && product.salePrice < product.price;
  const displayPrice = hasSale ? product.salePrice : product.price;

  return (
    <Link
      to={`/products/${product.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary"
    >
      {/* Add to Cart Icon - Top Right */}
      <button
        type="button"
        onClick={handleAddToCart}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-primary shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-primary hover:text-white"
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
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={product.images[0] ?? 'https://placehold.co/400x300?text=Product'}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
        />

        {/* Tags Overlay - Top Left */}
        {product.tags.length > 0 && (
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
        )}
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
          {hasSale && (
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