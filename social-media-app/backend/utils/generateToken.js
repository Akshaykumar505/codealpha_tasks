const jwt = require('jsonwebtoken');

// User ki ID ko ek secure token me convert karta hai (login ke baad milta hai)
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = generateToken;