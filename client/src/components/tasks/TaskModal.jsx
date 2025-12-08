import { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  Tag,
  CheckSquare,
  Plus,
  Trash2,
  Link,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useTaskStore from '../../stores/taskStore';
import useTeamStore from '../../stores/teamStore';
import useProjectStore from '../../stores/projectStore';
import useCelebrationStore from '../../stores/celebrationStore';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import Badge from '../common/Badge';
import Avatar from '../common/Avatar';
import TimeTracker from './TimeTracker';
import RecurringConfig from './RecurringConfig';

const statusOptions = [
  { value: 'To Do', label: 'To Do' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Review', label: 'Review' },
  { value: 'Done', label: 'Done' },
];

const priorityOptions = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Urgent', label: 'Urgent' },
];

export default function TaskModal({ task, isOpen, onClose, teamId, initialStatus, initialDueDate }) {
  const { createTask, updateTask, deleteTask, updateChecklistItem, tasks } = useTaskStore();
  const { currentTeam } = useTeamStore();
  const { projects, currentProject } = useProjectStore();
  const { celebrate } = useCelebrationStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newTag, setNewTag] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: initialStatus || 'To Do',
    priority: 'Medium',
    projectId: currentProject?._id || '',
    assignedTo: '',
    dueDate: '',
    tags: [],
    checklist: [],
    blockedBy: [],
    recurring: null,
  });

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'To Do',
        priority: task.priority || 'Medium',
        projectId: task.project?._id || '',
        assignedTo: task.assignedTo?._id || '',
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().split('T')[0]
          : '',
        tags: task.tags || [],
        checklist: task.checklist || [],
        blockedBy: task.blockedBy?.map(t => t._id || t) || [],
        recurring: task.recurring || null,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: initialStatus || 'To Do',
        priority: 'Medium',
        projectId: currentProject?._id || '',
        assignedTo: '',
        dueDate: initialDueDate || '',
        tags: [],
        checklist: [],
        blockedBy: [],
        recurring: null,
      });
    }
  }, [task, initialStatus, initialDueDate, currentProject]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    setIsLoading(true);

    const taskData = {
      ...formData,
      teamId,
      assignedTo: formData.assignedTo || null,
      dueDate: formData.dueDate || null,
    };

    const result = isEditing
      ? await updateTask(task._id, taskData)
      : await createTask(taskData);

    setIsLoading(false);

    if (result.success) {
      toast.success(isEditing ? 'Task updated!' : 'Task created!');

      // Trigger celebration when task is marked as Done
      const wasNotDone = task?.status !== 'Done';
      const isNowDone = formData.status === 'Done';
      if (isNowDone && (wasNotDone || !isEditing)) {
        celebrate(formData.title ? `"${formData.title}" Completed!` : 'Task Completed!');
      }

      onClose();
    } else {
      toast.error(result.error || 'Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setIsDeleting(true);
    const result = await deleteTask(task._id);
    setIsDeleting(false);

    if (result.success) {
      toast.success('Task deleted');
      onClose();
    } else {
      toast.error(result.error || 'Failed to delete task');
    }
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setFormData({
      ...formData,
      checklist: [
        ...formData.checklist,
        { text: newChecklistItem, completed: false },
      ],
    });
    setNewChecklistItem('');
  };

  const handleToggleChecklistItem = async (index) => {
    const newChecklist = [...formData.checklist];
    newChecklist[index].completed = !newChecklist[index].completed;
    setFormData({ ...formData, checklist: newChecklist });

    if (isEditing && formData.checklist[index]._id) {
      await updateChecklistItem(task._id, formData.checklist[index]._id, {
        completed: newChecklist[index].completed,
      });
    }
  };

  const handleRemoveChecklistItem = (index) => {
    setFormData({
      ...formData,
      checklist: formData.checklist.filter((_, i) => i !== index),
    });
  };

  const handleAddTag = () => {
    if (!newTag.trim() || formData.tags.includes(newTag.trim())) return;
    setFormData({
      ...formData,
      tags: [...formData.tags, newTag.trim()],
    });
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const teamMembers =
    currentTeam?.members?.map((m) => ({
      value: m.user._id,
      label: m.user.name,
    })) || [];

  const projectOptions = [
    { value: '', label: 'No Project' },
    ...projects.map((p) => ({
      value: p._id,
      label: p.name,
    })),
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black bg-opacity-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Task' : 'Create Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="Enter task title"
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Add a description..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Project */}
          {projects.length > 0 && (
            <Select
              label="Project"
              value={formData.projectId}
              onChange={(e) =>
                setFormData({ ...formData, projectId: e.target.value })
              }
              options={projectOptions}
            />
          )}

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              options={statusOptions}
            />
            <Select
              label="Priority"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
              options={priorityOptions}
            />
          </div>

          {/* Assignee & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Assignee"
              value={formData.assignedTo}
              onChange={(e) =>
                setFormData({ ...formData, assignedTo: e.target.value })
              }
              options={[{ value: '', label: 'Unassigned' }, ...teamMembers]}
            />
            <Input
              label="Due Date"
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button type="button" size="sm" variant="secondary" onClick={handleAddTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Dependencies (Blocked By) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Blocked By (Dependencies)
              </span>
            </label>
            {/* Show blocking tasks indicator */}
            {formData.blockedBy.length > 0 && (
              <div className="mb-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>This task is blocked by {formData.blockedBy.length} task(s)</span>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.blockedBy.map((taskId) => {
                const blockerTask = tasks.find(t => t._id === taskId);
                if (!blockerTask) return null;
                return (
                  <span
                    key={taskId}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${
                      blockerTask.status === 'Done'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      blockerTask.status === 'Done' ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    {blockerTask.title}
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        blockedBy: formData.blockedBy.filter(id => id !== taskId)
                      })}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
            <select
              onChange={(e) => {
                if (e.target.value && !formData.blockedBy.includes(e.target.value)) {
                  setFormData({
                    ...formData,
                    blockedBy: [...formData.blockedBy, e.target.value]
                  });
                }
                e.target.value = '';
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-card dark:text-dark-text"
              defaultValue=""
            >
              <option value="" disabled>Add blocking task...</option>
              {tasks
                .filter(t => t._id !== task?._id && !formData.blockedBy.includes(t._id))
                .map(t => (
                  <option key={t._id} value={t._id}>
                    {t.title} ({t.status})
                  </option>
                ))
              }
            </select>
          </div>

          {/* Show tasks this blocks */}
          {task?.dependencies && task.dependencies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Blocks These Tasks
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {task.dependencies.map((depTask) => (
                  <span
                    key={depTask._id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-sm text-blue-700 dark:text-blue-300"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {depTask.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Time Tracking - Only show for existing tasks */}
          {isEditing && (
            <TimeTracker task={task} />
          )}

          {/* Recurring Config */}
          <RecurringConfig
            recurring={formData.recurring}
            onChange={(recurring) => setFormData({ ...formData, recurring })}
          />

          {/* Checklist */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Checklist
            </label>
            <div className="space-y-2 mb-2">
              {formData.checklist.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleChecklistItem(index)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      item.completed ? 'line-through text-gray-400' : ''
                    }`}
                  >
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(index)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyPress={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())
                }
                placeholder="Add checklist item..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleAddChecklistItem}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            {isEditing ? (
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                {isEditing ? 'Save Changes' : 'Create Task'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
