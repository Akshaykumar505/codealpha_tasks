const express = require('express');
const router = express.Router({ mergeParams: true });
const { addComment, getComments, deleteComment } = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

router.get('/', getComments);           // post ke comments dekhna (public)
router.post('/', protect, addComment);   // comment karna (login zaroori)
router.delete('/:id', protect, deleteComment); // comment delete karna

module.exports = router;