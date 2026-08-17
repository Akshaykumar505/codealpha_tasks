const express = require('express');
const router = express.Router();
const {
  createPost,
  getFeed,
  getSinglePost,
  updatePost,
  deletePost,
  toggleLike,
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const commentRoutes = require('./commentRoutes');

router.get('/', getFeed);
router.get('/:id', getSinglePost);
router.post('/', protect, upload.single('image'), createPost);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);
router.put('/:id/like', protect, toggleLike);

// Comment routes ko post ke andar "nest" kar diya
// Isse URL banega: /api/posts/:postId/comments
router.use('/:postId/comments', commentRoutes);

module.exports = router;