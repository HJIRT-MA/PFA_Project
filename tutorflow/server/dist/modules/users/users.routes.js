"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const auth_1 = require("../../middleware/auth");
exports.usersRouter = (0, express_1.Router)();
exports.usersRouter.use(auth_1.requireAuth);
exports.usersRouter.get('/me/notification-preferences', async (req, res, next) => {
    try {
        const userId = req.user.id;
        let prefs = await prisma_1.prisma.notificationPreferences.findUnique({
            where: { userId }
        });
        if (!prefs) {
            prefs = await prisma_1.prisma.notificationPreferences.create({
                data: { userId }
            });
        }
        res.json({ preferences: prefs });
    }
    catch (error) {
        next(error);
    }
});
exports.usersRouter.patch('/me/notification-preferences', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const updateData = req.body;
        const prefs = await prisma_1.prisma.notificationPreferences.upsert({
            where: { userId },
            update: updateData,
            create: { userId, ...updateData }
        });
        res.json({ preferences: prefs });
    }
    catch (error) {
        next(error);
    }
});
