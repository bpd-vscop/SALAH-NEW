const express = require('express');

const authRoutes = require('./auth');
const userRoutes = require('./users');
const categoryRoutes = require('./categories');
const productRoutes = require('./products');
const bannerRoutes = require('./banners');
const orderRoutes = require('./orders');
const cartRoutes = require('./cart');
const uploadRoutes = require('./uploads');

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

  return router;
};
