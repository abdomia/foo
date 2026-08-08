import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { z } from 'zod';

const createAdminSchema = z.object({
  key: z.string().min(1),
  email: z.string().trim().email().toLowerCase(),
  name: z.string().trim().min(2).max(100),
  password: z.string().min(6).max(128),
  phone: z.string().trim().regex(/^[0-9+\s-]{10,15}$/),
});

export async function POST(request: NextRequest) {
  const secretKey = process.env.ADMIN_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'Admin secret key is not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const parsed = createAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  if (parsed.data.key !== secretKey) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 401 });
  }

  try {
    const { email, name, password, phone } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      const user = await prisma.user.update({
        where: { email },
        data: { isAdmin: true },
      });
      return NextResponse.json({ success: true, message: 'User promoted to admin', email: user.email });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await hashPassword(password),
        phone,
        parentPhone: phone,
        isAdmin: true,
        isSubscribed: true,
      },
    });

    return NextResponse.json({ success: true, message: 'Admin created', email: user.email });
  } catch (error) {
    console.error('Error creating admin:', error);
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
  }
}
