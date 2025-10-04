import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { productsApi } from '../api/products';
import { SiteLayout } from '../components/layout/SiteLayout';
import { useCart } from '../context/CartContext';
import type { Product } from '../types/api';
import { formatCurrency } from '../utils/format';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    if (!id) {
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { product: data } = await productsApi.get(id);
        setProduct(data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Unable to load product');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  return (
    <SiteLayout>
      {loading && <div className="product-loading">Loading product…</div>}
      {error && <div className="product-error">{error}</div>}
      {product && (
        <article className="product-detail">
          <div className="product-gallery">
            <img
              src={product.images[0] ?? 'https://placehold.co/600x400?text=Product'}
              alt={product.name}
            />
            <div className="product-thumbnails">
              {product.images.slice(1).map((image) => (
                <img key={image} src={image} alt={product.name} />
              ))}
            </div>
          </div>
          <div className="product-summary">
            <h1>{product.name}</h1>
            <div className="product-price-detail">{formatCurrency(product.price ?? 0)}</div>
            <div className="product-tag-list">
              {product.tags.map((tag) => (
                <span key={tag} className="product-tag">
                  {tag}
                </span>
              ))}
            </div>
            <p className="product-description">{product.description || 'No description provided.'}</p>
            {product.attributes && (
              <dl className="product-attributes">
                {Object.entries(product.attributes).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <button
              type="button"
              className="primary-button"
              onClick={() => addItem({ productId: product.id, quantity: 1 }, product)}
            >
              Add to cart
            </button>
            <p className="product-policy">All sales are final. No returns or exchanges.</p>
          </div>
        </article>
      )}
    </SiteLayout>
  );
};
