"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const auth_1 = require("../../middleware/auth");
exports.messagesRouter = (0, express_1.Router)();
// Get list of conversations
exports.messagesRouter.get('/conversations', auth_1.requireAuth, async (req, res, next) => {
    try {
        const userId = req.user.id;
        // To get the latest message per conversation, we query all messages for this user
        // In a production app, we would use a more optimized SQL query with GROUP BY / DISTINCT ON
        const messages = await prisma_1.prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { id: true, email: true, avatarUrl: true } },
                receiver: { select: { id: true, email: true, avatarUrl: true } }
            }
        });
        const conversationsMap = new Map();
        for (const msg of messages) {
            const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
            if (!conversationsMap.has(otherUser.id)) {
                conversationsMap.set(otherUser.id, {
                    user: otherUser,
                    lastMessage: msg,
                    unreadCount: 0
                });
            }
            if (msg.receiverId === userId && !msg.readAt) {
                const conv = conversationsMap.get(otherUser.id);
                conv.unreadCount += 1;
            }
        }
        res.json({ conversations: Array.from(conversationsMap.values()) });
    }
    catch (error) {
        next(error);
    }
});
// Get conversation history with a specific user
exports.messagesRouter.get('/:userId', auth_1.requireAuth, async (req, res, next) => {
    try {
        const myId = req.user.id;
        const otherId = req.params.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const messages = await prisma_1.prisma.message.findMany({
            where: {
                OR: [
                    { senderId: myId, receiverId: otherId },
                    { senderId: otherId, receiverId: myId }
                ]
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });
        // Mark as read
        await prisma_1.prisma.message.updateMany({
            where: {
                senderId: otherId,
                receiverId: myId,
                readAt: null
            },
            data: { readAt: new Date() }
        });
        // Return newest last for UI convenience by reversing the desc array
        res.json({ messages: messages.reverse() });
    }
    catch (error) {
        next(error);
    }
});
