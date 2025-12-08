import { create } from 'zustand';
import { tasksApi } from '../services/api';

const useTaskStore = create((set, get) => ({
  tasks: [],
  currentTask: null,
  isLoading: false,
  error: null,
  filters: {
    status: null,
    priority: null,
    assignedTo: null,
    search: '',
  },

  // Fetch tasks for a team
  fetchTasks: async (teamId, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = { teamId, ...filters };
      const { data } = await tasksApi.getAll(params);
      set({ tasks: data.tasks, isLoading: false });
      return { success: true };
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Failed to fetch tasks',
        isLoading: false,
      });
      return { success: false };
    }
  },

  // Create task
  createTask: async (taskData) => {
    try {
      const { data } = await tasksApi.create(taskData);
      set((state) => ({
        tasks: [...state.tasks, data.task],
      }));
      return { success: true, task: data.task };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create task',
      };
    }
  },

  // Update task
  updateTask: async (taskId, taskData) => {
    try {
      const { data } = await tasksApi.update(taskId, taskData);
      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === taskId ? data.task : t)),
        currentTask:
          state.currentTask?._id === taskId ? data.task : state.currentTask,
      }));
      return { success: true, task: data.task };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update task',
      };
    }
  },

  // Delete task
  deleteTask: async (taskId) => {
    try {
      await tasksApi.delete(taskId);
      set((state) => ({
        tasks: state.tasks.filter((t) => t._id !== taskId),
        currentTask:
          state.currentTask?._id === taskId ? null : state.currentTask,
      }));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete task',
      };
    }
  },

  // Reorder tasks (drag and drop)
  reorderTasks: async (taskId, newStatus, newOrder, teamId) => {
    // Optimistic update
    const previousTasks = get().tasks;

    try {
      const { data } = await tasksApi.reorder({
        taskId,
        newStatus,
        newOrder,
        teamId,
      });
      set({ tasks: data.tasks });
      return { success: true };
    } catch (error) {
      // Revert on error
      set({ tasks: previousTasks });
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to reorder tasks',
      };
    }
  },

  // Update checklist item
  updateChecklistItem: async (taskId, itemId, data) => {
    try {
      const { data: response } = await tasksApi.updateChecklistItem(
        taskId,
        itemId,
        data
      );
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t._id === taskId ? response.task : t
        ),
        currentTask:
          state.currentTask?._id === taskId
            ? response.task
            : state.currentTask,
      }));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // Set current task (for modal/detail view)
  setCurrentTask: (task) => set({ currentTask: task }),

  // Update task from socket event
  updateTaskFromSocket: (task) => {
    set((state) => {
      const exists = state.tasks.some((t) => t._id === task._id);
      if (exists) {
        return {
          tasks: state.tasks.map((t) => (t._id === task._id ? task : t)),
          currentTask:
            state.currentTask?._id === task._id ? task : state.currentTask,
        };
      }
      return {
        tasks: [...state.tasks, task],
      };
    });
  },

  // Add task from socket (created by another user)
  addTaskFromSocket: (task) => {
    set((state) => {
      const exists = state.tasks.some((t) => t._id === task._id);
      if (!exists) {
        return { tasks: [...state.tasks, task] };
      }
      return state;
    });
  },

  // Remove task from socket
  removeTaskFromSocket: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t._id !== taskId),
      currentTask:
        state.currentTask?._id === taskId ? null : state.currentTask,
    }));
  },

  // Set tasks from socket (after reorder)
  setTasksFromSocket: (tasks) => set({ tasks }),

  // Bulk update tasks
  bulkUpdateTasks: async (taskIds, updates, teamId) => {
    try {
      const { data } = await tasksApi.bulkUpdate({ taskIds, updates, teamId });
      set((state) => {
        const updatedMap = new Map(data.tasks.map((t) => [t._id, t]));
        return {
          tasks: state.tasks.map((t) => updatedMap.get(t._id) || t),
        };
      });
      return { success: true, tasks: data.tasks };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to bulk update tasks',
      };
    }
  },

  // Bulk delete tasks
  bulkDeleteTasks: async (taskIds, teamId) => {
    try {
      await tasksApi.bulkDelete({ taskIds, teamId });
      set((state) => ({
        tasks: state.tasks.filter((t) => !taskIds.includes(t._id)),
        currentTask: taskIds.includes(state.currentTask?._id) ? null : state.currentTask,
      }));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to bulk delete tasks',
      };
    }
  },

  // Bulk update from socket
  bulkUpdateTasksFromSocket: (tasks) => {
    set((state) => {
      const updatedMap = new Map(tasks.map((t) => [t._id, t]));
      return {
        tasks: state.tasks.map((t) => updatedMap.get(t._id) || t),
      };
    });
  },

  // Bulk delete from socket
  bulkDeleteTasksFromSocket: (taskIds) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => !taskIds.includes(t._id)),
      currentTask: taskIds.includes(state.currentTask?._id) ? null : state.currentTask,
    }));
  },

  // Time tracking - Start timer
  startTimer: async (taskId) => {
    try {
      const { data } = await tasksApi.startTimer(taskId);
      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === taskId ? data.task : t)),
        currentTask: state.currentTask?._id === taskId ? data.task : state.currentTask,
      }));
      return { success: true, task: data.task };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to start timer',
      };
    }
  },

  // Time tracking - Stop timer
  stopTimer: async (taskId) => {
    try {
      const { data } = await tasksApi.stopTimer(taskId);
      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === taskId ? data.task : t)),
        currentTask: state.currentTask?._id === taskId ? data.task : state.currentTask,
      }));
      return { success: true, task: data.task, session: data.session };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to stop timer',
      };
    }
  },

  // Time tracking - Update estimate
  updateTimeEstimate: async (taskId, estimatedMinutes) => {
    try {
      const { data } = await tasksApi.updateTimeEstimate(taskId, estimatedMinutes);
      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === taskId ? data.task : t)),
        currentTask: state.currentTask?._id === taskId ? data.task : state.currentTask,
      }));
      return { success: true, task: data.task };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update estimate',
      };
    }
  },

  // Time tracking - Add manual entry
  addTimeEntry: async (taskId, duration) => {
    try {
      const { data } = await tasksApi.addTimeEntry(taskId, duration);
      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === taskId ? data.task : t)),
        currentTask: state.currentTask?._id === taskId ? data.task : state.currentTask,
      }));
      return { success: true, task: data.task };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to add time entry',
      };
    }
  },

  // Set filters
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  // Clear filters
  clearFilters: () =>
    set({
      filters: {
        status: null,
        priority: null,
        assignedTo: null,
        search: '',
      },
    }),

  // Get tasks grouped by status
  getTasksByStatus: () => {
    const tasks = get().tasks;
    const statuses = ['To Do', 'In Progress', 'Review', 'Done'];

    return statuses.reduce((acc, status) => {
      acc[status] = tasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.order - b.order);
      return acc;
    }, {});
  },

  // Clear task state
  clearTaskState: () =>
    set({
      tasks: [],
      currentTask: null,
      error: null,
      filters: {
        status: null,
        priority: null,
        assignedTo: null,
        search: '',
      },
    }),
}));

export default useTaskStore;
