'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useAuth } from '@/components/AuthProvider';
import { getClassByKey } from '@/lib/classes';
import { formatMinutes } from '@/lib/learning';
import Image from 'next/image';
import {
  BookOpen,
  Target,
  Clock,
  Flame,
  Trophy,
  Play,
  Crown,
  Sparkles,
  MessageCircle,
  TrendingUp,
  BarChart3,
  Star,
  Award,
  CheckCircle2,
  GraduationCap,
  Zap,
  ListChecks,
  ChevronLeft,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ProgressStats {
  lessonsCompleted: number;
  totalLessons: number;
  completionPercent: number;
  exercisesCompleted: number;
  quizzesTaken: number;
  quizzesPassed: number;
  averageQuizScore: number;
  bestQuizScore: number;
  totalHours: number;
  learningMinutes: number;
  streak: number;
  xp: number;
  badges: { id: string; name: string; icon: string; earned: boolean; earnedDate?: string }[];
  lastLesson: {
    lessonId: string;
    title: string;
    progress: number;
    watchSeconds: number;
    completed: boolean;
    updatedAt: string;
  } | null;
  recentActivity: { id: string; type: 'lesson' | 'quiz'; title: string; date: string; score?: number }[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  TrendingUp,
  Trophy,
  Sparkles,
  Crown,
  Star,
  Award,
  Target,
  CheckCircle2,
  Flame,
  GraduationCap,
  Dice5: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="4" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <circle cx="16" cy="8" r="1.5" fill="currentColor" />
      <circle cx="8" cy="16" r="1.5" fill="currentColor" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  GitBranch: () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M6 21V9a9 9 0 0 0 9 9" />
    </svg>
  ),
};

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const activeClassKey = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('class')
    : null;

  const activeClass = getClassByKey(activeClassKey);
  const isSubscribed = user?.isSubscribed;

  const fetchStats = useCallback(async () => {
    if (!user) {
      setIsLoadingStats(false);
      return;
    }
    try {
      const res = await fetch('/api/user/progress');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/bar.png"
            alt="منصة الرائد"
            width={64}
            height={64}
            className="animate-pulse rounded-xl"
          />
          <p className="text-text-secondary">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            {user?.avatar ? (
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-primary/20">
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-primary/20">
                <Image
                  src="/bar.png"
                  alt="منصة الرائد"
                  width={100}
                  height={100}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-text-primary">
                {user ? `مرحباً ${user.name}!` : 'مرحباً بك!'}
              </h1>
              <p className="text-text-secondary mt-1">
                {user ? 'استمر في رحلتك لتعلم الإحصاء' : 'سجل الدخول وابدأ رحلتك في تعلم الإحصاء'}
              </p>
              {activeClass && (
                <Badge variant="secondary" className="mt-2">
                  {activeClass.name}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats && stats.xp > 0 && (
              <Badge variant="secondary" className="gap-1 px-3 py-1.5">
                <Zap className="w-4 h-4 text-warning" />
                {stats.xp} XP
              </Badge>
            )}
            {stats && stats.streak > 0 && (
              <Badge variant="secondary" className="gap-1 px-3 py-1.5">
                <Flame className="w-4 h-4 text-warning" />
                {stats.streak} يوم متتالي
              </Badge>
            )}
            {isSubscribed ? (
              <Link href="/lessons">
                <Button className="gap-2">
                  <Play className="w-4 h-4" />
                  ابدأ التعلم
                </Button>
              </Link>
            ) : (
              <Link href="/subscribe">
                <Button className="gap-2">
                  <Crown className="w-4 h-4" />
                  اشترك الآن
                </Button>
              </Link>
            )}
          </div>
        </div>

        {!isSubscribed && (
          <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Crown className="w-8 h-8 text-accent" />
                </div>
                <div className="flex-1 text-center md:text-right">
                  <h3 className="text-xl font-bold text-text-primary mb-2">
                    {user ? 'فعّل اشتراكك الآن' : 'اشترك للحصول على جميع الفيديوهات'}
                  </h3>
                  <p className="text-text-secondary mb-4">
                    {user
                      ? 'لديك حساب! اشترك الآن لمشاهدة جميع الفيديوهات التعليمية'
                      : 'سجل حسابك واشترك للحصول على وصول كامل لجميع الدروس والتمارين'}
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    {!user && (
                      <>
                        <Link href="/auth/signup">
                          <Button variant="outline" size="sm">إنشاء حساب</Button>
                        </Link>
                        <Link href="/auth/login">
                          <Button variant="ghost" size="sm">تسجيل الدخول</Button>
                        </Link>
                      </>
                    )}
                    <Link href="/subscribe">
                      <Button size="sm" className="gap-2">
                        <Crown className="w-4 h-4" />
                        اشترك الآن
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stats?.lastLesson && !stats.lastLesson.completed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-text-primary">استكمال التعلم</h3>
                      {stats.lastLesson.progress > 0 && (
                        <span className="text-xs text-text-secondary">{stats.lastLesson.progress}%</span>
                      )}
                    </div>
                    <p className="text-text-secondary mb-3">{stats.lastLesson.title}</p>
                    <ProgressBar value={stats.lastLesson.progress} size="sm" className="max-w-md" />
                  </div>
                  <Link href={`/lesson/${stats.lastLesson.lessonId}`}>
                    <Button className="gap-2 px-6 py-6 text-lg">
                      <Play className="w-5 h-5" />
                      استكمال الدرس
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-white border-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-1">الدروس المكتملة</p>
                  <p className="text-3xl font-bold">
                    {isLoadingStats ? '...' : `${stats?.lessonsCompleted ?? 0}`}
                  </p>
                  <p className="text-white/60 text-xs mt-1">من أصل {stats?.totalLessons ?? 0} درس</p>
                </div>
                <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>
              <ProgressBar value={stats?.completionPercent ?? 0} size="sm" className="mt-4" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary to-secondary/80 text-white border-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-1">نسبة الإنجاز</p>
                  <p className="text-3xl font-bold">
                    {isLoadingStats ? '...' : `${stats?.completionPercent ?? 0}%`}
                  </p>
                  <p className="text-white/60 text-xs mt-1">من المنهج</p>
                </div>
                <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6" />
                </div>
              </div>
              <ProgressBar value={stats?.completionPercent ?? 0} size="sm" className="mt-4" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent to-accent/80 text-white border-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-1">الاختبارات</p>
                  <p className="text-3xl font-bold">
                    {isLoadingStats ? '...' : `${stats?.quizzesTaken ?? 0}`}
                  </p>
                  <p className="text-white/60 text-xs mt-1">
                    متوسط الدرجات {stats?.averageQuizScore ?? 0}%
                  </p>
                </div>
                <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center">
                  <ListChecks className="w-6 h-6" />
                </div>
              </div>
              <ProgressBar
                value={stats?.averageQuizScore ?? 0}
                size="sm"
                className="mt-4"
              />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success to-success/80 text-white border-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-1">وقت التعلم</p>
                  <p className="text-3xl font-bold">
                    {isLoadingStats ? '...' : formatMinutes(stats?.learningMinutes ?? 0)}
                  </p>
                  <p className="text-white/60 text-xs mt-1">
                    {stats?.totalHours ?? 0} ساعة تقريباً
                  </p>
                </div>
                <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 text-white/80 text-sm">
                <Flame className="w-4 h-4" />
                <span>{stats?.streak ?? 0} أيام متتالية</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-text-primary">الإنجازات</h3>
                <Link href="/progress" className="text-sm text-primary hover:underline flex items-center gap-1">
                  تطويري
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(stats?.badges ?? []).map((badge) => {
                  const IconComponent = iconMap[badge.icon] || Trophy;
                  return (
                    <div
                      key={badge.id}
                      className={`p-4 rounded-xl text-center transition-all ${
                        badge.earned ? 'bg-muted' : 'bg-muted/50 opacity-60'
                      }`}
                    >
                      <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
                        badge.earned ? 'bg-primary/20 text-primary' : 'bg-muted text-text-secondary'
                      }`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <p className="font-medium text-sm text-text-primary">{badge.name}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        {badge.earned ? (badge.earnedDate ? badge.earnedDate : 'تم الحصول عليها') : 'غير محققة'}
                      </p>
                    </div>
                  );
                })}
                {(stats?.badges?.length ?? 0) === 0 && (
                  <p className="text-text-secondary col-span-full text-center py-6">
                    أكمل أول درس لتبدأ في جمع الإنجازات
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-text-primary mb-4">آخر النشاطات</h3>
              {(stats?.recentActivity?.length ?? 0) === 0 && (
                <p className="text-text-secondary text-center py-6">
                  لا يوجد نشاط بعد — ابدأ رحلتك التعليمية الآن
                </p>
              )}
              <div className="space-y-3">
                {(stats?.recentActivity ?? []).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      activity.type === 'lesson'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-secondary/10 text-secondary'
                    }`}>
                      {activity.type === 'lesson' ? (
                        <BookOpen className="w-5 h-5" />
                      ) : (
                        <ListChecks className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-text-primary truncate">{activity.title}</p>
                      <p className="text-xs text-text-secondary">
                        {activity.type === 'lesson' ? 'درس' : 'اختبار'}
                        {activity.score !== undefined ? ` • ${activity.score}%` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-text-secondary flex-shrink-0">
                      {new Date(activity.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                className="fixed bottom-6 left-6 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all z-50"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const phoneNumber = '01022916304';
                  window.open(`https://wa.me/${phoneNumber}?text=مرحباً،سؤال عن الإحصاء`, '_blank');
                }}
              >
                <MessageCircle className="w-7 h-7 text-white" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="top" className="mb-2 bg-green-600 text-white">
              <p>تواصل معنا على واتساب</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </MainLayout>
  );
}
