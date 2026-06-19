import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';

export const tutorsRouter = Router();

// GET /api/tutors
tutorsRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 12);
    const subject = req.query.subject as string;
    const maxRate = req.query.maxRate ? parseFloat(req.query.maxRate as string) : undefined;
    const minRating = req.query.minRating ? parseFloat(req.query.minRating as string) : undefined;
    const sortBy = req.query.sortBy as string || 'rating';

    const where: any = { isVerified: true };
    if (subject) where.subjects = { has: subject };
    if (maxRate !== undefined) where.hourlyRate = { lte: maxRate };
    if (minRating !== undefined) where.averageRating = { gte: minRating };

    let orderBy: any = { averageRating: 'desc' };
    if (sortBy === 'price') {
      orderBy = { hourlyRate: 'asc' };
    } else if (sortBy === 'reviews') {
      orderBy = { reviewCount: 'desc' };
    }

    const [tutors, total] = await Promise.all([
      prisma.tutorProfile.findMany({
        where,
        include: {
          user: { select: { email: true, avatarUrl: true } }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.tutorProfile.count({ where })
    ]);

    const mappedTutors = tutors.map(t => ({
      id: t.userId,
      name: t.user.email.split('@')[0],
      avatarUrl: t.user.avatarUrl,
      subjects: t.subjects,
      hourlyRate: t.hourlyRate,
      averageRating: t.averageRating,
      reviewCount: t.reviewCount,
      availableSlotsCount: 15, // Mock for now
      availability: t.availability,
      isOnline: t.isOnline
    }));

    const totalPages = Math.ceil(total / limit);

    res.json({ tutors: mappedTutors, total, page, totalPages });
  } catch (error) {
    next(error);
  }
});

