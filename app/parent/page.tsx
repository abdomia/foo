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
import type { StudentReport } from '@/lib/report';
import {
  Users,
  User,
  GraduationCap,
  Target,
  ClipboardList,
  Trophy,
  Clock,
  Activity,
  Crown,
  Award,
  Lock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface Child {
  id: string;
  name: string;
  grade: string | null;
  avatar: string | null;
  isSubscribed: boolean;
  subscriptionPlan: string | null;
  subscriptionExpiry: string | null;
  canEdit: boolean;
}

interface ParentReport extends StudentReport {
  canEdit: boolean;
  certificates: {
    id: string;
    certificateId: string;
    courseTitle: string;
    completionPercent: number;
    issuedAt: string;
  }[];
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatLearningTime(hours: number, minutes: number): string {
  const totalMinutes = Math.round(hours * 60) + minutes;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h >= 1) return m > 0 ? `${h} ساعة ${m} دقيقة` : `${h} ساعة`;
  return `${m} دقيقة`;
}

const PlanLabel = ({ plan }: { plan: string | null }) => {
  if (plan === 'yearly') return 'سنوي';
  if (plan === 'monthly') return 'شهري';
  if (plan === 'semester') return 'فصلي';
  return '';
};

export default function ParentPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [report, setReport] = useState<ParentReport | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [gradeInput, setGradeInput] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);
  const [gradeMessage, setGradeMessage] = useState('');

  const fetchChildren = useCallback(async () => {
    try {
      const res = await fetch('/api/parent/students');
      const json = await res.json();
      if (json.success) {
        setChildren(json.data);
        if (json.data.length > 0) {
          setSelectedId(json.data[0].id);
        }
      }
    } catch {
      // ignore network errors
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchChildren();
    else setLoadingList(false);
  }, [user, fetchChildren]);

  useEffect(() => {
    if (selectedId) {
      setLoadingReport(true);
      setReport(null);
      setGradeMessage('');
      fetch(`/api/parent/report?studentId=${encodeURIComponent(selectedId)}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setReport(json.data);
            setGradeInput(json.data.student.grade ?? '');
          }
        })
        .catch(() => {})
        .finally(() => setLoadingReport(false));
    }
  }, [selectedId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const handleSaveGrade = async () => {
    if (!selectedId || !report) return;
    setSavingGrade(true);
    setGradeMessage('');
    try {
      const res = await fetch('/api/parent/update-student', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedId, grade: gradeInput }),
      });
      const json = await res.json();
      if (json.success) {
        setGradeMessage('تم حفظ التعديل بنجاح');
        setChildren((prev) =>
          prev.map((c) => (c.id === selectedId ? { ...c, grade: gradeInput } : c))
        );
      } else {
        setGradeMessage(json.error ?? 'فشل الحفظ');
      }
    } catch {
      setGradeMessage('فشل الحفظ');
    } finally {
      setSavingGrade(false);
      setTimeout(() => setGradeMessage(''), 3000);
    }
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!user) return null;

  if (user.role !== 'parent' && !user.isAdmin) {
    return (
      <MainLayout>
        <Card>
          <CardContent className="p-10 text-center text-text-secondary">
            هذه الصفحة مخصصة لأولياء الأمور.
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">لوحة ولي الأمر</h1>
          <p className="text-text-secondary mt-1">تابع تقدم ونتائج أبنائك</p>
        </div>

        {loadingList ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : children.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Users className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="font-bold text-text-primary">لا يوجد أبناء مرتبطون بحسابك</p>
              <p className="text-sm text-text-secondary mt-2">
                تأكد من أن رقم الهاتف الذي سجلت به مطابق للرقم الذي أدخله الطالب كرقم ولي الأمر
                عند التسجيل. ستتم إضافة أي طالب يسجل بهذا الرقم لحسابك تلقائياً.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            <div className="md:col-span-1 space-y-3">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedId(child.id)}
                  className={`w-full text-right p-3 rounded-xl border transition-colors ${
                    selectedId === child.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                      {child.avatar ? (
                        <Image
                          src={child.avatar}
                          alt={child.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-text-primary truncate">{child.name}</p>
                      <p className="text-xs text-text-secondary truncate">
                        {getClassByKey(child.grade)?.name ?? 'لم يحدد الصف'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {child.isSubscribed ? (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Crown className="w-3 h-3" /> مشترك
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        غير مشترك
                      </Badge>
                    )}
                    {!child.canEdit && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Lock className="w-3 h-3" /> للعرض فقط
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="md:col-span-3">
              {loadingReport ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : report ? (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-muted flex-shrink-0">
                          {report.student.avatar ? (
                            <Image
                              src={report.student.avatar}
                              alt={report.student.name}
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10">
                              <User className="w-6 h-6 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-xl font-bold text-text-primary">
                            {report.student.name}
                          </h2>
                          <p className="text-sm text-text-secondary">
                            {getClassByKey(report.student.grade)?.name ?? 'لم يحدد الصف'} · مستوى{' '}
                            {report.level} · {report.xp} XP
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {report.student.isSubscribed ? (
                            <Badge variant="secondary" className="gap-1">
                              <Crown className="w-3 h-3 text-warning" />
                              مشترك {PlanLabel({ plan: report.student.subscriptionPlan })}
                              {report.student.subscriptionExpiry
                                ? ` حتى ${formatDate(report.student.subscriptionExpiry)}`
                                : ''}
                            </Badge>
                          ) : (
                            <Badge variant="outline">غير مشترك</Badge>
                          )}
                        </div>
                      </div>

                      {report.canEdit ? (
                        <div className="mt-4 border-t border-border pt-4">
                          <p className="text-sm font-medium text-text-primary mb-2 flex items-center gap-1">
                            <GraduationCap className="w-4 h-4 text-primary" /> تعديل بيانات الطالب
                          </p>
                          <div className="flex flex-wrap items-end gap-2">
                            <input
                              value={gradeInput}
                              onChange={(e) => setGradeInput(e.target.value)}
                              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="الصف الدراسي"
                            />
                            <button
                              onClick={handleSaveGrade}
                              disabled={savingGrade}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              {savingGrade ? 'جاري الحفظ...' : 'حفظ'}
                            </button>
                            {gradeMessage && (
                              <p className="text-sm text-text-secondary">{gradeMessage}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-4 border-t border-border pt-4 text-xs text-text-muted flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" />
                          لا تملك صلاحية تعديل البيانات التعليمية — للعرض فقط.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      {
                        label: 'نسبة الإنجاز',
                        value: `${report.completionPercent}%`,
                        sub: `${report.lessonsCompleted}/${report.totalLessons} درس`,
                        icon: Target,
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
                        sub: `الأفضل ${report.bestQuizScore}%`,
                        icon: Trophy,
                      },
                      {
                        label: 'وقت التعلم',
                        value: formatLearningTime(report.totalHours, report.learningMinutes),
                        sub: 'إجمالي',
                        icon: Clock,
                      },
                      {
                        label: 'أيام متتالية',
                        value: String(report.streak),
                        sub: 'streak',
                        icon: Activity,
                      },
                      {
                        label: 'آخر نشاط',
                        value: formatDate(report.lastActivityAt),
                        sub: report.lastActivityLabel ?? '—',
                        icon: Activity,
                      },
                    ].map((s) => {
                      const Icon = s.icon;
                      return (
                        <Card key={s.label}>
                          <CardContent className="p-4">
                            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-2">
                              <Icon className="w-4 h-4" />
                            </div>
                            <p className="text-sm font-bold text-text-primary leading-tight">
                              {s.value}
                            </p>
                            <p className="text-xs text-text-secondary mt-0.5 truncate">{s.sub}</p>
                            <p className="text-[10px] text-text-muted mt-0.5">{s.label}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-success" />
                          <p className="font-bold text-text-primary text-sm">أفضل مادة</p>
                        </div>
                        {report.bestTopic ? (
                          <p className="text-sm text-text-secondary">
                            {report.bestTopic.title} — {report.bestTopic.measure}% ·{' '}
                            {report.bestTopic.label}
                          </p>
                        ) : (
                          <p className="text-sm text-text-secondary">لا توجد بيانات بعد</p>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="w-4 h-4 text-error" />
                          <p className="font-bold text-text-primary text-sm">يحتاج تحسين</p>
                        </div>
                        {report.weakestTopic ? (
                          <p className="text-sm text-text-secondary">
                            {report.weakestTopic.title} — {report.weakestTopic.measure}% ·{' '}
                            {report.weakestTopic.label}
                          </p>
                        ) : (
                          <p className="text-sm text-text-secondary">لا توجد بيانات بعد</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardContent className="p-5">
                      <h3 className="font-bold text-text-primary mb-3">تحليل المواضيع</h3>
                      {report.topics.length === 0 ? (
                        <p className="text-sm text-text-secondary">لا توجد مواضيع</p>
                      ) : (
                        <div className="space-y-3">
                          {report.topics.map((t) => (
                            <div key={t.id} className="border border-border rounded-xl p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="font-bold text-text-primary text-sm">{t.title}</p>
                                <span className="text-xs text-text-secondary">
                                  {t.lessonsCompleted}/{t.totalLessons} درس · {t.quizzesTaken}{' '}
                                  اختبار
                                </span>
                              </div>
                              <ProgressBar value={t.lessonPercent} size="sm" />
                              {t.quizzesTaken > 0 && (
                                <p className="text-xs text-text-secondary mt-1.5">
                                  متوسط الاختبارات: {t.averageScore}% · الأفضل: {t.bestScore}%
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-5">
                      <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary" /> الشهادات
                      </h3>
                      {report.certificates.length === 0 ? (
                        <p className="text-sm text-text-secondary">لا توجد شهادات بعد</p>
                      ) : (
                        <ul className="space-y-2">
                          {report.certificates.map((c) => (
                            <li
                              key={c.id}
                              className="border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"
                            >
                              <div>
                                <p className="font-bold text-text-primary text-sm">
                                  {c.courseTitle}
                                </p>
                                <p className="text-xs text-text-secondary mt-0.5">
                                  صدرت في {formatDate(c.issuedAt)}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                إنجاز {c.completionPercent}%
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-10 text-center text-text-secondary">
                    اختر طالباً لعرض تقريره
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
