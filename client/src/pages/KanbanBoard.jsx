import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, Kanban, FolderKanban, X, CheckSquare } from 'lucide-react';
import useTaskStore from '../stores/taskStore';
import useTeamStore from '../stores/teamStore';
import useProjectStore from '../stores/projectStore';
import useCelebrationStore from '../stores/celebrationStore';
import { getSocket } from '../services/socket';
import TaskCard from '../components/tasks/TaskCard';
import TaskModal from '../components/tasks/TaskModal';
import BulkActionsBar from '../components/tasks/BulkActionsBar';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';

const STATUSES = ['To Do', 'In Progress', 'Review', 'Done'];

const statusColors = {
  'To Do': 'border-t-gray-400',
  'In Progress': 'border-t-blue-500',
  Review: 'border-t-purple-500',
  Done: 'border-t-green-500',
};

export default function KanbanBoard() {
  const { setPageTitle, currentTeam, showNewTaskModal, setShowNewTaskModal } = useOutletContext();
  const {
    tasks,
    fetchTasks,
    reorderTasks,
    isLoading,
    updateTaskFromSocket,
    addTaskFromSocket,
    removeTaskFromSocket,
    setTasksFromSocket,
    bulkUpdateTasksFromSocket,
    bulkDeleteTasksFromSocket,
  } = useTaskStore();
  const { currentTeam: team } = useTeamStore();
  const { currentProject, projects, fetchProjects, clearCurrentProject } = useProjectStore();
  const { celebrate } = useCelebrationStore();

  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [creatingInStatus, setCreatingInStatus] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    setPageTitle('Kanban Board');
  }, [setPageTitle]);

  // Handle global new task shortcut
  useEffect(() => {
    if (showNewTaskModal) {
      setSelectedTask(null);
      setCreatingInStatus('To Do');
      setShowTaskModal(true);
      setShowNewTaskModal(false);
    }
  }, [showNewTaskModal, setShowNewTaskModal]);

  useEffect(() => {
    if (currentTeam?._id) {
      const filters = currentProject ? { projectId: currentProject._id } : {};
      fetchTasks(currentTeam._id, filters);
      fetchProjects(currentTeam._id);
    }
  }, [currentTeam, currentProject, fetchTasks, fetchProjects]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('task:created', ({ task }) => {
      addTaskFromSocket(task);
    });

    socket.on('task:updated', ({ task }) => {
      updateTaskFromSocket(task);
    });

    socket.on('task:deleted', ({ taskId }) => {
      removeTaskFromSocket(taskId);
    });

    socket.on('tasks:reordered', ({ tasks }) => {
      setTasksFromSocket(tasks);
    });

    socket.on('tasks:bulk_updated', ({ tasks }) => {
      bulkUpdateTasksFromSocket(tasks);
    });

    socket.on('tasks:bulk_deleted', ({ taskIds }) => {
      bulkDeleteTasksFromSocket(taskIds);
      // Clear selection if any deleted tasks were selected
      setSelectedTasks((prev) => prev.filter((id) => !taskIds.includes(id)));
    });

    return () => {
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
      socket.off('tasks:reordered');
      socket.off('tasks:bulk_updated');
      socket.off('tasks:bulk_deleted');
    };
  }, [addTaskFromSocket, updateTaskFromSocket, removeTaskFromSocket, setTasksFromSocket, bulkUpdateTasksFromSocket, bulkDeleteTasksFromSocket]);

  const getTasksByStatus = (status) => {
    return tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.order - b.order);
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId;
    const newOrder = destination.index;

    // Trigger celebration when task is moved to Done
    if (newStatus === 'Done' && source.droppableId !== 'Done') {
      const task = tasks.find(t => t._id === draggableId);
      celebrate(task?.title ? `"${task.title}" Completed!` : 'Task Completed!');
    }

    await reorderTasks(draggableId, newStatus, newOrder, currentTeam._id);
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleCreateTask = (status) => {
    setCreatingInStatus(status);
    setSelectedTask(null);
    setShowTaskModal(true);
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
    setCreatingInStatus(null);
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const clearSelection = () => {
    setSelectedTasks([]);
    setSelectionMode(false);
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    if (selectionMode) {
      setSelectedTasks([]);
    }
  };

  const selectAllInColumn = (status) => {
    const columnTaskIds = getTasksByStatus(status).map((t) => t._id);
    setSelectedTasks((prev) => {
      const newSelection = new Set(prev);
      columnTaskIds.forEach((id) => newSelection.add(id));
      return Array.from(newSelection);
    });
  };

  if (!currentTeam) {
    return (
      <EmptyState
        icon={Kanban}
        title="No team selected"
        description="Create or join a team to start managing tasks."
      />
    );
  }

  if (isLoading && tasks.length === 0) {
    return <LoadingSpinner size="lg" className="py-20" />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Selection Mode Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectionMode}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              selectionMode
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            {selectionMode ? 'Exit Selection' : 'Select Multiple'}
          </button>
          {selectedTasks.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-dark-muted">
              {selectedTasks.length} selected (Ctrl/Cmd + Click to select)
            </span>
          )}
        </div>
      </div>

      {/* Project Filter Bar */}
      {currentProject && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${currentProject.color}20` }}
          >
            <FolderKanban
              className="w-4 h-4"
              style={{ color: currentProject.color }}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 dark:text-dark-muted">Viewing project</p>
            <p className="font-semibold text-gray-900 dark:text-dark-text">{currentProject.name}</p>
          </div>
          <button
            onClick={clearCurrentProject}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Show All Tasks
          </button>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {STATUSES.map((status) => {
            const columnTasks = getTasksByStatus(status);

            return (
              <div
                key={status}
                className={`flex-shrink-0 w-80 bg-gray-100 rounded-lg flex flex-col border-t-4 ${statusColors[status]}`}
              >
                {/* Column Header */}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{status}</h3>
                    <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs text-gray-600">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCreateTask(status)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Tasks */}
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] ${
                        snapshot.isDraggingOver ? 'bg-gray-200' : ''
                      }`}
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable
                          key={task._id}
                          draggableId={task._id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <TaskCard
                                task={task}
                                onClick={() => handleTaskClick(task)}
                                isDragging={snapshot.isDragging}
                                isSelected={selectedTasks.includes(task._id)}
                                onSelect={toggleTaskSelection}
                                selectionMode={selectionMode}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="p-4 text-center text-gray-400 text-sm">
                          No tasks
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>

                {/* Add Task Button */}
                <div className="p-2 border-t border-gray-200">
                  <button
                    onClick={() => handleCreateTask(status)}
                    className="w-full p-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add task
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Task Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={showTaskModal}
        onClose={handleCloseModal}
        teamId={currentTeam._id}
        initialStatus={creatingInStatus}
      />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedTasks={selectedTasks}
        onClearSelection={clearSelection}
        teamId={currentTeam._id}
      />
    </div>
  );
}
