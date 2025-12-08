import { Task, Team, ActivityLog, Notification, User } from '../models/index.js';
import { createError, asyncHandler } from '../utils/helpers.js';

// Helper function to calculate next occurrence
const calculateNextOccurrence = (frequency, interval, daysOfWeek, currentDate = new Date()) => {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 * interval));
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'custom':
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find next day of week
        const currentDay = next.getDay();
        const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
        let daysToAdd = 0;

        for (const day of sortedDays) {
          if (day > currentDay) {
            daysToAdd = day - currentDay;
            break;
          }
        }

        if (daysToAdd === 0) {
          // No day found this week, go to first day next week
          daysToAdd = 7 - currentDay + sortedDays[0];
        }

        next.setDate(next.getDate() + daysToAdd);
      } else {
        next.setDate(next.getDate() + 1);
      }
      break;
    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private (team members)
export const createTask = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    status,
    priority,
    teamId,
    projectId,
    assignedTo,
    dueDate,
    tags,
    checklist,
    dependencies,
    blockedBy,
    recurring,
  } = req.body;

  if (!title || !teamId) {
    throw createError('Title and team ID are required', 400);
  }

  // Verify team membership
  const team = await Team.findById(teamId);
  if (!team) {
    throw createError('Team not found', 404);
  }

  const isMember = team.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!isMember) {
    throw createError('You are not a member of this team', 403);
  }

  // Get max order for the status column
  const maxOrderTask = await Task.findOne({ team: teamId, status: status || 'To Do' })
    .sort({ order: -1 })
    .select('order');
  const order = maxOrderTask ? maxOrderTask.order + 1 : 0;

  // Prepare recurring data
  let recurringData = null;
  if (recurring?.isRecurring && recurring?.frequency) {
    const nextOccurrence = calculateNextOccurrence(
      recurring.frequency,
      recurring.interval || 1,
      recurring.daysOfWeek || [],
      dueDate ? new Date(dueDate) : new Date()
    );

    recurringData = {
      isRecurring: true,
      frequency: recurring.frequency,
      interval: recurring.interval || 1,
      daysOfWeek: recurring.daysOfWeek || [],
      endDate: recurring.endDate || null,
      nextOccurrence,
      parentTaskId: null,
    };
  }

  const task = await Task.create({
    title,
    description,
    status: status || 'To Do',
    priority: priority || 'Medium',
    team: teamId,
    project: projectId || null,
    assignedTo: assignedTo || null,
    createdBy: req.user._id,
    dueDate: dueDate || null,
    tags: tags || [],
    checklist: checklist || [],
    order,
    dependencies: dependencies || [],
    blockedBy: blockedBy || [],
    recurring: recurringData,
  });

  // Update blockedBy tasks to add this task to their dependencies
  if (blockedBy && blockedBy.length > 0) {
    await Task.updateMany(
      { _id: { $in: blockedBy } },
      { $addToSet: { dependencies: task._id } }
    );
  }

  const populatedTask = await Task.findById(task._id)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('project', 'name color')
    .populate('dependencies', 'title status')
    .populate('blockedBy', 'title status');

  // Log activity
  await ActivityLog.create({
    team: teamId,
    user: req.user._id,
    action: 'task_created',
    targetType: 'task',
    targetId: task._id,
    description: `${req.user.name} created task "${task.title}"`,
  });

  // Notify assigned user
  if (assignedTo && assignedTo !== req.user._id.toString()) {
    await Notification.create({
      user: assignedTo,
      team: teamId,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have been assigned to "${task.title}"`,
      data: { taskId: task._id },
    });

    const io = req.app.get('io');
    io.to(`user:${assignedTo}`).emit('notification:new', {
      type: 'task_assigned',
      message: `You have been assigned to "${task.title}"`,
      taskId: task._id,
    });
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${teamId}`).emit('task:created', { task: populatedTask });

  res.status(201).json({ task: populatedTask });
});

