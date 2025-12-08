import express from 'express';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  reorderTasks,
  updateChecklistItem,
  bulkUpdateTasks,
  bulkDeleteTasks,
  startTimer,
  stopTimer,
  updateTimeEstimate,
  addTimeEntry,
} from '../controllers/taskController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Task CRUD
router.post('/', createTask);
router.get('/', getTasks);
router.put('/reorder', reorderTasks);
router.put('/bulk', bulkUpdateTasks);
router.delete('/bulk', bulkDeleteTasks);
router.get('/:taskId', getTask);
router.put('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);

// Checklist
router.put('/:taskId/checklist/:itemId', updateChecklistItem);

// Time tracking
router.post('/:taskId/timer/start', startTimer);
router.post('/:taskId/timer/stop', stopTimer);
router.put('/:taskId/time-estimate', updateTimeEstimate);
router.post('/:taskId/time-entry', addTimeEntry);

export default router;