// GET /api/tutors/me/stats
tutorsRouter.get('/me/stats', requireAuth, requireRole('TUTOR'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any).id;
    
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      res.status(404).json({ error: 'Tutor profile not found' });
      return;
    }

    const reviews = await prisma.review.findMany({
      where: { tutorId: userId }
    });

    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) ratingBreakdown[r.rating as keyof typeof ratingBreakdown]++;
    });

    // Calculate response rate
    const sessions = await prisma.session.findMany({
      where: { tutorId: userId, status: { not: 'PENDING' } }
    });

    const totalRequests = sessions.length;
    const acceptedRequests = sessions.filter(s => s.status === 'CONFIRMED' || s.status === 'COMPLETED').length;
    const responseRate = totalRequests > 0 ? (acceptedRequests / totalRequests) * 100 : 100;

    // Total Earnings (COMPLETED)
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
    const allTimeEarnings = completedSessions.reduce((acc, s) => acc + s.amountCents, 0) / 100;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthEarnings = completedSessions
      .filter(s => {
        const d = new Date(s.datetime);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((acc, s) => acc + s.amountCents, 0) / 100;

    // Sessions per week (last 8 weeks)
    const sessionsPerWeek: { week: string, count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date();
      start.setDate(now.getDate() - (i * 7 + now.getDay())); // start of that week (Sunday)
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(start);
      end.setDate(start.getDate() + 7);

      const count = sessions.filter(s => {
        const d = new Date(s.datetime);
        return d >= start && d < end;
      }).length;

      sessionsPerWeek.push({
        week: `Week ${start.getDate()}/${start.getMonth() + 1}`,
        count
      });
    }

    res.json({
      averageRating: profile.averageRating,
      totalReviews: profile.reviewCount,
      profileViews: profile.profileViews,
      ratingBreakdown,
      responseRate,
      totalEarnings: {
        currentMonth: currentMonthEarnings,
        allTime: allTimeEarnings
      },
      sessionsPerWeek,
      isOnline: profile.isOnline
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tutors/:id
tutorsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 5;
    
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: id },
      include: { user: true }
    });

    if (!tutorProfile || !tutorProfile.isVerified) {
      res.status(404).json({ error: 'Tutor not found' });
      return;
    }

    const [reviews, totalReviews, allReviews] = await Promise.all([
      prisma.review.findMany({
        where: { tutorId: id },
        include: { student: { select: { email: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.review.count({ where: { tutorId: id } }),
      prisma.review.findMany({ where: { tutorId: id }, select: { rating: true } })
    ]);

    const averageRating = allReviews.length > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length : 0;

    const formattedReviews = reviews.map(r => ({
      id: r.id,
      studentName: r.student.email.split('@')[0],
      avatarUrl: r.student.avatarUrl,
      rating: r.rating,
      comment: r.comment,
      date: r.createdAt
    }));

    res.json({
      id: tutorProfile.userId,
      name: tutorProfile.user.email.split('@')[0],
      avatarUrl: tutorProfile.user.avatarUrl,
      bio: tutorProfile.bio,
      subjects: tutorProfile.subjects,
      hourlyRate: tutorProfile.hourlyRate,
      subscriptionMonthlyPrice: tutorProfile.subscriptionMonthlyPrice,
      subscriptionYearlyPrice: tutorProfile.subscriptionYearlyPrice,
      averageRating,
      reviewCount: totalReviews,
      availability: tutorProfile.availability || {},
      reviews: formattedReviews,
      reviewsPage: page,
      reviewsTotalPages: Math.ceil(totalReviews / limit),
      isOnline: tutorProfile.isOnline
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tutors/:id/view
tutorsRouter.post('/:id/view', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Ignore if it's the tutor viewing their own profile
    const currentUserId = (req as any).user?.id;
    if (currentUserId === id) {
      res.status(200).json({ success: true, ignored: true });
      return;
    }

    await prisma.tutorProfile.update({
      where: { userId: id },
      data: { profileViews: { increment: 1 } }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    if ((error as any).code === 'P2025') {
      res.status(404).json({ error: 'Tutor not found' });
      return;
    }
    next(error);
  }
});

const updateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  subjects: z.array(z.string()).optional(),
  hourlyRate: z.number().min(0).optional(),
  subscriptionMonthlyPrice: z.number().min(0).optional(),
  subscriptionYearlyPrice: z.number().min(0).optional(),
  isVerified: z.boolean().optional(),
  availability: z.record(z.any()).optional(),
  isOnline: z.boolean().optional(),
});

tutorsRouter.patch(
  '/me/profile',
  requireAuth,
  requireRole('TUTOR'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedData = updateProfileSchema.parse(req.body);
      const userId = (req.user as any).id;

      const updatedProfile = await prisma.tutorProfile.upsert({
        where: { userId },
        update: parsedData,
        create: {
          userId,
          bio: parsedData.bio || '',
          subjects: parsedData.subjects || [],
          hourlyRate: parsedData.hourlyRate || 0,
          subscriptionMonthlyPrice: parsedData.subscriptionMonthlyPrice || 0,
          subscriptionYearlyPrice: parsedData.subscriptionYearlyPrice || 0,
          availability: parsedData.availability || {},
          isOnline: parsedData.isOnline ?? true,
        },
      });

      res.json({ profile: updatedProfile });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/tutors/:id/favorite
tutorsRouter.post('/:id/favorite', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentId = (req.user as any).id;
    const tutorUserId = req.params.id;

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId }
    });

    if (!tutorProfile) {
      res.status(404).json({ error: 'Tutor not found' });
      return;
    }

    await prisma.favoriteTutor.create({
      data: {
        studentId,
        tutorId: tutorProfile.id
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Already favorited' });
      return;
    }
    next(error);
  }
});

// DELETE /api/tutors/:id/favorite
tutorsRouter.delete('/:id/favorite', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentId = (req.user as any).id;
    const tutorUserId = req.params.id;

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId }
    });

    if (!tutorProfile) {
      res.status(404).json({ error: 'Tutor not found' });
      return;
    }

    await prisma.favoriteTutor.delete({
      where: {
        studentId_tutorId: {
          studentId,
          tutorId: tutorProfile.id
        }
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Favorite not found' });
      return;
    }
    next(error);
  }
});
