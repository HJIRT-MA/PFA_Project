import { io } from '../socket';
import { prisma } from '../lib/prisma';
import { Resend } from 'resend';
import { NotificationType } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock');

export const notificationService = {
  createNotification: async (userId: string, type: NotificationType, title: string, body: string, link?: string) => {
    try {
      const notification = await prisma.notification.create({
        data: { userId, type, title, body, link }
      });
      if (io) {
        io.to(`user:${userId}`).emit('notification', notification);
      }
      return notification;
    } catch (e) {
      console.error('Failed to create notification', e);
    }
  },

  sendEmail: async (to: string, subject: string, html: string) => {
    try {
      await resend.emails.send({
        from: 'TutorFlow <noreply@tutorflow.com>',
        to: [to],
        subject,
        html
      });
    } catch (e) {
      console.error('Failed to send email', e);
    }
  }
};
