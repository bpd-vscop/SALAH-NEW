const express = require('express');
const {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  addShippingAddress,
  updateShippingAddress,
  deleteShippingAddress,
  requestPasswordChange,
  changePassword,
} = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { profileUpload } = require('../middleware/upload');

const router = express.Router();

router.use(requireAuth);

router.get('/', requireRole(['super_admin', 'admin']), listUsers);
router.post('/', requireRole(['super_admin', 'admin']), createUser);
router.put(
  '/:id',
  requireRole(['super_admin', 'admin']),
  profileUpload.single('profileImage'),
  updateUser
);
router.delete('/:id', requireRole(['super_admin']), deleteUser);

// Shipping address routes (clients can manage their own)
router.post('/:id/shipping-addresses', addShippingAddress);
router.put('/:id/shipping-addresses/:addressId', updateShippingAddress);
router.delete('/:id/shipping-addresses/:addressId', deleteShippingAddress);

// Password change routes (users can change their own password)
router.post('/:id/request-password-change', requestPasswordChange);
router.post('/:id/change-password', changePassword);

module.exports = router;
