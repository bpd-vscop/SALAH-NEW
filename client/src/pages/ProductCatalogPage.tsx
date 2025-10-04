import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { categoriesApi } from '../api/categories';
import { productsApi } from '../api/products';
import { SiteLayout } from '../components/layout/SiteLayout';
import { useCart } from '../context/CartContext';
import type { Category, Product, ProductTag } from '../types/api';
import { formatCurrency } from '../utils/format';

const tagOptions: ProductTag[] = ['in stock', 'out of stock', 'on sale', 'available to order'];

export const ProductCatalogPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<Set<ProductTag>>(new Set());
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { categories: data } = await categoriesApi.list();
        setCategories(data);
      } catch (err) {
        console.error(err);
      }
    };
    void loadCategories();
  }, []);

  const loadProducts = useMemo(
    () =>
      async (params?: { categoryId?: string; tags?: ProductTag[]; search?: string }) => {
        setLoading(true);
        setError(null);
        try {
          const { products: data } = await productsApi.list(params);
          setProducts(data);
        } catch (err) {
          console.error(err);
          setError(err instanceof Error ? err.message : 'Unable to load products');
        } finally {
          setLoading(false);
        }
      },
    []
  );

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadProducts({
      categoryId: selectedCategory || undefined,
      tags: selectedTags.size ? Array.from(selectedTags) : undefined,
      search: search || undefined,
    });
  };

  const toggleTag = (tag: ProductTag) => {
    setSelectedTags((current) => {
      const next = new Set(current);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  return (
    <SiteLayout>
      <section className="catalog-header">
        <h1>Product Catalog</h1>
        <form className="catalog-filters" onSubmit={handleSubmit}>
          <input
            type="search"
            placeholder="Search products"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="tag-filter-group">
            {tagOptions.map((tag) => (
              <label key={tag} className={selectedTags.has(tag) ? 'tag-option active' : 'tag-option'}>
                <input
                  type="checkbox"
                  checked={selectedTags.has(tag)}
                  onChange={() => toggleTag(tag)}
                />
                {tag}
              </label>
            ))}
          </div>
          <button type="submit" className="primary-button">
            Apply filters
          </button>
        </form>
      </section>

      {loading && <div className="catalog-loading">Loading products…</div>}
      {error && <div className="catalog-error">{error}</div>}

      <div className="product-grid">
        {products.map((product) => (
          <article key={product.id} className="product-card">
            <div className="product-media">
              <img
                src={product.images[0] ?? 'https://placehold.co/400x300?text=Product'}
                alt={product.name}
                loading="lazy"
              />
              <div className="product-tags">
                {product.tags.map((tag) => (
                  <span key={tag} className="product-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="product-body">
              <h3>{product.name}</h3>
              <p className="product-price">{formatCurrency(product.price ?? 0)}</p>
              <div className="product-actions">
                <a className="ghost-button" href={`/products/${product.id}`}>
                  View
                </a>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => addItem({ productId: product.id, quantity: 1 }, product)}
                >
                  Add to cart
                </button>
              </div>
            </div>
          </article>
        ))}
        {!loading && !products.length && <p>No products available.</p>}
      </div>
    </SiteLayout>
  );
};

