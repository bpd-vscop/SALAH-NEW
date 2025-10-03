const express = require('express');
const {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', requireRole(['admin', 'manager']), listUsers);
router.post('/', requireRole(['admin']), createUser);
router.put('/:id', requireRole(['admin', 'manager']), updateUser);
router.delete('/:id', requireRole(['admin']), deleteUser);

module.exports = router;
