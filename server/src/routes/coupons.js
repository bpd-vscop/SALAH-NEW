const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
} = require('../controllers/couponController');

const router = express.Router();

router.post('/validate', applyCoupon);
router.get('/', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), listCoupons);
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), createCoupon);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), updateCoupon);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager']), deleteCoupon);

module.exports = router;
