'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/AuthProvider';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Trophy,
  Flame,
  Star,
  Target,
  Crown,
  BookOpen,
  Award,
  Calendar,
  Zap,
  Video,
  CheckCircle,
  Brain,
  FileQuestion,
  RefreshCw,
  Sparkles
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Star,
  Trophy,
  Flame,
  Target,
  Crown,
  Zap,
  BookOpen,
  Award,
  TrendingUp,
  Clock,
  Calendar,
  Video,
  CheckCircle,
  Brain,
  FileQuestion,
  RefreshCw,
};

interface WeeklyStats {
  videosWatched: number;
  questionsSolved: number;
  exercisesCompleted: number;
}

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

interface UserStats {
  lessonsCompleted: number;
  exercisesCompleted: number;
  totalHours: number;
  quizzesPassed: number;
  streak: number;
}

interface GamificationBadge {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  awardedAt: string;
}

interface GamificationData {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpForNext: number;
  streak: number;
  streakBest: number;
  questionsAnswered: number;
  quizzesTaken: number;
  unitsCompleted: number;
  badges: GamificationBadge[];
}

const BADGE_DEFS = [
  { type: 'first_quiz', name: 'أول اختبار', icon: 'Target', description: 'أجب على أول اختبار في المنصة' },
  { type: 'streak_7', name: 'سبعة أيام متتالية', icon: 'Flame', description: 'واصل نشاطك 7 أيام متتالية' },
  { type: 'questions_100', name: '100 سؤال', icon: 'Brain', description: 'أجب على 100 سؤال حتى الآن' },
  { type: 'first_unit', name: 'أكملت أول وحدة', icon: 'Trophy', description: 'أنهِ جميع دروس أول وحدة' },
  { type: 'perfect_score', name: 'الدرجة الكاملة', icon: 'Crown', description: 'احصل على 100% في اختبار' },
];

