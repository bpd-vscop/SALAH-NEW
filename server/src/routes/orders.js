const express = require('express');
const {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
} = require('../controllers/orderController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', listOrders);
router.get('/:id', getOrder);
router.post('/', requireRole(['client']), createOrder);
router.patch('/:id', requireRole(['super_admin', 'admin', 'staff']), updateOrder);

module.exports = router;
