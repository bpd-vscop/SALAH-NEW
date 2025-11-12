const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} = require('../controllers/brandController');

const router = express.Router();

router.get('/', listBrands);
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), createBrand);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), updateBrand);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager']), deleteBrand);

module.exports = router;
