const express = require('express');
const {
  listInvoices,
  getInvoice,
  createInvoice,
  deleteInvoice,
  updateInvoiceStatus,
} = require('../controllers/invoiceController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole(['super_admin', 'admin', 'staff']));
router.get('/', listInvoices);
router.post('/', createInvoice);
router.patch('/:id', updateInvoiceStatus);
router.get('/:id', getInvoice);
router.delete('/:id', deleteInvoice);

module.exports = router;
