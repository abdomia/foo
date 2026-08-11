import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { CLASSES } from '@/lib/classes';
import { fetchGradeContent } from '@/lib/study-plans/content';

// GET /api/study-plans/meta -> grades with content availability
// GET /api/study-plans/meta?grade=<key> -> topics for the wizard unit selection
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const grade = searchParams.get('grade');

  try {
    if (grade) {
      const content = await fetchGradeContent(grade);
      return NextResponse.json({
        success: true,
        data: {
          grade,
          topics: content.topics.map((t) => ({
            id: t.id,
            title: t.title,
            icon: t.icon,
            order: t.order,
            lessonCount: t.lessonCount,
          })),
          lessons: content.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            topicId: l.topicId,
            type: l.type,
            duration: l.duration,
          })),
        },
      });
    }

    // Grade availability: which classes actually have content.
    const availability = await Promise.all(
      CLASSES.map(async (cls) => {
        const content = await fetchGradeContent(cls.key);
        return { key: cls.key, name: cls.name, hasContent: content.lessons.length > 0, lessonCount: content.lessons.length };
      })
    );

    return NextResponse.json({ success: true, data: { grades: availability } });
  } catch (error) {
    console.error('[study-plans:meta] error:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 });
  }
}
