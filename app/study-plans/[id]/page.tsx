'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useAuth } from '@/components/AuthProvider';
import { VideoTypeBadge } from '@/components/study-plans/VideoTypeBadge';
import { ConfirmDialog } from '@/components/study-plans/ConfirmDialog';
import { EditPlanModal } from '@/components/study-plans/EditPlanModal';
import {
  Robot,
  CalendarRange,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  Pencil,
  Printer,
  FileText,
  Download,
  Loader2,
  Crown,
  Trophy,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  INTENSITY_LABELS,
  DIFFICULTY_LABELS,
  PRIOR_KNOWLEDGE_LABELS,
  type ContentType,
  type StudyIntensity,
} from '@/lib/study-plans/types';

interface PlanItem {
  id: string;
  lesson: { lessonId: string; title: string; url: string; accessType: string; type: string };
  scheduledDate: string;
  orderIndex: number;
  videoType: string;
  durationMinutes: number;
  completed: boolean;
  completedAt: string | null;
}

interface PlanDay {
  date: string;
  weekday: number;
  weekdayLabel: string;
  isToday: boolean;
  isPast: boolean;
  totalMinutes: number;
  completedCount: number;
  totalCount: number;
  items: PlanItem[];
}

interface PlanData {
  plan: {
    id: string;
    title: string;
    grade: string;
    gradeLabel: string;
    status: string;
    startDate: string;
    endDate: string;
    dailyMinutes: number;
    selectedDays: number[];
    contentScope: string;
    contentType: string;
    difficultyLevel: string;
    priorKnowledge: string;
    studyIntensity: string;
    progressPercent: number;
    totalVideos: number;
    explanationVideos: number;
    practiceVideos: number;
    reviewVideos: number;
    examVideos: number;
    totalContentMinutes: number;
    aiUsed: boolean;
    resetCount: number;
    createdAt: string;
    completedAt: string | null;
  };
  stats: {
    completedCount: number;
    remainingCount: number;
    watchedMinutes: number;
    remainingMinutes: number;
    lag: number;
    daysBehind: number;
    expectedCompleted: number;
  };
  days: PlanDay[];
}

