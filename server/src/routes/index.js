const express = require('express');

const authRoutes = require('./auth');
const userRoutes = require('./users');
const categoryRoutes = require('./categories');
const productRoutes = require('./products');
const bannerRoutes = require('./banners');
const orderRoutes = require('./orders');
const cartRoutes = require('./cart');
const uploadRoutes = require('./uploads');
const heroSlideRoutes = require('./heroSlides');
const featuredShowcaseRoutes = require('./featuredShowcase');
const menuRoutes = require('./menu');
const categoryDisplayRoutes = require('./categoryDisplay');

module.exports = () => {
  const router = express.Router();

  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/categories', categoryRoutes);
  router.use('/products', productRoutes);
  router.use('/banners', bannerRoutes);
  router.use('/orders', orderRoutes);
  router.use('/cart', cartRoutes);
  router.use('/uploads', uploadRoutes);
  router.use('/hero-slides', heroSlideRoutes);
  router.use('/featured-showcase', featuredShowcaseRoutes);
  router.use('/menu', menuRoutes);
  router.use('/category-display', categoryDisplayRoutes);

  return router;
};