const dayNames = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export default function ProgressPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [stats, setStats] = useState<UserStats>({
    lessonsCompleted: 0,
    exercisesCompleted: 0,
    totalHours: 0,
    quizzesPassed: 0,
    streak: 0,
  });
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ day: string; progress: number; date: string }[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<{ videosWatched: number; questionsSolved: number; exercisesCompleted: number; thisWeek: WeeklyStats }>({
    videosWatched: 0,
    questionsSolved: 0,
    exercisesCompleted: 0,
    thisWeek: { videosWatched: 0, questionsSolved: 0, exercisesCompleted: 0 }
  });
  const [activeAchievementTab, setActiveAchievementTab] = useState<'all' | 'lessons' | 'exercises' | 'quizzes'>('all');
  const [showBadgeCelebration, setShowBadgeCelebration] = useState(false);
  const [celebratingBadge, setCelebratingBadge] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.id) {
      fetchStats();
      fetchTopics();
      fetchWeeklyActivity();
      fetchWeeklyStats();
      fetchGamification();
    }
  }, [user]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id) {
        fetchStats();
        fetchTopics();
        fetchWeeklyActivity();
        fetchWeeklyStats();
        fetchGamification();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      fetchWeeklyActivity();
      fetchWeeklyStats();
      fetchStats();
      fetchGamification();
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchStats = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/user/progress`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchGamification = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/user/gamification');
      const data = await res.json();
      if (data.success) {
        setGamification(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch gamification:', error);
    }
  };

  const fetchTopics = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/admin/topics');
      const data = await res.json();
      if (data.success) {
        const topicsWithProgress = await Promise.all(data.data.map(async (topic: any) => {
          const lessonsWithProgress = await Promise.all(topic.lessons.map(async (lesson: any) => {
            try {
              const progressRes = await fetch(`/api/user/lesson-progress?lessonId=${lesson.id}`);
              const progressData = await progressRes.json();
              return { ...lesson, completed: progressData.success && progressData.data?.completed };
            } catch {
              return { ...lesson, completed: false };
            }
          }));
          const completedCount = lessonsWithProgress.filter((l: any) => l.completed).length;
          return {
            ...topic,
            progress: Math.round((completedCount / (lessonsWithProgress.length || 1)) * 100),
            lessons: lessonsWithProgress,
          };
        }));
        setTopics(topicsWithProgress);
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    } finally {
      setTopicsLoading(false);
    }
  };

  const fetchWeeklyActivity = async () => {
    if (!user?.id) return;
    try {
      const today = new Date();
      const activities: { day: string; progress: number; date: string }[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayIndex = date.getDay();
        const dateStr = date.toISOString().split('T')[0];

        const res = await fetch(`/api/user/lesson-progress?date=${dateStr}`);
        const data = await res.json();
        const count = data.success && data.data ? data.data.filter((p: any) => p.completed).length : 0;

        const isToday = i === 0;
        const isYesterday = i === 1;

        let dayLabel = dayNames[dayIndex];
        if (isToday) dayLabel = 'اليوم';
        else if (isYesterday) dayLabel = 'أمس';

        activities.push({
          day: dayLabel,
          progress: count,
          date: dateStr,
        });
      }
      setWeeklyData(activities);
    } catch (error) {
      console.error('Failed to fetch weekly activity:', error);
      const defaultData = dayNames.map(day => ({ day, progress: 0, date: '' }));
      setWeeklyData(defaultData);
    }
  };

  const fetchWeeklyStats = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/user/weekly-stats`);
      const data = await res.json();
      if (data.success) {
        setWeeklyStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch weekly stats:', error);
    }
  };

  const allLessonsCount = topics.reduce((acc, t) => acc + t.lessons.length, 0);
  const totalProgress = allLessonsCount > 0 ? Math.round((stats.lessonsCompleted / allLessonsCount) * 100) : 0;

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-text-secondary">جاري التحميل...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-text-primary">تتبع تقدمك</h1>
          <p className="text-text-secondary mt-1">راقب إنجازاتك وتقدمك في التعلم</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="bg-gradient-to-l from-primary to-primary/80 text-white border-0 overflow-hidden relative">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
              <motion.div
                className="absolute top-4 right-4 w-2 h-2 bg-white/30 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/80 text-sm mb-1">التقدم الإجمالي</p>
                    <motion.p
                      className="text-5xl font-bold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                    >
                      {totalProgress}%
                    </motion.p>
                    <p className="text-white/60 text-sm mt-1">مستمر في التحسن</p>
                  </div>
                  <motion.div
                    className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <TrendingUp className="w-7 h-7" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="bg-gradient-to-l from-secondary to-secondary/80 text-white border-0 overflow-hidden relative">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
              <motion.div
                className="absolute top-4 right-4 w-2 h-2 bg-white/30 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/80 text-sm mb-1">أيام متتالية</p>
                    <motion.p
                      className="text-5xl font-bold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.3 }}
                    >
                      {stats.streak}
                    </motion.p>
                    <p className="text-white/60 text-sm mt-1">🔥 حافظ على التسجيل</p>
                  </div>
                  <motion.div
                    className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center"
                    whileHover={{ scale: 1.1 }}
                  >
                    <Flame className="w-7 h-7" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="bg-gradient-to-l from-accent to-accent/80 text-white border-0 overflow-hidden relative">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
              <motion.div
                className="absolute top-4 right-4 w-2 h-2 bg-white/30 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/80 text-sm mb-1">إجمالي ساعات التعلم</p>
                    <motion.p
                      className="text-5xl font-bold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.4 }}
                    >
                      {stats.totalHours}
                    </motion.p>
                    <p className="text-white/60 text-sm mt-1">ساعة من الجهد</p>
                  </div>
                  <motion.div
                    className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center"
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Clock className="w-7 h-7" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {gamification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="w-16 h-16 bg-gradient-to-l from-primary to-accent rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg"
                      whileHover={{ rotate: 6, scale: 1.05 }}
                    >
                      {gamification.level}
                    </motion.div>
                    <div>
                      <p className="font-bold text-text-primary">المستوى {gamification.level}</p>
                      <p className="text-sm text-text-secondary">
                        {gamification.totalXp} XP إجمالي
                      </p>
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span className="text-text-secondary">التقدم للمستوى {gamification.level + 1}</span>
                      <span className="font-medium text-primary">
                        {gamification.xpIntoLevel} / {gamification.xpForNext} XP
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-l from-primary to-accent rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (gamification.xpIntoLevel / gamification.xpForNext) * 100)}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                    <p className="text-xs text-text-secondary mt-2">
                      {Math.max(0, gamification.xpForNext - gamification.xpIntoLevel)} XP متبقي للمستوى التالي
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-text-primary flex items-center justify-center gap-1">
                        <Flame className="w-5 h-5 text-warning" />
                        {gamification.streak}
                      </p>
                      <p className="text-xs text-text-secondary">أيام متتالية</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-text-primary">{gamification.questionsAnswered}</p>
                      <p className="text-xs text-text-secondary">سؤال</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-text-primary">{gamification.unitsCompleted}</p>
                      <p className="text-xs text-text-secondary">وحدات</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-text-primary">النشاط الأسبوعي</h2>
                <button
                  onClick={() => {
                    fetchWeeklyActivity();
                    fetchWeeklyStats();
                  }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="تحديث"
                >
                  <RefreshCw className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <motion.div
                  className="p-4 bg-primary/10 rounded-xl text-center"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Video className="w-6 h-6 text-primary" />
                  </div>
                  <motion.p
                    className="text-2xl font-bold text-text-primary"
                    key={weeklyStats.thisWeek.videosWatched}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                  >
                    {weeklyStats.thisWeek.videosWatched}
                  </motion.p>
                  <p className="text-xs text-text-secondary">مقاطع هذا الأسبوع</p>
                </motion.div>
                <motion.div
                  className="p-4 bg-secondary/10 rounded-xl text-center"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <FileQuestion className="w-6 h-6 text-secondary" />
                  </div>
                  <motion.p
                    className="text-2xl font-bold text-text-primary"
                    key={weeklyStats.thisWeek.questionsSolved}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                  >
                    {weeklyStats.thisWeek.questionsSolved}
                  </motion.p>
                  <p className="text-xs text-text-secondary">تمارين هذا الأسبوع</p>
                </motion.div>
                <motion.div
                  className="p-4 bg-accent/10 rounded-xl text-center"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-6 h-6 text-accent" />
                  </div>
                  <motion.p
                    className="text-2xl font-bold text-text-primary"
                    key={weeklyStats.thisWeek.exercisesCompleted}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                  >
                    {weeklyStats.thisWeek.exercisesCompleted}
                  </motion.p>
                  <p className="text-xs text-text-secondary">تمارين مكتملة</p>
                </motion.div>
              </div>
              {weeklyData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-text-secondary">
                  جاري التحميل...
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-text-secondary mb-2">مقاطع الفيديو المشاهدة</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="day"
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            axisLine={{ stroke: '#e2e8f0' }}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            formatter={(value) => [`${value} فيديو`, 'المقاطع']}
                          />
                          <Bar
                            dataKey="progress"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                            name="المقاطع"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-text-secondary mb-2">نشاط الموقع اليومي</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <defs>
                            <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="day"
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            axisLine={{ stroke: '#e2e8f0' }}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            formatter={(value) => [`${value} نشاط`, 'النشاط']}
                          />
                          <Area
                            type="monotone"
                            dataKey="progress"
                            stroke="#8b5cf6"
                            fillOpacity={1}
                            fill="url(#colorProgress)"
                            strokeWidth={2}
                            name="النشاط"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg text-text-primary">إحصائيات المواضيع</h2>
                  <Badge variant="secondary">{topics.length} مواضيع</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {topicsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                        <div className="h-2 bg-muted rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : topics.length === 0 ? (
                  <p className="text-text-secondary text-center py-4">لا توجد مواضيع</p>
                ) : (
                  <div className="space-y-4">
                    {topics.map((topic, idx) => {
                      const topicLessons = topic.lessons.length;
                      const completed = topic.lessons.filter(l => l.completed).length;
                      return (
                        <motion.div
                          key={topic.id}
                          className="space-y-2"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + idx * 0.1 }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-text-primary">{topic.title}</span>
                            <span className="text-sm text-text-secondary">
                              {completed} / {topicLessons}
                            </span>
                          </div>
                          <ProgressBar
                            value={(completed / topicLessons) * 100}
                            size="sm"
                            color={completed === topicLessons ? 'success' : 'primary'}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg text-text-primary">ملخص الإنجاز</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveAchievementTab('all')}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        activeAchievementTab === 'all' ? 'bg-primary text-white' : 'bg-muted text-text-secondary hover:bg-primary/20'
                      }`}
                    >
                      الكل
                    </button>
                    <button
                      onClick={() => setActiveAchievementTab('lessons')}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        activeAchievementTab === 'lessons' ? 'bg-primary text-white' : 'bg-muted text-text-secondary hover:bg-primary/20'
                      }`}
                    >
                      الدروس
                    </button>
                    <button
                      onClick={() => setActiveAchievementTab('exercises')}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        activeAchievementTab === 'exercises' ? 'bg-primary text-white' : 'bg-muted text-text-secondary hover:bg-primary/20'
                      }`}
                    >
                      التمارين
                    </button>
                    <button
                      onClick={() => setActiveAchievementTab('quizzes')}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        activeAchievementTab === 'quizzes' ? 'bg-primary text-white' : 'bg-muted text-text-secondary hover:bg-primary/20'
                      }`}
                    >
                      الاختبارات
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <motion.div
                    className={`text-center p-4 rounded-xl cursor-pointer transition-all ${
                      activeAchievementTab === 'all' || activeAchievementTab === 'lessons'
                        ? 'bg-muted hover:bg-primary/10'
                        : 'bg-muted opacity-50'
                    }`}
                    whileHover={activeAchievementTab === 'all' || activeAchievementTab === 'lessons' ? { scale: 1.05 } : {}}
                    onClick={() => setActiveAchievementTab('lessons')}
                  >
                    <motion.div
                      className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <BookOpen className="w-6 h-6 text-primary" />
                    </motion.div>
                    <motion.p
                      className="text-2xl font-bold text-text-primary"
                      key={stats.lessonsCompleted}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                    >
                      {stats.lessonsCompleted}
                    </motion.p>
                    <p className="text-xs text-text-secondary">({
                      Math.round((stats.lessonsCompleted / (allLessonsCount || 1)) * 100)
                    }% إجمالي)</p>
                  </motion.div>
                  <motion.div
                    className={`text-center p-4 rounded-xl cursor-pointer transition-all ${
                      activeAchievementTab === 'all' || activeAchievementTab === 'lessons'
                        ? 'bg-muted hover:bg-secondary/10'
                        : 'bg-muted opacity-50'
                    }`}
                    whileHover={activeAchievementTab === 'all' || activeAchievementTab === 'lessons' ? { scale: 1.05 } : {}}
                    onClick={() => setActiveAchievementTab('lessons')}
                  >
                    <motion.div
                      className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-2"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Video className="w-6 h-6 text-secondary" />
                    </motion.div>
                    <motion.p
                      className="text-2xl font-bold text-text-primary"
                      key={topics.reduce((acc, t) => acc + t.lessons.filter(l => l.type === 'explanation' && l.completed).length, 0)}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                    >
                      {topics.reduce((acc, t) => acc + t.lessons.filter(l => l.type === 'explanation' && l.completed).length, 0)}
                    </motion.p>
                    <p className="text-xs text-text-secondary">({
                      Math.round((topics.reduce((acc, t) => acc + t.lessons.filter(l => l.type === 'explanation' && l.completed).length, 0) /
                        topics.reduce((acc, t) => acc + t.lessons.filter(l => l.type === 'explanation').length, 1)) * 100)
                    }% شرح)</p>
                  </motion.div>
                  <motion.div
                    className={`text-center p-4 rounded-xl cursor-pointer transition-all ${
                      activeAchievementTab === 'all' || activeAchievementTab === 'exercises'
                        ? 'bg-muted hover:bg-accent/10'
                        : 'bg-muted opacity-50'
                    }`}
                    whileHover={activeAchievementTab === 'all' || activeAchievementTab === 'exercises' ? { scale: 1.05 } : {}}
                    onClick={() => setActiveAchievementTab('exercises')}
                  >
                    <motion.div
                      className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-2"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Target className="w-6 h-6 text-accent" />
                    </motion.div>
                    <motion.p
                      className="text-2xl font-bold text-text-primary"
                      key={topics.reduce((acc, t) => acc + t.lessons.filter(l => l.type === 'practice' && l.completed).length, 0)}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                    >
                      {topics.reduce((acc, t) => acc + t.lessons.filter(l => l.type === 'practice' && l.completed).length, 0)}
                    </motion.p>
                    <p className="text-xs text-text-secondary">({
                      Math.round((topics.reduce((acc, t) => acc + t.lessons.filter(l => l.type === 'practice' && l.completed).length, 0) /
                        topics.reduce((acc, t) => acc + t.lessons.filter(l => l.type === 'practice').length, 1)) * 100)
                    }% تدريب)</p>
                  </motion.div>
                  <motion.div
                    className={`text-center p-4 rounded-xl cursor-pointer transition-all ${
                      activeAchievementTab === 'all' || activeAchievementTab === 'quizzes'
                        ? 'bg-muted hover:bg-warning/10'
                        : 'bg-muted opacity-50'
                    }`}
                    whileHover={activeAchievementTab === 'all' || activeAchievementTab === 'quizzes' ? { scale: 1.05 } : {}}
                    onClick={() => setActiveAchievementTab('quizzes')}
                  >
                    <motion.div
                      className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-2"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Trophy className="w-6 h-6 text-warning" />
                    </motion.div>
                    <motion.p
                      className="text-2xl font-bold text-text-primary"
                      key={stats.quizzesPassed}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                    >
                      {stats.quizzesPassed}
                    </motion.p>
                    <p className="text-xs text-text-secondary">اختبارات</p>
                  </motion.div>
                </motion.div>
                <div className="mt-4 flex items-center justify-center">
                  <button
                    onClick={() => {
                      fetchStats();
                      fetchWeeklyStats();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    تحديث الإحصائيات
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

<motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-text-primary">الإنجازات والشارات</h2>
                <Badge variant="default">
                  {(gamification?.badges.length ?? 0)} / {BADGE_DEFS.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {BADGE_DEFS.map((def, idx) => {
                  const earnedBadge = gamification?.badges.find((b) => b.type === def.type);
                  const earned = !!earnedBadge;
                  const IconComponent = iconMap[def.icon] || Award;
                  const isJustEarned = celebratingBadge === def.type;

                  return (
                    <motion.div
                      key={def.type}
                      className={`p-4 rounded-xl text-center transition-all cursor-pointer relative ${
                        earned
                          ? 'bg-gradient-to-l from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border-2 border-primary/30'
                          : 'bg-muted opacity-60 hover:opacity-80'
                      }`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: earned ? 1 : 0.6,
                        scale: isJustEarned ? 1.1 : (earned ? 1 : 0.8),
                        boxShadow: isJustEarned ? '0 0 30px rgba(59, 130, 246, 0.5)' : 'none'
                      }}
                      transition={{ delay: 0.8 + idx * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => {
                        if (earned) {
                          setCelebratingBadge(def.type);
                          setShowBadgeCelebration(true);
                          setTimeout(() => {
                            setShowBadgeCelebration(false);
                            setCelebratingBadge(null);
                          }, 3000);
                        } else {
                          alert(def.description);
                        }
                      }}
                    >
                      {earned && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <motion.div
                        className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${
                          earned ? 'bg-primary/20 text-primary' : 'bg-muted text-text-secondary'
                        }`}
                        whileHover={{ rotate: earned ? 360 : 0 }}
                        transition={{ duration: 0.5 }}
                        animate={isJustEarned ? { rotate: [0, 360, 0] } : {}}
                      >
                        <IconComponent className="w-8 h-8" />
                      </motion.div>
                      <p className="font-bold text-text-primary mb-1">{def.name}</p>
                      {earned && (
                        <p className="text-xs text-green-600 font-medium">
                          ✓ تم الحصول عليها
                        </p>
                      )}
                      {!earned && (
                        <p className="text-xs text-text-secondary">
                          {def.type === 'questions_100' && `${gamification?.questionsAnswered ?? 0}/100`}
                          {def.type === 'streak_7' && `${gamification?.streak ?? 0}/7`}
                          {['first_quiz', 'first_unit', 'perfect_score'].includes(def.type) && 'قيد الإنجاز'}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  onClick={() => fetchGamification()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  تحقق من الشارات
                </button>
                <button
                  onClick={() => {
                    fetchStats();
                    fetchTopics();
                    fetchWeeklyActivity();
                    fetchWeeklyStats();
                    fetchGamification();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-lg transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  تحديث كل الإحصائيات
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>




      </div>
    </MainLayout>
  );
}
