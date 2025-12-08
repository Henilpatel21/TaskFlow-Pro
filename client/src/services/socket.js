import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const initSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinTeam = (teamId) => {
  if (socket) {
    socket.emit('team:join', teamId);
  }
};

export const leaveTeam = (teamId) => {
  if (socket) {
    socket.emit('team:leave', teamId);
  }
};

export const emitTyping = (teamId, taskId, isTyping) => {
  if (socket) {
    socket.emit('task:typing', { teamId, taskId, isTyping });
  }
};

export const updatePresence = (teamId, status) => {
  if (socket) {
    socket.emit('presence:update', { teamId, status });
  }
};
