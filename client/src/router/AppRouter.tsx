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
import { UserSettingsPage } from '../pages/UserSettingsPage';
import { ManufacturersPage } from '../pages/ManufacturersPage';
import { ManufacturerDetailPage } from '../pages/ManufacturerDetailPage';
import { CategoryPage } from '../pages/CategoryPage';
import { CategoriesPage } from '../pages/CategoriesPage';
import { ClientRegistrationPage } from '../pages/ClientRegistrationPage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';

export const AppRouter: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductCatalogPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/manufacturers" element={<ManufacturersPage />} />
      <Route path="/manufacturers/:slug" element={<ManufacturerDetailPage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/categories/:categoryId" element={<CategoryPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/clients/register" element={<ClientRegistrationPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route element={<ProtectedRoute allowRoles={['client', 'super_admin', 'admin', 'staff']} /> }>
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/account" element={<AccountDashboardPage />} />
      </Route>

      <Route element={<ProtectedRoute allowRoles={['super_admin', 'admin', 'staff']} /> }>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/settings" element={<UserSettingsPage />} />
      </Route>

      <Route path="*" element={<HomePage />} />
    </Routes>
  </BrowserRouter>
);
