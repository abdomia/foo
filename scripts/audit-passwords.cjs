const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const users = await prisma.user.findMany({ select: { id: true, email: true, password: true } });
  const isHash = (p) => /^\$2[aby]\$\d{2}\$/.test(p);
  const plain = users.filter((u) => !isHash(u.password));
  console.log('TOTAL_USERS=' + users.length);
  console.log('BCRYPT=' + (users.length - plain.length));
  console.log('PLAINTEXT=' + plain.length);
  if (plain.length > 0) {
    console.log(plain.map((u) => u.email).join('\n'));
  }
  await prisma.$disconnect();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
