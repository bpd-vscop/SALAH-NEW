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
  convertToB2B,
  sendClientVerification,
} = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { profileUpload, verificationUpload } = require('../middleware/upload');

const router = express.Router();

router.use(requireAuth);

router.get('/', requireRole(['super_admin', 'admin']), listUsers);
router.post('/', requireRole(['super_admin', 'admin']), createUser);
router.put(
  '/:id',
  // Allow users to update their own profile, admins can update any
  profileUpload.single('profileImage'),
  updateUser
);
router.delete('/:id', requireRole(['super_admin']), deleteUser);

router.post('/:id/convert-to-b2b', verificationUpload.single('verificationFile'), convertToB2B);
router.post('/:id/send-verification', requireRole(['super_admin', 'admin']), sendClientVerification);

// Shipping address routes (clients can manage their own)
router.post('/:id/shipping-addresses', addShippingAddress);
router.put('/:id/shipping-addresses/:addressId', updateShippingAddress);
router.delete('/:id/shipping-addresses/:addressId', deleteShippingAddress);

// Password change routes (users can change their own password)
router.post('/:id/request-password-change', requestPasswordChange);
router.post('/:id/change-password', changePassword);

// Phone update route (users can update their own phone)
router.put('/:id/phone', updateUser);

module.exports = router;
