import { create } from 'zustand';
import { teamsApi, invitesApi } from '../services/api';

const useTeamStore = create((set, get) => ({
  teams: [],
  currentTeam: null,
  invites: [],
  myInvites: [],
  activity: [],
  isLoading: false,
  error: null,

  // Fetch all teams
  fetchTeams: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await teamsApi.getAll();
      set({ teams: data.teams, isLoading: false });
      return { success: true };
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Failed to fetch teams',
        isLoading: false,
      });
      return { success: false };
    }
  },

  // Fetch single team
  fetchTeam: async (teamId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await teamsApi.getOne(teamId);
      set({ currentTeam: data.team, isLoading: false });
      return { success: true, team: data.team };
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Failed to fetch team',
        isLoading: false,
      });
      return { success: false };
    }
  },

  // Create team
  createTeam: async (name, description) => {
    try {
      const { data } = await teamsApi.create({ name, description });
      set((state) => ({
        teams: [data.team, ...state.teams],
        currentTeam: data.team,
      }));
      return { success: true, team: data.team };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create team',
      };
    }
  },

  // Update team
  updateTeam: async (teamId, data) => {
    try {
      const { data: response } = await teamsApi.update(teamId, data);
      set((state) => ({
        teams: state.teams.map((t) =>
          t._id === teamId ? response.team : t
        ),
        currentTeam:
          state.currentTeam?._id === teamId
            ? response.team
            : state.currentTeam,
      }));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update team',
      };
    }
  },

  // Delete team
  deleteTeam: async (teamId) => {
    try {
      await teamsApi.delete(teamId);
      set((state) => ({
        teams: state.teams.filter((t) => t._id !== teamId),
        currentTeam:
          state.currentTeam?._id === teamId ? null : state.currentTeam,
      }));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete team',
      };
    }
  },

  // Add member directly
  addMember: async (teamId, email, role) => {
    try {
      const { data } = await teamsApi.addMember(teamId, email, role);
      set((state) => ({
        teams: state.teams.map((t) => (t._id === teamId ? data.team : t)),
        currentTeam:
          state.currentTeam?._id === teamId ? data.team : state.currentTeam,
      }));
      return { success: true, addedUser: data.addedUser };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to add member',
      };
    }
  },

  // Update member role
  updateMemberRole: async (teamId, userId, role) => {
    try {
      const { data } = await teamsApi.updateMemberRole(teamId, userId, role);
      set((state) => ({
        teams: state.teams.map((t) => (t._id === teamId ? data.team : t)),
        currentTeam:
          state.currentTeam?._id === teamId ? data.team : state.currentTeam,
      }));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update role',
      };
    }
  },

  // Remove member
  removeMember: async (teamId, userId) => {
    try {
      const { data } = await teamsApi.removeMember(teamId, userId);
      set((state) => ({
        teams: state.teams.map((t) => (t._id === teamId ? data.team : t)),
        currentTeam:
          state.currentTeam?._id === teamId ? data.team : state.currentTeam,
      }));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to remove member',
      };
    }
  },

  // Leave team
  leaveTeam: async (teamId) => {
    try {
      await teamsApi.leave(teamId);
      set((state) => ({
        teams: state.teams.filter((t) => t._id !== teamId),
        currentTeam:
          state.currentTeam?._id === teamId ? null : state.currentTeam,
      }));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to leave team',
      };
    }
  },

  // Fetch team activity
  fetchActivity: async (teamId, page = 1) => {
    try {
      const { data } = await teamsApi.getActivity(teamId, { page, limit: 20 });
      set({ activity: data.activities });
      return { success: true, pagination: data.pagination };
    } catch (error) {
      return { success: false };
    }
  },

  // Invites
  fetchTeamInvites: async (teamId) => {
    try {
      const { data } = await invitesApi.getTeamInvites(teamId);
      set({ invites: data.invites });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  fetchMyInvites: async () => {
    try {
      const { data } = await invitesApi.getMyInvites();
      set({ myInvites: data.invites });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  createInvite: async (teamId, email, role) => {
    try {
      const { data } = await invitesApi.create({ teamId, email, role });
      set((state) => ({
        invites: [data.invite, ...state.invites],
      }));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to send invite',
      };
    }
  },

  acceptInvite: async (inviteId) => {
    try {
      const { data } = await invitesApi.accept(inviteId);
      set((state) => ({
        myInvites: state.myInvites.filter((i) => i._id !== inviteId),
        teams: [data.team, ...state.teams],
      }));
      return { success: true, team: data.team };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to accept invite',
      };
    }
  },

  declineInvite: async (inviteId) => {
    try {
      await invitesApi.decline(inviteId);
      set((state) => ({
        myInvites: state.myInvites.filter((i) => i._id !== inviteId),
      }));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  cancelInvite: async (inviteId) => {
    try {
      await invitesApi.cancel(inviteId);
      set((state) => ({
        invites: state.invites.filter((i) => i._id !== inviteId),
      }));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // Set current team
  setCurrentTeam: (team) => set({ currentTeam: team }),

  // Update team from socket event
  updateTeamFromSocket: (team) => {
    set((state) => ({
      teams: state.teams.map((t) => (t._id === team._id ? team : t)),
      currentTeam:
        state.currentTeam?._id === team._id ? team : state.currentTeam,
    }));
  },

  // Clear state
  clearTeamState: () =>
    set({
      teams: [],
      currentTeam: null,
      invites: [],
      myInvites: [],
      activity: [],
      error: null,
    }),
}));

export default useTeamStore;
