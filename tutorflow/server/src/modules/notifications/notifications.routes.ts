import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/me', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any).id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: [
        { readAt: 'asc' }, // nulls (unread) first usually requires special query, but in Prisma we can sort by createdAt for now
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, readAt: null }
    });

    res.json({ notifications, unreadCount, page });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch('/:id/read', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const notification = await prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() }
    });

    res.json({ success: true, count: notification.count });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch('/read-all', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any).id;

    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
