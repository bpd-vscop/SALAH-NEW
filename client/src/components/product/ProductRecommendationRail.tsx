import { Link } from 'react-router-dom';
import type { Product } from '../../types/api';
import { formatCurrency } from '../../utils/format';
import { getProductStatusTags } from '../../utils/productStatus';

interface ProductRecommendationRailProps {
  title: string;
  subtitle?: string;
  products: Product[];
  columns?: 4 | 6;
  showBrowseLink?: boolean;
}

export const ProductRecommendationRail: React.FC<ProductRecommendationRailProps> = ({
  title,
  subtitle,
  products,
  columns = 4,
  showBrowseLink = true,
}) => {
  if (!products.length) {
    return null;
  }

  const gridClassName =
    columns === 6
      ? 'grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
      : 'grid gap-5 sm:grid-cols-2 xl:grid-cols-4';
  const displayProducts = columns === 6 ? products.slice(0, 6) : products;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
        </div>
        {showBrowseLink ? (
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Browse catalog
          </Link>
        ) : null}
      </div>

      <div className={gridClassName}>
        {displayProducts.map((product) => {
          const displayTags = getProductStatusTags(product);
          return (
            <article
              key={product.id}
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <img
                  src={product.images[0] ?? 'https://placehold.co/400x300?text=Product'}
                  alt={product.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {displayTags.length ? (
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    {displayTags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-white shadow-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="space-y-1">
                  <h4 className="line-clamp-2 text-base font-semibold text-slate-900">{product.name}</h4>
                  <p className="text-sm font-semibold text-primary">
                    {formatCurrency(
                      product.salePrice && product.salePrice < product.price ? product.salePrice : product.price
                    )}
                  </p>
                </div>
                <Link
                  to={`/products/${product.id}`}
                  className="mt-auto inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                >
                  View details
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

