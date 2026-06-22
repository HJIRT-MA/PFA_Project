import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from './lib/prisma';
import { notificationService } from './services/notification.service';
import { NotificationType } from '@prisma/client';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

export let io: SocketIOServer;

export const setupSocketIO = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: { 
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.IO Redis Adapter connected');
  }).catch((err) => {
    console.error('❌ Failed to connect Socket.IO Redis Adapter:', err);
  });

  io.use((socket, next) => {
    let token = socket.handshake.auth?.token;
    
    // If no token in auth payload, extract from cookies
    if (!token && socket.request.headers.cookie) {
      const match = socket.request.headers.cookie.match(/(^| )auth_token=([^;]+)/);
      if (match) {
        token = match[2];
      }
    }

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
          },
          include: { sender: true }
        });
        
        io.to(`user:${data.receiverId}`).emit('new_message', msg);
        socket.emit('message_saved', msg);
        
        // Notify the receiver
        const receiver = await prisma.user.findUnique({ where: { id: data.receiverId } });
        if (receiver) {
          await notificationService.notifyUser(
            data.receiverId,
            receiver.email,
            NotificationType.NEW_MESSAGE,
            `New message from ${msg.sender.email.split('@')[0]}`,
            data.content.length > 50 ? `${data.content.substring(0, 50)}...` : data.content,
            `<p>You have a new message from ${msg.sender.email.split('@')[0]}:</p><blockquote>${data.content}</blockquote>`,
            `?chat=open`
          );
        }
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
