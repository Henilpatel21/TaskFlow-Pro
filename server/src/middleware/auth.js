import { verifyAccessToken } from '../utils/jwt.js';
import { User, Team } from '../models/index.js';
import { createError } from '../utils/helpers.js';

// Verify JWT access token
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Access token required', 401);
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw createError('User not found', 401);
      }

      req.user = user;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw createError('Access token expired', 401);
      }
      throw createError('Invalid access token', 401);
    }
  } catch (error) {
    next(error);
  }
};

// Check if user is member of team
export const requireTeamMember = async (req, res, next) => {
  try {
    const teamId = req.params.teamId || req.body.teamId || req.query.teamId;

    if (!teamId) {
      throw createError('Team ID required', 400);
    }

    const team = await Team.findById(teamId);

    if (!team) {
      throw createError('Team not found', 404);
    }

    const member = team.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!member) {
      throw createError('You are not a member of this team', 403);
    }

    req.team = team;
    req.memberRole = member.role;
    next();
  } catch (error) {
    next(error);
  }
};

// Role-based access control
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.memberRole) {
      return next(createError('Team membership required', 403));
    }

    if (!roles.includes(req.memberRole)) {
      return next(
        createError(`This action requires one of these roles: ${roles.join(', ')}`, 403)
      );
    }

    next();
  };
};

// Check if user is team admin
export const requireTeamAdmin = requireRole('Admin');

// Check if user is team admin or manager
export const requireTeamManager = requireRole('Admin', 'Manager');
