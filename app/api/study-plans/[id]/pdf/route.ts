import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { getStudyPlanForUser } from '@/lib/study-plans/service';
import { getClassByKey } from '@/lib/classes';
import { formatArabicDate, parseDateKey } from '@/lib/study-plans/planning';
import { INTENSITY_LABELS, CONTENT_TYPE_LABELS, VIDEO_TYPE_LABELS, type VideoType } from '@/lib/study-plans/types';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const data = await getStudyPlanForUser(params.id, user.id);
  if (!data) return NextResponse.json({ success: false, error: 'الخطة غير موجودة' }, { status: 404 });

  const { plan, stats, days } = data;
  const gradeLabel = getClassByKey(plan.grade)?.name ?? plan.grade;

  const videoTypeLabel = (t: string) => VIDEO_TYPE_LABELS[t as VideoType] ?? 'فيديو';
  const totalDayMinutes = days.reduce((s, d) => s + d.totalMinutes, 0);

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>خطتي الذكية — ${gradeLabel}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', 'Tahoma', Arial, sans-serif; color: #1e293b; font-size: 12px; }
  .header { text-align: center; padding-bottom: 10px; border-bottom: 2px solid #cc785c; margin-bottom: 12px; }
  .header h1 { font-size: 20px; color: #b0532f; margin-bottom: 4px; }
  .header p { color: #64748b; font-size: 12px; }
  .meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .meta .box { flex: 1; min-width: 120px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; }
  .meta .box .k { font-size: 10px; color: #64748b; }
  .meta .box .v { font-weight: bold; color: #1e293b; }
  h2.day { font-size: 13px; color: #b0532f; margin: 10px 0 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  th, td { border: 1px solid #e2e8f0; padding: 5px 8px; text-align: right; }
  th { background: #f1f5f9; color: #334155; font-size: 11px; }
  td.done { color: #16a34a; }
  .footer { margin-top: 14px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 10px; background: #f1f5f9; }
  .progress { margin: 6px 0; }
  .print-hint { display: none; }
</style>
</head>
<body>
  <div class="header">
    <h1>🤖 خطتي الذكية</h1>
    <p>منصة الرائد — للرياضيات والإحصاء | ${gradeLabel}</p>
  </div>

  <div class="meta">
    <div class="box"><div class="k">الطالب</div><div class="v">${user.name}</div></div>
    <div class="box"><div class="k">الفترة</div><div class="v">${formatArabicDate(parseDateKey(plan.startDate))} → ${formatArabicDate(parseDateKey(plan.endDate))}</div></div>
    <div class="box"><div class="k">المدة اليومية</div><div class="v">${plan.dailyMinutes} دقيقة</div></div>
    <div class="box"><div class="k">أيام المذاكرة</div><div class="v">${plan.selectedDays.length} أيام</div></div>
  </div>

  <div class="meta">
    <div class="box"><div class="k">التقدم</div><div class="v">${stats.completedCount} / ${plan.totalVideos} (${plan.progressPercent}%)</div></div>
    <div class="box"><div class="k">إجمالي المدة</div><div class="v">${plan.totalContentMinutes} دقيقة</div></div>
    <div class="box"><div class="k">الخطة</div><div class="v">${CONTENT_TYPE_LABELS[plan.contentType as keyof typeof CONTENT_TYPE_LABELS] ?? plan.contentType} · ${INTENSITY_LABELS[plan.studyIntensity as keyof typeof INTENSITY_LABELS] ?? plan.studyIntensity}</div></div>
    <div class="box"><div class="k">المتبقي</div><div class="v">${stats.remainingMinutes} دقيقة</div></div>
  </div>

  ${days
    .map(
      (day) => `
  <h2 class="day">${day.weekdayLabel} — ${formatArabicDate(parseDateKey(day.date))} <small>(${day.completedCount}/${day.totalCount} مكتمل)</small></h2>
  <table>
    <thead><tr><th style="width:32px">#</th><th>الدرس</th><th>النوع</th><th>المدة</th><th>الحالة</th></tr></thead>
    <tbody>
      ${day.items
        .map(
          (it, idx) => `<tr>
            <td>${idx + 1}</td>
            <td>${it.lesson.title}</td>
            <td><span class="badge">${videoTypeLabel(it.videoType)}</span></td>
            <td>${it.durationMinutes} د</td>
            <td class="${it.completed ? 'done' : ''}">${it.completed ? '✓ مكتمل' : '—'}</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>`
    )
    .join('')}

  <div class="footer">
    مع الرائد يا بطل ... انسى صعوبة الرياضيات ❤️ — أُنشئت بتاريخ ${formatArabicDate(new Date())}
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
