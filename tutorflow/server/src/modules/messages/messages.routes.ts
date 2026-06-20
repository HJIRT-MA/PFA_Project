import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';

export const messagesRouter = Router();

// Get list of conversations
messagesRouter.get('/conversations', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any).id;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, email: true, avatarUrl: true } },
        receiver: { select: { id: true, email: true, avatarUrl: true } }
      }
    });

    const conversationsMap = new Map();
    
    for (const msg of messages) {
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!conversationsMap.has(otherUser.id)) {
        conversationsMap.set(otherUser.id, {
          user: otherUser,
          lastMessage: msg,
          unreadCount: 0
        });
      }
      
      if (msg.receiverId === userId && !msg.readAt) {
        const conv = conversationsMap.get(otherUser.id);
        conv.unreadCount += 1;
      }
    }

    res.json({ conversations: Array.from(conversationsMap.values()) });
  } catch (error) {
    next(error);
  }
});

// Get conversation history with a specific user
messagesRouter.get('/:userId', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const myId = (req.user as any).id;
    const otherId = req.params.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: otherId },
          { senderId: otherId, receiverId: myId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Mark as read
    await prisma.message.updateMany({
      where: {
        senderId: otherId,
        receiverId: myId,
        readAt: null
      },
      data: { readAt: new Date() }
    });

    // Return newest last for UI convenience by reversing the desc array
    res.json({ messages: messages.reverse() });
  } catch (error) {
    next(error);
  }
});
