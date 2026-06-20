import * as socketServer from '../socket';
import { prisma } from '../lib/prisma';
import nodemailer from 'nodemailer';
import { NotificationType } from '@prisma/client';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'mohamedaminehjirt@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

export const notificationService = {
  createNotification: async (userId: string, type: NotificationType, title: string, body: string, link?: string) => {
    try {
      const notification = await prisma.notification.create({
        data: { userId, type, title, body, link }
      });
      if (socketServer.io) {
        socketServer.io.to(`user:${userId}`).emit('notification', notification);
      }
      return notification;
    } catch (e) {
      console.error('Failed to create notification', e);
    }
  },

  sendEmail: async (to: string, subject: string, html: string) => {
    try {
      await transporter.sendMail({
        from: '"TutorFlow" <mohamedaminehjirt@gmail.com>',
        to,
        subject,
        html
      });
    } catch (e) {
      console.error('Failed to send email', e);
    }
  },

  notifyUser: async (
    userId: string,
    emailAddress: string,
    type: NotificationType,
    title: string,
    body: string,
    emailHtml: string,
    link?: string
  ) => {
    console.log(`[DEBUG] notifyUser called for ${userId} (${emailAddress}) - Type: ${type}`);
    try {
      // 1. Fetch user preferences
      let prefs = await prisma.notificationPreferences.findUnique({
        where: { userId }
      });

      if (!prefs) {
        prefs = {
          userId,
          emailOnBooking: true,
          emailOnMessage: true,
          emailOnReminder: true,
          pushOnBooking: true,
          pushOnMessage: true,
          pushOnReminder: true,
        } as any;
      }
      
      const safePrefs = prefs!;

      // 2. Always create the DB notification (for the Bell history)
      const notification = await prisma.notification.create({
        data: { userId, type, title, body, link }
      });

      // 3. Determine if we should Push (emit socket)
      let shouldPush = true;
      if (type === 'BOOKING_REQUEST' || type === 'BOOKING_CONFIRMED' || type === 'BOOKING_CANCELLED') {
        shouldPush = safePrefs.pushOnBooking;
      } else if (type === 'NEW_MESSAGE') {
        shouldPush = safePrefs.pushOnMessage;
      } else if (type === 'SESSION_REMINDER') {
        shouldPush = safePrefs.pushOnReminder;
      }

      if (shouldPush && socketServer.io) {
        socketServer.io.to(`user:${userId}`).emit('notification', notification);
      }

      // 4. Determine if we should Email
      let shouldEmail = true;
      if (type === 'BOOKING_REQUEST' || type === 'BOOKING_CONFIRMED' || type === 'BOOKING_CANCELLED') {
        shouldEmail = safePrefs.emailOnBooking;
      } else if (type === 'NEW_MESSAGE') {
        shouldEmail = safePrefs.emailOnMessage;
      } else if (type === 'SESSION_REMINDER') {
        shouldEmail = safePrefs.emailOnReminder;
      }

      if (shouldEmail && emailAddress) {
        console.log(`\n📧 [EMAIL DISPATCHED] To: ${emailAddress} | Subject: ${title}`);
        console.log(`Email Content:\n${emailHtml}\n`);
        
        await transporter.sendMail({
          from: '"TutorFlow Notifications" <mohamedaminehjirt@gmail.com>',
          to: emailAddress,
          subject: title,
          html: emailHtml
        }).catch((e: any) => console.log('Note: Nodemailer API failed. Error:', e.message || e));
      }

      return notification;
    } catch (error) {
      console.error('Error in notifyUser:', error);
    }
  }
};
