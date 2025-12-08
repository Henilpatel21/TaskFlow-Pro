import { Calendar, CheckSquare, MessageSquare, Tag, Check, Link, Clock, Play, Repeat } from 'lucide-react';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';

export default function TaskCard({ task, onClick, isDragging, isSelected, onSelect, selectionMode }) {
  const completedChecklist = task.checklist?.filter((item) => item.completed).length || 0;
  const totalChecklist = task.checklist?.length || 0;

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'Done';

  // Check if task is blocked (has unfinished blockers)
  const isBlocked = task.blockedBy?.some(
    (blocker) => blocker.status !== 'Done'
  );

  const handleClick = (e) => {
    // If Ctrl/Cmd is pressed, toggle selection
    if (e.ctrlKey || e.metaKey || selectionMode) {
      e.stopPropagation();
      onSelect?.(task._id);
    } else {
      onClick?.();
    }
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onSelect?.(task._id);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative group bg-white dark:bg-dark-card rounded-lg border p-3
        cursor-pointer transition-all duration-200
        hover:shadow-md
        ${isDragging ? 'shadow-lg opacity-90 rotate-1' : ''}
        ${isSelected
          ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
          : 'border-gray-200 dark:border-dark-border hover:border-primary-300'
        }
      `}
    >
      {/* Selection checkbox - visible on hover or when selected */}
      <div className={`absolute -left-1 -top-1 transition-opacity ${isSelected || selectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button
          onClick={handleCheckboxClick}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-primary-600 border-primary-600 text-white'
              : 'bg-white border-gray-300 hover:border-primary-500'
          }`}
        >
          {isSelected && <Check className="w-3 h-3" />}
        </button>
      </div>
      {/* Title */}
      <h4 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Meta info */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge priority={task.priority} />

        {/* Due date */}
        {task.dueDate && (
          <span
            className={`inline-flex items-center gap-1 text-xs ${
              isOverdue ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            <Calendar className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}

        {/* Checklist progress */}
        {totalChecklist > 0 && (
          <span
            className={`inline-flex items-center gap-1 text-xs ${
              completedChecklist === totalChecklist
                ? 'text-green-600'
                : 'text-gray-500'
            }`}
          >
            <CheckSquare className="w-3 h-3" />
            {completedChecklist}/{totalChecklist}
          </span>
        )}

        {/* Blocked indicator */}
        {isBlocked && (
          <span className="inline-flex items-center gap-1 text-xs text-orange-600" title="Blocked by other tasks">
            <Link className="w-3 h-3" />
            Blocked
          </span>
        )}

        {/* Has dependencies indicator */}
        {task.dependencies?.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-blue-600" title={`Blocks ${task.dependencies.length} task(s)`}>
            <Link className="w-3 h-3" />
            {task.dependencies.length}
          </span>
        )}

        {/* Timer running indicator */}
        {task.timeTracking?.isTimerRunning && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 animate-pulse" title="Timer running">
            <Play className="w-3 h-3" />
            Active
          </span>
        )}

        {/* Logged time indicator */}
        {task.timeTracking?.totalMinutes > 0 && !task.timeTracking?.isTimerRunning && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500" title={`${task.timeTracking.totalMinutes} minutes logged`}>
            <Clock className="w-3 h-3" />
            {task.timeTracking.totalMinutes >= 60
              ? `${Math.floor(task.timeTracking.totalMinutes / 60)}h`
              : `${task.timeTracking.totalMinutes}m`
            }
          </span>
        )}

        {/* Recurring indicator */}
        {task.recurring?.isRecurring && (
          <span className="inline-flex items-center gap-1 text-xs text-purple-600" title={`Repeats ${task.recurring.frequency}`}>
            <Repeat className="w-3 h-3" />
            {task.recurring.frequency === 'daily' && 'Daily'}
            {task.recurring.frequency === 'weekly' && 'Weekly'}
            {task.recurring.frequency === 'biweekly' && 'Bi-weekly'}
            {task.recurring.frequency === 'monthly' && 'Monthly'}
            {task.recurring.frequency === 'custom' && 'Custom'}
          </span>
        )}
      </div>

      {/* Assignee */}
      {task.assignedTo && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar name={task.assignedTo.name} size="xs" />
            <span className="text-xs text-gray-600 truncate max-w-[100px]">
              {task.assignedTo.name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
