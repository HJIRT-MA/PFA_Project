const { PrismaClient, NotificationType } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const userId = "7f2d7f17-cc39-4b25-a61c-72be0f6a72aa"; // student id from db output
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'Test',
        body: 'Test body',
        link: '/dashboard'
      }
    });
    console.log("Created:", notification);
  } catch(e) {
    console.error(e);
  }
}
main().finally(() => prisma.$disconnect());