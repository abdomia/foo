import { NextRequest, NextResponse } from 'next/server';
import { createSubscriptionCode, getAllSubscriptionCodes, deleteSubscriptionCode } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { adminSubscriptionCodeSchema } from '@/lib/validation';

function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function requireAdmin() {
  const admin = await getSessionUser();
  if (!admin) return { error: unauthorized() as NextResponse };
  if (!admin.isAdmin) return { error: forbidden() as NextResponse };
  return { error: null };
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const codes = await getAllSubscriptionCodes();
    return NextResponse.json({ success: true, data: codes });
  } catch (error) {
    console.error('Error fetching codes:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ في جلب الأكواد' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'البيانات مطلوبة' }, { status: 400 });
  }

  const parsed = adminSubscriptionCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'البيانات غير صالحة' }, { status: 400 });
  }

  try {
    const { plan, durationDays } = parsed.data;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const code = generateUniqueCode();
    const subscriptionCode = await createSubscriptionCode({
      code,
      plan,
      expiresAt,
    });

    return NextResponse.json({ success: true, data: subscriptionCode });
  } catch (error) {
    console.error('Error creating code:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ في إنشاء الكود' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'المعرف مطلوب' }, { status: 400 });
    }

    const result = await deleteSubscriptionCode(id);
    if (!result) {
      return NextResponse.json({ success: false, error: 'فشل في حذف الكود' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting code:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ في حذف الكود' }, { status: 500 });
  }
}
