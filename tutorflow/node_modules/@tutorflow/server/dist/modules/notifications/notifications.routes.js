"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const auth_1 = require("../../middleware/auth");
exports.notificationsRouter = (0, express_1.Router)();
exports.notificationsRouter.use(auth_1.requireAuth);
exports.notificationsRouter.get('/me', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 20;
        const notifications = await prisma_1.prisma.notification.findMany({
            where: { userId },
            orderBy: [
                { readAt: 'asc' }, // nulls (unread) first usually requires special query, but in Prisma we can sort by createdAt for now
                { createdAt: 'desc' }
            ],
            skip: (page - 1) * limit,
            take: limit
        });
        const unreadCount = await prisma_1.prisma.notification.count({
            where: { userId, readAt: null }
        });
        res.json({ notifications, unreadCount, page });
    }
    catch (error) {
        next(error);
    }
});
exports.notificationsRouter.patch('/:id/read', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const notification = await prisma_1.prisma.notification.updateMany({
            where: { id, userId },
            data: { readAt: new Date() }
        });
        res.json({ success: true, count: notification.count });
    }
    catch (error) {
        next(error);
    }
});
exports.notificationsRouter.patch('/read-all', async (req, res, next) => {
    try {
        const userId = req.user.id;
        await prisma_1.prisma.notification.updateMany({
            where: { userId, readAt: null },
            data: { readAt: new Date() }
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
