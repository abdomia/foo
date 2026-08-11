import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { markStudyPlanItem, StudyPlanError } from '@/lib/study-plans/service';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id, itemId } = await params;

  let body: { completed?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // default to toggling on
  }

  try {
    const item = await markStudyPlanItem(id, user.id, itemId, body.completed ?? true);
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    if (error instanceof StudyPlanError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    console.error('[study-plans:item] error:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
