import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.review.deleteMany();
  await prisma.message.deleteMany();
  await prisma.session.deleteMany();
  await prisma.tutorProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@tutorflow.local',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  // Create Students
  const student1 = await prisma.user.create({
    data: {
      email: 'student1@tutorflow.local',
      passwordHash,
      role: Role.STUDENT,
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: 'student2@tutorflow.local',
      passwordHash,
      role: Role.STUDENT,
    },
  });

  // Create Tutors
  const tutor1 = await prisma.user.create({
    data: {
      email: 'tutor1@tutorflow.local',
      passwordHash,
      role: Role.TUTOR,
      tutorProfile: {
        create: {
          bio: 'Experienced Math Tutor',
          subjects: ['Math', 'Physics'],
          hourlyRate: 50.0,
          isVerified: true,
        },
      },
    },
  });

  const tutor2 = await prisma.user.create({
    data: {
      email: 'tutor2@tutorflow.local',
      passwordHash,
      role: Role.TUTOR,
      tutorProfile: {
        create: {
          bio: 'Language Specialist',
          subjects: ['English', 'Spanish'],
          hourlyRate: 40.0,
          isVerified: true,
        },
      },
    },
  });

  console.log('Seeding completed successfully!');
  console.log('Login with password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
