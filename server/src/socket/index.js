import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import { User, Team } from '../models/index.js';

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user._id})`);

    // Join user's personal room for direct notifications
    socket.join(`user:${socket.user._id}`);

    // Join all team rooms the user belongs to
    const teams = await Team.find({ 'members.user': socket.user._id });
    teams.forEach((team) => {
      socket.join(`team:${team._id}`);
      console.log(`User ${socket.user.name} joined team room: ${team.name}`);
    });

    // Handle joining a specific team room (when switching teams)
    socket.on('team:join', async (teamId) => {
      const team = await Team.findById(teamId);

      if (!team) {
        socket.emit('error', { message: 'Team not found' });
        return;
      }

      const isMember = team.members.some(
        (m) => m.user.toString() === socket.user._id.toString()
      );

      if (!isMember) {
        socket.emit('error', { message: 'Not a team member' });
        return;
      }

      socket.join(`team:${teamId}`);
      socket.emit('team:joined', { teamId });
      console.log(`User ${socket.user.name} explicitly joined team room: ${team.name}`);
    });

    // Handle leaving a team room
    socket.on('team:leave', (teamId) => {
      socket.leave(`team:${teamId}`);
      socket.emit('team:left', { teamId });
      console.log(`User ${socket.user.name} left team room: ${teamId}`);
    });

    // Handle typing indicators for tasks
    socket.on('task:typing', ({ teamId, taskId, isTyping }) => {
      socket.to(`team:${teamId}`).emit('task:user_typing', {
        taskId,
        userId: socket.user._id,
        userName: socket.user.name,
        isTyping,
      });
    });

    // Handle user presence
    socket.on('presence:update', ({ teamId, status }) => {
      socket.to(`team:${teamId}`).emit('presence:changed', {
        userId: socket.user._id,
        userName: socket.user.name,
        status, // 'online', 'away', 'busy'
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name} (${socket.user._id})`);

      // Notify all teams about user going offline
      teams.forEach((team) => {
        socket.to(`team:${team._id}`).emit('presence:changed', {
          userId: socket.user._id,
          userName: socket.user.name,
          status: 'offline',
        });
      });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.user.name}:`, error);
    });
  });

  // Utility function to emit to team
  io.emitToTeam = (teamId, event, data) => {
    io.to(`team:${teamId}`).emit(event, data);
  };

  // Utility function to emit to user
  io.emitToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  return io;
};
