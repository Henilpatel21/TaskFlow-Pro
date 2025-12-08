import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import useAuthStore from '../../stores/authStore';
import useTeamStore from '../../stores/teamStore';
import useNotificationStore from '../../stores/notificationStore';
import { getSocket } from '../../services/socket';
import Modal from '../common/Modal';
import CreateTeamForm from '../teams/CreateTeamForm';
import CelebrationOverlay from '../common/CelebrationOverlay';
import { PageLoader } from '../common/LoadingSpinner';
import KeyboardShortcutsModal from '../common/KeyboardShortcutsModal';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';

export default function MainLayout() {
  const navigate = useNavigate();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [pageTitle, setPageTitle] = useState('Dashboard');
  const headerRef = useRef(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({
    onNewTask: () => setShowNewTaskModal(true),
    onSearch: () => headerRef.current?.focusSearch(),
    onShowHelp: () => setShowKeyboardShortcuts(true),
    onCloseModal: () => {
      setShowCreateTeam(false);
      setShowKeyboardShortcuts(false);
      setShowNewTaskModal(false);
    },
  });
  const {
    teams,
    currentTeam,
    fetchTeams,
    fetchTeam,
    setCurrentTeam,
    updateTeamFromSocket,
  } = useTeamStore();
  const { fetchNotifications, addNotification } = useNotificationStore();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isAuthenticated) {
      fetchTeams();
      fetchNotifications();
    }
  }, [isAuthenticated, authLoading, navigate, fetchTeams, fetchNotifications]);

  // Set initial team
  useEffect(() => {
    if (teams.length > 0 && !currentTeam) {
      const activeTeam = user?.activeTeam
        ? teams.find((t) => t._id === user.activeTeam._id || t._id === user.activeTeam)
        : teams[0];
      if (activeTeam) {
        setCurrentTeam(activeTeam);
        fetchTeam(activeTeam._id);
      }
    }
  }, [teams, currentTeam, user, setCurrentTeam, fetchTeam]);

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('team:updated', ({ team }) => {
      updateTeamFromSocket(team);
    });

    socket.on('team:member_added', ({ team }) => {
      updateTeamFromSocket(team);
    });

    socket.on('team:member_removed', ({ team }) => {
      updateTeamFromSocket(team);
    });

    socket.on('notification:new', (data) => {
      addNotification(data);
    });

    return () => {
      socket.off('team:updated');
      socket.off('team:member_added');
      socket.off('team:member_removed');
      socket.off('notification:new');
    };
  }, [updateTeamFromSocket, addNotification]);

  const handleTeamCreated = (team) => {
    setShowCreateTeam(false);
    setCurrentTeam(team);
    navigate('/board');
  };

  if (authLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-bg">
      <Sidebar onCreateTeam={() => setShowCreateTeam(true)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header ref={headerRef} title={pageTitle} onShowShortcuts={() => setShowKeyboardShortcuts(true)} />

        <main className="flex-1 overflow-auto p-6">
          <Outlet context={{ setPageTitle, currentTeam, showNewTaskModal, setShowNewTaskModal }} />
        </main>
      </div>

      {/* Create Team Modal */}
      <Modal
        isOpen={showCreateTeam}
        onClose={() => setShowCreateTeam(false)}
        title="Create New Team"
      >
        <CreateTeamForm
          onSuccess={handleTeamCreated}
          onCancel={() => setShowCreateTeam(false)}
        />
      </Modal>

      {/* Celebration Overlay */}
      <CelebrationOverlay />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </div>
  );
}