// @desc    Get team tasks
// @route   GET /api/tasks
// @access  Private
export const getTasks = asyncHandler(async (req, res) => {
  const { teamId, projectId, status, assignedTo, priority, search } = req.query;

  if (!teamId) {
    throw createError('Team ID is required', 400);
  }

  // Build query
  const query = { team: teamId };

  // Filter by project if provided
  if (projectId) {
    query.project = projectId;
  }

  if (status) query.status = status;
  if (assignedTo) query.assignedTo = assignedTo;
  if (priority) query.priority = priority;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  const tasks = await Task.find(query)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('project', 'name color')
    .populate('dependencies', 'title status')
    .populate('blockedBy', 'title status')
    .sort({ status: 1, order: 1, createdAt: -1 });

  res.json({ tasks });
});

// @desc    Get single task
// @route   GET /api/tasks/:taskId
// @access  Private
export const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.taskId)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('team', 'name');

  if (!task) {
    throw createError('Task not found', 404);
  }

  // Verify team membership
  const team = await Team.findById(task.team);
  const isMember = team.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!isMember) {
    throw createError('You are not a member of this team', 403);
  }

  res.json({ task });
});

// @desc    Update task
// @route   PUT /api/tasks/:taskId
// @access  Private
export const updateTask = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    status,
    priority,
    projectId,
    assignedTo,
    dueDate,
    tags,
    checklist,
    dependencies,
    blockedBy,
    recurring,
  } = req.body;

  const task = await Task.findById(req.params.taskId);

  if (!task) {
    throw createError('Task not found', 404);
  }

  // Verify team membership
  const team = await Team.findById(task.team);
  const isMember = team.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!isMember) {
    throw createError('You are not a member of this team', 403);
  }

  const oldStatus = task.status;
  const oldAssignee = task.assignedTo?.toString();

  // Update fields
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (status !== undefined) task.status = status;
  if (priority !== undefined) task.priority = priority;
  if (projectId !== undefined) task.project = projectId || null;
  if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
  if (dueDate !== undefined) task.dueDate = dueDate || null;
  if (tags !== undefined) task.tags = tags;
  if (checklist !== undefined) task.checklist = checklist;
  if (dependencies !== undefined) task.dependencies = dependencies;
  if (blockedBy !== undefined) {
    // Handle blockedBy updates
    const oldBlockedBy = task.blockedBy.map(id => id.toString());
    const newBlockedBy = blockedBy || [];

    // Remove this task from old blockedBy tasks' dependencies
    const removedFrom = oldBlockedBy.filter(id => !newBlockedBy.includes(id));
    if (removedFrom.length > 0) {
      await Task.updateMany(
        { _id: { $in: removedFrom } },
        { $pull: { dependencies: task._id } }
      );
    }

    // Add this task to new blockedBy tasks' dependencies
    const addedTo = newBlockedBy.filter(id => !oldBlockedBy.includes(id));
    if (addedTo.length > 0) {
      await Task.updateMany(
        { _id: { $in: addedTo } },
        { $addToSet: { dependencies: task._id } }
      );
    }

    task.blockedBy = blockedBy;
  }

  // Handle recurring updates
  if (recurring !== undefined) {
    if (recurring?.isRecurring && recurring?.frequency) {
      const nextOccurrence = calculateNextOccurrence(
        recurring.frequency,
        recurring.interval || 1,
        recurring.daysOfWeek || [],
        dueDate ? new Date(dueDate) : (task.dueDate || new Date())
      );

      task.recurring = {
        isRecurring: true,
        frequency: recurring.frequency,
        interval: recurring.interval || 1,
        daysOfWeek: recurring.daysOfWeek || [],
        endDate: recurring.endDate || null,
        nextOccurrence,
        parentTaskId: task.recurring?.parentTaskId || null,
      };
    } else {
      task.recurring = {
        isRecurring: false,
        frequency: null,
        interval: 1,
        daysOfWeek: [],
        endDate: null,
        nextOccurrence: null,
        parentTaskId: null,
      };
    }
  }

  // Check if task is being marked as Done and is recurring
  const isBeingCompleted = status === 'Done' && oldStatus !== 'Done' && task.recurring?.isRecurring;
  let newRecurringTask = null;

  await task.save();

  // Create next occurrence if recurring task is completed
  if (isBeingCompleted) {
    const recurringConfig = task.recurring;

    // Check if we should create another occurrence (endDate not passed)
    const shouldCreateNext = !recurringConfig.endDate || new Date(recurringConfig.endDate) > new Date();

    if (shouldCreateNext) {
      const nextDueDate = recurringConfig.nextOccurrence || calculateNextOccurrence(
        recurringConfig.frequency,
        recurringConfig.interval,
        recurringConfig.daysOfWeek,
        task.dueDate || new Date()
      );

      // Calculate the occurrence after this one
      const futureNextOccurrence = calculateNextOccurrence(
        recurringConfig.frequency,
        recurringConfig.interval,
        recurringConfig.daysOfWeek,
        nextDueDate
      );

      // Get max order for the status column
      const maxOrderTask = await Task.findOne({ team: task.team, status: 'To Do' })
        .sort({ order: -1 })
        .select('order');
      const order = maxOrderTask ? maxOrderTask.order + 1 : 0;

      // Create the new recurring task
      newRecurringTask = await Task.create({
        title: task.title,
        description: task.description,
        status: 'To Do',
        priority: task.priority,
        team: task.team,
        project: task.project,
        assignedTo: task.assignedTo,
        createdBy: req.user._id,
        dueDate: nextDueDate,
        tags: task.tags,
        checklist: task.checklist.map(item => ({ text: item.text, completed: false })),
        order,
        recurring: {
          isRecurring: true,
          frequency: recurringConfig.frequency,
          interval: recurringConfig.interval,
          daysOfWeek: recurringConfig.daysOfWeek,
          endDate: recurringConfig.endDate,
          nextOccurrence: futureNextOccurrence,
          parentTaskId: recurringConfig.parentTaskId || task._id,
        },
      });

      // Populate the new task
      await newRecurringTask.populate([
        { path: 'assignedTo', select: 'name email avatar' },
        { path: 'createdBy', select: 'name email avatar' },
        { path: 'project', select: 'name color' },
      ]);

      // Emit new task creation
      const io = req.app.get('io');
      io.to(`team:${task.team}`).emit('task:created', { task: newRecurringTask });

      // Log activity for recurring task creation
      await ActivityLog.create({
        team: task.team,
        user: req.user._id,
        action: 'task_created',
        targetType: 'task',
        targetId: newRecurringTask._id,
        description: `Next occurrence of recurring task "${task.title}" created`,
      });
    }
  }

  const populatedTask = await Task.findById(task._id)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('project', 'name color')
    .populate('dependencies', 'title status')
    .populate('blockedBy', 'title status');

  // Log activity
  let actionDescription = `${req.user.name} updated task "${task.title}"`;
  let action = 'task_updated';

  if (oldStatus !== task.status) {
    action = 'task_status_changed';
    actionDescription = `${req.user.name} moved "${task.title}" from ${oldStatus} to ${task.status}`;
  }

  await ActivityLog.create({
    team: task.team,
    user: req.user._id,
    action,
    targetType: 'task',
    targetId: task._id,
    details: { oldStatus, newStatus: task.status },
    description: actionDescription,
  });

  // Notify new assignee
  const newAssignee = task.assignedTo?.toString();
  if (newAssignee && newAssignee !== oldAssignee && newAssignee !== req.user._id.toString()) {
    await Notification.create({
      user: newAssignee,
      team: task.team,
      type: 'task_assigned',
      title: 'Task Assigned',
      message: `You have been assigned to "${task.title}"`,
      data: { taskId: task._id },
    });

    const io = req.app.get('io');
    io.to(`user:${newAssignee}`).emit('notification:new', {
      type: 'task_assigned',
      message: `You have been assigned to "${task.title}"`,
      taskId: task._id,
    });
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${task.team}`).emit('task:updated', { task: populatedTask });

  res.json({ task: populatedTask });
});

// @desc    Delete task
// @route   DELETE /api/tasks/:taskId
// @access  Private (Admin/Manager or creator)
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    throw createError('Task not found', 404);
  }

  // Verify team membership and permissions
  const team = await Team.findById(task.team);
  const member = team.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );

  if (!member) {
    throw createError('You are not a member of this team', 403);
  }

  // Only Admin, Manager, or creator can delete
  const canDelete =
    member.role === 'Admin' ||
    member.role === 'Manager' ||
    task.createdBy.toString() === req.user._id.toString();

  if (!canDelete) {
    throw createError('You do not have permission to delete this task', 403);
  }

  const taskTitle = task.title;
  const teamId = task.team;

  await task.deleteOne();

  // Log activity
  await ActivityLog.create({
    team: teamId,
    user: req.user._id,
    action: 'task_deleted',
    targetType: 'task',
    targetId: req.params.taskId,
    description: `${req.user.name} deleted task "${taskTitle}"`,
  });

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${teamId}`).emit('task:deleted', { taskId: req.params.taskId });

  res.json({ message: 'Task deleted successfully' });
});

