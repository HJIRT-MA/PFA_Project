import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

const app = express();
const port = process.env.PORT || 3000;

import { authRouter } from './modules/auth/auth.routes';
import { tutorsRouter } from './modules/tutors/tutors.routes';
import { sessionsRouter } from './modules/sessions/sessions.routes';
import { messagesRouter } from './modules/messages/messages.routes';
import { reviewsRouter } from './modules/reviews/reviews.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { usersRouter } from './modules/users/users.routes';
import { aiRouter } from './modules/ai/ai.routes';
import { uploadRouter } from './modules/upload/upload.routes';
import { subscriptionsRouter } from './modules/subscriptions/subscriptions.routes';
import passport from 'passport';
import { createServer } from 'http';
import { setupSocketIO } from './socket';
import path from 'path';

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(morgan('dev'));

// Stripe webhook needs raw body
app.use('/api/sessions/webhook', express.raw({ type: 'application/json' }));
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use(express.json());
app.use(passport.initialize());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/tutors', tutorsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/users', usersRouter);
app.use('/api/ai', aiRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/subscriptions', subscriptionsRouter);

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'TutorFlow API is running', health: '/health' });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

import { ZodError } from 'zod';

// Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      details: err.errors
    });
    return;
  }

  res.status(500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

const server = createServer(app);
setupSocketIO(server);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
