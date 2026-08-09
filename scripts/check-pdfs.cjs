const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const pdfs = await prisma.pdf.findMany({ select: { id: true, title: true, fileUrl: true, accessType: true, category: true } });
  console.log(JSON.stringify(pdfs, null, 2));
  await prisma.$disconnect();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
