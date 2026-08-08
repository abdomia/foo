'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/components/AuthProvider';
import { getClassByKey } from '@/lib/classes';
import { userProgress } from '@/lib/data';
import Image from 'next/image';
import {
  TrendingUp,
  Clock,
  Trophy,
  Play,
  BookOpen,
  Target,
  BarChart3,
  Crown,
  Sparkles,
  Flame,
  MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Lesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  completed: boolean;
  topicId: string;
  type?: 'explanation' | 'practice';
}

interface Topic {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  lessons: Lesson[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  TrendingUp,
  Trophy,
  Sparkles,
  Crown,
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
  const [stats, setStats] = useState({
    lessonsCompleted: 0,
    exercisesCompleted: 0,
    totalHours: 0,
    quizzesPassed: 0,
    streak: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const activeClassKey = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('class')
    : null;

  const activeClass = getClassByKey(activeClassKey);

  const isSubscribed = user?.isSubscribed;

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
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
  };

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
                      : 'سجل حسابك واشترك للحصول على وصول كامل لجميع الدروس والتمارين'
                    }
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

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-primary to-primary/80 text-white border-0 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 -translate-x-1/2" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/70 text-sm mb-1">الدروس المكتملة</p>
                    <motion.p
                      className="text-4xl font-bold"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {isLoadingStats ? (
                        <span className="animate-pulse bg-white/20 h-10 w-16 inline-block rounded" />
                      ) : (
                        stats.lessonsCompleted
                      )}
                    </motion.p>
                  </div>
                  <motion.div
                    className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <BookOpen className="w-6 h-6" />
                  </motion.div>
                </div>
                <motion.div
                  className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  <motion.div
                    className="h-full bg-white rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((stats.lessonsCompleted / 10) * 100, 100)}%` }}
                    transition={{ delay: 0.3, duration: 1 }}
                  />
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-primary/90 to-primary/60 text-white border-0 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/70 text-sm mb-1">التمارين المنجزة</p>
                    <motion.p
                      className="text-4xl font-bold"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      {isLoadingStats ? (
                        <span className="animate-pulse bg-white/20 h-10 w-16 inline-block rounded" />
                      ) : (
                        stats.exercisesCompleted
                      )}
                    </motion.p>
                  </div>
                  <motion.div
                    className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Target className="w-6 h-6" />
                  </motion.div>
                </div>
                <motion.div
                  className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                >
                  <motion.div
                    className="h-full bg-white rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((stats.exercisesCompleted / 20) * 100, 100)}%` }}
                    transition={{ delay: 0.4, duration: 1 }}
                  />
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-accent to-accent/80 text-white border-0 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 -translate-x-1/2" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/70 text-sm mb-1">ساعات التعلم</p>
                    <motion.p
                      className="text-4xl font-bold"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {isLoadingStats ? (
                        <span className="animate-pulse bg-white/20 h-10 w-16 inline-block rounded" />
                      ) : (
                        stats.totalHours
                      )}
                    </motion.p>
                  </div>
                  <motion.div
                    className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Clock className="w-6 h-6" />
                  </motion.div>
                </div>
                {stats.streak > 0 && (
                  <motion.div
                    className="flex items-center gap-1 mt-3 text-white/80 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Flame className="w-4 h-4" />
                    <span>{stats.streak} أيام متتالية</span>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* <motion.div */}
        {/*   initial={{ opacity: 0, y: 20 }} */}
        {/*   animate={{ opacity: 1, y: 0 }} */}
        {/*   transition={{ delay: 0.4 }} */}
        {/* > */}
        {/* </motion.div> */}


<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-text-primary mb-4">الإنجازات</h3>
              <div className="grid grid-cols-2 gap-3">
                {userProgress.badges.map((badge) => {
                  const IconComponent = iconMap[badge.icon] || Trophy;
                  return (
                    <div
                      key={badge.id}
                      className={`p-4 rounded-xl text-center ${
                        badge.earned
                          ? 'bg-muted'
                          : 'bg-muted/50'
                      }`}
                    >
                      <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
                        badge.earned ? 'bg-primary/20 text-primary' : 'bg-muted text-text-secondary'
                      }`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <p className="font-medium text-sm text-text-primary">{badge.name}</p>
                    </div>
                  );
                })}
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
                  // Replace with your phone number when ready
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
