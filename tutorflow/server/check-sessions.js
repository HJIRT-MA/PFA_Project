const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.session.findMany({
    orderBy: { datetime: 'desc' },
    take: 2,
    include: { student: true, tutor: true }
  });
  console.log(sessions.map(s => ({ id: s.id, status: s.status })));
}

main().finally(() => prisma.$disconnect());
