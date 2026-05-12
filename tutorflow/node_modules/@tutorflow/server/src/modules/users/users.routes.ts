import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/me/notification-preferences', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any).id;

    let prefs = await prisma.notificationPreferences.findUnique({
      where: { userId }
    });

    if (!prefs) {
      prefs = await prisma.notificationPreferences.create({
        data: { userId }
      });
    }

    res.json({ preferences: prefs });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch('/me/notification-preferences', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any).id;
    const updateData = req.body;

    const prefs = await prisma.notificationPreferences.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData }
    });

    res.json({ preferences: prefs });
  } catch (error) {
    next(error);
  }
});
