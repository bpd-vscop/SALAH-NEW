const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  listTaxRates,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
  resolveTaxRate,
} = require('../controllers/taxRateController');

const router = express.Router();

router.get('/lookup', requireAuth, resolveTaxRate);
router.get('/', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), listTaxRates);
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), createTaxRate);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), updateTaxRate);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager']), deleteTaxRate);

module.exports = router;
