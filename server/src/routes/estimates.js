const express = require('express');
const {
  listEstimates,
  getEstimate,
  createEstimate,
  deleteEstimate,
  updateEstimateStatus,
} = require('../controllers/estimateController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole(['super_admin', 'admin', 'staff']));
router.get('/', listEstimates);
router.post('/', createEstimate);
router.patch('/:id', updateEstimateStatus);
router.get('/:id', getEstimate);
router.delete('/:id', deleteEstimate);

module.exports = router;
