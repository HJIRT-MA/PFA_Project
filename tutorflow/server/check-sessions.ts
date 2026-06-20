import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.session.findMany().then(s => console.log(s));
