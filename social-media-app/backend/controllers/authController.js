const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { asyncHandler } = require('../middleware/errorHandler');

// Naya user register karna
const register = asyncHandler(async (req, res) => {
  const { username, email, password, fullName } = req.body;

  // Check karo email/username already toh nahi hai
  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) {
    res.status(400);
    throw new Error(
      userExists.email === email ? 'Email already registered' : 'Username already taken'
    );
  }

  const user = await User.create({ username, email, password, fullName });

  res.status(201).json({
    success: true,
    token: generateToken(user._id),
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      bio: user.bio,
    },
  });
});

// Login karna
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // password field 'select: false' hai schema me, isliye yahan manually maangna padta hai
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  res.json({
    success: true,
    token: generateToken(user._id),
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      bio: user.bio,
    },
  });
});

// Logged-in user ka apna data lena
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = { register, login, getMe };
