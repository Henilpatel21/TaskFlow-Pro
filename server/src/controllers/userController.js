import { User } from '../models/index.js';
import { createError, asyncHandler, sanitizeUser } from '../utils/helpers.js';

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatar } = req.body;

  const updateData = {};
  if (name) updateData.name = name;
  if (avatar !== undefined) updateData.avatar = avatar;

  const user = await User.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate('teams', 'name description')
    .populate('activeTeam', 'name description');

  res.json({ user: sanitizeUser(user) });
});

// @desc    Change password
// @route   PUT /api/users/password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw createError('Please provide current and new password', 400);
  }

  if (newPassword.length < 6) {
    throw createError('New password must be at least 6 characters', 400);
  }

  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw createError('Current password is incorrect', 400);
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: 'Password updated successfully' });
});

// @desc    Set active team
// @route   PUT /api/users/active-team
// @access  Private
export const setActiveTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.body;

  if (!teamId) {
    throw createError('Team ID required', 400);
  }

  // Verify user is member of team
  if (!req.user.teams.includes(teamId)) {
    throw createError('You are not a member of this team', 403);
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { activeTeam: teamId },
    { new: true }
  )
    .populate('teams', 'name description')
    .populate('activeTeam', 'name description');

  res.json({ user: sanitizeUser(user) });
});

// @desc    Search users by email (for invites)
// @route   GET /api/users/search
// @access  Private
export const searchUsers = asyncHandler(async (req, res) => {
  const { email } = req.query;

  if (!email || email.length < 3) {
    throw createError('Please provide at least 3 characters to search', 400);
  }

  const users = await User.find({
    email: { $regex: email, $options: 'i' },
    _id: { $ne: req.user._id },
  })
    .select('name email avatar')
    .limit(10);

  res.json({ users });
});
