const express = require('express');

const authRoutes = require('./auth');
const userRoutes = require('./users');
const categoryRoutes = require('./categories');
const productRoutes = require('./products');
const orderRoutes = require('./orders');
const cartRoutes = require('./cart');
const wishlistRoutes = require('./wishlist');
const uploadRoutes = require('./uploads');
const heroSlideRoutes = require('./heroSlides');
const featuredShowcaseRoutes = require('./featuredShowcase');
const menuRoutes = require('./menu');
const manufacturerRoutes = require('./manufacturers');
const categoryDisplayRoutes = require('./categoryDisplay');
const manufacturerDisplayRoutes = require('./manufacturerDisplay');
const brandRoutes = require('./brands');
const modelRoutes = require('./models');
const tagRoutes = require('./tags');
const couponRoutes = require('./coupons');
const taxRateRoutes = require('./taxRates');
const clientRoutes = require('./clients');
const contactRoutes = require('./contact');
const messageRoutes = require('./messages');
const adminMessageRoutes = require('./adminMessages');
const reviewRoutes = require('./reviews');
const reviewerNameRoutes = require('./reviewerNames');
const invoiceRoutes = require('./invoices');
const downloadRoutes = require('./downloads');

module.exports = () => {
  const router = express.Router();

  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/categories', categoryRoutes);
  router.use('/products', productRoutes);
  // banners removed
  router.use('/orders', orderRoutes);
  router.use('/cart', cartRoutes);
  router.use('/wishlist', wishlistRoutes);
  router.use('/uploads', uploadRoutes);
  router.use('/hero-slides', heroSlideRoutes);
  router.use('/featured-showcase', featuredShowcaseRoutes);
  router.use('/menu', menuRoutes);
  router.use('/manufacturers', manufacturerRoutes);
  router.use('/category-display', categoryDisplayRoutes);
  router.use('/manufacturer-display', manufacturerDisplayRoutes);
  router.use('/brands', brandRoutes);
  router.use('/models', modelRoutes);
  router.use('/tags', tagRoutes);
  router.use('/coupons', couponRoutes);
  router.use('/tax-rates', taxRateRoutes);
  router.use('/clients', clientRoutes);
  router.use('/contact', contactRoutes);
  router.use('/messages', messageRoutes);
  router.use('/admin/messages', adminMessageRoutes);
  router.use('/reviews', reviewRoutes);
  router.use('/reviewer-names', reviewerNameRoutes);
  router.use('/invoices', invoiceRoutes);
  router.use('/downloads', downloadRoutes);

  return router;
};
