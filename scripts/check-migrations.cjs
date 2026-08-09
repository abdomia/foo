const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const rows = await prisma.$queryRawUnsafe('SELECT "migration_name", "finished_at" FROM "_prisma_migrations" ORDER BY "started_at"');
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.log('NO_MIGRATIONS_TABLE_OR_ERROR: ' + e.message);
  }
  await prisma.$disconnect();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
