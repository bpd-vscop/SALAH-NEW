const express = require('express');
const {
  listInvoices,
  getInvoice,
  createInvoice,
  deleteInvoice,
} = require('../controllers/invoiceController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole(['super_admin', 'admin', 'staff']));
router.get('/', listInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.delete('/:id', deleteInvoice);

module.exports = router;
