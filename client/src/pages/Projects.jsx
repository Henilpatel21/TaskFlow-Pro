import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Archive,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Palette,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useProjectStore from '../stores/projectStore';
import useTeamStore from '../stores/teamStore';
import { getSocket } from '../services/socket';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';

const projectColors = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];

export default function Projects() {
  const navigate = useNavigate();
  const { setPageTitle, currentTeam } = useOutletContext();
  const {
    projects,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    addProjectFromSocket,
    updateProjectFromSocket,
    removeProjectFromSocket,
    isLoading,
  } = useProjectStore();
  const { currentTeam: team } = useTeamStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPageTitle('Projects');
  }, [setPageTitle]);

  useEffect(() => {
    if (currentTeam?._id) {
      fetchProjects(currentTeam._id);
    }
  }, [currentTeam, fetchProjects]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('project:created', ({ project }) => {
      addProjectFromSocket(project);
    });

    socket.on('project:updated', ({ project }) => {
      updateProjectFromSocket(project);
    });

    socket.on('project:deleted', ({ projectId }) => {
      removeProjectFromSocket(projectId);
    });

    return () => {
      socket.off('project:created');
      socket.off('project:updated');
      socket.off('project:deleted');
    };
  }, [addProjectFromSocket, updateProjectFromSocket, removeProjectFromSocket]);

  const handleOpenCreate = () => {
    setFormData({ name: '', description: '', color: '#3b82f6' });
    setEditingProject(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (project) => {
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color || '#3b82f6',
    });
    setEditingProject(project);
    setShowCreateModal(true);
    setMenuOpen(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    setIsSubmitting(true);

    if (editingProject) {
      const result = await updateProject(editingProject._id, formData);
      if (result.success) {
        toast.success('Project updated!');
        setShowCreateModal(false);
      } else {
        toast.error(result.error);
      }
    } else {
      const result = await createProject({
        ...formData,
        teamId: currentTeam._id,
      });
      if (result.success) {
        toast.success('Project created!');
        setShowCreateModal(false);
      } else {
        toast.error(result.error);
      }
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"? Tasks will be unassigned from this project.`)) {
      return;
    }

    const result = await deleteProject(project._id);
    if (result.success) {
      toast.success('Project deleted');
    } else {
      toast.error(result.error);
    }
    setMenuOpen(null);
  };

  const handleArchive = async (project) => {
    const result = await updateProject(project._id, { isArchived: !project.isArchived });
    if (result.success) {
      toast.success(project.isArchived ? 'Project unarchived' : 'Project archived');
    } else {
      toast.error(result.error);
    }
    setMenuOpen(null);
  };

  const handleSelectProject = (project) => {
    setCurrentProject(project);
    navigate('/board');
  };

  if (!currentTeam) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No team selected"
        description="Create or join a team to manage projects."
      />
    );
  }

  if (isLoading && projects.length === 0) {
    return <LoadingSpinner size="lg" className="py-20" />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Projects</h2>
          <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">
            Organize your tasks into different projects
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* All Tasks Card */}
          <div
            onClick={() => {
              setCurrentProject(null);
              navigate('/board');
            }}
            className="bg-white dark:bg-dark-card rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border p-6 cursor-pointer hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all group"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors">
                <FolderKanban className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-dark-text">All Tasks</h3>
                <p className="text-sm text-gray-500 dark:text-dark-muted">View all tasks</p>
              </div>
            </div>
          </div>

          {/* Project Cards */}
          {projects.map((project) => (
            <div
              key={project._id}
              className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden hover:shadow-lg transition-all group"
            >
              {/* Color Bar */}
              <div
                className="h-2"
                style={{ backgroundColor: project.color || '#3b82f6' }}
              />

              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => handleSelectProject(project)}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${project.color}20` }}
                    >
                      <FolderKanban
                        className="w-5 h-5"
                        style={{ color: project.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-dark-text truncate">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-gray-500 dark:text-dark-muted truncate">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === project._id ? null : project._id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {menuOpen === project._id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpen(null)}
                        />
                        <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-gray-200 dark:border-dark-border py-1 z-20">
                          <button
                            onClick={() => handleOpenEdit(project)}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleArchive(project)}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Archive className="w-4 h-4" />
                            {project.isArchived ? 'Unarchive' : 'Archive'}
                          </button>
                          <button
                            onClick={() => handleDelete(project)}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Task Stats */}
                {project.taskCounts && (
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-lg font-bold text-gray-900 dark:text-dark-text">
                        {project.taskCounts.total}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-muted">Total</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {project.taskCounts.inProgress}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">Active</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {project.taskCounts.done}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">Done</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-lg font-bold text-gray-600 dark:text-gray-400">
                        {project.taskCounts.todo}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-muted">To Do</p>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                {project.taskCounts && project.taskCounts.total > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-dark-muted mb-1">
                      <span>Progress</span>
                      <span>
                        {Math.round(
                          (project.taskCounts.done / project.taskCounts.total) * 100
                        )}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(project.taskCounts.done / project.taskCounts.total) * 100}%`,
                          backgroundColor: project.color || '#3b82f6',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* View Button */}
                <button
                  onClick={() => handleSelectProject(project)}
                  className="w-full mt-4 py-2 text-sm font-medium text-center rounded-lg border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  View Tasks
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to organize your tasks."
          action={
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          }
        />
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white dark:bg-dark-card rounded-xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                {editingProject ? 'Edit Project' : 'Create Project'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input
                label="Project Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter project name"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Add a description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Palette className="w-4 h-4 inline mr-1" />
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {projectColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        formData.color === color
                          ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
