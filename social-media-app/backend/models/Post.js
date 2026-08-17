const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
  type: String,
  trim: true,
  maxlength: [500, 'Post cannot exceed 500 characters'],
  default: '',
},
    image: {
      type: String,
      default: '',
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Comments alag collection me hain, yahan sirf link hota hai (query karte time)
postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
});

postSchema.virtual('likesCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

// Sabse naye posts pehle dikhane ke liye fast query
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);