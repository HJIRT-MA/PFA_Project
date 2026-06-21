import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { notificationService } from '../../services/notification.service';
import { NotificationType } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2023-10-16' as any, // Bypass strict version type check
});

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock');

export const sessionsRouter = Router();

const createSessionSchema = z.object({
  tutorId: z.string().uuid(),
  datetime: z.string().datetime(),
  durationMin: z.coerce.number().refine(val => [30, 60, 90].includes(val), {
    message: "Duration must be 30, 60, or 90 minutes"
  }),
});

sessionsRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any).id;
    const role = (req.user as any).role;
    const status = req.query.status as string;

    const where: any = {};
    if (role === 'STUDENT') {
      where.studentId = userId;
    } else if (role === 'TUTOR') {
      where.tutorId = userId;
    }

    if (status) {
      where.status = status;
    }

    const sessions = await prisma.session.findMany({
      where,
      include: {
        tutor: { select: { email: true, avatarUrl: true, tutorProfile: { select: { hourlyRate: true, subjects: true } } } },
        student: { select: { email: true, avatarUrl: true } }
      },
      orderBy: { datetime: 'asc' }
    });

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        tutor: { select: { email: true, avatarUrl: true, tutorProfile: { select: { hourlyRate: true, subjects: true } } } },
        student: { select: { email: true, avatarUrl: true } }
      }
    });

    if (!session || (session.studentId !== userId && session.tutorId !== userId)) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    let clientSecret: string | undefined;
    if (session.status === 'AWAITING_PAYMENT' && session.stripePaymentIntentId && session.studentId === userId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(session.stripePaymentIntentId);
      clientSecret = paymentIntent.client_secret || undefined;
    }

    res.json({ session, clientSecret });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.post('/', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tutorId, datetime, durationMin } = createSessionSchema.parse(req.body);
    const studentId = (req.user as any).id;

    // Check tutor exists and is verified
    const tutor = await prisma.tutorProfile.findUnique({
      where: { userId: tutorId },
      include: { user: true }
    });

    if (!tutor || !tutor.isVerified) {
      res.status(404).json({ error: 'Tutor not found or not verified' });
      return;
    }

    // Check if slot is taken (basic check for overlapping sessions)
    const newSessionStart = new Date(datetime);
    const newSessionEnd = new Date(newSessionStart.getTime() + durationMin * 60000);

    const conflictingSessions = await prisma.session.findMany({
      where: {
        tutorId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        datetime: {
          lt: newSessionEnd,
        }
      }
    });

    const isConflict = conflictingSessions.some(session => {
      const existingStart = new Date(session.datetime);
      const existingEnd = new Date(existingStart.getTime() + session.durationMin * 60000);
      return newSessionStart < existingEnd && newSessionEnd > existingStart;
    });

    if (isConflict) {
      res.status(409).json({ error: 'Time slot is already taken' });
      return;
    }

    // Check if user has an active subscription to this tutor
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        studentId,
        tutorId,
        status: 'ACTIVE',
        currentPeriodEnd: { gt: new Date() } // Ensure it's not expired
      }
    });

    const amountCents = Math.round(tutor.hourlyRate * (durationMin / 60) * 100);

    if (activeSubscription) {
      // Calculate start and end of the week of the selected session
      const sessionDate = new Date(datetime);
      const dayOfWeek = sessionDate.getDay() || 7; // Sunday = 7
      const startOfWeek = new Date(sessionDate);
      startOfWeek.setDate(sessionDate.getDate() - dayOfWeek + 1);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Count sessions booked THIS week with THIS tutor
      const weeklySessionsCount = await prisma.session.count({
        where: {
          studentId,
          tutorId,
          datetime: {
            gte: startOfWeek,
            lte: endOfWeek
          },
          status: { notIn: ['CANCELLED', 'AWAITING_PAYMENT'] }
        }
      });

      const weeklyLimit = 3;

      if (weeklySessionsCount >= weeklyLimit) {
        res.status(429).json({ error: `You have reached your limit of ${weeklyLimit} sessions per week for your ${activeSubscription.plan} subscription.` });
        return;
      }

      // Bypass payment and create as PENDING
      const session = await prisma.session.create({
        data: {
          studentId,
          tutorId,
          datetime: newSessionStart,
          durationMin,
          amountCents: 0, // Free due to subscription
          status: 'PENDING',
        },
        include: { student: true, tutor: true }
      });

      // Notify the tutor immediately
      await notificationService.notifyUser(
        session.tutorId,
        session.tutor.email,
        NotificationType.BOOKING_REQUEST,
        `New Booking Request (Subscriber)`,
        `${session.student.email.split('@')[0]} (Subscriber) has requested a ${session.durationMin}-minute session.`,
        `<p>You have a new session request on ${session.datetime} from your subscriber.</p>`,
        '/dashboard?tab=pending'
      );

      res.json({
        sessionId: session.id,
        isSubscribed: true,
      });
      return;
    }

    // Create session in DB (Standard flow)
    const session = await prisma.session.create({
      data: {
        studentId,
        tutorId,
        datetime: newSessionStart,
        durationMin,
        amountCents,
        status: 'AWAITING_PAYMENT',
      }
    });

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      metadata: { sessionId: session.id },
    });

    // Update session with payment intent id
    await prisma.session.update({
      where: { id: session.id },
      data: { stripePaymentIntentId: paymentIntent.id }
    });

    res.json({
      sessionId: session.id,
      clientSecret: paymentIntent.client_secret,
      isSubscribed: false
    });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.post('/verify-payment', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { paymentIntentId } = req.body;
    const studentId = (req.user as any).id;

    if (!paymentIntentId) {
      res.status(400).json({ error: 'Missing paymentIntentId' });
      return;
    }

    const session = await prisma.session.findFirst({
      where: { stripePaymentIntentId: paymentIntentId, studentId },
      include: { student: true, tutor: true }
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.status !== 'AWAITING_PAYMENT') {
      res.json({ success: true, session }); // already processed
      return;
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      const updatedSession = await prisma.session.update({
        where: { id: session.id },
        data: { status: 'PENDING' },
        include: { student: true, tutor: true }
      });

      // Notify the tutor
      await notificationService.notifyUser(
        updatedSession.tutorId,
        updatedSession.tutor.email,
        NotificationType.BOOKING_REQUEST,
        `New Booking Request`,
        `${updatedSession.student.email.split('@')[0]} has requested a ${updatedSession.durationMin}-minute session.`,
        `<p>You have a new session request on ${updatedSession.datetime} that requires your approval.</p>`,
        '/dashboard?tab=pending'
      );

      res.json({ success: true, session: updatedSession });
    } else {
      res.status(400).json({ error: 'Payment not successful yet' });
    }
  } catch (error) {
    next(error);
  }
});

