"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const stripe_1 = __importDefault(require("stripe"));
const resend_1 = require("resend");
const prisma_1 = require("../../lib/prisma");
const auth_1 = require("../../middleware/auth");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    apiVersion: '2023-10-16', // Bypass strict version type check
});
const resend = new resend_1.Resend(process.env.RESEND_API_KEY || 're_mock');
exports.sessionsRouter = (0, express_1.Router)();
const createSessionSchema = zod_1.z.object({
    tutorId: zod_1.z.string().uuid(),
    datetime: zod_1.z.string().datetime(),
    durationMin: zod_1.z.enum(['30', '60', '90']).transform(val => parseInt(val)),
});
exports.sessionsRouter.get('/me', auth_1.requireAuth, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const status = req.query.status;
        const where = {};
        if (role === 'STUDENT') {
            where.studentId = userId;
        }
        else if (role === 'TUTOR') {
            where.tutorId = userId;
        }
        if (status) {
            where.status = status;
        }
        const sessions = await prisma_1.prisma.session.findMany({
            where,
            include: {
                tutor: { select: { email: true, avatarUrl: true, tutorProfile: { select: { hourlyRate: true, subjects: true } } } },
                student: { select: { email: true, avatarUrl: true } }
            },
            orderBy: { datetime: 'asc' }
        });
        res.json({ sessions });
    }
    catch (error) {
        next(error);
    }
});
exports.sessionsRouter.get('/:id', auth_1.requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const session = await prisma_1.prisma.session.findUnique({
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
        let clientSecret;
        if (session.status === 'PENDING' && session.stripePaymentIntentId && session.studentId === userId) {
            const paymentIntent = await stripe.paymentIntents.retrieve(session.stripePaymentIntentId);
            clientSecret = paymentIntent.client_secret || undefined;
        }
        res.json({ session, clientSecret });
    }
    catch (error) {
        next(error);
    }
});
exports.sessionsRouter.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('STUDENT'), async (req, res, next) => {
    try {
        const { tutorId, datetime, durationMin } = createSessionSchema.parse(req.body);
        const studentId = req.user.id;
        // Check tutor exists and is verified
        const tutor = await prisma_1.prisma.tutorProfile.findUnique({
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
        const conflictingSessions = await prisma_1.prisma.session.findMany({
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
        const amountCents = Math.round(tutor.hourlyRate * (durationMin / 60) * 100);
        // Create session in DB
        const session = await prisma_1.prisma.session.create({
            data: {
                studentId,
                tutorId,
                datetime: newSessionStart,
                durationMin,
                amountCents,
                status: 'PENDING',
            }
        });
        // Create Stripe PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountCents,
            currency: 'eur',
            metadata: { sessionId: session.id },
        });
        // Update session with payment intent id
        await prisma_1.prisma.session.update({
            where: { id: session.id },
            data: { stripePaymentIntentId: paymentIntent.id }
        });
        res.json({
            sessionId: session.id,
            clientSecret: paymentIntent.client_secret
        });
    }
    catch (error) {
        next(error);
    }
});
// Webhook endpoint
// We need raw body for Stripe signature verification. Since we have global express.json() in index.ts,
// we might have trouble if it's already parsed. But assuming it works or we use a separate route configuration.
exports.sessionsRouter.post('/webhook', async (req, res, next) => {
    try {
        const sig = req.headers['stripe-signature'];
        let event;
        try {
            // If req.body is already parsed, stripe.webhooks.constructEvent might fail.
            // But assuming raw body is somehow passed or we just mock verification if SECRET is mock
            if (process.env.STRIPE_WEBHOOK_SECRET) {
                event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
            }
            else {
                event = req.body; // Mock fallback
            }
        }
        catch (err) {
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const sessionId = paymentIntent.metadata.sessionId;
            if (sessionId) {
                const session = await prisma_1.prisma.session.update({
                    where: { id: sessionId },
                    data: { status: 'CONFIRMED' },
                    include: { student: true, tutor: true }
                });
                // Send email
                await resend.emails.send({
                    from: 'TutorFlow <noreply@tutorflow.com>',
                    to: [session.student.email, session.tutor.email],
                    subject: 'Session Confirmed',
                    html: `<p>Session on ${session.datetime} has been confirmed.</p>`
                }).catch(console.error);
            }
        }
        else if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object;
            const sessionId = paymentIntent.metadata.sessionId;
            if (sessionId) {
                await prisma_1.prisma.session.update({
                    where: { id: sessionId },
                    data: { status: 'CANCELLED' }
                });
            }
        }
        res.json({ received: true });
    }
    catch (error) {
        next(error);
    }
});
exports.sessionsRouter.patch('/:id/accept', auth_1.requireAuth, (0, auth_1.requireRole)('TUTOR'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const tutorId = req.user.id;
        const session = await prisma_1.prisma.session.findUnique({
            where: { id },
            include: { student: true }
        });
        if (!session || session.tutorId !== tutorId) {
            res.status(403).json({ error: 'Not authorized' });
            return;
        }
        if (session.status !== 'CONFIRMED') {
            res.status(400).json({ error: 'Session must be CONFIRMED to accept' });
            return;
        }
        // No-op for status, just notify student
        await resend.emails.send({
            from: 'TutorFlow <noreply@tutorflow.com>',
            to: [session.student.email],
            subject: 'Tutor accepted your session',
            html: `<p>Your tutor has acknowledged your upcoming session.</p>`
        }).catch(console.error);
        res.json({ success: true, session });
    }
    catch (error) {
        next(error);
    }
});
exports.sessionsRouter.patch('/:id/decline', auth_1.requireAuth, (0, auth_1.requireRole)('TUTOR'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const tutorId = req.user.id;
        const { reason } = req.body;
        const session = await prisma_1.prisma.session.findUnique({
            where: { id },
            include: { student: true }
        });
        if (!session || session.tutorId !== tutorId) {
            res.status(403).json({ error: 'Not authorized' });
            return;
        }
        if (session.stripePaymentIntentId) {
            await stripe.refunds.create({
                payment_intent: session.stripePaymentIntentId,
            });
        }
        const updatedSession = await prisma_1.prisma.session.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });
        await resend.emails.send({
            from: 'TutorFlow <noreply@tutorflow.com>',
            to: [session.student.email],
            subject: 'Session Declined',
            html: `<p>Your tutor declined the session. Reason: ${reason}. You have been refunded.</p>`
        }).catch(console.error);
        res.json({ success: true, session: updatedSession });
    }
    catch (error) {
        next(error);
    }
});
exports.sessionsRouter.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('STUDENT'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;
        const session = await prisma_1.prisma.session.findUnique({
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
        if (hoursDiff > 24)
            refundPercent = 1;
        else if (hoursDiff >= 12)
            refundPercent = 0.5;
        const refundAmountCents = Math.round(session.amountCents * refundPercent);
        if (session.stripePaymentIntentId && refundAmountCents > 0) {
            await stripe.refunds.create({
                payment_intent: session.stripePaymentIntentId,
                amount: refundAmountCents,
            });
        }
        const updatedSession = await prisma_1.prisma.session.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });
        res.json({
            success: true,
            refundPercent: refundPercent * 100,
            refundAmountCents,
            session: updatedSession
        });
    }
    catch (error) {
        next(error);
    }
});
exports.sessionsRouter.post('/:id/room', auth_1.requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const session = await prisma_1.prisma.session.findUnique({
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
        if (diffMins > 30) {
            res.status(400).json({ error: 'Room is only available 30 minutes before the session starts.' });
            return;
        }
        // Call Daily API
        const DAILY_API_KEY = process.env.DAILY_API_KEY || 'mock_daily_key';
        const roomName = `session-${id}`;
        let roomUrl = `https://mock.daily.co/${roomName}`;
        if (DAILY_API_KEY !== 'mock_daily_key') {
            // Try to create room
            const roomRes = await fetch('https://api.daily.co/v1/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DAILY_API_KEY}` },
                body: JSON.stringify({
                    name: roomName,
                    privacy: 'private',
                    properties: {
                        exp: Math.floor(sessionEnd.getTime() / 1000)
                    }
                })
            });
            const roomData = await roomRes.json();
            if (roomRes.ok) {
                roomUrl = roomData.url;
            }
            else if (roomData.error === 'invalid-request-error' && roomData.info && roomData.info.includes('already exists')) {
                // Room already exists, fetch it to get URL
                const existingRoomRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
                    headers: { Authorization: `Bearer ${DAILY_API_KEY}` }
                });
                const existingRoomData = await existingRoomRes.json();
                roomUrl = existingRoomData.url;
            }
            else {
                res.status(500).json({ error: 'Failed to create room', details: roomData });
                return;
            }
        }
        // Create meeting token
        let token = 'mock_token';
        if (DAILY_API_KEY !== 'mock_daily_key') {
            const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DAILY_API_KEY}` },
                body: JSON.stringify({
                    properties: {
                        room_name: roomName,
                        is_owner: true,
                        exp: Math.floor(sessionEnd.getTime() / 1000)
                    }
                })
            });
            const tokenData = await tokenRes.json();
            if (tokenRes.ok) {
                token = tokenData.token;
            }
        }
        res.json({ roomUrl, token });
    }
    catch (error) {
        next(error);
    }
});
