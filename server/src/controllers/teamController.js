import { Team, User, Task, ActivityLog, Notification } from '../models/index.js';
import { createError, asyncHandler } from '../utils/helpers.js';

// @desc    Create new team
// @route   POST /api/teams
// @access  Private
export const createTeam = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    throw createError('Team name is required', 400);
  }

  const team = await Team.create({
    name,
    description,
    owner: req.user._id,
    members: [{ user: req.user._id, role: 'Admin' }],
  });

  // Add team to user's teams list and set as active
  await User.findByIdAndUpdate(req.user._id, {
    $push: { teams: team._id },
    activeTeam: team._id,
  });

  // Log activity
  await ActivityLog.create({
    team: team._id,
    user: req.user._id,
    action: 'team_created',
    targetType: 'team',
    targetId: team._id,
    description: `${req.user.name} created the team "${team.name}"`,
  });

  const populatedTeam = await Team.findById(team._id).populate(
    'members.user',
    'name email avatar'
  );

  res.status(201).json({ team: populatedTeam });
});

// @desc    Get user's teams
// @route   GET /api/teams
// @access  Private
export const getTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find({ 'members.user': req.user._id })
    .populate('members.user', 'name email avatar')
    .populate('owner', 'name email avatar')
    .sort({ createdAt: -1 });

  res.json({ teams });
});

// @desc    Get single team
// @route   GET /api/teams/:teamId
// @access  Private (team members only)
export const getTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.teamId)
    .populate('members.user', 'name email avatar')
    .populate('owner', 'name email avatar');

  if (!team) {
    throw createError('Team not found', 404);
  }

  // Check membership
  const isMember = team.members.some(
    (m) => m.user._id.toString() === req.user._id.toString()
  );

  if (!isMember) {
    throw createError('You are not a member of this team', 403);
  }

  res.json({ team });
});

// @desc    Update team
// @route   PUT /api/teams/:teamId
// @access  Private (Admin only)
export const updateTeam = asyncHandler(async (req, res) => {
  const { name, description, settings } = req.body;

  const updateData = {};
  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (settings) updateData.settings = settings;

  const team = await Team.findByIdAndUpdate(req.params.teamId, updateData, {
    new: true,
    runValidators: true,
  })
    .populate('members.user', 'name email avatar')
    .populate('owner', 'name email avatar');

  // Log activity
  await ActivityLog.create({
    team: team._id,
    user: req.user._id,
    action: 'team_updated',
    targetType: 'team',
    targetId: team._id,
    description: `${req.user.name} updated the team settings`,
  });

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${team._id}`).emit('team:updated', { team });

  res.json({ team });
});

// @desc    Delete team
// @route   DELETE /api/teams/:teamId
// @access  Private (Admin only)
export const deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.teamId);

  if (!team) {
    throw createError('Team not found', 404);
  }

  // Only owner can delete team
  if (team.owner.toString() !== req.user._id.toString()) {
    throw createError('Only team owner can delete the team', 403);
  }

  // Remove team from all members
  await User.updateMany(
    { teams: team._id },
    { $pull: { teams: team._id }, $unset: { activeTeam: '' } }
  );

  // Delete all tasks
  await Task.deleteMany({ team: team._id });

  // Delete all activity logs
  await ActivityLog.deleteMany({ team: team._id });

  // Delete all notifications related to team
  await Notification.deleteMany({ team: team._id });

  // Delete team
  await team.deleteOne();

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${team._id}`).emit('team:deleted', { teamId: team._id });

  res.json({ message: 'Team deleted successfully' });
});

