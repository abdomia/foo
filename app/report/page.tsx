'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useAuth } from '@/components/AuthProvider';
import { getClassByKey } from '@/lib/classes';
import {
  Download,
  TrendingUp,
  TrendingDown,
  BookOpen,
  ClipboardList,
  Target,
  Trophy,
  Clock,
  Activity,
  History,
  User,
} from 'lucide-react';

interface TopicReport {
  id: string;
  title: string;
  grade: string | null;
  lessonsCompleted: number;
  totalLessons: number;
  lessonPercent: number;
  quizzesTaken: number;
  averageScore: number;
  bestScore: number;
}

interface ReportActivity {
  id: string;
  type: 'lesson' | 'quiz';
  title: string;
  date: string;
  score?: number;
}

interface StudentReport {
  student: {
    id: string;
    name: string;
    grade: string | null;
    avatar: string | null;
    createdAt: string;
    isSubscribed: boolean;
    subscriptionPlan: string | null;
    subscriptionExpiry: string | null;
  };
  completionPercent: number;
  lessonsCompleted: number;
  totalLessons: number;
  quizzesTaken: number;
  quizzesPassed: number;
  averageQuizScore: number;
  bestQuizScore: number;
  learningMinutes: number;
  totalHours: number;
  streak: number;
  xp: number;
  level: number;
  lastActivityAt: string | null;
  lastActivityLabel: string | null;
  bestTopic: { title: string; measure: number; label: string } | null;
  weakestTopic: { title: string; measure: number; label: string } | null;
  topics: TopicReport[];
  recentActivity: ReportActivity[];
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

function formatLearningTime(hours: number, minutes: number): string {
  if (hours >= 1) {
    const h = Math.floor(hours);
    const m = minutes - h * 60;
    return m > 0 ? `${h} ساعة ${m} دقيقة` : `${h} ساعة`;
  }
  return `${minutes} دقيقة`;
}

export default function ReportPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [report, setReport] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch('/api/user/report');
      const json = await res.json();
      if (json.success) setReport(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchReport();
    else setLoading(false);
  }, [user, fetchReport]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || (loading && !report)) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!user) return null;
  if (!report) {
    return (
      <MainLayout>
        <Card>
          <CardContent className="p-10 text-center text-text-secondary">
            تعذر تحميل التقرير
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  const classLabel = getClassByKey(report.student.grade)?.name ?? 'لم يحدد الصف';

  const primaryStats: { label: string; value: string; sub: string; icon: typeof Target }[] = [
    {
      label: 'نسبة الإنجاز',
      value: `${report.completionPercent}%`,
      sub: `${report.lessonsCompleted} من ${report.totalLessons} درس`,
      icon: Target,
    },
    {
      label: 'الدروس المكتملة',
      value: String(report.lessonsCompleted),
      sub: `من أصل ${report.totalLessons} درس`,
      icon: BookOpen,
    },
    {
      label: 'الاختبارات',
      value: String(report.quizzesTaken),
      sub: `${report.quizzesPassed} ناجح`,
      icon: ClipboardList,
    },
    {
      label: 'متوسط الدرجات',
      value: `${report.averageQuizScore}%`,
      sub: `أفضل نتيجة ${report.bestQuizScore}%`,
      icon: Trophy,
    },
    {
      label: 'وقت التعلم',
      value: formatLearningTime(report.totalHours, report.learningMinutes),
      sub: 'إجمالي وقت التعلم',
      icon: Clock,
    },
    {
      label: 'آخر نشاط',
      value: formatDate(report.lastActivityAt),
      sub: report.lastActivityLabel ?? 'لا يوجد نشاط بعد',
      icon: Activity,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 report-print animate-fade-in">
        <div className="no-print flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">تقرير الطالب</h1>
            <p className="text-text-secondary mt-1">ملخص تفصيلي لتقدمك في المنصة</p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            تصدير التقرير PDF
          </button>
        </div>

        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-l from-primary to-accent" />
          <CardContent className="p-6 -mt-10">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-surface-card bg-surface-card flex-shrink-0">
                {report.student.avatar ? (
                  <Image src={report.student.avatar} alt={report.student.name} width={80} height={80} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-text-primary">{report.student.name}</h2>
                  {report.student.isSubscribed && (
                    <Badge variant="secondary" className="text-xs">
                      مشترك
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">المستوى {report.level}</Badge>
                </div>
                <p className="text-text-secondary mt-1">
                  {classLabel} · عضو منذ {formatDate(report.student.createdAt)} · {report.xp} XP · {report.streak} أيام متتالية
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
              {primaryStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="p-3 bg-muted rounded-xl">
                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-2">
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-bold text-text-primary leading-tight">{stat.value}</p>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{stat.sub}</p>
                    <p className="text-[10px] text-text-muted mt-1">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className={report.bestTopic ? 'border-success/30' : ''}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-success/10 rounded-lg flex items-center justify-center text-success">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-text-primary">أفضل Topic</h3>
              </div>
              {report.bestTopic ? (
                <>
                  <p className="font-bold text-text-primary">{report.bestTopic.title}</p>
                  <p className="text-sm text-text-secondary mt-1">
                    {report.bestTopic.measure}% · {report.bestTopic.label}
                  </p>
                </>
              ) : (
                <p className="text-sm text-text-secondary">ابدأ التعلم لتحديد أفضل المواد لديك</p>
              )}
            </CardContent>
          </Card>

          <Card className={report.weakestTopic ? 'border-error/30' : ''}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-error/10 rounded-lg flex items-center justify-center text-error">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-text-primary">يحتاج إلى تحسين</h3>
              </div>
              {report.weakestTopic ? (
                <>
                  <p className="font-bold text-text-primary">{report.weakestTopic.title}</p>
                  <p className="text-sm text-text-secondary mt-1">
                    {report.weakestTopic.measure}% · {report.weakestTopic.label}
                  </p>
                </>
              ) : (
                <p className="text-sm text-text-secondary">أكمل أكثر من مادة واحدة لتظهر النتيجة</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-text-primary">تحليل المواضيع</h3>
              <Badge variant="secondary">{report.topics.length} مواضيع</Badge>
            </div>
            {report.topics.length === 0 ? (
              <p className="text-center text-text-secondary py-6">لا توجد مواضيع</p>
            ) : (
              <div className="space-y-4">
                {report.topics.map((topic) => (
                  <div key={topic.id} className="border border-border rounded-xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-text-primary">{topic.title}</p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {topic.lessonsCompleted} / {topic.totalLessons} درس · {topic.quizzesTaken} اختبار
                        </p>
                      </div>
                      <Badge variant={topic.lessonPercent === 100 ? 'secondary' : 'outline'} className="text-xs">
                        إنجاز {topic.lessonPercent}%
                      </Badge>
                    </div>
                    <ProgressBar
                      value={topic.lessonPercent}
                      size="sm"
                      color={topic.lessonPercent === 100 ? 'success' : 'primary'}
                    />
                    {topic.quizzesTaken > 0 && (
                      <p className="text-xs text-text-secondary mt-2">
                        متوسط درجات الاختبارات: <span className="font-bold text-text-primary">{topic.averageScore}%</span> · أفضل نتيجة: {topic.bestScore}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg text-text-primary">آخر الأنشطة</h3>
            </div>
            {report.recentActivity.length === 0 ? (
              <p className="text-center text-text-secondary py-6">لا يوجد نشاط بعد</p>
            ) : (
              <ul className="space-y-3">
                {report.recentActivity.map((act) => (
                  <li key={act.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${act.type === 'lesson' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                      {act.type === 'lesson' ? <BookOpen className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{act.title}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{formatDateShort(act.date)}</p>
                    </div>
                    {typeof act.score === 'number' && (
                      <Badge variant={act.score >= 70 ? 'secondary' : 'outline'} className="text-xs">
                        {act.score}%
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="no-print flex justify-end">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-text-primary hover:bg-muted transition-colors"
          >
            <Download className="w-4 h-4" />
            طباعة التقرير
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
