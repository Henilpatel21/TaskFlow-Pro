import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const shortcuts = {
  // Navigation
  'g d': { action: 'navigate', to: '/dashboard', description: 'Go to Dashboard' },
  'g b': { action: 'navigate', to: '/board', description: 'Go to Kanban Board' },
  'g p': { action: 'navigate', to: '/projects', description: 'Go to Projects' },
  'g c': { action: 'navigate', to: '/calendar', description: 'Go to Calendar' },
  'g a': { action: 'navigate', to: '/analytics', description: 'Go to Analytics' },
  'g t': { action: 'navigate', to: '/team', description: 'Go to Team' },
  'g m': { action: 'navigate', to: '/members', description: 'Go to Members' },
  'g s': { action: 'navigate', to: '/settings', description: 'Go to Settings' },

  // Actions
  'n': { action: 'newTask', description: 'Create new task' },
  '/': { action: 'search', description: 'Focus search' },
  '?': { action: 'showHelp', description: 'Show keyboard shortcuts' },
  'Escape': { action: 'closeModal', description: 'Close modal/cancel' },
};

export const shortcutsList = Object.entries(shortcuts).map(([key, value]) => ({
  key,
  ...value,
}));

export default function useKeyboardShortcuts({
  onNewTask,
  onSearch,
  onShowHelp,
  onCloseModal,
  enabled = true,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleKeyDown = useCallback(
    (event) => {
      if (!enabled) return;

      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = event.target;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[role="dialog"]');

      // Allow Escape in modals
      if (event.key === 'Escape') {
        onCloseModal?.();
        return;
      }

      if (isInputField) return;

      // Handle two-key combinations (g + letter)
      if (event.key === 'g') {
        const handleSecondKey = (e) => {
          const combo = `g ${e.key}`;
          const shortcut = shortcuts[combo];

          if (shortcut?.action === 'navigate') {
            e.preventDefault();
            navigate(shortcut.to);
          }

          document.removeEventListener('keydown', handleSecondKey);
        };

        // Listen for the second key within 500ms
        document.addEventListener('keydown', handleSecondKey);
        setTimeout(() => {
          document.removeEventListener('keydown', handleSecondKey);
        }, 500);
        return;
      }

      // Single key shortcuts
      switch (event.key) {
        case 'n':
          event.preventDefault();
          onNewTask?.();
          break;
        case '/':
          event.preventDefault();
          onSearch?.();
          break;
        case '?':
          event.preventDefault();
          onShowHelp?.();
          break;
        default:
          break;
      }
    },
    [enabled, navigate, onNewTask, onSearch, onShowHelp, onCloseModal]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { shortcuts: shortcutsList };
}
