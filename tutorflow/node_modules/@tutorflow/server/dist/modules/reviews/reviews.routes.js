"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const auth_1 = require("../../middleware/auth");
exports.reviewsRouter = (0, express_1.Router)();
const createReviewSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid(),
    rating: zod_1.z.number().min(1).max(5),
    comment: zod_1.z.string().min(20).max(500)
});
exports.reviewsRouter.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('STUDENT'), async (req, res, next) => {
    try {
        const { sessionId, rating, comment } = createReviewSchema.parse(req.body);
        const studentId = req.user.id;
        const session = await prisma_1.prisma.session.findUnique({
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
        const review = await prisma_1.prisma.review.create({
            data: {
                sessionId,
                studentId,
                tutorId: session.tutorId,
                rating,
                comment
            }
        });
        // Recalculate avg
        const allReviews = await prisma_1.prisma.review.findMany({
            where: { tutorId: session.tutorId }
        });
        const averageRating = allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;
        await prisma_1.prisma.tutorProfile.update({
            where: { userId: session.tutorId },
            data: {
                averageRating,
                reviewCount: allReviews.length
            }
        });
        res.status(201).json({ success: true, review });
    }
    catch (error) {
        next(error);
    }
});
exports.reviewsRouter.post('/:id/flag', auth_1.requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const review = await prisma_1.prisma.review.update({
            where: { id },
            data: { isFlagged: true }
        });
        res.json({ success: true, review });
    }
    catch (error) {
        next(error);
    }
});
