import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2023-10-16' as any,
});

export const subscriptionsRouter = Router();

const createCheckoutSchema = z.object({
  tutorId: z.string().uuid(),
  plan: z.enum(['MONTHLY', 'YEARLY']),
});

subscriptionsRouter.post('/checkout', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tutorId, plan } = createCheckoutSchema.parse(req.body);
    const studentId = (req.user as any).id;
    const studentEmail = (req.user as any).email;

    // Check if subscription already exists and is active
    let existingSub = await prisma.subscription.findUnique({
      where: {
        studentId_tutorId: {
          studentId,
          tutorId,
        }
      }
    });

    if (existingSub && existingSub.status === 'ACTIVE') {
      res.status(400).json({ error: 'You already have an active subscription with this tutor.' });
      return;
    }

    const tutor = await prisma.tutorProfile.findUnique({
      where: { userId: tutorId },
      include: { user: true }
    });

    if (!tutor) {
      res.status(404).json({ error: 'Tutor not found' });
      return;
    }

    let price = 0;
    if (plan === 'MONTHLY') {
      price = tutor.subscriptionMonthlyPrice || 0;
    } else {
      price = tutor.subscriptionYearlyPrice || 0;
    }

    if (price <= 0) {
      res.status(400).json({ error: 'Tutor has not set a price for this subscription plan.' });
      return;
    }

    // 1. Create or retrieve Stripe Customer
    // In a real app, we should save the stripeCustomerId in the User model. For now, we search or create.
    let customers = await stripe.customers.list({ email: studentEmail, limit: 1 });
    let stripeCustomerId = customers.data.length > 0 ? customers.data[0].id : null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: studentEmail,
      });
      stripeCustomerId = customer.id;
    }

    // 2. Create the product first
    const stripeProduct = await stripe.products.create({
      name: `Subscription to ${tutor.user.email} (${plan})`,
    });

    // 3. Create the subscription with payment_behavior='default_incomplete'
    const stripeSubscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price_data: {
            currency: 'usd',
            product: stripeProduct.id,
            unit_amount: Math.round(price * 100),
            recurring: {
              interval: plan === 'MONTHLY' ? 'month' : 'year',
            },
          },
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        studentId,
        tutorId,
        plan,
      }
    });

    // 3. Save or update subscription in DB (INACTIVE until payment confirms)
    const dbSub = await prisma.subscription.upsert({
      where: {
        studentId_tutorId: {
          studentId,
          tutorId,
        }
      },
      update: {
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: stripeCustomerId,
        status: 'INACTIVE',
        plan: plan as any,
        currentPeriodEnd: new Date(Date.now() + (plan === 'MONTHLY' ? 30 : 365) * 24 * 60 * 60 * 1000),
      },
      create: {
        studentId,
        tutorId,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: stripeCustomerId,
        status: 'INACTIVE',
        plan: plan as any,
        currentPeriodEnd: new Date(Date.now() + (plan === 'MONTHLY' ? 30 : 365) * 24 * 60 * 60 * 1000),
      }
    });

    const invoice = stripeSubscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent as any;

    res.json({ 
      subscriptionId: dbSub.id, 
      clientSecret: paymentIntent?.client_secret 
    });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any).id;
    const role = (req.user as any).role;

    if (role === 'STUDENT') {
      const subscriptions = await prisma.subscription.findMany({
        where: { studentId: userId, status: 'ACTIVE' },
        include: { tutor: { include: { tutorProfile: true } } }
      });
      res.json({ subscriptions });
    } else {
      const subscriptions = await prisma.subscription.findMany({
        where: { tutorId: userId, status: 'ACTIVE' },
        include: { student: true }
      });
      res.json({ subscriptions });
    }
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        tutor: { select: { email: true, tutorProfile: { select: { hourlyRate: true, subscriptionMonthlyPrice: true, subscriptionYearlyPrice: true } } } },
      }
    });

    if (!subscription || subscription.studentId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    let clientSecret: string | undefined;
    if (subscription.status === 'INACTIVE' && subscription.stripeSubscriptionId) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId, {
          expand: ['latest_invoice.payment_intent']
        });
        const invoice = stripeSubscription.latest_invoice as any;
        clientSecret = invoice?.payment_intent?.client_secret;
      } catch (err) {
        console.error('Failed to fetch stripe subscription details', err);
      }
    }

    res.json({ subscription, clientSecret });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/verify-payment', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subscriptionId } = req.body;
    const studentId = (req.user as any).id;

    if (!subscriptionId) {
      res.status(400).json({ error: 'Missing subscriptionId' });
      return;
    }

    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, studentId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    if (subscription.status === 'ACTIVE') {
      res.json({ success: true, subscription }); // already processed
      return;
    }

    // Verify with Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

    if (stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing') {
      const updatedSub = await prisma.subscription.update({
        where: { id: subscription.id },
        data: { 
          status: 'ACTIVE',
          currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000)
        },
        include: {
          student: true,
        }
      });

      // Create notification for tutor
      await prisma.notification.create({
        data: {
          userId: updatedSub.tutorId,
          type: 'NEW_SUBSCRIPTION',
          title: 'New Subscriber!',
          body: `${updatedSub.student.email.split('@')[0]} has subscribed to your ${updatedSub.plan} plan!`,
          link: '/dashboard',
        }
      });

      res.json({ success: true, subscription: updatedSub });
    } else {
      res.status(400).json({ error: 'Payment not successful yet' });
    }
  } catch (error) {
    next(error);
  }
});

// Webhook for subscriptions updates
subscriptionsRouter.post('/webhook', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    let event;

    try {
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } else {
        event = req.body;
      }
    } catch (err: any) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: 'CANCELED' }
      });
    } else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as any;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { 
          status: subscription.status === 'active' ? 'ACTIVE' : (subscription.status === 'past_due' ? 'PAST_DUE' : 'INACTIVE'),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        }
      });
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});