// @desc    Reorder tasks (drag and drop)
// @route   PUT /api/tasks/reorder
// @access  Private
export const reorderTasks = asyncHandler(async (req, res) => {
  const { taskId, newStatus, newOrder, teamId } = req.body;

  if (!taskId || newStatus === undefined || newOrder === undefined || !teamId) {
    throw createError('Task ID, status, order, and team ID are required', 400);
  }

  const task = await Task.findById(taskId);

  if (!task) {
    throw createError('Task not found', 404);
  }

  // Verify team membership
  const team = await Team.findById(teamId);
  const isMember = team.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!isMember) {
    throw createError('You are not a member of this team', 403);
  }

  const oldStatus = task.status;
  const oldOrder = task.order;

  // If moving to a different column
  if (oldStatus !== newStatus) {
    // Shift tasks down in the old column
    await Task.updateMany(
      { team: teamId, status: oldStatus, order: { $gt: oldOrder } },
      { $inc: { order: -1 } }
    );

    // Shift tasks up in the new column
    await Task.updateMany(
      { team: teamId, status: newStatus, order: { $gte: newOrder } },
      { $inc: { order: 1 } }
    );
  } else {
    // Moving within the same column
    if (newOrder > oldOrder) {
      await Task.updateMany(
        { team: teamId, status: newStatus, order: { $gt: oldOrder, $lte: newOrder } },
        { $inc: { order: -1 } }
      );
    } else if (newOrder < oldOrder) {
      await Task.updateMany(
        { team: teamId, status: newStatus, order: { $gte: newOrder, $lt: oldOrder } },
        { $inc: { order: 1 } }
      );
    }
  }

  // Update the task
  task.status = newStatus;
  task.order = newOrder;
  await task.save();

  // Get all updated tasks
  const tasks = await Task.find({ team: teamId })
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .sort({ status: 1, order: 1 });

  // Log activity if status changed
  if (oldStatus !== newStatus) {
    await ActivityLog.create({
      team: teamId,
      user: req.user._id,
      action: 'task_status_changed',
      targetType: 'task',
      targetId: taskId,
      details: { oldStatus, newStatus },
      description: `${req.user.name} moved "${task.title}" from ${oldStatus} to ${newStatus}`,
    });
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${teamId}`).emit('tasks:reordered', { tasks });

  res.json({ tasks });
});

// @desc    Bulk update tasks
// @route   PUT /api/tasks/bulk
// @access  Private
export const bulkUpdateTasks = asyncHandler(async (req, res) => {
  const { taskIds, updates, teamId } = req.body;

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw createError('Task IDs are required', 400);
  }

  if (!teamId) {
    throw createError('Team ID is required', 400);
  }

  // Verify team membership
  const team = await Team.findById(teamId);
  if (!team) {
    throw createError('Team not found', 404);
  }

  const isMember = team.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!isMember) {
    throw createError('You are not a member of this team', 403);
  }

  // Validate all tasks belong to this team
  const tasks = await Task.find({ _id: { $in: taskIds }, team: teamId });
  if (tasks.length !== taskIds.length) {
    throw createError('Some tasks not found or do not belong to this team', 400);
  }

  // Build update object
  const updateObj = {};
  if (updates.status !== undefined) updateObj.status = updates.status;
  if (updates.priority !== undefined) updateObj.priority = updates.priority;
  if (updates.assignedTo !== undefined) updateObj.assignedTo = updates.assignedTo || null;
  if (updates.projectId !== undefined) updateObj.project = updates.projectId || null;

  // Update all tasks
  await Task.updateMany(
    { _id: { $in: taskIds } },
    { $set: updateObj }
  );

  // Handle completedAt for status changes
  if (updates.status === 'Done') {
    await Task.updateMany(
      { _id: { $in: taskIds }, completedAt: null },
      { $set: { completedAt: new Date() } }
    );
  } else if (updates.status && updates.status !== 'Done') {
    await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: { completedAt: null } }
    );
  }

  // Get updated tasks
  const updatedTasks = await Task.find({ _id: { $in: taskIds } })
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('project', 'name color');

  // Log activity
  await ActivityLog.create({
    team: teamId,
    user: req.user._id,
    action: 'tasks_bulk_updated',
    targetType: 'task',
    description: `${req.user.name} bulk updated ${taskIds.length} tasks`,
    details: { taskIds, updates },
  });

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${teamId}`).emit('tasks:bulk_updated', { tasks: updatedTasks });

  res.json({ tasks: updatedTasks });
});

