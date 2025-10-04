import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productsApi } from '../api/products';
import { SiteLayout } from '../components/layout/SiteLayout';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { Product } from '../types/api';
import { formatCurrency } from '../utils/format';

export const CartPage: React.FC = () => {
  const { items, updateItem, removeItem } = useCart();
  const { user } = useAuth();
  const [productMap, setProductMap] = useState<Record<string, Product>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const missing = items
      .filter((line) => !productMap[line.productId])
      .map((line) => line.productId);
    if (!missing.length) {
      return;
    }

    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const responses = await Promise.allSettled(missing.map((id) => productsApi.get(id)));
        const nextMap: Record<string, Product> = {};
        responses.forEach((result) => {
          if (result.status === 'fulfilled') {
            const product = result.value.product;
            nextMap[product.id] = product;
          }
        });
        setProductMap((current) => ({ ...current, ...nextMap }));
      } finally {
        setLoadingProducts(false);
      }
    };

    void loadProducts();
  }, [items, productMap]);

  const total = useMemo(() => {
    return items.reduce((sum, line) => {
      const product = productMap[line.productId];
      const price = product?.price ?? 0;
      return sum + price * line.quantity;
    }, 0);
  }, [items, productMap]);

  return (
    <SiteLayout>
      <section className="cart-page">
        <h1>Your Cart</h1>
        {!items.length && <p>Your cart is empty. Start exploring our <Link to="/products">catalog</Link>.</p>}
        {loadingProducts && <div className="cart-loading">Loading product details…</div>}
        {items.length > 0 && (
          <div className="cart-grid">
            <div className="cart-lines">
              {items.map((line) => {
                const product = productMap[line.productId];
                return (
                  <article key={line.productId} className="cart-line">
                    <img
                      src={product?.images?.[0] ?? 'https://placehold.co/120x120?text=Item'}
                      alt={product?.name ?? 'Cart item'}
                    />
                    <div className="cart-line-body">
                      <h3>{product?.name ?? 'Loading…'}</h3>
                      <p className="cart-line-price">{formatCurrency((product?.price ?? 0) * line.quantity)}</p>
                      <div className="cart-line-controls">
                        <label>
                          Qty
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(event) => updateItem(line.productId, Number(event.target.value))}
                          />
                        </label>
                        <button type="button" className="ghost-button" onClick={() => removeItem(line.productId)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <aside className="cart-summary">
              <h2>Summary</h2>
              <dl>
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatCurrency(total)}</dd>
                </div>
                <div>
                  <dt>Taxes & shipping</dt>
                  <dd>Calculated at pickup / checkout</dd>
                </div>
              </dl>
              <button
                type="button"
                className="primary-button"
                onClick={() => navigate(user ? '/checkout' : '/login', { state: { from: '/checkout' } })}
              >
                Proceed to checkout
              </button>
              {!user && <p className="cart-note">You need an account before placing orders.</p>}
            </aside>
          </div>
        )}
      </section>
    </SiteLayout>
  );
};
