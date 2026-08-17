const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  toggleFollow,
  updateProfile,
  searchUsers,
  getSuggestedUsers,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/search', searchUsers);
router.get('/suggestions', protect, getSuggestedUsers);
router.get('/:username', getUserProfile);
router.put('/profile', protect, updateProfile);
router.put('/follow/:id', protect, toggleFollow);

module.exports = router;