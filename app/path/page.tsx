'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useAuth } from '@/components/AuthProvider';
import {
  Map,
  CheckCircle2,
  Lock,
  Play,
  ListChecks,
  Crown,
  Trophy,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PathLesson {
  id: string;
  title: string;
  duration: string;
  type: string;
  accessType: string;
  locked: boolean;
  completed: boolean;
  progress: number;
}

interface PathQuiz {
  id: string;
  title: string;
  locked: boolean;
  passed: boolean;
  score: number;
}

interface PathUnit {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  totalLessons: number;
  completedLessons: number;
  progress: number;
  lessons: PathLesson[];
  quizzes: PathQuiz[];
  nextLessonId: string | null;
}

interface LearningPath {
  units: PathUnit[];
  coursePercent: number;
  totalLessons: number;
  completedLessons: number;
  lastLesson: { lessonId: string; title: string; topicId: string } | null;
  nextLesson: { lessonId: string; title: string; topicTitle: string } | null;
}

export default function LearningPathPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<LearningPath | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  const fetchPath = useCallback(async () => {
    try {
      const res = await fetch('/api/user/learning-path');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        if (json.data.units?.length > 0) {
          setExpandedUnit((prev) => prev ?? json.data.units[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch learning path:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchPath();
  }, [fetchPath]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || isLoadingData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-text-secondary mt-2">جاري تحميل خطتك التعليمية...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">خطتي التعليمية</h1>
          <p className="text-text-secondary mt-1">تتبّع تقدمك في المنهج واعرف خطوتك التالية</p>
        </div>

        {data && (
          <>
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Map className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-text-primary">
                        تقدمك في المنهج
                      </h3>
                      <span className="font-bold text-primary text-2xl">{data.coursePercent}%</span>
                    </div>
                    <ProgressBar value={data.coursePercent} size="lg" />
                    <p className="text-sm text-text-secondary mt-2">
                      أكملت {data.completedLessons} من {data.totalLessons} درساً
                    </p>
                  </div>
                  {data.nextLesson && (
                    <Link href={`/lesson/${data.nextLesson.lessonId}`}>
                      <Button className="gap-2 px-6 py-6 text-lg">
                        <Play className="w-5 h-5" />
                        الخطوة التالية
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>

            {data.nextLesson && (
              <Card>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center text-warning flex-shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary mb-1">المقترح التالي</p>
                    <p className="font-bold text-text-primary truncate">{data.nextLesson.title}</p>
                    <p className="text-xs text-text-secondary">{data.nextLesson.topicTitle}</p>
                  </div>
                  <Link href={`/lesson/${data.nextLesson.lessonId}`}>
                    <Button variant="outline" size="sm" className="gap-1">
                      ابدأ
                      <Play className="w-3 h-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {data.units.map((unit) => {
                const isExpanded = expandedUnit === unit.id;
                return (
                  <Card key={unit.id} className="overflow-hidden">
                    <button
                      className="w-full p-5 flex items-center gap-4 hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedUnit(isExpanded ? null : unit.id)}
                    >
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary flex-shrink-0">
                        {unit.progress === 100 ? (
                          <Trophy className="w-6 h-6 text-success" />
                        ) : (
                          <span className="text-lg font-bold">{unit.order + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <h3 className="font-bold text-text-primary">{unit.title}</h3>
                        <p className="text-sm text-text-secondary mb-2 truncate">{unit.description}</p>
                        <div className="flex items-center gap-3">
                          <ProgressBar value={unit.progress} size="sm" className="max-w-xs" />
                          <span className="text-xs text-text-secondary whitespace-nowrap">
                            {unit.progress}% ({unit.completedLessons}/{unit.totalLessons})
                          </span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-text-secondary" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-text-secondary" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border"
                        >
                          <div className="p-5 space-y-2">
                            {unit.lessons.map((lesson) => {
                              const isCurrent = data.nextLesson?.lessonId === lesson.id;
                              return (
                                <div key={lesson.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    lesson.completed
                                      ? 'bg-success/10 text-success'
                                      : lesson.locked
                                        ? 'bg-muted text-text-secondary'
                                        : isCurrent
                                          ? 'bg-warning/10 text-warning'
                                          : 'bg-primary/10 text-primary'
                                  }`}>
                                    {lesson.completed ? (
                                      <CheckCircle2 className="w-5 h-5" />
                                    ) : lesson.locked ? (
                                      <Lock className="w-5 h-5" />
                                    ) : isCurrent ? (
                                      <Play className="w-5 h-5" />
                                    ) : (
                                      <Play className="w-5 h-5" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 text-right">
                                    <p className="font-medium text-sm text-text-primary truncate">{lesson.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {lesson.locked && (
                                        <Badge variant="secondary" className="gap-1 text-xs">
                                          <Crown className="w-3 h-3" />
                                          {lesson.accessType === 'PREMIUM' ? 'مميز' : 'مشترك'}
                                        </Badge>
                                      )}
                                      {isCurrent && !lesson.locked && (
                                        <Badge variant="secondary" className="gap-1 text-xs bg-warning/10 text-warning">
                                          التالي لك
                                        </Badge>
                                      )}
                                      {lesson.completed && (
                                        <Badge variant="secondary" className="gap-1 text-xs bg-success/10 text-success">
                                          مكتمل
                                        </Badge>
                                      )}
                                      <span className="text-xs text-text-secondary flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {lesson.duration}
                                      </span>
                                    </div>
                                  </div>
                                  {!lesson.locked && (
                                    <Link href={`/lesson/${lesson.id}`}>
                                      <Button variant="ghost" size="sm">
                                        <Play className="w-4 h-4" />
                                      </Button>
                                    </Link>
                                  )}
                                </div>
                              );
                            })}

                            {unit.quizzes.length > 0 && (
                              <div className="pt-2 mt-2 border-t border-border">
                                <p className="text-xs font-bold text-text-secondary mb-2 flex items-center gap-1">
                                  <ListChecks className="w-4 h-4" />
                                  اختبارات الوحدة
                                </p>
                                <div className="space-y-2">
                                  {unit.quizzes.map((quiz) => (
                                    <div key={quiz.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        quiz.passed
                                          ? 'bg-success/10 text-success'
                                          : quiz.locked
                                            ? 'bg-muted text-text-secondary'
                                            : 'bg-secondary/10 text-secondary'
                                      }`}>
                                        {quiz.passed ? (
                                          <CheckCircle2 className="w-5 h-5" />
                                        ) : quiz.locked ? (
                                          <Lock className="w-5 h-5" />
                                        ) : (
                                          <ListChecks className="w-5 h-5" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0 text-right">
                                        <p className="font-medium text-sm text-text-primary truncate">{quiz.title}</p>
                                        {quiz.passed && (
                                          <p className="text-xs text-success">أفضل نتيجة: {quiz.score}%</p>
                                        )}
                                      </div>
                                      {quiz.locked ? (
                                        <Link href="/subscribe">
                                          <Button variant="ghost" size="sm">
                                            <Crown className="w-4 h-4 text-warning" />
                                          </Button>
                                        </Link>
                                      ) : (
                                        <Link href="/quizzes">
                                          <Button variant="ghost" size="sm">
                                            <ListChecks className="w-4 h-4" />
                                          </Button>
                                        </Link>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
