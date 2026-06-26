import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import { getConversationByIdentity } from '../services/liveChatService.js';

let io = null;

export function initLiveChatSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    try {
      const token = String(socket.handshake.auth?.token || '').trim();
      const guestId = String(socket.handshake.auth?.guestId || '').trim();
      const role = String(socket.handshake.auth?.role || '').trim();

      if (role === 'admin') {
        if (!token) return next(new Error('Unauthorized'));
        const decoded = verifyToken(token);
        if (!['admin', 'super_admin'].includes(decoded.role)) return next(new Error('Unauthorized'));
        socket.data.admin = decoded;
        return next();
      }

      if (token) {
        try {
          const decoded = verifyToken(token);
          if (decoded.role === 'user') {
            socket.data.user = decoded;
            return next();
          }
        } catch {
          // Continue to guest auth.
        }
      }

      if (guestId) {
        socket.data.guestId = guestId;
        return next();
      }

      return next(new Error('Authentication required'));
    } catch (error) {
      return next(error);
    }
  });

  io.on('connection', async (socket) => {
    async function joinConversationRoom() {
      if (socket.data.admin) return;

      const userId = socket.data.user?.sub ? Number(socket.data.user.sub) : null;
      const guestId = socket.data.guestId || null;
      const conversation = await getConversationByIdentity({ userId, guestId });

      if (conversation?.id) {
        socket.join(`conversation:${conversation.id}`);
        socket.data.conversationId = conversation.id;
      }
    }

    if (socket.data.admin) {
      socket.join('admin:live-chat');
      return;
    }

    await joinConversationRoom();
    socket.on('chat:join', joinConversationRoom);
  });

  return io;
}

export function emitLiveChatEvents(payload) {
  if (!io) return;

  const { conversationId, message } = payload;

  io.to(`conversation:${conversationId}`).emit('chat:message', {
    conversationId,
    message,
  });

  io.to('admin:live-chat').emit('chat:conversation:updated', {
    conversationId,
    message,
  });
}

export function getLiveChatIo() {
  return io;
}

export default initLiveChatSocket;
