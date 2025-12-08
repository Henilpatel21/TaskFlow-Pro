import { X, Keyboard } from 'lucide-react';
import { shortcutsList } from '../../hooks/useKeyboardShortcuts';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const navigationShortcuts = shortcutsList.filter((s) => s.action === 'navigate');
  const actionShortcuts = shortcutsList.filter((s) => s.action !== 'navigate');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-dark-card rounded-xl shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-dark-border">
          <div className="flex items-center gap-3">
            <Keyboard className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-dark-muted uppercase tracking-wide mb-3">
              Navigation
            </h3>
            <div className="space-y-2">
              {navigationShortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-gray-700 dark:text-dark-text">
                    {shortcut.description}
                  </span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-dark-muted uppercase tracking-wide mb-3">
              Actions
            </h3>
            <div className="space-y-2">
              {actionShortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-gray-700 dark:text-dark-text">
                    {shortcut.description}
                  </span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <p className="text-sm text-primary-700 dark:text-primary-300">
              <strong>Tip:</strong> Press <kbd className="px-1 bg-primary-100 dark:bg-primary-800 rounded">?</kbd> anytime to show this help.
              Two-key shortcuts (like <kbd className="px-1 bg-primary-100 dark:bg-primary-800 rounded">g d</kbd>) require pressing keys in sequence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
