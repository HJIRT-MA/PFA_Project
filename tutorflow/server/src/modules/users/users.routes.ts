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

usersRouter.get('/me/favorites', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentId = (req.user as any).id;

    const favorites = await prisma.favoriteTutor.findMany({
      where: { studentId },
      include: {
        tutor: {
          include: {
            user: { select: { email: true, avatarUrl: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedTutors = favorites.map(f => {
      const t = f.tutor;
      return {
        id: t.userId,
        name: t.user.email.split('@')[0],
        avatarUrl: t.user.avatarUrl,
        subjects: t.subjects,
        hourlyRate: t.hourlyRate,
        averageRating: t.averageRating,
        reviewCount: t.reviewCount,
        availableSlotsCount: 15,
        availability: t.availability,
        isOnline: t.isOnline
      };
    });

    res.json({ favorites: mappedTutors });
  } catch (error) {
    next(error);
  }
});
