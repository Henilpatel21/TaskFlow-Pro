import { create } from 'zustand';
import { projectsApi } from '../services/api';

const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  // Fetch all projects for a team
  fetchProjects: async (teamId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await projectsApi.getAll({ teamId });
      set({ projects: data.projects, isLoading: false });
      return { success: true, projects: data.projects };
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Failed to fetch projects',
        isLoading: false,
      });
      return { success: false };
    }
  },

  // Fetch single project
  fetchProject: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await projectsApi.getOne(projectId);
      set({ currentProject: data.project, isLoading: false });
      return { success: true, project: data.project };
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Failed to fetch project',
        isLoading: false,
      });
      return { success: false };
    }
  },

  // Create project
  createProject: async (projectData) => {
    try {
      const { data } = await projectsApi.create(projectData);
      set((state) => ({
        projects: [...state.projects, data.project],
      }));
      return { success: true, project: data.project };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create project',
      };
    }
  },

  // Update project
  updateProject: async (projectId, projectData) => {
    try {
      const { data } = await projectsApi.update(projectId, projectData);
      set((state) => ({
        projects: state.projects.map((p) =>
          p._id === projectId ? data.project : p
        ),
        currentProject:
          state.currentProject?._id === projectId
            ? data.project
            : state.currentProject,
      }));
      return { success: true, project: data.project };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update project',
      };
    }
  },

  // Delete project
  deleteProject: async (projectId) => {
    try {
      await projectsApi.delete(projectId);
      set((state) => ({
        projects: state.projects.filter((p) => p._id !== projectId),
        currentProject:
          state.currentProject?._id === projectId ? null : state.currentProject,
      }));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete project',
      };
    }
  },

  // Set current project
  setCurrentProject: (project) => set({ currentProject: project }),

  // Clear current project (show all tasks)
  clearCurrentProject: () => set({ currentProject: null }),

  // Update project from socket
  updateProjectFromSocket: (project) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p._id === project._id ? project : p
      ),
      currentProject:
        state.currentProject?._id === project._id
          ? project
          : state.currentProject,
    }));
  },

  // Add project from socket
  addProjectFromSocket: (project) => {
    set((state) => ({
      projects: [...state.projects, project],
    }));
  },

  // Remove project from socket
  removeProjectFromSocket: (projectId) => {
    set((state) => ({
      projects: state.projects.filter((p) => p._id !== projectId),
      currentProject:
        state.currentProject?._id === projectId ? null : state.currentProject,
    }));
  },

  // Clear state
  clearProjectState: () =>
    set({
      projects: [],
      currentProject: null,
      error: null,
    }),
}));

export default useProjectStore;
