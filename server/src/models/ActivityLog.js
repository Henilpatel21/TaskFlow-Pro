import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'task_created',
        'task_updated',
        'task_deleted',
        'task_assigned',
        'task_status_changed',
        'task_comment_added',
        'tasks_bulk_updated',
        'tasks_bulk_deleted',
        'member_added',
        'member_removed',
        'member_role_changed',
        'team_created',
        'team_updated',
        'project_created',
        'project_updated',
        'project_deleted',
      ],
    },
    targetType: {
      type: String,
      enum: ['task', 'team', 'member', 'project'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying team activities
activityLogSchema.index({ team: 1, createdAt: -1 });
activityLogSchema.index({ targetType: 1, targetId: 1 });

// Auto-delete old logs after 30 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