// @desc    Update member role
// @route   PUT /api/teams/:teamId/members/:userId/role
// @access  Private (Admin only)
export const updateMemberRole = asyncHandler(async (req, res) => {
  const { teamId, userId } = req.params;
  const { role } = req.body;

  if (!['Admin', 'Manager', 'Member'].includes(role)) {
    throw createError('Invalid role', 400);
  }

  const team = await Team.findById(teamId);

  if (!team) {
    throw createError('Team not found', 404);
  }

  const memberIndex = team.members.findIndex(
    (m) => m.user.toString() === userId
  );

  if (memberIndex === -1) {
    throw createError('User is not a team member', 404);
  }

  // Prevent demoting the owner
  if (team.owner.toString() === userId && role !== 'Admin') {
    throw createError('Cannot change the role of team owner', 400);
  }

  team.members[memberIndex].role = role;
  await team.save();

  const updatedTeam = await Team.findById(teamId)
    .populate('members.user', 'name email avatar')
    .populate('owner', 'name email avatar');

  // Get target user
  const targetUser = await User.findById(userId);

  // Log activity
  await ActivityLog.create({
    team: team._id,
    user: req.user._id,
    action: 'member_role_changed',
    targetType: 'member',
    targetId: userId,
    details: { newRole: role },
    description: `${req.user.name} changed ${targetUser.name}'s role to ${role}`,
  });

  // Create notification for the user
  await Notification.create({
    user: userId,
    team: team._id,
    type: 'role_changed',
    title: 'Role Updated',
    message: `Your role in "${team.name}" has been changed to ${role}`,
  });

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${team._id}`).emit('team:member_updated', { team: updatedTeam });
  io.to(`user:${userId}`).emit('notification:new', {
    type: 'role_changed',
    message: `Your role in "${team.name}" has been changed to ${role}`,
  });

  res.json({ team: updatedTeam });
});

// @desc    Remove member from team
// @route   DELETE /api/teams/:teamId/members/:userId
// @access  Private (Admin only)
export const removeMember = asyncHandler(async (req, res) => {
  const { teamId, userId } = req.params;

  const team = await Team.findById(teamId);

  if (!team) {
    throw createError('Team not found', 404);
  }

  // Prevent removing the owner
  if (team.owner.toString() === userId) {
    throw createError('Cannot remove team owner', 400);
  }

  const memberIndex = team.members.findIndex(
    (m) => m.user.toString() === userId
  );

  if (memberIndex === -1) {
    throw createError('User is not a team member', 404);
  }

  // Remove member
  team.members.splice(memberIndex, 1);
  await team.save();

  // Remove team from user's teams
  await User.findByIdAndUpdate(userId, {
    $pull: { teams: team._id },
    $unset: { activeTeam: '' },
  });

  // Unassign user from tasks
  await Task.updateMany(
    { team: team._id, assignedTo: userId },
    { assignedTo: null }
  );

  const targetUser = await User.findById(userId);

  // Log activity
  await ActivityLog.create({
    team: team._id,
    user: req.user._id,
    action: 'member_removed',
    targetType: 'member',
    targetId: userId,
    description: `${req.user.name} removed ${targetUser.name} from the team`,
  });

  // Create notification
  await Notification.create({
    user: userId,
    team: team._id,
    type: 'member_removed',
    title: 'Removed from Team',
    message: `You have been removed from "${team.name}"`,
  });

  const updatedTeam = await Team.findById(teamId)
    .populate('members.user', 'name email avatar')
    .populate('owner', 'name email avatar');

  // Emit real-time updates
  const io = req.app.get('io');
  io.to(`team:${team._id}`).emit('team:member_removed', { team: updatedTeam, userId });
  io.to(`user:${userId}`).emit('notification:new', {
    type: 'member_removed',
    message: `You have been removed from "${team.name}"`,
  });

  res.json({ team: updatedTeam });
});

// @desc    Leave team
// @route   POST /api/teams/:teamId/leave
// @access  Private
export const leaveTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user._id;

  const team = await Team.findById(teamId);

  if (!team) {
    throw createError('Team not found', 404);
  }

  // Owner cannot leave, must transfer ownership or delete team
  if (team.owner.toString() === userId.toString()) {
    throw createError('Team owner cannot leave. Transfer ownership or delete the team.', 400);
  }

  const memberIndex = team.members.findIndex(
    (m) => m.user.toString() === userId.toString()
  );

  if (memberIndex === -1) {
    throw createError('You are not a member of this team', 404);
  }

  // Remove member
  team.members.splice(memberIndex, 1);
  await team.save();

  // Remove team from user's teams
  await User.findByIdAndUpdate(userId, {
    $pull: { teams: team._id },
    $unset: { activeTeam: '' },
  });

  // Unassign from tasks
  await Task.updateMany(
    { team: team._id, assignedTo: userId },
    { assignedTo: null }
  );

  // Log activity
  await ActivityLog.create({
    team: team._id,
    user: userId,
    action: 'member_removed',
    targetType: 'member',
    targetId: userId,
    description: `${req.user.name} left the team`,
  });

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${team._id}`).emit('team:member_left', { teamId, userId });

  res.json({ message: 'Left team successfully' });
});

// @desc    Add member directly by email
// @route   POST /api/teams/:teamId/members
// @access  Private (Admin only)
export const addMemberDirectly = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { email, role = 'Member' } = req.body;

  if (!email) {
    throw createError('Email is required', 400);
  }

  if (!['Admin', 'Manager', 'Member'].includes(role)) {
    throw createError('Invalid role', 400);
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw createError('Team not found', 404);
  }

  // Find user by email
  let user = await User.findOne({ email: email.toLowerCase() });

  // If user doesn't exist, create a guest user
  if (!user) {
    user = await User.create({
      name: email.split('@')[0],
      email: email.toLowerCase(),
      isGuest: true,
    });
  }

  // Check if user is already a member
  const existingMember = team.members.find(
    (m) => m.user.toString() === user._id.toString()
  );

  if (existingMember) {
    throw createError('User is already a team member', 400);
  }

  // Add member to team
  team.members.push({ user: user._id, role });
  await team.save();

  // Add team to user's teams list
  await User.findByIdAndUpdate(user._id, {
    $addToSet: { teams: team._id },
  });

  // Log activity
  await ActivityLog.create({
    team: team._id,
    user: req.user._id,
    action: 'member_added',
    targetType: 'member',
    targetId: user._id,
    description: `${req.user.name} added ${user.name} to the team`,
  });

  // Create notification for the added user
  await Notification.create({
    user: user._id,
    team: team._id,
    type: 'team_joined',
    title: 'Added to Team',
    message: `You have been added to "${team.name}" as ${role}`,
  });

  const updatedTeam = await Team.findById(teamId)
    .populate('members.user', 'name email avatar')
    .populate('owner', 'name email avatar');

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${team._id}`).emit('team:member_added', { team: updatedTeam });
  io.to(`user:${user._id}`).emit('notification:new', {
    type: 'team_joined',
    message: `You have been added to "${team.name}"`,
  });

  res.status(201).json({ team: updatedTeam, addedUser: { _id: user._id, name: user.name, email: user.email } });
});

// @desc    Get team activity logs
// @route   GET /api/teams/:teamId/activity
// @access  Private
export const getTeamActivity = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const activities = await ActivityLog.find({ team: teamId })
    .populate('user', 'name email avatar')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await ActivityLog.countDocuments({ team: teamId });

  res.json({
    activities,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});
