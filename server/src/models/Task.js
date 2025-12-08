import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Checklist item cannot exceed 200 characters'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['To Do', 'In Progress', 'Review', 'Done'],
      default: 'To Do',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [30, 'Tag cannot exceed 30 characters'],
      },
    ],
    checklist: [checklistItemSchema],
    order: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Task Dependencies
    dependencies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    }],
    blockedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    }],
    // Time Tracking
    timeTracking: {
      estimatedMinutes: {
        type: Number,
        default: 0,
      },
      totalMinutes: {
        type: Number,
        default: 0,
      },
      sessions: [{
        startTime: Date,
        endTime: Date,
        duration: Number, // in minutes
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      }],
      isTimerRunning: {
        type: Boolean,
        default: false,
      },
      timerStartedAt: {
        type: Date,
        default: null,
      },
      timerStartedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
    },
    // Recurring Tasks
    recurring: {
      isRecurring: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', 'monthly', 'custom'],
        default: null,
      },
      interval: {
        type: Number,
        default: 1, // Every X days/weeks/months
      },
      daysOfWeek: [{
        type: Number, // 0 = Sunday, 1 = Monday, etc.
      }],
      endDate: {
        type: Date,
        default: null,
      },
      nextOccurrence: {
        type: Date,
        default: null,
      },
      parentTaskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
taskSchema.index({ team: 1, status: 1 });
taskSchema.index({ team: 1, assignedTo: 1 });
taskSchema.index({ team: 1, createdBy: 1 });
taskSchema.index({ team: 1, dueDate: 1 });
taskSchema.index({ team: 1, order: 1 });
taskSchema.index({ team: 1, project: 1 });
taskSchema.index({ project: 1, status: 1 });

// Set completedAt when status changes to Done
taskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'Done' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'Done') {
      this.completedAt = null;
    }
  }
  next();
});

const Task = mongoose.model('Task', taskSchema);

export default Task;
