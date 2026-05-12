import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';

export const disputesRouter = Router();

disputesRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any).id;
    const { sessionId, reason, description } = req.body;

    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session || (session.studentId !== userId && session.tutorId !== userId)) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const dispute = await prisma.dispute.create({
      data: {
        sessionId,
        openedBy: userId,
        reason,
        description,
        status: 'OPEN'
      }
    });

    res.status(201).json({ dispute });
  } catch (error) {
    next(error);
  }
});

disputesRouter.get('/admin', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const disputes = await prisma.dispute.findMany({
      include: {
        session: { include: { student: true, tutor: true } },
        opener: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ disputes });
  } catch (error) {
    next(error);
  }
});

disputesRouter.patch('/admin/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;

    const dispute = await prisma.dispute.update({
      where: { id },
      data: { status, resolution }
    });

    // In a real app, if resolution involves a refund, we would call Stripe here.

    res.json({ dispute });
  } catch (error) {
    next(error);
  }
});
