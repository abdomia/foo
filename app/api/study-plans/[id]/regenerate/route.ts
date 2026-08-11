import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { regenerateStudyPlan, StudyPlanError } from '@/lib/study-plans/service';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    const data = await regenerateStudyPlan(id, user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof StudyPlanError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'insufficient_time' ? 422 : error.code === 'no_content' ? 422 : 400;
      return NextResponse.json(
        { success: false, code: error.code, error: error.message, details: error.details },
        { status }
      );
    }
    console.error('[study-plans:regenerate] error:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
