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
router.post('/', requireAuth, requireRole(['admin', 'manager', 'staff']), createProduct);
router.put('/:id', requireAuth, requireRole(['admin', 'manager', 'staff']), updateProduct);
router.delete('/:id', requireAuth, requireRole(['admin', 'manager']), deleteProduct);

module.exports = router;
