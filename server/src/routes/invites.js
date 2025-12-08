import express from 'express';
import {
  createInvite,
  getTeamInvites,
  getMyInvites,
  acceptInvite,
  declineInvite,
  cancelInvite,
  getInviteByToken,
} from '../controllers/inviteController.js';
import { authenticate, requireTeamMember, requireTeamManager } from '../middleware/auth.js';

const router = express.Router();

// Public route - get invite info by token
router.get('/token/:token', getInviteByToken);

// Protected routes
router.use(authenticate);

// User's invites
router.get('/my', getMyInvites);
router.post('/:inviteId/accept', acceptInvite);
router.post('/:inviteId/decline', declineInvite);

// Team invites (requires team membership)
router.post('/', createInvite);
router.get('/team/:teamId', requireTeamMember, getTeamInvites);
router.delete('/:inviteId', cancelInvite);

export default router;
