import { create } from 'zustand';

const useCelebrationStore = create((set) => ({
  showConfetti: false,
  message: '',

  // Trigger celebration
  celebrate: (message = 'Task Completed!') => {
    set({ showConfetti: true, message });

    // Auto-hide after 3 seconds
    setTimeout(() => {
      set({ showConfetti: false, message: '' });
    }, 3000);
  },

  // Manual hide
  hideCelebration: () => {
    set({ showConfetti: false, message: '' });
  },
}));

export default useCelebrationStore;
