import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.argv[2];
  const name = process.argv[3] || 'Admin';
  const password = process.argv[4] || 'admin123';
  const phone = process.argv[5] || '01000000000';
  
  if (!email) {
    console.log('Usage: npx tsx scripts/create-admin.ts email password name phone');
    console.log('Example: npx tsx scripts/create-admin.ts admin@test.com 123456 "Admin User" 01000000000');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Check if user exists
  let user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  
  if (user) {
    user = await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { isAdmin: true, password: passwordHash },
    });
    console.log(`✅ Updated ${user.name} (${user.email}) as admin!`);
  } else {
    user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: passwordHash,
        phone,
        parentPhone: phone,
        isAdmin: true,
        isSubscribed: true,
      },
    });
    console.log(`✅ Created admin user: ${user.email} / ${password}`);
  }
  process.exit(0);
}

createAdmin().catch(console.error);