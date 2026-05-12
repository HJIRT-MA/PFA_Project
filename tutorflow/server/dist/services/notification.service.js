"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const socket_1 = require("../socket");
const prisma_1 = require("../lib/prisma");
const resend_1 = require("resend");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY || 're_mock');
exports.notificationService = {
    createNotification: async (userId, type, title, body, link) => {
        try {
            const notification = await prisma_1.prisma.notification.create({
                data: { userId, type, title, body, link }
            });
            if (socket_1.io) {
                socket_1.io.to(`user:${userId}`).emit('notification', notification);
            }
            return notification;
        }
        catch (e) {
            console.error('Failed to create notification', e);
        }
    },
    sendEmail: async (to, subject, html) => {
        try {
            await resend.emails.send({
                from: 'TutorFlow <noreply@tutorflow.com>',
                to: [to],
                subject,
                html
            });
        }
        catch (e) {
            console.error('Failed to send email', e);
        }
    }
};
