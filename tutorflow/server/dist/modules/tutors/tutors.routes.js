"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tutorsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const auth_1 = require("../../middleware/auth");
exports.tutorsRouter = (0, express_1.Router)();
// GET /api/tutors
exports.tutorsRouter.get('/', async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 12);
        const subject = req.query.subject;
        const maxRate = req.query.maxRate ? parseFloat(req.query.maxRate) : undefined;
        const minRating = req.query.minRating ? parseFloat(req.query.minRating) : undefined;
        const sortBy = req.query.sortBy || 'rating';
        const where = { isVerified: true };
        if (subject)
            where.subjects = { has: subject };
        if (maxRate !== undefined)
            where.hourlyRate = { lte: maxRate };
        if (minRating !== undefined)
            where.averageRating = { gte: minRating };
        let orderBy = { averageRating: 'desc' };
        if (sortBy === 'price') {
            orderBy = { hourlyRate: 'asc' };
        }
        else if (sortBy === 'reviews') {
            orderBy = { reviewCount: 'desc' };
        }
        const [tutors, total] = await Promise.all([
            prisma_1.prisma.tutorProfile.findMany({
                where,
                include: {
                    user: { select: { email: true, avatarUrl: true } }
                },
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.prisma.tutorProfile.count({ where })
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
            availability: t.availability
        }));
        const totalPages = Math.ceil(total / limit);
        res.json({ tutors: mappedTutors, total, page, totalPages });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/tutors/me/stats
exports.tutorsRouter.get('/me/stats', auth_1.requireAuth, (0, auth_1.requireRole)('TUTOR'), async (req, res, next) => {
    try {
        const userId = req.user.id;
        const profile = await prisma_1.prisma.tutorProfile.findUnique({
            where: { userId }
        });
        if (!profile) {
            res.status(404).json({ error: 'Tutor profile not found' });
            return;
        }
        const reviews = await prisma_1.prisma.review.findMany({
            where: { tutorId: userId }
        });
        const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => {
            if (r.rating >= 1 && r.rating <= 5)
                ratingBreakdown[r.rating]++;
        });
        // Calculate response rate
        const sessions = await prisma_1.prisma.session.findMany({
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
        const sessionsPerWeek = [];
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
            ratingBreakdown,
            responseRate,
            totalEarnings: {
                currentMonth: currentMonthEarnings,
                allTime: allTimeEarnings
            },
            sessionsPerWeek
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/tutors/:id
exports.tutorsRouter.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 5;
        const tutorProfile = await prisma_1.prisma.tutorProfile.findUnique({
            where: { userId: id },
            include: { user: true }
        });
        if (!tutorProfile || !tutorProfile.isVerified) {
            res.status(404).json({ error: 'Tutor not found' });
            return;
        }
        const [reviews, totalReviews, allReviews] = await Promise.all([
            prisma_1.prisma.review.findMany({
                where: { tutorId: id },
                include: { student: { select: { email: true, avatarUrl: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma_1.prisma.review.count({ where: { tutorId: id } }),
            prisma_1.prisma.review.findMany({ where: { tutorId: id }, select: { rating: true } })
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
            averageRating,
            reviewCount: totalReviews,
            availability: tutorProfile.availability || {},
            reviews: formattedReviews,
            reviewsPage: page,
            reviewsTotalPages: Math.ceil(totalReviews / limit)
        });
    }
    catch (error) {
        next(error);
    }
});
const updateProfileSchema = zod_1.z.object({
    bio: zod_1.z.string().max(500).optional(),
    subjects: zod_1.z.array(zod_1.z.string()).optional(),
    hourlyRate: zod_1.z.number().min(0).optional(),
    isVerified: zod_1.z.boolean().optional(),
    availability: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.tutorsRouter.patch('/me/profile', auth_1.requireAuth, (0, auth_1.requireRole)('TUTOR'), async (req, res, next) => {
    try {
        const parsedData = updateProfileSchema.parse(req.body);
        const userId = req.user.id;
        const updatedProfile = await prisma_1.prisma.tutorProfile.upsert({
            where: { userId },
            update: parsedData,
            create: {
                userId,
                bio: parsedData.bio || '',
                subjects: parsedData.subjects || [],
                hourlyRate: parsedData.hourlyRate || 0,
                availability: parsedData.availability || {},
            },
        });
        res.json({ profile: updatedProfile });
    }
    catch (error) {
        next(error);
    }
});
