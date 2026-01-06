import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { ScrollToTop } from '../components/routing/ScrollToTop';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ProductCatalogPage } from '../pages/ProductCatalogPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { RegisterPage } from '../pages/RegisterPage';
import { UserSettingsPage } from '../pages/UserSettingsPage';
import { AdminOrderDetailsPage } from '../pages/AdminOrderDetailsPage';
import { ManufacturersPage } from '../pages/ManufacturersPage';
import { ManufacturerDetailPage } from '../pages/ManufacturerDetailPage';
import { CategoryPage } from '../pages/CategoryPage';
import { CategoriesPage } from '../pages/CategoriesPage';
import { ClientRegistrationPage } from '../pages/ClientRegistrationPage';
import { ClientDashboardPage } from '../pages/ClientDashboardPage';
import { WishlistPage } from '../pages/WishlistPage';
import { DownloadsPage } from '../pages/DownloadsPage';
import { DownloadDetailPage } from '../pages/DownloadDetailPage';
import { LegalDocumentPage } from '../pages/LegalDocumentPage';

export const AppRouter: React.FC = () => (
  <BrowserRouter>
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductCatalogPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/manufacturers" element={<ManufacturersPage />} />
      <Route path="/manufacturers/:slug" element={<ManufacturerDetailPage />} />
      <Route path="/downloads" element={<DownloadsPage />} />
      <Route path="/downloads/:slug" element={<DownloadDetailPage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/categories/:categoryId" element={<CategoryPage />} />
      <Route path="/legal/:type" element={<LegalDocumentPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password/:token" element={<LoginPage initialTab="login" />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/clients/register" element={<ClientRegistrationPage />} />

      <Route element={<ProtectedRoute allowRoles={['client', 'super_admin', 'admin', 'staff']} /> }>
        <Route path="/checkout" element={<CheckoutPage />} />
      </Route>

      <Route element={<ProtectedRoute allowRoles={['client']} /> }>
        <Route path="/dashboard" element={<ClientDashboardPage />} />
        <Route path="/account" element={<ClientDashboardPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
      </Route>

      <Route element={<ProtectedRoute allowRoles={['super_admin', 'admin', 'staff']} /> }>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/orders/:id" element={<AdminOrderDetailsPage />} />
        <Route path="/admin/settings" element={<UserSettingsPage />} />
      </Route>

      <Route path="*" element={<HomePage />} />
    </Routes>
  </BrowserRouter>
);