// @desc    Bulk delete tasks
// @route   DELETE /api/tasks/bulk
// @access  Private (Admin/Manager)
export const bulkDeleteTasks = asyncHandler(async (req, res) => {
  const { taskIds, teamId } = req.body;

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw createError('Task IDs are required', 400);
  }

  if (!teamId) {
    throw createError('Team ID is required', 400);
  }

  // Verify team membership and permissions
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

  // Only Admin or Manager can bulk delete
  if (member.role !== 'Admin' && member.role !== 'Manager') {
    throw createError('Only Admin or Manager can bulk delete tasks', 403);
  }

  // Delete tasks
  await Task.deleteMany({ _id: { $in: taskIds }, team: teamId });

  // Log activity
  await ActivityLog.create({
    team: teamId,
    user: req.user._id,
    action: 'tasks_bulk_deleted',
    targetType: 'task',
    description: `${req.user.name} deleted ${taskIds.length} tasks`,
    details: { taskIds },
  });

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${teamId}`).emit('tasks:bulk_deleted', { taskIds });

  res.json({ message: `${taskIds.length} tasks deleted successfully` });
});

// @desc    Start timer on task
// @route   POST /api/tasks/:taskId/timer/start
// @access  Private
export const startTimer = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    throw createError('Task not found', 404);
  }

  // Verify team membership
  const team = await Team.findById(task.team);
  const isMember = team.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!isMember) {
    throw createError('You are not a member of this team', 403);
  }

  if (task.timeTracking?.isTimerRunning) {
    throw createError('Timer is already running on this task', 400);
  }

  // Initialize timeTracking if it doesn't exist
  if (!task.timeTracking) {
    task.timeTracking = {
      estimatedMinutes: 0,
      totalMinutes: 0,
      sessions: [],
      isTimerRunning: false,
      timerStartedAt: null,
      timerStartedBy: null,
    };
  }

  task.timeTracking.isTimerRunning = true;
  task.timeTracking.timerStartedAt = new Date();
  task.timeTracking.timerStartedBy = req.user._id;

  await task.save();

  const populatedTask = await Task.findById(task._id)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('project', 'name color')
    .populate('dependencies', 'title status')
    .populate('blockedBy', 'title status')
    .populate('timeTracking.timerStartedBy', 'name');

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${task.team}`).emit('task:updated', { task: populatedTask });

  res.json({ task: populatedTask });
});

