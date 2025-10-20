const express = require('express');
const {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
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

module.exports = router;
