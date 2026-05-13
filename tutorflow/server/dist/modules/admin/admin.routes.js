"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const auth_1 = require("../../middleware/auth");
const resend_1 = require("resend");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY || 're_mock');
exports.adminRouter = (0, express_1.Router)();
exports.adminRouter.use(auth_1.requireAuth, (0, auth_1.requireRole)('ADMIN'));
exports.adminRouter.get('/tutors/pending', async (req, res, next) => {
    try {
        const tutors = await prisma_1.prisma.tutorProfile.findMany({
            where: { isVerified: false },
            include: { user: { select: { email: true, avatarUrl: true, createdAt: true } } },
            orderBy: { user: { createdAt: 'desc' } }
        });
        res.json({ tutors });
    }
    catch (error) {
        next(error);
    }
});
exports.adminRouter.patch('/tutors/:id/approve', async (req, res, next) => {
    try {
        const { id } = req.params;
        const tutorProfile = await prisma_1.prisma.tutorProfile.findUnique({
            where: { userId: id },
            include: { user: true }
        });
        if (!tutorProfile) {
            res.status(404).json({ error: 'Tutor not found' });
            return;
        }
        const updated = await prisma_1.prisma.tutorProfile.update({
            where: { userId: id },
            data: { isVerified: true }
        });
        await resend.emails.send({
            from: 'TutorFlow Admin <noreply@tutorflow.com>',
            to: [tutorProfile.user.email],
            subject: 'Your Tutor Profile has been approved!',
            html: `<p>Welcome to TutorFlow! Your profile is now live.</p>`
        }).catch(console.error);
        res.json({ success: true, tutorProfile: updated });
    }
    catch (error) {
        next(error);
    }
});
exports.adminRouter.patch('/tutors/:id/reject', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const tutorProfile = await prisma_1.prisma.tutorProfile.findUnique({
            where: { userId: id },
            include: { user: true }
        });
        if (!tutorProfile) {
            res.status(404).json({ error: 'Tutor not found' });
            return;
        }
        // In a real app, maybe soft-delete or set status to REJECTED.
        // For now we'll just leave it unverified but notify them.
        await resend.emails.send({
            from: 'TutorFlow Admin <noreply@tutorflow.com>',
            to: [tutorProfile.user.email],
            subject: 'Your Tutor Profile Application Update',
            html: `<p>Unfortunately, your application was not approved at this time. Reason: ${reason}</p>`
        }).catch(console.error);
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
exports.adminRouter.get('/stats', async (req, res, next) => {
    try {
        const period = req.query.period || '30d';
        const now = new Date();
        let startDate = new Date();
        if (period === '7d')
            startDate.setDate(now.getDate() - 7);
        else if (period === '90d')
            startDate.setDate(now.getDate() - 90);
        else
            startDate.setDate(now.getDate() - 30); // default 30d
        const totalUsers = {
            students: await prisma_1.prisma.user.count({ where: { role: 'STUDENT', createdAt: { gte: startDate } } }),
            tutors: await prisma_1.prisma.user.count({ where: { role: 'TUTOR', createdAt: { gte: startDate } } }),
        };
        const newUsersPerDay = [];
        for (let i = 0; i < (period === '7d' ? 7 : period === '90d' ? 90 : 30); i++) {
            const dayStart = new Date(startDate);
            dayStart.setDate(dayStart.getDate() + i);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            const count = await prisma_1.prisma.user.count({
                where: { createdAt: { gte: dayStart, lt: dayEnd } }
            });
            newUsersPerDay.push({ date: dayStart.toISOString().split('T')[0], count });
        }
        const totalSessions = await prisma_1.prisma.session.count({ where: { datetime: { gte: startDate } } });
        const completedSessions = await prisma_1.prisma.session.count({ where: { status: 'COMPLETED', datetime: { gte: startDate } } });
        const sessionsAggr = await prisma_1.prisma.session.aggregate({
            where: { status: 'COMPLETED', datetime: { gte: startDate } },
            _sum: { amountCents: true }
        });
        const totalRevenueEuros = (sessionsAggr._sum?.amountCents || 0) / 100;
        const reviewsAggr = await prisma_1.prisma.review.aggregate({
            where: { createdAt: { gte: startDate } },
            _avg: { rating: true }
        });
        const avgPlatformRating = reviewsAggr._avg.rating || 0;
        const pendingTutorValidations = await prisma_1.prisma.tutorProfile.count({ where: { isVerified: false } });
        const openDisputes = await prisma_1.prisma.dispute.count({ where: { status: 'OPEN' } });
        res.json({
            totalUsers,
            newUsersPerDay,
            totalSessions,
            completedSessions,
            totalRevenueEuros,
            avgPlatformRating,
            pendingTutorValidations,
            openDisputes
        });
    }
    catch (error) {
        next(error);
    }
});
exports.adminRouter.get('/users', async (req, res, next) => {
    try {
        const role = req.query.role;
        const users = await prisma_1.prisma.user.findMany({
            where: role && role !== 'ALL' ? { role: role } : undefined,
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                tutorProfile: {
                    select: {
                        id: true,
                        isVerified: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ users });
    }
    catch (error) {
        next(error);
    }
});
