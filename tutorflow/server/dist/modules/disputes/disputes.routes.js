"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disputesRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const auth_1 = require("../../middleware/auth");
exports.disputesRouter = (0, express_1.Router)();
exports.disputesRouter.post('/', auth_1.requireAuth, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { sessionId, reason, description } = req.body;
        const session = await prisma_1.prisma.session.findUnique({
            where: { id: sessionId }
        });
        if (!session || (session.studentId !== userId && session.tutorId !== userId)) {
            res.status(403).json({ error: 'Not authorized' });
            return;
        }
        const dispute = await prisma_1.prisma.dispute.create({
            data: {
                sessionId,
                openedBy: userId,
                reason,
                description,
                status: 'OPEN'
            }
        });
        res.status(201).json({ dispute });
    }
    catch (error) {
        next(error);
    }
});
exports.disputesRouter.get('/admin', auth_1.requireAuth, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        const disputes = await prisma_1.prisma.dispute.findMany({
            include: {
                session: { include: { student: true, tutor: true } },
                opener: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ disputes });
    }
    catch (error) {
        next(error);
    }
});
exports.disputesRouter.patch('/admin/:id', auth_1.requireAuth, (0, auth_1.requireRole)('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, resolution } = req.body;
        const dispute = await prisma_1.prisma.dispute.update({
            where: { id },
            data: { status, resolution }
        });
        // In a real app, if resolution involves a refund, we would call Stripe here.
        res.json({ dispute });
    }
    catch (error) {
        next(error);
    }
});
