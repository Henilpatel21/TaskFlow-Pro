import { Invite, Team, User, Notification, ActivityLog } from '../models/index.js';
import { createError, asyncHandler, sendEmail } from '../utils/helpers.js';

// @desc    Create invite
// @route   POST /api/invites
// @access  Private (Admin/Manager)
export const createInvite = asyncHandler(async (req, res) => {
  const { teamId, email, role } = req.body;

  if (!teamId || !email) {
    throw createError('Team ID and email are required', 400);
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw createError('Team not found', 404);
  }

  // Check if requester has permission
  const member = team.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );

  if (!member || !['Admin', 'Manager'].includes(member.role)) {
    throw createError('You do not have permission to invite members', 403);
  }

  // Check if user is already a member
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const isMember = team.members.some(
      (m) => m.user.toString() === existingUser._id.toString()
    );
    if (isMember) {
      throw createError('User is already a member of this team', 400);
    }
  }

  // Check for existing pending invite
  const existingInvite = await Invite.findOne({
    team: teamId,
    email,
    status: 'pending',
  });

  if (existingInvite) {
    throw createError('An invite has already been sent to this email', 400);
  }

  // Create invite
  const invite = await Invite.create({
    team: teamId,
    email,
    role: role || 'Member',
    invitedBy: req.user._id,
  });

  const populatedInvite = await Invite.findById(invite._id)
    .populate('team', 'name')
    .populate('invitedBy', 'name email');

  // Send email placeholder
  await sendEmail({
    to: email,
    subject: `You've been invited to join ${team.name} on TaskFlow Pro`,
    text: `${req.user.name} has invited you to join "${team.name}" as a ${role || 'Member'}.

           Use this invite token to accept: ${invite.token}

           The invite expires in 7 days.`,
  });

  // If user exists, send notification
  if (existingUser) {
    await Notification.create({
      user: existingUser._id,
      team: teamId,
      type: 'team_invite',
      title: 'Team Invitation',
      message: `You have been invited to join "${team.name}"`,
      data: { inviteId: invite._id, token: invite.token },
    });

    const io = req.app.get('io');
    io.to(`user:${existingUser._id}`).emit('notification:new', {
      type: 'team_invite',
      message: `You have been invited to join "${team.name}"`,
      inviteId: invite._id,
    });
  }

  res.status(201).json({ invite: populatedInvite });
});

// @desc    Get team invites
// @route   GET /api/invites/team/:teamId
// @access  Private (team members)
export const getTeamInvites = asyncHandler(async (req, res) => {
  const { teamId } = req.params;

  const invites = await Invite.find({ team: teamId, status: 'pending' })
    .populate('invitedBy', 'name email avatar')
    .sort({ createdAt: -1 });

  res.json({ invites });
});

// @desc    Get user's pending invites
// @route   GET /api/invites/my
// @access  Private
export const getMyInvites = asyncHandler(async (req, res) => {
  const invites = await Invite.find({
    email: req.user.email,
    status: 'pending',
  })
    .populate('team', 'name description')
    .populate('invitedBy', 'name email avatar')
    .sort({ createdAt: -1 });

  res.json({ invites });
});

// @desc    Accept invite
// @route   POST /api/invites/:inviteId/accept
// @access  Private
export const acceptInvite = asyncHandler(async (req, res) => {
  const invite = await Invite.findById(req.params.inviteId);

  if (!invite) {
    throw createError('Invite not found', 404);
  }

  if (invite.email.toLowerCase() !== req.user.email.toLowerCase()) {
    throw createError('This invite is not for you', 403);
  }

  if (invite.status !== 'pending') {
    throw createError(`Invite has already been ${invite.status}`, 400);
  }

  if (invite.isExpired()) {
    invite.status = 'expired';
    await invite.save();
    throw createError('Invite has expired', 400);
  }

  // Add user to team
  const team = await Team.findById(invite.team);

  if (!team) {
    throw createError('Team no longer exists', 404);
  }

  team.members.push({
    user: req.user._id,
    role: invite.role,
  });
  await team.save();

  // Add team to user
  await User.findByIdAndUpdate(req.user._id, {
    $push: { teams: team._id },
    activeTeam: team._id,
  });

  // Update invite status
  invite.status = 'accepted';
  await invite.save();

  // Log activity
  await ActivityLog.create({
    team: team._id,
    user: req.user._id,
    action: 'member_added',
    targetType: 'member',
    targetId: req.user._id,
    description: `${req.user.name} joined the team`,
  });

  // Notify team admins
  const admins = team.members.filter((m) => m.role === 'Admin');
  for (const admin of admins) {
    if (admin.user.toString() !== req.user._id.toString()) {
      await Notification.create({
        user: admin.user,
        team: team._id,
        type: 'member_added',
        title: 'New Team Member',
        message: `${req.user.name} has joined the team`,
      });
    }
  }

  const populatedTeam = await Team.findById(team._id)
    .populate('members.user', 'name email avatar')
    .populate('owner', 'name email avatar');

  // Emit real-time updates
  const io = req.app.get('io');
  io.to(`team:${team._id}`).emit('team:member_added', { team: populatedTeam });

  res.json({ message: 'Invite accepted successfully', team: populatedTeam });
});

// @desc    Decline invite
// @route   POST /api/invites/:inviteId/decline
// @access  Private
export const declineInvite = asyncHandler(async (req, res) => {
  const invite = await Invite.findById(req.params.inviteId);

  if (!invite) {
    throw createError('Invite not found', 404);
  }

  if (invite.email.toLowerCase() !== req.user.email.toLowerCase()) {
    throw createError('This invite is not for you', 403);
  }

  if (invite.status !== 'pending') {
    throw createError(`Invite has already been ${invite.status}`, 400);
  }

  invite.status = 'declined';
  await invite.save();

  res.json({ message: 'Invite declined' });
});

// @desc    Cancel/delete invite
// @route   DELETE /api/invites/:inviteId
// @access  Private (Admin/Manager)
export const cancelInvite = asyncHandler(async (req, res) => {
  const invite = await Invite.findById(req.params.inviteId);

  if (!invite) {
    throw createError('Invite not found', 404);
  }

  // Check if requester has permission
  const team = await Team.findById(invite.team);
  const member = team.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );

  if (!member || !['Admin', 'Manager'].includes(member.role)) {
    throw createError('You do not have permission to cancel this invite', 403);
  }

  await invite.deleteOne();

  res.json({ message: 'Invite cancelled' });
});

// @desc    Accept invite by token (for non-logged in users)
// @route   GET /api/invites/token/:token
// @access  Public
export const getInviteByToken = asyncHandler(async (req, res) => {
  const invite = await Invite.findOne({ token: req.params.token })
    .populate('team', 'name description')
    .populate('invitedBy', 'name');

  if (!invite) {
    throw createError('Invalid invite token', 404);
  }

  if (invite.status !== 'pending') {
    throw createError(`Invite has already been ${invite.status}`, 400);
  }

  if (invite.isExpired()) {
    throw createError('Invite has expired', 400);
  }

  res.json({
    invite: {
      team: invite.team,
      invitedBy: invite.invitedBy,
      role: invite.role,
      email: invite.email,
    },
  });
});
