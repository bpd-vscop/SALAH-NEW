import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { AccountDashboardPage } from '../pages/AccountDashboardPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ProductCatalogPage } from '../pages/ProductCatalogPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { RegisterPage } from '../pages/RegisterPage';

export const AppRouter: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductCatalogPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute allowRoles={['client', 'admin', 'manager', 'staff']} /> }>
        <Route path="/checkout" element={<CheckoutPage />} />
      </Route>

      <Route element={<ProtectedRoute allowRoles={['client', 'admin', 'manager', 'staff']} /> }>
        <Route path="/account" element={<AccountDashboardPage />} />
      </Route>

      <Route element={<ProtectedRoute allowRoles={['admin', 'manager', 'staff']} /> }>
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Route>

      <Route path="*" element={<HomePage />} />
    </Routes>
  </BrowserRouter>
);
