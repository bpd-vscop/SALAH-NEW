import { Link } from 'react-router-dom';
import type { Category } from '../../types/api';

interface CategoryGridProps {
  categories: Category[];
  loading?: boolean;
}

const FALLBACK_COLORS = ['#f97316', '#ef4444', '#6366f1', '#0ea5e9', '#10b981', '#facc15'];

export const CategoryGrid: React.FC<CategoryGridProps> = ({ categories, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-6 p-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 lg:gap-8">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center text-center p-2">
            <div className="mb-5 h-20 w-20 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
        No categories available yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6 p-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 lg:gap-8">
      {categories.map((category, index) => {
        const fallbackColor = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
        const destination = category.slug ? `/categories/${category.slug}` : `/categories/${category.id}`;

        return (
          <Link
            key={category.id}
            to={destination}
            className="group flex flex-col items-center rounded-lg p-2 text-center transition-all duration-300 hover:bg-slate-50"
          >
            <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-slate-200 bg-white transition-all duration-300 group-hover:border-primary group-hover:scale-105">
              {category.imageUrl ? (
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="absolute inset-0 m-auto h-full w-full scale-110 p-1 object-contain transition-transform duration-300 group-hover:scale-125"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-semibold text-white"
                  style={{ background: fallbackColor }}
                >
                  {category.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-base font-medium text-slate-700 transition-colors duration-300 group-hover:text-primary">
              {category.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
};
