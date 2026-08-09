import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';

type Cell = string | number | null;
type Row = Record<string, Cell>;
type SortOrder = 'asc' | 'desc';

interface Range {
  from: Date | null;
  to: Date | null;
}

const PLAN_LABELS: Record<string, string> = {
  monthly: 'شهري',
  yearly: 'سنوي',
  semester: 'فصلي',
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'مقبول',
  pending: 'قيد الانتظار',
  under_review: 'قيد المراجعة',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
};

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return d.toISOString().slice(0, 10);
}

function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return '—';
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

function includes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function planLabel(plan: string | null | undefined): string {
  return (plan && PLAN_LABELS[plan]) || plan || '—';
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

function sortRows(rows: Row[], sortBy: string | null, sortOrder: SortOrder, fallback = 'created') {
  const key = sortBy && sortBy in (rows[0] ?? {}) ? sortBy : fallback;
  rows.sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'ar');
    return sortOrder === 'asc' ? cmp : -cmp;
  });
}

// ---------------------------------------------------------------- students

async function studentsReport(search: string, r: Range, sortBy: string | null, sortOrder: SortOrder) {
  const users = await prisma.user.findMany({
    where: { role: 'student' },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const rows = users
    .filter((u) => {
      if (!search) return true;
      return includes(u.name, search) || includes(u.email, search) || includes(u.phone, search);
    })
    .filter((u) => {
      if (r.from && u.createdAt < r.from) return false;
      if (r.to && u.createdAt > r.to) return false;
      return true;
    })
    .map((u) => ({
      name: u.name,
      email: u.email,
      phone: u.phone,
      grade: u.grade || '—',
      subscribed: u.isSubscribed ? 'نعم' : 'لا',
      xp: u.xp,
      level: u.level,
      quizzesTaken: u.quizzesTaken,
      unitsCompleted: u.unitsCompleted,
      joined: fmtDate(u.createdAt),
      lastActive: fmtDate(u.lastActiveDate),
    }));

  sortRows(rows, sortBy, sortOrder, 'joined');

  const total = await prisma.user.count({ where: { role: 'student' } });

  return {
    columns: [
      { key: 'name', label: 'الاسم' },
      { key: 'email', label: 'البريد الإلكتروني' },
      { key: 'phone', label: 'الهاتف' },
      { key: 'grade', label: 'الصف' },
      { key: 'subscribed', label: 'مشترك' },
      { key: 'xp', label: 'نقاط الخبرة' },
      { key: 'level', label: 'المستوى' },
      { key: 'quizzesTaken', label: 'اختبارات' },
      { key: 'unitsCompleted', label: 'وحدات مكتملة' },
      { key: 'joined', label: 'تاريخ الانضمام' },
      { key: 'lastActive', label: 'آخر نشاط' },
    ],
    rows,
    summary: [
      { label: 'إجمالي الطلاب', value: total },
      { label: 'المعروض', value: rows.length },
    ],
  };
}

// ---------------------------------------------------------- subscriptions

async function subscriptionsReport(search: string, r: Range, sortBy: string | null, sortOrder: SortOrder) {
  const subs = await prisma.subscription.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const rows = subs
    .filter((s) => {
      if (!search) return true;
      return includes(s.user.name, search) || includes(s.user.email, search);
    })
    .filter((s) => {
      if (r.from && s.createdAt < r.from) return false;
      if (r.to && s.createdAt > r.to) return false;
      return true;
    })
    .map((s) => ({
      student: s.user.name,
      email: s.user.email,
      plan: planLabel(s.plan),
      status: statusLabel(s.status),
      amount: s.amount,
      classKey: s.classKey || '—',
      start: fmtDate(s.startDate),
      expiry: fmtDate(s.expiryDate),
      created: fmtDateTime(s.createdAt),
    }));

  sortRows(rows, sortBy, sortOrder, 'created');

  const total = await prisma.subscription.count();
  const approvedAgg = await prisma.subscription.aggregate({
    where: { status: 'approved' },
    _count: { _all: true },
    _sum: { amount: true },
  });
  const now = new Date();
  const active = rows.filter(
    (row) => row.status === 'مقبول' && row.expiry && row.expiry !== '—' && new Date(row.expiry + 'T23:59:59.999') > now
  ).length;

  return {
    columns: [
      { key: 'student', label: 'الطالب' },
      { key: 'email', label: 'البريد الإلكتروني' },
      { key: 'plan', label: 'الباقة' },
      { key: 'status', label: 'الحالة' },
      { key: 'amount', label: 'المبلغ (جنيه)' },
      { key: 'classKey', label: 'رمز الفصل' },
      { key: 'start', label: 'بداية الاشتراك' },
      { key: 'expiry', label: 'نهاية الاشتراك' },
      { key: 'created', label: 'تاريخ الطلب' },
    ],
    rows,
    summary: [
      { label: 'إجمالي الطلبات', value: total },
      { label: 'مقبولة', value: approvedAgg._count._all },
      { label: 'نشطة حالياً', value: active },
      { label: 'إجمالي المقبول (جنيه)', value: approvedAgg._sum.amount ?? 0 },
    ],
  };
}

// ---------------------------------------------------------------- payments

async function paymentsReport(search: string, r: Range, sortBy: string | null, sortOrder: SortOrder) {
  const payments = await prisma.payment.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const rows = payments
    .filter((p) => {
      if (!search) return true;
      return (
        includes(p.user.name, search) ||
        includes(p.user.email, search) ||
        includes(p.transactionId ?? '', search) ||
        includes(p.vodafoneRef ?? '', search)
      );
    })
    .filter((p) => {
      if (r.from && p.createdAt < r.from) return false;
      if (r.to && p.createdAt > r.to) return false;
      return true;
    })
    .map((p) => ({
      student: p.user.name,
      email: p.user.email,
      amount: p.amount,
      plan: planLabel(p.plan),
      method: p.paymentMethod === 'instapay' ? 'انستاباي' : 'فودافون كاش',
      status: statusLabel(p.status),
      transactionId: p.transactionId || '—',
      ref: p.vodafoneRef || '—',
      created: fmtDateTime(p.createdAt),
    }));

  sortRows(rows, sortBy, sortOrder, 'created');

  const total = await prisma.payment.count();
  const approvedAgg = await prisma.payment.aggregate({
    where: { status: 'approved' },
    _count: { _all: true },
    _sum: { amount: true },
  });
  const pendingCount = await prisma.payment.count({ where: { status: 'pending' } });

  return {
    columns: [
      { key: 'student', label: 'الطالب' },
      { key: 'email', label: 'البريد الإلكتروني' },
      { key: 'amount', label: 'المبلغ (جنيه)' },
      { key: 'plan', label: 'الباقة' },
      { key: 'method', label: 'طريقة الدفع' },
      { key: 'status', label: 'الحالة' },
      { key: 'transactionId', label: 'رقم العملية' },
      { key: 'ref', label: 'مرجع فودافون' },
      { key: 'created', label: 'التاريخ' },
    ],
    rows,
    summary: [
      { label: 'إجمالي المعاملات', value: total },
      { label: 'مقبولة', value: approvedAgg._count._all },
      { label: 'قيد الانتظار', value: pendingCount },
      { label: 'إيرادات مقبولة (جنيه)', value: approvedAgg._sum.amount ?? 0 },
    ],
  };
}

// ---------------------------------------------------------------- revenue

async function revenueReport(_search: string, r: Range, sortBy: string | null, sortOrder: SortOrder) {
  const conditions: Prisma.Sql[] = [Prisma.sql`"status" = 'approved'`];
  if (r.from) conditions.push(Prisma.sql`"createdAt" >= ${r.from}`);
  if (r.to) conditions.push(Prisma.sql`"createdAt" <= ${r.to}`);
  const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

  const days = await prisma.$queryRaw<{ day: string; amount: number; count: number }[]>`
    SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
           COALESCE(SUM("amount"), 0)::int AS amount,
           COUNT(*)::int AS count
    FROM "Payment"
    ${whereSql}
    GROUP BY 1
    ORDER BY 1 ${sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}
  `;

  const totals = await prisma.payment.aggregate({
    where: { status: 'approved', ...(r.from ? { createdAt: { gte: r.from } } : {}), ...(r.to ? { createdAt: { lte: r.to } } : {}) },
    _sum: { amount: true },
    _count: { _all: true },
  });

  void sortBy;
  const rows: Row[] = days.map((d) => ({ day: d.day, amount: d.amount, payments: d.count }));

  return {
    columns: [
      { key: 'day', label: 'اليوم' },
      { key: 'amount', label: 'الإيرادات (جنيه)' },
      { key: 'payments', label: 'عدد المعاملات' },
    ],
    rows,
    summary: [
      { label: 'إجمالي الإيرادات (جنيه)', value: totals._sum.amount ?? 0 },
      { label: 'عدد المعاملات', value: totals._count._all },
      { label: 'عدد الأيام', value: rows.length },
    ],
  };
}

// ---------------------------------------------------------------- quizzes

async function quizzesReport(search: string, r: Range, sortBy: string | null, sortOrder: SortOrder) {
  const attempts = await prisma.userQuizProgress.findMany({
    include: { quiz: { select: { id: true, title: true, grade: true } } },
    orderBy: { completedAt: 'desc' },
    take: 30000,
  });

  const groups = new Map<string, { id: string; title: string; grade: string | null; attempts: number; students: Set<string>; scores: number[]; passed: number }>();
  for (const a of attempts) {
    if (r.from && a.completedAt < r.from) continue;
    if (r.to && a.completedAt > r.to) continue;
    if (search && !includes(a.quiz.title, search)) continue;
    let g = groups.get(a.quizId);
    if (!g) {
      g = { id: a.quizId, title: a.quiz.title, grade: a.quiz.grade, attempts: 0, students: new Set(), scores: [], passed: 0 };
      groups.set(a.quizId, g);
    }
    g.attempts += 1;
    g.students.add(a.userId);
    g.scores.push(a.score);
    if (a.passed) g.passed += 1;
  }

  const rows: Row[] = Array.from(groups.values()).map((g) => ({
    quiz: g.title,
    grade: g.grade || '—',
    attempts: g.attempts,
    students: g.students.size,
    avgScore: g.scores.length ? Math.round(g.scores.reduce((s, v) => s + v, 0) / g.scores.length) : 0,
    passRate: g.attempts ? Math.round((g.passed / g.attempts) * 100) : 0,
  }));

  sortRows(rows, sortBy, sortOrder, 'attempts');

  const totalAttempts = rows.reduce((s, r) => s + (r.attempts as number), 0);

  return {
    columns: [
      { key: 'quiz', label: 'الاختبار' },
      { key: 'grade', label: 'الصف' },
      { key: 'attempts', label: 'عدد المحاولات' },
      { key: 'students', label: 'عدد الطلاب' },
      { key: 'avgScore', label: 'متوسط الدرجة' },
      { key: 'passRate', label: 'نسبة النجاح (%)' },
    ],
    rows,
    summary: [
      { label: 'عدد الاختبارات', value: rows.length },
      { label: 'إجمالي المحاولات', value: totalAttempts },
    ],
  };
}

// ------------------------------------------------------------ lessonViews

async function lessonViewsReport(search: string, r: Range, sortBy: string | null, sortOrder: SortOrder) {
  const progress = await prisma.userLessonProgress.findMany({
    include: { lesson: { select: { id: true, title: true, grade: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 40000,
  });

  const groups = new Map<string, { id: string; title: string; grade: string | null; views: Set<string>; completions: number; watchSeconds: number }>();
  for (const p of progress) {
    if (r.from && p.updatedAt < r.from) continue;
    if (r.to && p.updatedAt > r.to) continue;
    if (search && !includes(p.lesson.title, search)) continue;
    let g = groups.get(p.lessonId);
    if (!g) {
      g = { id: p.lessonId, title: p.lesson.title, grade: p.lesson.grade, views: new Set(), completions: 0, watchSeconds: 0 };
      groups.set(p.lessonId, g);
    }
    g.views.add(p.userId);
    g.watchSeconds += p.watchSeconds;
    if (p.completed) g.completions += 1;
  }

  const rows: Row[] = Array.from(groups.values()).map((g) => ({
    lesson: g.title,
    grade: g.grade || '—',
    views: g.views.size,
    completions: g.completions,
    completionRate: g.views.size ? Math.round((g.completions / g.views.size) * 100) : 0,
    hours: Math.round(g.watchSeconds / 60) / 60,
  }));

  sortRows(rows, sortBy, sortOrder, 'views');

  const totalViews = rows.reduce((s, r) => s + (r.views as number), 0);
  const totalCompletions = rows.reduce((s, r) => s + (r.completions as number), 0);

  return {
    columns: [
      { key: 'lesson', label: 'الدرس' },
      { key: 'grade', label: 'الصف' },
      { key: 'views', label: 'عدد المشاهدين' },
      { key: 'completions', label: 'إكمال' },
      { key: 'completionRate', label: 'نسبة الإكمال (%)' },
      { key: 'hours', label: 'ساعات المشاهدة' },
    ],
    rows,
    summary: [
      { label: 'عدد الدروس', value: rows.length },
      { label: 'إجمالي المشاهدين', value: totalViews },
      { label: 'إجمالي الإكمال', value: totalCompletions },
    ],
  };
}

// --------------------------------------------------------------- progress

async function progressReport(search: string, r: Range, sortBy: string | null, sortOrder: SortOrder) {
  const [students, totalLessons, progress, quizProgress] = await Promise.all([
    prisma.user.findMany({ where: { role: 'student' }, select: { id: true, name: true, grade: true }, take: 5000 }),
    prisma.lesson.count(),
    prisma.userLessonProgress.findMany({ select: { userId: true, lessonId: true, completed: true, timeSpentSeconds: true, updatedAt: true }, take: 50000 }),
    prisma.userQuizProgress.findMany({ select: { userId: true, score: true, completedAt: true }, take: 50000 }),
  ]);

  const perStudentLessons = new Map<string, { done: Set<string>; hours: number }>();
  for (const p of progress) {
    if (r.from && p.updatedAt < r.from) continue;
    if (r.to && p.updatedAt > r.to) continue;
    let rec = perStudentLessons.get(p.userId);
    if (!rec) {
      rec = { done: new Set(), hours: 0 };
      perStudentLessons.set(p.userId, rec);
    }
    rec.hours += p.timeSpentSeconds / 3600;
    if (p.completed) rec.done.add(p.lessonId);
  }

  const perStudentQuizzes = new Map<string, number[]>();
  for (const q of quizProgress) {
    if (r.from && q.completedAt < r.from) continue;
    if (r.to && q.completedAt > r.to) continue;
    let arr = perStudentQuizzes.get(q.userId);
    if (!arr) {
      arr = [];
      perStudentQuizzes.set(q.userId, arr);
    }
    arr.push(q.score);
  }

  const rows: Row[] = [];
  for (const s of students) {
    if (search && !includes(s.name, search)) continue;
    const lessons = perStudentLessons.get(s.id);
    const doneCount = lessons?.done.size ?? 0;
    const quizzes = perStudentQuizzes.get(s.id);
    const avgScore = quizzes && quizzes.length ? Math.round(quizzes.reduce((a, b) => a + b, 0) / quizzes.length) : 0;
    rows.push({
      name: s.name,
      grade: s.grade || '—',
      lessonsDone: doneCount,
      totalLessons,
      percent: totalLessons ? Math.round((doneCount / totalLessons) * 100) : 0,
      quizzes: quizzes?.length ?? 0,
      avgScore,
      hours: lessons ? Math.round(lessons.hours * 10) / 10 : 0,
    });
  }

  sortRows(rows, sortBy, sortOrder, 'percent');

  const avgPercent = rows.length ? Math.round(rows.reduce((s, r) => s + (r.percent as number), 0) / rows.length) : 0;

  return {
    columns: [
      { key: 'name', label: 'الطالب' },
      { key: 'grade', label: 'الصف' },
      { key: 'lessonsDone', label: 'دروس مكتملة' },
      { key: 'totalLessons', label: 'إجمالي الدروس' },
      { key: 'percent', label: 'نسبة الإكمال (%)' },
      { key: 'quizzes', label: 'اختبارات' },
      { key: 'avgScore', label: 'متوسط الدرجة' },
      { key: 'hours', label: 'ساعات التعلم' },
    ],
    rows,
    summary: [
      { label: 'عدد الطلاب', value: rows.length },
      { label: 'متوسط الإكمال (%)', value: avgPercent },
    ],
  };
}

// ---------------------------------------------------------------- main

const REPORTS: Record<string, (s: string, r: Range, b: string | null, o: SortOrder) => Promise<{ columns: { key: string; label: string }[]; rows: Row[]; summary: { label: string; value: Cell }[] }>> = {
  students: studentsReport,
  subscriptions: subscriptionsReport,
  payments: paymentsReport,
  revenue: revenueReport,
  quizzes: quizzesReport,
  lessonViews: lessonViewsReport,
  progress: progressReport,
};

export async function GET(request: NextRequest) {
  const admin = await getSessionUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) {
    return NextResponse.json({ success: false, error: 'غير مسموح به' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'students';
  const search = (searchParams.get('search') ?? '').trim();
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const sortBy = searchParams.get('sortBy');
  const sortOrder: SortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  const range: Range = {
    from: fromParam ? new Date(`${fromParam}T00:00:00`) : null,
    to: toParam ? new Date(`${toParam}T23:59:59.999`) : null,
  };

  const handler = REPORTS[type];
  if (!handler) {
    return NextResponse.json({ success: false, error: 'نوع تقرير غير صالح' }, { status: 400 });
  }

  try {
    const data = await handler(search, range, sortBy, sortOrder);
    return NextResponse.json({ success: true, data: { type, ...data } });
  } catch (error) {
    console.error('Admin reports error:', error);
    return NextResponse.json({ success: false, error: 'تعذر إنشاء التقرير' }, { status: 500 });
  }
}
