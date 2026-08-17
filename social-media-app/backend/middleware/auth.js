const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Ye function har "private" route se pehle chalta hai
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // "Bearer <token>" me se sirf token nikalna
      token = req.headers.authorization.split(' ')[1];

      // Token verify karna
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Us user ka data database se laake request me attach karna
      req.user = await User.findById(decoded.id);
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User no longer exists' });
      }

      return next(); // sab sahi hai, aage badho
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };
