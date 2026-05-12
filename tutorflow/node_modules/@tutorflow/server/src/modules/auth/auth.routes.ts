import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import passport from './passport';
import { requireAuth } from '../../middleware/auth';
import { Role } from '@prisma/client';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['STUDENT', 'TUTOR']).transform(val => val as Role),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, role } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'Email already exists', code: 'EMAIL_IN_USE' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        ...(role === 'TUTOR' && {
          tutorProfile: {
            create: {
              bio: '',
              subjects: [],
              hourlyRate: 0,
            },
          },
        }),
      },
      include: { tutorProfile: true },
    });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, tutorProfile: user.tutorProfile } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email }, include: { tutorProfile: true } });
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      return;
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, tutorProfile: user.tutorProfile } });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

authRouter.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req: Request, res: Response) => {
    const user: any = req.user;
    if (!user) {
      return res.redirect('/login?error=auth_failed');
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (user.isNewUser) {
      // Redirect to onboarding/role selection with token
      return res.redirect(`${clientUrl}/onboarding?token=${token}&isNewUser=true`);
    }

    // Redirect to dashboard with token
    return res.redirect(`${clientUrl}/dashboard?token=${token}`);
  }
);

authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

const roleSchema = z.object({ role: z.enum(['STUDENT', 'TUTOR']).transform(val => val as Role) });

authRouter.patch('/me/role', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role } = roleSchema.parse(req.body);
    const userId = (req.user as any).id;
    
    const data: any = { role };
    if (role === 'TUTOR') {
      // Ensure empty profile exists
      const existingProfile = await prisma.tutorProfile.findUnique({ where: { userId } });
      if (!existingProfile) {
        data.tutorProfile = {
          create: {
            bio: '',
            subjects: [],
            hourlyRate: 0,
          }
        };
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      include: { tutorProfile: true }
    });

    res.json({ user: { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role, tutorProfile: updatedUser.tutorProfile } });
  } catch (error) {
    next(error);
  }
});
