const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');

// Apni saari notifications dekhna
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate('sender', 'username fullName avatar')
    .populate('post', 'content');

  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    read: false,
  });

  res.json({ success: true, notifications, unreadCount });
});

// Saari notifications ko "read" mark karna
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });

  res.json({ success: true, message: 'All notifications marked as read' });
});

module.exports = { getNotifications, markAllRead };