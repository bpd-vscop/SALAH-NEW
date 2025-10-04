import { useEffect, useState } from 'react';
import { bannersApi } from '../api/banners';
import { categoriesApi } from '../api/categories';
import { productsApi } from '../api/products';
import type { Banner, Category, Product } from '../types/api';
import { SiteLayout } from '../components/layout/SiteLayout';
import { formatCurrency } from '../utils/format';
import { useCart } from '../context/CartContext';

export const HomePage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [bannerRes, categoryRes, productRes] = await Promise.all([
          bannersApi.list(),
          categoriesApi.list(),
          productsApi.list({ tags: ['on sale'] }),
        ]);
        setBanners(bannerRes.banners);
        setCategories(categoryRes.categories.slice(0, 6));
        setFeatured(productRes.products.slice(0, 8));
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load homepage');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const slideBanner = banners.filter((banner) => banner.type === 'slide');
  const rowBanners = banners.filter((banner) => banner.type === 'row');
  const advertisingBanner = banners.find((banner) => banner.type === 'advertising');

  return (
    <SiteLayout>
      <div className="home-hero">
        {advertisingBanner ? (
          <img src={advertisingBanner.imageUrl} alt={advertisingBanner.text ?? 'Promoted banner'} />
        ) : (
          <div className="hero-placeholder">Welcome to SALAH Store — Premium automotive and industrial supplies.</div>
        )}
      </div>
      <section className="home-section">
        <h2>Popular Categories</h2>
        {categories.length ? (
          <div className="category-grid">
            {categories.map((category) => (
              <div key={category.id} className="category-card">
                <h3>{category.name}</h3>
                <p>{category.parentId ? 'Subcategory' : 'Top category'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No categories yet.</p>
        )}
      </section>

      <section className="home-section">
        <h2>Featured Offers</h2>
        {loading && <div className="home-loading">Loading featured products…</div>}
        {error && <div className="home-error">{error}</div>}
        <div className="product-grid">
          {featured.map((product) => (
            <div key={product.id} className="product-card">
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
                <p>{formatCurrency(product.price ?? 0)}</p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => addItem({ productId: product.id, quantity: 1 }, product)}
                >
                  Add to cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {!!rowBanners.length && (
        <section className="home-section row-banner-section">
          <div className="row-banner-grid">
            {rowBanners.map((banner) => (
              <img key={banner.id} src={banner.imageUrl} alt={banner.text ?? 'Row banner'} />
            ))}
          </div>
        </section>
      )}

      {!!slideBanner.length && (
        <section className="home-section">
          <h2>Announcements</h2>
          <div className="slide-banner">
            {slideBanner.map((banner) => (
              <article key={banner.id}>
                <img src={banner.imageUrl} alt={banner.text ?? 'Announcement'} />
                {banner.text && <p>{banner.text}</p>}
              </article>
            ))}
          </div>
        </section>
      )}
    </SiteLayout>
  );
};
