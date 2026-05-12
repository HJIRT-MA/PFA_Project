import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';

export const reviewsRouter = Router();

const createReviewSchema = z.object({
  sessionId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(20).max(500)
});

reviewsRouter.post('/', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId, rating, comment } = createReviewSchema.parse(req.body);
    const studentId = (req.user as any).id;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { review: true }
    });

    if (!session || session.studentId !== studentId) {
      res.status(403).json({ error: 'Not authorized or session not found' });
      return;
    }

    if (session.status !== 'COMPLETED') {
      res.status(400).json({ error: 'Session must be COMPLETED to leave a review' });
      return;
    }

    if (session.review) {
      res.status(409).json({ error: 'Review already exists for this session' });
      return;
    }

    // Insert review
    const review = await prisma.review.create({
      data: {
        sessionId,
        studentId,
        tutorId: session.tutorId,
        rating,
        comment
      }
    });

    // Recalculate avg
    const allReviews = await prisma.review.findMany({
      where: { tutorId: session.tutorId }
    });

    const averageRating = allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;

    await prisma.tutorProfile.update({
      where: { userId: session.tutorId },
      data: {
        averageRating,
        reviewCount: allReviews.length
      }
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    next(error);
  }
});

reviewsRouter.post('/:id/flag', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const review = await prisma.review.update({
      where: { id },
      data: { isFlagged: true }
    });

    res.json({ success: true, review });
  } catch (error) {
    next(error);
  }
});
