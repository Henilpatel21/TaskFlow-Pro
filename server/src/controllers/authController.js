import { User } from '../models/index.js';
import {
  generateTokens,
  verifyRefreshToken,
  getRefreshTokenCookieOptions,
} from '../utils/jwt.js';
import { createError, asyncHandler, sanitizeUser } from '../utils/helpers.js';

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Validation
  if (!name || !email || !password) {
    throw createError('Please provide name, email and password', 400);
  }

  if (password.length < 6) {
    throw createError('Password must be at least 6 characters', 400);
  }

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw createError('Email already registered', 400);
  }

  // Create user
  const user = await User.create({ name, email, password });

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Save refresh token to user
  user.refreshToken = refreshToken;
  await user.save();

  // Set refresh token cookie
  res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

  res.status(201).json({
    user: sanitizeUser(user),
    accessToken,
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw createError('Please provide email and password', 400);
  }

  // Find user with password
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw createError('Invalid credentials', 401);
  }

  // Check password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw createError('Invalid credentials', 401);
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  // Set refresh token cookie
  res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

  res.json({
    user: sanitizeUser(user),
    accessToken,
  });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    throw createError('Refresh token required', 401);
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);

    // Find user with matching refresh token
    const user = await User.findById(decoded.userId).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      throw createError('Invalid refresh token', 401);
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);

    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Set new refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, getRefreshTokenCookieOptions());

    res.json({
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw createError('Refresh token expired, please login again', 401);
    }
    throw createError('Invalid refresh token', 401);
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  // Clear refresh token from user
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

  // Clear cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: true, // MUST be true in production
    sameSite:  'none',
  });

  res.json({ message: 'Logged out successfully' });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('teams', 'name description')
    .populate('activeTeam', 'name description');

  res.json({ user: sanitizeUser(user) });
});

// @desc    Guest entry (no password required)
// @route   POST /api/auth/guest
// @access  Public
export const guestEntry = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  // Validation
  if (!name || !email) {
    throw createError('Please provide name and email', 400);
  }

  // Check if user exists
  let user = await User.findOne({ email });

  if (user) {
    // If user exists and has password, they need to login properly
    const userWithPassword = await User.findOne({ email }).select('+password');
    if (userWithPassword.password) {
      throw createError('This email is registered. Please login with your password.', 400);
    }
  } else {
    // Create guest user (no password)
    user = await User.create({
      name,
      email,
      isGuest: true
    });
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Save refresh token to user
  user.refreshToken = refreshToken;
  await user.save();

  // Set refresh token cookie
  res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

  res.status(200).json({
    user: sanitizeUser(user),
    accessToken,
    isGuest: true,
  });
});
