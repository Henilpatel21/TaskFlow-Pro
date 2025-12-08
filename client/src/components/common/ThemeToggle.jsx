import { Moon, Sun } from 'lucide-react';
import useThemeStore from '../../stores/themeStore';

export default function ThemeToggle({ className = '' }) {
  const { isDarkMode, toggleDarkMode } = useThemeStore();

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        relative p-2 rounded-lg transition-all duration-300
        ${isDarkMode
          ? 'bg-dark-card text-yellow-400 hover:bg-dark-border'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }
        ${className}
      `}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5">
        <Sun
          className={`
            absolute inset-0 w-5 h-5 transition-all duration-300
            ${isDarkMode ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}
          `}
        />
        <Moon
          className={`
            absolute inset-0 w-5 h-5 transition-all duration-300
            ${isDarkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}
          `}
        />
      </div>
    </button>
  );
}