export default function StudyPlanDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/study-plans/${params.id}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error || 'فشل تحميل الخطة');
    } catch (e) {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (searchParams.get('action') === 'regenerate') setShowRegenerate(true);
  }, [searchParams]);

  const toggleItem = async (item: PlanItem) => {
    setToggling(item.id);
    try {
      await fetch(`/api/study-plans/${params.id}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !item.completed }),
      });
      await fetchPlan();
    } catch {
      // ignore
    } finally {
      setToggling(null);
    }
  };

  const handleReset = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/study-plans/${params.id}/reset`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setShowReset(false);
        setData(json.data);
      } else {
        setError(json.error || 'تعذر إعادة الضبط');
      }
    } catch {
      setError('تعذر إعادة الضبط');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/study-plans/${params.id}/regenerate`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setShowRegenerate(false);
        const newId = json.data?.plan?.id;
        router.push(newId ? `/study-plans/${newId}` : '/study-plans');
      } else {
        setError(json.error || 'تعذر إعادة الإنشاء');
        setShowRegenerate(false);
      }
    } catch {
      setError('تعذر إعادة الإنشاء');
      setShowRegenerate(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSave = async (changes: {
    endDate: string;
    dailyMinutes: number;
    selectedDays: number[];
    contentType: ContentType;
    studyIntensity: StudyIntensity;
  }) => {
    const res = await fetch(`/api/study-plans/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
    const json = await res.json();
    if (json.success) {
      setShowEdit(false);
      setData(json.data);
      return;
    }
    throw new Error(json.error || 'تعذر الحفظ');
  };

  const isCompleted = data?.plan.status === 'completed';

  if (isLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-text-secondary mt-2">جاري تحميل خطتك...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !data) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-3" />
          <p className="text-text-secondary">{error || 'الخطة غير موجودة'}</p>
          <Link href="/study-plans">
            <Button className="mt-4">رجوع للخطط</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const { plan, stats, days } = data;

  const minutesLabel = (m: number) => {
    if (m < 60) return `${m} دقيقة`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest ? `${h} س و ${rest} د` : `${h} ساعات`;
  };

  const isBehind = stats.lag > 0 && !isCompleted;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/study-plans" className="text-sm text-text-secondary hover:text-primary transition-colors">
                خطتي الذكية
              </Link>
              <span className="text-text-muted">/</span>
              <span className="text-sm text-text-secondary">{plan.gradeLabel}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary flex items-center gap-2">
              {plan.title}
              {isCompleted && <Trophy className="w-7 h-7 text-success" />}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="h-10 px-4 rounded-xl border border-border text-text-primary font-bold text-sm hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              <Pencil className="w-4 h-4" />
              تعديل
            </button>
            <button
              onClick={() => setShowReset(true)}
              disabled={isCompleted}
              className="h-10 px-4 rounded-xl border border-border text-text-primary font-bold text-sm hover:bg-muted transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              <RefreshCcw className="w-4 h-4" />
              إعادة ضبط
            </button>
            <button
              onClick={() => setShowRegenerate(true)}
              disabled={isCompleted}
              className="h-10 px-4 rounded-xl border border-border text-text-primary font-bold text-sm hover:bg-muted transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              <Robot className="w-4 h-4" />
              إعادة إنشاء
            </button>
            <button
              onClick={() => window.print()}
              className="h-10 px-4 rounded-xl border border-border text-text-primary font-bold text-sm hover:bg-muted transition-colors flex items-center gap-1.5 no-print"
            >
              <Printer className="w-4 h-4" />
              طباعة
            </button>
            <a
              href={`/api/study-plans/${plan.id}/pdf`}
              target="_blank"
              className="h-10 px-4 rounded-xl border border-border text-text-primary font-bold text-sm hover:bg-muted transition-colors flex items-center gap-1.5 no-print"
            >
              <Download className="w-4 h-4" />
              PDF
            </a>
          </div>
        </div>

        {error && <p className="text-sm text-error bg-error/10 rounded-xl p-3">{error}</p>}

        {/* Progress hero */}
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-text-primary">تقدمك في الخطة</span>
                  <span className="text-3xl font-bold text-primary">{plan.progressPercent}%</span>
                </div>
                <ProgressBar value={plan.progressPercent} size="lg" color={isCompleted ? 'success' : 'primary'} />
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm">
                  <span className="text-text-secondary">
                    <span className="font-bold text-success">{stats.completedCount}</span> / {plan.totalVideos} فيديو مكتمل
                  </span>
                  <span className="text-text-secondary flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    شاهدت {minutesLabel(stats.watchedMinutes)} · متبقي {minutesLabel(stats.remainingMinutes)}
                  </span>
                  <span className="text-text-secondary flex items-center gap-1">
                    <CalendarRange className="w-4 h-4" />
                    {plan.startDate} ← {plan.endDate} · {plan.dailyMinutes} دقيقة/يوم
                  </span>
                </div>
              </div>
              <div className="flex gap-3 md:flex-col md:w-48 flex-shrink-0">
                <div className="bg-surface-card border border-border rounded-xl p-3 flex-1">
                  <p className="text-xs text-text-secondary">الخطة</p>
                  <p className="font-bold text-text-primary text-sm">{INTENSITY_LABELS[plan.studyIntensity as StudyIntensity] ?? plan.studyIntensity}</p>
                </div>
                <div className="bg-surface-card border border-border rounded-xl p-3 flex-1">
                  <p className="text-xs text-text-secondary">مستواك</p>
                  <p className="font-bold text-text-primary text-sm">{DIFFICULTY_LABELS[plan.difficultyLevel] ?? plan.difficultyLevel}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {plan.aiUsed && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-bold">
                  <Robot className="w-3.5 h-3.5" />
                  مرتبة بالذكاء الاصطناعي
                </span>
              )}
              {plan.resetCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-xs font-bold">
                  <RefreshCcw className="w-3.5 h-3.5" />
                  أُعيد ضبطها {plan.resetCount} مرة
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-text-secondary text-xs font-bold">
                {PRIOR_KNOWLEDGE_LABELS[plan.priorKnowledge] ?? plan.priorKnowledge}
              </span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-bold">
                  <Trophy className="w-3.5 h-3.5" />
                  مكتملة 🎉
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lag warning */}
        {isBehind && (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 bg-warning/10 text-warning rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-text-primary">أنت متأخر في خطتك!</h3>
                <p className="text-sm text-text-secondary mt-0.5">
                  المفروض تكون خلصت {stats.expectedCompleted} فيديو حتى دلوقتي، والباقي عليك {stats.lag} فيديو
                  {stats.daysBehind > 0 && <> (متأخر {stats.daysBehind} يوم)</>}.
                </p>
              </div>
              <button
                onClick={() => setShowReset(true)}
                className="h-10 px-4 rounded-xl bg-warning text-white font-bold text-sm hover:bg-warning/90 transition-colors flex items-center gap-1.5"
              >
                <RefreshCcw className="w-4 h-4" />
                أعد ضبط الخطة
              </button>
            </CardContent>
          </Card>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'شرح', value: plan.explanationVideos, cls: 'bg-blue-500/10 text-blue-500' },
            { label: 'تدريب', value: plan.practiceVideos, cls: 'bg-green-500/10 text-green-500' },
            { label: 'مراجعة', value: plan.reviewVideos, cls: 'bg-purple-500/10 text-purple-500' },
            { label: 'اختبار', value: plan.examVideos, cls: 'bg-orange-500/10 text-orange-500' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-2', s.cls)}>
                  <Play className="w-4 h-4" />
                </div>
                <p className="text-2xl font-bold text-text-primary">{s.value}</p>
                <p className="text-xs text-text-secondary">فيديو {s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Daily schedule */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-primary" />
            جدولك اليومي
          </h2>

          {days.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-text-secondary">لا توجد أيام مجدولة في هذه الخطة</CardContent>
            </Card>
          )}

          {days.map((day) => (
            <Card
              key={day.date}
              className={cn('overflow-hidden', day.isToday && 'border-primary/50 shadow-lg')}
            >
              <div
                className={cn(
                  'px-5 py-3 flex items-center justify-between border-b border-border',
                  day.isPast ? 'bg-muted/40' : 'bg-gradient-to-l from-primary/10 to-transparent'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-text-primary">{day.weekdayLabel}</span>
                  <span className="text-sm text-text-secondary" dir="ltr">
                    {day.date}
                  </span>
                  {day.isToday && (
                    <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[11px] font-bold">اليوم</span>
                  )}
                </div>
                <div className="text-sm text-text-secondary">
                  {day.completedCount}/{day.totalCount} · {day.totalMinutes} دقيقة
                </div>
              </div>
              <div className="divide-y divide-border">
                {day.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 p-3.5 px-5',
                      item.completed && 'bg-success/5',
                      !item.completed && day.isPast && 'bg-error/5'
                    )}
                  >
                    <button
                      onClick={() => toggleItem(item)}
                      disabled={toggling === item.id}
                      className={cn(
                        'w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        item.completed ? 'border-success bg-success' : 'border-border hover:border-primary'
                      )}
                      title={item.completed ? 'إلغاء الإنجاز' : 'تم الإنجاز'}
                    >
                      {toggling === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                      ) : item.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : null}
                    </button>
                    <span className="w-6 text-center text-xs text-text-secondary font-bold flex-shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0 text-right">
                      <p className={cn('font-medium text-sm truncate', item.completed && 'text-text-muted line-through')}>
                        {item.lesson.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <VideoTypeBadge type={item.videoType} />
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.durationMinutes} د
                        </span>
                        {item.completed && item.completedAt && (
                          <span className="text-xs text-success">تم ✓</span>
                        )}
                      </div>
                    </div>
                    {item.completed ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-success px-2">
                        <CheckCircle2 className="w-4 h-4" />
                        مكتمل
                      </span>
                    ) : item.lesson.accessType !== 'FREE' ? (
                      <Link href="/subscribe">
                        <button className="h-9 px-3 rounded-lg bg-warning/10 text-warning text-xs font-bold hover:bg-warning/20 transition-colors flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" />
                          اشترك
                        </button>
                      </Link>
                    ) : (
                      <Link href={`/lesson/${item.lesson.lessonId}`}>
                        <button className="h-9 px-3 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1">
                          <Play className="w-3.5 h-3.5" />
                          شاهد
                        </button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <EditPlanModal
          open={showEdit}
          current={{
            endDate: plan.endDate,
            dailyMinutes: plan.dailyMinutes,
            selectedDays: plan.selectedDays,
            contentType: plan.contentType,
            studyIntensity: plan.studyIntensity,
          }}
          onClose={() => setShowEdit(false)}
          onSave={handleEditSave}
        />

        <ConfirmDialog
          open={showReset}
          title="إعادة ضبط الخطة؟"
          message="هيتم إعادة توزيع الفيديوهات غير المكتملة على الأيام المتبقية من خطتك، وهتفضل فيديوهاتك المكتملة زي ما هي."
          confirmLabel="أعد الضبط"
          tone="primary"
          loading={actionLoading}
          onConfirm={handleReset}
          onCancel={() => setShowReset(false)}
        />

        <ConfirmDialog
          open={showRegenerate}
          title="إعادة إنشاء الخطة؟"
          message="هيتم إنشاء خطة جديدة بذات الإعدادات، مع استبعاد الدروس اللي خلصتها قبل كده. خطتك الحالية هتتحفظ في السجل."
          confirmLabel="إنشاء خطة جديدة 🤖"
          loading={actionLoading}
          onConfirm={handleRegenerate}
          onCancel={() => setShowRegenerate(false)}
        />
      </div>
    </MainLayout>
  );
}
