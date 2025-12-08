import { Project, Task, ActivityLog } from '../models/index.js';
import { createError, asyncHandler } from '../utils/helpers.js';

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
export const createProject = asyncHandler(async (req, res) => {
  const { name, description, color, icon, teamId } = req.body;

  if (!name) {
    throw createError('Project name is required', 400);
  }

  if (!teamId) {
    throw createError('Team ID is required', 400);
  }

  // Get max order for team's projects
  const maxOrder = await Project.findOne({ team: teamId })
    .sort({ order: -1 })
    .select('order');

  const project = await Project.create({
    name,
    description,
    color: color || '#3b82f6',
    icon: icon || 'folder',
    team: teamId,
    createdBy: req.user._id,
    order: maxOrder ? maxOrder.order + 1 : 0,
  });

  // Log activity
  await ActivityLog.create({
    team: teamId,
    user: req.user._id,
    action: 'project_created',
    targetType: 'project',
    targetId: project._id,
    description: `${req.user.name} created project "${project.name}"`,
  });

  const populatedProject = await Project.findById(project._id)
    .populate('createdBy', 'name email avatar');

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${teamId}`).emit('project:created', { project: populatedProject });

  res.status(201).json({ project: populatedProject });
});

// @desc    Get all projects for a team
// @route   GET /api/projects
// @access  Private
export const getProjects = asyncHandler(async (req, res) => {
  const { teamId, includeArchived } = req.query;

  if (!teamId) {
    throw createError('Team ID is required', 400);
  }

  const query = { team: teamId };
  if (!includeArchived || includeArchived === 'false') {
    query.isArchived = false;
  }

  const projects = await Project.find(query)
    .populate('createdBy', 'name email avatar')
    .sort({ order: 1, createdAt: -1 });

  // Get task counts for each project
  const projectsWithCounts = await Promise.all(
    projects.map(async (project) => {
      const taskCounts = await Task.aggregate([
        { $match: { project: project._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const counts = {
        total: 0,
        todo: 0,
        inProgress: 0,
        review: 0,
        done: 0,
      };

      taskCounts.forEach((item) => {
        counts.total += item.count;
        if (item._id === 'To Do') counts.todo = item.count;
        if (item._id === 'In Progress') counts.inProgress = item.count;
        if (item._id === 'Review') counts.review = item.count;
        if (item._id === 'Done') counts.done = item.count;
      });

      return {
        ...project.toObject(),
        taskCounts: counts,
      };
    })
  );

  res.json({ projects: projectsWithCounts });
});

// @desc    Get single project
// @route   GET /api/projects/:projectId
// @access  Private
export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId)
    .populate('createdBy', 'name email avatar');

  if (!project) {
    throw createError('Project not found', 404);
  }

  // Get task counts
  const taskCounts = await Task.aggregate([
    { $match: { project: project._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = {
    total: 0,
    todo: 0,
    inProgress: 0,
    review: 0,
    done: 0,
  };

  taskCounts.forEach((item) => {
    counts.total += item.count;
    if (item._id === 'To Do') counts.todo = item.count;
    if (item._id === 'In Progress') counts.inProgress = item.count;
    if (item._id === 'Review') counts.review = item.count;
    if (item._id === 'Done') counts.done = item.count;
  });

  res.json({
    project: {
      ...project.toObject(),
      taskCounts: counts,
    },
  });
});

// @desc    Update project
// @route   PUT /api/projects/:projectId
// @access  Private
export const updateProject = asyncHandler(async (req, res) => {
  const { name, description, color, icon, isArchived } = req.body;

  const project = await Project.findById(req.params.projectId);

  if (!project) {
    throw createError('Project not found', 404);
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (color !== undefined) updateData.color = color;
  if (icon !== undefined) updateData.icon = icon;
  if (isArchived !== undefined) updateData.isArchived = isArchived;

  const updatedProject = await Project.findByIdAndUpdate(
    req.params.projectId,
    updateData,
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email avatar');

  // Log activity
  await ActivityLog.create({
    team: project.team,
    user: req.user._id,
    action: isArchived ? 'project_archived' : 'project_updated',
    targetType: 'project',
    targetId: project._id,
    description: isArchived
      ? `${req.user.name} archived project "${project.name}"`
      : `${req.user.name} updated project "${project.name}"`,
  });

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${project.team}`).emit('project:updated', { project: updatedProject });

  res.json({ project: updatedProject });
});

// @desc    Delete project
// @route   DELETE /api/projects/:projectId
// @access  Private
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId);

  if (!project) {
    throw createError('Project not found', 404);
  }

  // Remove project reference from all tasks
  await Task.updateMany(
    { project: project._id },
    { project: null }
  );

  // Log activity
  await ActivityLog.create({
    team: project.team,
    user: req.user._id,
    action: 'project_deleted',
    targetType: 'project',
    targetId: project._id,
    description: `${req.user.name} deleted project "${project.name}"`,
  });

  const teamId = project.team;
  await project.deleteOne();

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${teamId}`).emit('project:deleted', { projectId: req.params.projectId });

  res.json({ message: 'Project deleted successfully' });
});

// @desc    Reorder projects
// @route   PUT /api/projects/reorder
// @access  Private
export const reorderProjects = asyncHandler(async (req, res) => {
  const { projectIds, teamId } = req.body;

  if (!Array.isArray(projectIds) || !teamId) {
    throw createError('Invalid request data', 400);
  }

  // Update order for each project
  await Promise.all(
    projectIds.map((projectId, index) =>
      Project.findByIdAndUpdate(projectId, { order: index })
    )
  );

  const projects = await Project.find({ team: teamId, isArchived: false })
    .populate('createdBy', 'name email avatar')
    .sort({ order: 1 });

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`team:${teamId}`).emit('projects:reordered', { projects });

  res.json({ projects });
});
