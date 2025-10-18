const express = require('express');
const { getManufacturerDisplay, updateManufacturerDisplay } = require('../controllers/manufacturerDisplayController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', getManufacturerDisplay);
router.put('/', requireAuth, requireRole(['super_admin', 'admin', 'staff']), updateManufacturerDisplay);

module.exports = router;