// @desc    Stop timer on task
// @route   POST /api/tasks/:taskId/timer/stop
// @access  Private
export const stopTimer = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    throw createError('Task not found', 404);
  }

  // Verify team membership
  const team = await Team.findById(task.team);
  const isMember = team.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!isMember) {
    throw createError('You are not a member of this team', 403);
  }

  if (!task.timeTracking?.isTimerRunning) {
    throw createError('Timer is not running on this task', 400);
  }

  const startTime = task.timeTracking.timerStartedAt;
  const endTime = new Date();
  const duration = Math.round((endTime - startTime) / 60000); // Convert to minutes

  // Add session
  task.timeTracking.sessions.push({
    startTime,
    endTime,
    duration,
    user: task.timeTracking.timerStartedBy,
  });

  // Update total time
  task.timeTracking.totalMinutes += duration;

  // Reset timer
  task.timeTracking.isTimerRunning = false;
  task.timeTracking.timerStartedAt = null;
  task.timeTracking.timerStartedBy = null;

  await task.save();

  const populatedTask = await Task.findById(task._id)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('project', 'name color')
    .populate('dependencies', 'title status')
    .populate('blockedBy', 'title status');

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${task.team}`).emit('task:updated', { task: populatedTask });

  res.json({ task: populatedTask, session: { startTime, endTime, duration } });
});

// @desc    Update estimated time
// @route   PUT /api/tasks/:taskId/time-estimate
// @access  Private
export const updateTimeEstimate = asyncHandler(async (req, res) => {
  const { estimatedMinutes } = req.body;
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    throw createError('Task not found', 404);
  }

  // Verify team membership
  const team = await Team.findById(task.team);
  const isMember = team.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!isMember) {
    throw createError('You are not a member of this team', 403);
  }

  // Initialize timeTracking if it doesn't exist
  if (!task.timeTracking) {
    task.timeTracking = {
      estimatedMinutes: 0,
      totalMinutes: 0,
      sessions: [],
      isTimerRunning: false,
      timerStartedAt: null,
      timerStartedBy: null,
    };
  }

  task.timeTracking.estimatedMinutes = estimatedMinutes || 0;
  await task.save();

  const populatedTask = await Task.findById(task._id)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('project', 'name color')
    .populate('dependencies', 'title status')
    .populate('blockedBy', 'title status');

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${task.team}`).emit('task:updated', { task: populatedTask });

  res.json({ task: populatedTask });
});

