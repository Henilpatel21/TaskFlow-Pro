import express from 'express';
import {
  updateProfile,
  changePassword,
  setActiveTeam,
  searchUsers,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.put('/profile', updateProfile);
router.put('/password', changePassword);
router.put('/active-team', setActiveTeam);
router.get('/search', searchUsers);

export default router;
