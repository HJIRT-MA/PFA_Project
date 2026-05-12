import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from './lib/prisma';

export let io: SocketIOServer;

export const setupSocketIO = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret') as any;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).user.id;
    socket.join(`user:${userId}`);

    socket.on('send_message', async (data: { receiverId: string, content: string, sessionId?: string }) => {
      try {
        const msg = await prisma.message.create({
          data: {
            senderId: userId,
            receiverId: data.receiverId,
            content: data.content,
            sessionId: data.sessionId
          }
        });
        io.to(`user:${data.receiverId}`).emit('new_message', msg);
        socket.emit('message_saved', msg);
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('mark_read', async (data: { messageId: string }) => {
      try {
        const msg = await prisma.message.findUnique({ where: { id: data.messageId } });
        if (!msg || msg.receiverId !== userId) return;

        const updated = await prisma.message.update({
          where: { id: data.messageId },
          data: { readAt: new Date() }
        });
        io.to(`user:${updated.senderId}`).emit('message_read', updated);
      } catch (err) {
        console.error(err);
      }
    });
  });
};
