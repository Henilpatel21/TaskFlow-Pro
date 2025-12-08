import express from 'express';
import {
  createTeam,
  getTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  updateMemberRole,
  removeMember,
  leaveTeam,
  getTeamActivity,
  addMemberDirectly,
} from '../controllers/teamController.js';
import {
  authenticate,
  requireTeamMember,
  requireTeamAdmin,
} from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Team CRUD
router.post('/', createTeam);
router.get('/', getTeams);

// Team-specific routes (require membership)
router.get('/:teamId', requireTeamMember, getTeam);
router.put('/:teamId', requireTeamMember, requireTeamAdmin, updateTeam);
router.delete('/:teamId', requireTeamMember, requireTeamAdmin, deleteTeam);

// Member management (Admin only)
router.post('/:teamId/members', requireTeamMember, requireTeamAdmin, addMemberDirectly);
router.put('/:teamId/members/:userId/role', requireTeamMember, requireTeamAdmin, updateMemberRole);
router.delete('/:teamId/members/:userId', requireTeamMember, requireTeamAdmin, removeMember);

// Leave team (any member)
router.post('/:teamId/leave', requireTeamMember, leaveTeam);

// Activity logs
router.get('/:teamId/activity', requireTeamMember, getTeamActivity);

export default router;
