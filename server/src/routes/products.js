const express = require('express');
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', listProducts);
router.get('/:id', getProduct);
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'staff']), createProduct);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'staff']), updateProduct);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin']), deleteProduct);

module.exports = router;
