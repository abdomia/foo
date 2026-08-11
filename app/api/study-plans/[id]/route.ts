import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { studyPlanUpdateSchema } from '@/lib/validation';
import { getStudyPlanForUser, updateStudyPlanSettings, StudyPlanError } from '@/lib/study-plans/service';

function handlePlanError(error: unknown) {
  if (error instanceof StudyPlanError) {
    const status =
      error.code === 'not_found' ? 404 : error.code === 'insufficient_time' ? 422 : error.code === 'bad_request' ? 400 : 422;
    return NextResponse.json(
      { success: false, code: error.code, error: error.message, details: error.details },
      { status }
    );
  }
  console.error('[study-plans] unexpected error:', error);
  return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 });
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    const data = await getStudyPlanForUser(id, user.id);
    if (!data) return NextResponse.json({ success: false, error: 'الخطة غير موجودة' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handlePlanError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const parsed = studyPlanUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  try {
    const result = await updateStudyPlanSettings(id, user.id, parsed.data);
    const data = await getStudyPlanForUser(id, user.id);
    return NextResponse.json({ success: true, data, redistributedCount: result.redistributedCount });
  } catch (error) {
    return handlePlanError(error);
  }
}
