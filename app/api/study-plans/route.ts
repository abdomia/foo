import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { studyPlanCreateSchema } from '@/lib/validation';
import { createStudyPlan, listStudyPlansForUser, StudyPlanError } from '@/lib/study-plans/service';

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

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const parsed = studyPlanCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  try {
    const data = await createStudyPlan(user.id, parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handlePlanError(error);
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const plans = await listStudyPlansForUser(user.id);
    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    console.error('[study-plans] list error:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 });
  }
}
