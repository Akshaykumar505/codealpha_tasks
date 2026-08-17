const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Cloudinary ko apni account details se configure karna
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Ab images local folder ki jagah seedha Cloudinary pe upload hongi
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'social-media-app/posts', // Cloudinary pe is folder ke andar save hongi
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1200, crop: 'limit' }], // bahut badi images ko automatically resize kar dega
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

module.exports = upload;