// @desc    Add manual time entry
// @route   POST /api/tasks/:taskId/time-entry
// @access  Private
export const addTimeEntry = asyncHandler(async (req, res) => {
  const { duration } = req.body; // duration in minutes
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    throw createError('Task not found', 404);
  }

  if (!duration || duration <= 0) {
    throw createError('Duration must be a positive number', 400);
  }

  // Verify team membership
  const team = await Team.findById(task.team);
  const isMember = team.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!isMember) {
    throw createError('You are not a member of this team', 403);
  }

  // Initialize timeTracking if it doesn't exist
  if (!task.timeTracking) {
    task.timeTracking = {
      estimatedMinutes: 0,
      totalMinutes: 0,
      sessions: [],
      isTimerRunning: false,
      timerStartedAt: null,
      timerStartedBy: null,
    };
  }

  const now = new Date();
  task.timeTracking.sessions.push({
    startTime: now,
    endTime: now,
    duration,
    user: req.user._id,
  });
  task.timeTracking.totalMinutes += duration;

  await task.save();

  const populatedTask = await Task.findById(task._id)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('project', 'name color')
    .populate('dependencies', 'title status')
    .populate('blockedBy', 'title status');

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${task.team}`).emit('task:updated', { task: populatedTask });

  res.json({ task: populatedTask });
});

// @desc    Update checklist item
// @route   PUT /api/tasks/:taskId/checklist/:itemId
// @access  Private
export const updateChecklistItem = asyncHandler(async (req, res) => {
  const { taskId, itemId } = req.params;
  const { completed, text } = req.body;

  const task = await Task.findById(taskId);

  if (!task) {
    throw createError('Task not found', 404);
  }

  // Verify team membership
  const team = await Team.findById(task.team);
  const isMember = team.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!isMember) {
    throw createError('You are not a member of this team', 403);
  }

  const itemIndex = task.checklist.findIndex((item) => item._id.toString() === itemId);

  if (itemIndex === -1) {
    throw createError('Checklist item not found', 404);
  }

  if (completed !== undefined) task.checklist[itemIndex].completed = completed;
  if (text !== undefined) task.checklist[itemIndex].text = text;

  await task.save();

  const populatedTask = await Task.findById(task._id)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar');

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${task.team}`).emit('task:updated', { task: populatedTask });

  res.json({ task: populatedTask });
});
