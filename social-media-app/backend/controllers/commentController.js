const Notification = require('../models/Notification');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { asyncHandler } = require('../middleware/errorHandler');

// Post pe comment karna
const addComment = asyncHandler(async (req, res) => {
  const { text } = req.body;
  const postId = req.params.postId;

  const post = await Post.findById(postId);
  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  const comment = await Comment.create({
    post: postId,
    author: req.user._id,
    text,
  });

  await comment.populate('author', 'username fullName avatar');

  // Notification banao, sirf tab jab koi doosre ke post pe comment kare
  if (post.author.toString() !== req.user._id.toString()) {
    await Notification.create({
      recipient: post.author,
      sender: req.user._id,
      type: 'comment',
      post: post._id,
    });
  }

  res.status(201).json({ success: true, comment });
});

// Ek post ke saare comments dekhna
const getComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ post: req.params.postId })
    .sort({ createdAt: -1 })
    .populate('author', 'username fullName avatar');

  res.json({ success: true, comments });
});

// Apna comment delete karna
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    res.status(404);
    throw new Error('Comment not found');
  }

  if (comment.author.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You can only delete your own comments');
  }

  await comment.deleteOne();

  res.json({ success: true, message: 'Comment deleted successfully' });
});

module.exports = { addComment, getComments, deleteComment };
