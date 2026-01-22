const express = require('express');
const {
    getSettings,
    updateSettings,
    testConnection,
} = require('../controllers/shipEngineSettingsController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(['super_admin', 'admin']));

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/test', testConnection);

module.exports = router;
