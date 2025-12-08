import { create } from 'zustand';

const useThemeStore = create((set, get) => ({
  isDarkMode: false,

  // Initialize theme from localStorage or system preference
  initializeTheme: () => {
    const stored = localStorage.getItem('theme');
    if (stored) {
      const isDark = stored === 'dark';
      set({ isDarkMode: isDark });
      applyTheme(isDark);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      set({ isDarkMode: prefersDark });
      applyTheme(prefersDark);
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        set({ isDarkMode: e.matches });
        applyTheme(e.matches);
      }
    });
  },

  // Toggle dark mode
  toggleDarkMode: () => {
    const newValue = !get().isDarkMode;
    set({ isDarkMode: newValue });
    localStorage.setItem('theme', newValue ? 'dark' : 'light');
    applyTheme(newValue);
  },

  // Set specific theme
  setTheme: (isDark) => {
    set({ isDarkMode: isDark });
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    applyTheme(isDark);
  },
}));

// Apply theme to document
function applyTheme(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export default useThemeStore;