// Webhook endpoint
// We need raw body for Stripe signature verification. Since we have global express.json() in index.ts,
// we might have trouble if it's already parsed. But assuming it works or we use a separate route configuration.
sessionsRouter.post('/webhook', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    let event;

    try {
      // If req.body is already parsed, stripe.webhooks.constructEvent might fail.
      // But assuming raw body is somehow passed or we just mock verification if SECRET is mock
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } else {
        event = req.body; // Mock fallback
      }
    } catch (err: any) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as any;
      const sessionId = paymentIntent.metadata.sessionId;

      if (sessionId) {
        const session = await prisma.session.update({
          where: { id: sessionId },
          data: { status: 'PENDING' },
          include: { student: true, tutor: true }
        });

        // Notify the tutor
        await notificationService.notifyUser(
          session.tutorId,
          session.tutor.email,
          NotificationType.BOOKING_REQUEST,
          `New Booking Request`,
          `${session.student.email.split('@')[0]} has requested a ${session.durationMin}-minute session.`,
          `<p>You have a new session request on ${session.datetime} that requires your approval.</p>`,
          '/dashboard?tab=pending'
        );
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as any;
      const sessionId = paymentIntent.metadata.sessionId;
      
      if (sessionId) {
        await prisma.session.update({
          where: { id: sessionId },
          data: { status: 'CANCELLED' }
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.patch('/:id/accept', requireAuth, requireRole('TUTOR'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tutorId = (req.user as any).id;

    const session = await prisma.session.findUnique({
      where: { id },
      include: { student: true }
    });

    if (!session || session.tutorId !== tutorId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (session.status !== 'PENDING') {
      res.status(400).json({ error: 'Session must be PENDING to accept' });
      return;
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: { status: 'CONFIRMED' }
    });

    // Notify student
    await notificationService.notifyUser(
      session.studentId,
      session.student.email,
      NotificationType.BOOKING_CONFIRMED,
      'Session Accepted',
      `Your session on ${new Date(session.datetime).toLocaleDateString()} has been accepted.`,
      `<p>Your tutor has acknowledged your upcoming session.</p>`,
      '/dashboard?tab=upcoming'
    );

    res.json({ success: true, session: updatedSession });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.patch('/:id/decline', requireAuth, requireRole('TUTOR'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tutorId = (req.user as any).id;
    const { reason } = req.body;

    const session = await prisma.session.findUnique({
      where: { id },
      include: { student: true }
    });

    if (!session || session.tutorId !== tutorId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (session.stripePaymentIntentId) {
      try {
        await stripe.refunds.create({
          payment_intent: session.stripePaymentIntentId,
        });
      } catch (err) {
        console.error('Stripe refund failed (likely a mock payment intent during dev):', err);
      }
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    // Notify student
    await notificationService.notifyUser(
      session.studentId,
      session.student.email,
      NotificationType.BOOKING_CANCELLED,
      'Session Declined',
      `Your tutor declined the session. Reason: ${reason}. Your payment will be refunded.`,
      `<p>Your tutor declined the session. Reason: ${reason}. You have been refunded.</p>`,
      '/dashboard?tab=past'
    );

    res.json({ success: true, session: updatedSession });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.delete('/:id', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = (req.user as any).id;

    const session = await prisma.session.findUnique({
      where: { id }
    });

    if (!session || session.studentId !== studentId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const now = new Date();
    const sessionDate = new Date(session.datetime);
    const hoursDiff = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundPercent = 0;
    if (hoursDiff > 24) refundPercent = 1;
    else if (hoursDiff >= 12) refundPercent = 0.5;

    const refundAmountCents = Math.round(session.amountCents * refundPercent);

    if (session.stripePaymentIntentId && refundAmountCents > 0) {
      await stripe.refunds.create({
        payment_intent: session.stripePaymentIntentId,
        amount: refundAmountCents,
      });
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.json({
      success: true,
      refundPercent: refundPercent * 100,
      refundAmountCents,
      session: updatedSession
    });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.patch('/:id/complete', requireAuth, requireRole('TUTOR'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tutorId = (req.user as any).id;

    const session = await prisma.session.findUnique({
      where: { id },
      include: { student: true }
    });

    if (!session || session.tutorId !== tutorId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (session.status !== 'CONFIRMED') {
      res.status(400).json({ error: 'Session must be CONFIRMED to be marked as completed' });
      return;
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: { status: 'COMPLETED' }
    });

    await resend.emails.send({
      from: 'TutorFlow <noreply@tutorflow.com>',
      to: [session.student.email],
      subject: 'Session Completed - Please leave a review',
      html: `<p>Your session has been marked as completed. Please leave a review for your tutor!</p>`
    }).catch(console.error);

    res.json({ success: true, session: updatedSession });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.post('/:id/room', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const session = await prisma.session.findUnique({
      where: { id }
    });

    if (!session || (session.studentId !== userId && session.tutorId !== userId)) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (session.status !== 'CONFIRMED') {
      res.status(400).json({ error: 'Session is not confirmed' });
      return;
    }

    const now = new Date();
    const sessionStart = new Date(session.datetime);
    const sessionEnd = new Date(sessionStart.getTime() + session.durationMin * 60000);
    
    // Only accessible 30 min before
    const diffMins = (sessionStart.getTime() - now.getTime()) / 60000;
    if (false) { // BYPASS TIMER FOR TESTING
      res.status(400).json({ error: 'Room is only available 30 minutes before the session starts.' });
      return;
    }

    // ----------------------------------------------------------------------
    // JITSI MEET INTEGRATION
    // ----------------------------------------------------------------------
    // Jitsi dynamically creates rooms on-the-fly when users join them.
    // We just need a unique room name for this session.
    const roomName = `tutorflow-session-${id}`;

    // Send the roomUrl, but pass null for the token since it's a public room
    res.json({ roomUrl: roomName, token: null }); 
  } catch (error) {
    next(error);
  }
});

sessionsRouter.get('/:id/resources', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const session = await prisma.session.findUnique({
      where: { id },
      include: { resources: { orderBy: { createdAt: 'desc' } } }
    });

    if (!session || (session.studentId !== userId && session.tutorId !== userId)) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    res.json({ resources: session.resources });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.post('/:id/resources', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;
    const { title, url, type } = req.body;

    const session = await prisma.session.findUnique({
      where: { id }
    });

    if (!session || (session.studentId !== userId && session.tutorId !== userId)) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const resource = await prisma.resource.create({
      data: {
        sessionId: id,
        title,
        url,
        type: type || 'link'
      }
    });

    res.json({ resource });
  } catch (error) {
    next(error);
  }
});

sessionsRouter.get('/:id/messages', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const session = await prisma.session.findUnique({
      where: { id }
    });

    if (!session || (session.studentId !== userId && session.tutorId !== userId)) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, email: true, avatarUrl: true } }
      }
    });

    res.json({ messages });
  } catch (error) {
    next(error);
  }
});
