import { useState } from 'react';
import { X, Trash2, CheckSquare, ArrowRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import useTaskStore from '../../stores/taskStore';
import useTeamStore from '../../stores/teamStore';
import useProjectStore from '../../stores/projectStore';
import Button from '../common/Button';
import Select from '../common/Select';

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

export default function BulkActionsBar({ selectedTasks, onClearSelection, teamId }) {
  const { bulkUpdateTasks, bulkDeleteTasks } = useTaskStore();
  const { currentTeam } = useTeamStore();
  const { projects } = useProjectStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const selectedCount = selectedTasks.length;

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

  const handleBulkUpdate = async (updates) => {
    setIsLoading(true);
    const result = await bulkUpdateTasks(selectedTasks, updates, teamId);
    setIsLoading(false);

    if (result.success) {
      toast.success(`Updated ${selectedCount} tasks`);
      onClearSelection();
    } else {
      toast.error(result.error || 'Failed to update tasks');
    }
  };

  const handleBulkDelete = async () => {
    setIsLoading(true);
    const result = await bulkDeleteTasks(selectedTasks, teamId);
    setIsLoading(false);

    if (result.success) {
      toast.success(`Deleted ${selectedCount} tasks`);
      onClearSelection();
    } else {
      toast.error(result.error || 'Failed to delete tasks');
    }
    setShowDeleteConfirm(false);
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-dark-card rounded-xl shadow-xl border border-gray-200 dark:border-dark-border px-4 py-3 flex items-center gap-4 animate-slide-up">
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-4 border-r border-gray-200 dark:border-dark-border">
          <CheckSquare className="w-5 h-5 text-primary-600" />
          <span className="font-medium text-gray-900 dark:text-dark-text">
            {selectedCount} selected
          </span>
          <button
            onClick={onClearSelection}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status change */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-dark-muted">Status:</span>
          <select
            onChange={(e) => e.target.value && handleBulkUpdate({ status: e.target.value })}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-card dark:text-dark-text"
            defaultValue=""
          >
            <option value="" disabled>Move to...</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority change */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-dark-muted">Priority:</span>
          <select
            onChange={(e) => e.target.value && handleBulkUpdate({ priority: e.target.value })}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-card dark:text-dark-text"
            defaultValue=""
          >
            <option value="" disabled>Set priority...</option>
            {priorityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Assign */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-dark-muted">Assign:</span>
          <select
            onChange={(e) => handleBulkUpdate({ assignedTo: e.target.value || null })}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-card dark:text-dark-text"
            defaultValue=""
          >
            <option value="" disabled>Assign to...</option>
            <option value="">Unassigned</option>
            {teamMembers.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Project */}
        {projects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-dark-muted">Project:</span>
            <select
              onChange={(e) => handleBulkUpdate({ projectId: e.target.value || null })}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-card dark:text-dark-text"
              defaultValue=""
            >
              <option value="" disabled>Move to project...</option>
              {projectOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Delete */}
        <div className="pl-4 border-l border-gray-200 dark:border-dark-border">
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isLoading}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white dark:bg-dark-card rounded-xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                  Delete {selectedCount} tasks?
                </h3>
                <p className="text-sm text-gray-500 dark:text-dark-muted">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleBulkDelete}
                isLoading={isLoading}
              >
                Delete Tasks
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
