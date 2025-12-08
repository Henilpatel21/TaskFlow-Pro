import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
} from 'lucide-react';
import useTaskStore from '../stores/taskStore';
import useProjectStore from '../stores/projectStore';
import TaskModal from '../components/tasks/TaskModal';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Calendar() {
  const { setPageTitle, currentTeam } = useOutletContext();
  const { tasks, fetchTasks, isLoading } = useTaskStore();
  const { fetchProjects } = useProjectStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    setPageTitle('Calendar');
  }, [setPageTitle]);

  useEffect(() => {
    if (currentTeam?._id) {
      fetchTasks(currentTeam._id);
      fetchProjects(currentTeam._id);
    }
  }, [currentTeam, fetchTasks, fetchProjects]);

  // Get calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Start from the Sunday before the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // End on the Saturday after the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const weeks = [];
    let currentWeek = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      currentWeek.push(new Date(current));
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      current.setDate(current.getDate() + 1);
    }

    return { weeks, month, year };
  }, [currentDate]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      if (task.dueDate) {
        const dateKey = new Date(task.dueDate).toDateString();
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey).push(task);
      }
    });
    return map;
  }, [tasks]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleTaskClick = (task, e) => {
    e.stopPropagation();
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setSelectedTask(null);
    setShowTaskModal(true);
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
    setSelectedDate(null);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === calendarData.month;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Low: 'bg-gray-200 border-gray-400',
      Medium: 'bg-blue-200 border-blue-400',
      High: 'bg-orange-200 border-orange-400',
      Urgent: 'bg-red-200 border-red-400',
    };
    return colors[priority] || colors.Medium;
  };

  const getStatusDot = (status) => {
    const colors = {
      'To Do': 'bg-gray-400',
      'In Progress': 'bg-blue-500',
      'Review': 'bg-purple-500',
      'Done': 'bg-green-500',
    };
    return colors[status] || colors['To Do'];
  };

  if (!currentTeam) {
    return (
      <EmptyState
        icon={CalendarIcon}
        title="No team selected"
        description="Create or join a team to view the calendar."
      />
    );
  }

  if (isLoading && tasks.length === 0) {
    return <LoadingSpinner size="lg" className="py-20" />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            {MONTHS[calendarData.month]} {calendarData.year}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-dark-border">
          {DAYS.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-sm font-semibold text-gray-600 dark:text-dark-muted"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar weeks */}
        <div className="flex-1 grid grid-rows-6">
          {calendarData.weeks.map((week, weekIndex) => (
            <div
              key={weekIndex}
              className="grid grid-cols-7 border-b border-gray-100 dark:border-dark-border last:border-b-0"
            >
              {week.map((date, dayIndex) => {
                const dateKey = date.toDateString();
                const dayTasks = tasksByDate.get(dateKey) || [];
                const isCurrentMonthDay = isCurrentMonth(date);
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={dayIndex}
                    onClick={() => handleDateClick(date)}
                    className={`
                      min-h-[120px] p-2 border-r border-gray-100 dark:border-dark-border last:border-r-0
                      cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors
                      ${!isCurrentMonthDay ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}
                    `}
                  >
                    {/* Date number */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`
                          w-7 h-7 flex items-center justify-center text-sm rounded-full
                          ${isTodayDate
                            ? 'bg-primary-600 text-white font-bold'
                            : isCurrentMonthDay
                              ? 'text-gray-900 dark:text-dark-text'
                              : 'text-gray-400 dark:text-gray-600'
                          }
                        `}
                      >
                        {date.getDate()}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-dark-muted">
                          {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Tasks */}
                    <div className="space-y-1 overflow-hidden">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task._id}
                          onClick={(e) => handleTaskClick(task, e)}
                          className={`
                            px-2 py-1 text-xs rounded truncate cursor-pointer
                            border-l-2 transition-colors
                            ${getPriorityColor(task.priority)}
                            hover:opacity-80
                          `}
                        >
                          <div className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDot(task.status)}`} />
                            <span className={`truncate ${task.status === 'Done' ? 'line-through text-gray-500' : ''}`}>
                              {task.title}
                            </span>
                          </div>
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-dark-muted pl-2">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-sm text-gray-600 dark:text-dark-muted">
        <div className="flex items-center gap-2">
          <span className="font-medium">Status:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400" /> To Do
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> In Progress
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Review
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Done
          </span>
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={showTaskModal}
        onClose={handleCloseModal}
        teamId={currentTeam._id}
        initialStatus="To Do"
        initialDueDate={selectedDate ? selectedDate.toISOString().split('T')[0] : undefined}
      />
    </div>
  );
}
