import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin(email: string) {
  const user = await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { isAdmin: true },
  });
  console.log(`✅ ${user.name} is now admin!`);
  process.exit(0);
}

const email = process.argv[2];
if (!email) {
  console.log('Usage: npx tsx make-admin.ts your@email.com');
  process.exit(1);
}

makeAdmin(email).catch(console.error);