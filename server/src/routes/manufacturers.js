const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  listManufacturers,
  createManufacturer,
  updateManufacturer,
  deleteManufacturer,
} = require('../controllers/manufacturerController');

const router = express.Router();

router.get('/', listManufacturers);
// Allow super_admin as well; 'manager' is kept for forward-compat though not present in enum
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), createManufacturer);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), updateManufacturer);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager']), deleteManufacturer);

module.exports = router;
