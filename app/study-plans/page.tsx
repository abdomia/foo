'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useAuth } from '@/components/AuthProvider';
import { LearningPathSection } from '@/components/study-plans/LearningPathSection';
import { Bot, Sparkles, Clock, CalendarRange, Trophy, History, Plus, ArrowLeft, RefreshCcw, CheckCircle2, Crown } from 'lucide-react';

interface PlanSummary {
  id: string;
  title: string;
  grade: string;
  gradeLabel: string;
  status: string;
  startDate: string;
  endDate: string;
  dailyMinutes: number;
  progressPercent: number;
  completedCount: number;
  totalVideos: number;
  totalContentMinutes: number;
  aiUsed: boolean;
  resetCount: number;
  createdAt: string;
  completedAt: string | null;
}

export default function StudyPlansPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/study-plans', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setPlans(json.data);
    } catch (e) {
      console.error('Failed to load plans:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchPlans();
  }, [user, fetchPlans]);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const active = plans.find((p) => p.status === 'active');
  const history = plans.filter((p) => p.status !== 'active');

  const statusMeta = (status: string) =>
    status === 'completed'
      ? { label: 'مكتملة', color: 'bg-success/10 text-success', icon: CheckCircle2 }
      : status === 'archived'
        ? { label: 'سابقة', color: 'bg-muted text-text-secondary', icon: History }
        : { label: 'نشطة', color: 'bg-primary/10 text-primary', icon: Crown };

  const minutesLabel = (m: number) => {
    if (m < 60) return `${m} دقيقة`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest ? `${h} س و ${rest} د` : `${h} ساعات`;
  };

  if (isLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
              <Bot className="w-8 h-8 text-primary" />
              خطتي الذكية
            </h1>
            <p className="text-text-secondary mt-1">خطة مذاكرة مخصصة تحسب لك ما تذاكره كل يوم بناءً على مناهجك</p>
          </div>
          <Link href="/study-plans/new">
            <button className="h-11 px-5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors flex items-center gap-2">
              <Plus className="w-5 h-5" />
              إنشاء خطة جديدة
            </button>
          </Link>
        </div>

        {!active && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-1">مش عارف تبدأ منين؟</h3>
              <p className="text-text-secondary mb-6 max-w-md mx-auto">
                اختار صفك وأيام مذاكرتك، وهنظبط لك الخطة يوم بيوم — حتى الفيديوهات هتترتب بالترتيب الصح 🤖
              </p>
              <Link href="/study-plans/new">
                <button className="h-12 px-8 rounded-xl bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto">
                  <Sparkles className="w-5 h-5" />
                  أنشئ خطتك الأولى مجاناً
                </button>
              </Link>
            </CardContent>
          </Card>
        )}

        {active && (
          <Card className="overflow-hidden bg-gradient-to-br from-primary/10 via-surface-card to-accent/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold">
                  <Crown className="w-4 h-4" />
                  خطتك النشطة
                </div>
                {active.aiUsed && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-bold">
                    <Bot className="w-4 h-4" />
                    مرتبة بالذكاء الاصطناعي
                  </div>
                )}
                {active.resetCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-sm font-bold">
                    <RefreshCcw className="w-4 h-4" />
                    أُعيد ضبطها {active.resetCount} مرة
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-text-primary mb-1">{active.title}</h2>
                  <p className="text-sm text-text-secondary mb-3">{active.gradeLabel}</p>
                  <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
                    <CalendarRange className="w-4 h-4" />
                    {active.startDate} ← {active.endDate}
                    <span className="mx-1">·</span>
                    <Clock className="w-4 h-4" />
                    {active.dailyMinutes} دقيقة/يوم
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-text-primary">
                      {active.completedCount} / {active.totalVideos} فيديو
                    </span>
                    <span className="text-2xl font-bold text-primary">{active.progressPercent}%</span>
                  </div>
                  <ProgressBar value={active.progressPercent} size="lg" />
                  <p className="text-xs text-text-secondary mt-2">إجمالي {minutesLabel(active.totalContentMinutes)} محتوى</p>
                </div>
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 md:w-44">
                  <Link href={`/study-plans/${active.id}`}>
                    <button className="w-full h-11 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors">
                      عرض الخطة
                    </button>
                  </Link>
                  <Link href={`/study-plans/${active.id}/?action=regenerate`}>
                    <button className="w-full h-11 rounded-xl border border-border text-text-primary font-bold hover:bg-muted transition-colors">
                      إعادة إنشاء 🤖
                    </button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {history.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
              <History className="w-5 h-5 text-text-secondary" />
              سجل خططك السابقة
            </h2>
            <div className="space-y-3">
              {history.map((p) => {
                const meta = statusMeta(p.status);
                return (
                  <Card key={p.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                        <meta.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-text-primary truncate">{p.title}</p>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${meta.color}`}>{meta.label}</span>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {p.gradeLabel} · {p.startDate} ← {p.endDate} · {p.completedCount}/{p.totalVideos}
                        </p>
                      </div>
                      <Link href={`/study-plans/${p.id}`}>
                        <button className="h-10 px-4 rounded-xl border border-border text-text-primary text-sm font-bold hover:bg-muted transition-colors flex items-center gap-1">
                          <span>عرض</span>
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-text-secondary" />
            تقدمك في المنهج
          </h2>
          <LearningPathSection />
        </div>
      </div>
    </MainLayout>
  );
}
