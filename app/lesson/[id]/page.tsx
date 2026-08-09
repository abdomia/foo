'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { useAuth } from '@/components/AuthProvider';
import FavoriteButton from '@/components/FavoriteButton';
import {
  ArrowRight,
  ArrowLeft,
  Play,
  Clock,
  Crown,
  Lock,
  FileText,
  Download,
  ListChecks,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Home,
} from 'lucide-react';

interface LessonData {
  lesson: {
    id: string;
    title: string;
    description: string;
    videoUrl: string | null;
    duration: string;
    type: string;
    accessType: string;
    locked: boolean;
    summary: string | null;
    keyPoints: string[];
    files: { title: string; url: string; type?: string }[];
  };
  topic: { id: string; title: string; icon: string };
  prevLesson: { id: string; title: string } | null;
  nextLesson: { id: string; title: string } | null;
  pdfs: { id: string; title: string; fileUrl: string | null; locked: boolean }[];
  quiz: {
    id: string;
    title: string;
    description: string | null;
    locked: boolean;
    questionsCount: number;
    timeLimit: number | null;
    passingScore: number;
  } | null;
  progress: { progress: number; watchSeconds: number; completed: boolean };
}

export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [data, setData] = useState<LessonData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    params.then((p) => setLessonId(p.id));
  }, [params]);

  const fetchLesson = useCallback(async () => {
    if (!lessonId) return;
    try {
      const res = await fetch(`/api/lesson/${lessonId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setWatchSeconds(json.data.progress?.watchSeconds || 0);
        setCompleted(json.data.progress?.completed || false);
      }
    } catch (err) {
      console.error('Failed to fetch lesson:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || (isLoadingData && lessonId)) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-text-secondary mt-2">جاري تحميل الدرس...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-fade-in">
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-text-secondary mb-4" />
              <p className="text-text-secondary mb-4">الدرس غير موجود</p>
              <Link href="/lessons">
                <Button className="gap-2">
                  <ArrowRight className="w-4 h-4" />
                  الرجوع للدروس
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const { lesson, topic, prevLesson, nextLesson, pdfs, quiz, progress } = data;

  if (lesson.locked) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto animate-fade-in">
          <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent/20">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">هذا الدرس للمشتركين فقط</h2>
              <p className="text-text-secondary mb-6">
                اشترك الآن للوصول إلى جميع الدروس والفيديوهات التعليمية
              </p>
              <div className="space-y-3">
                <Link href="/subscribe" className="block">
                  <Button className="w-full gap-2">
                    <Crown className="w-4 h-4" />
                    اشترك الآن
                  </Button>
                </Link>
                <Link href="/lessons" className="block">
                  <Button variant="outline" className="w-full gap-2">
                    <ArrowRight className="w-4 h-4" />
                    الرجوع للدروس
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-2 text-sm text-text-secondary flex-wrap">
          <Link href="/" className="hover:text-text-primary flex items-center gap-1">
            <Home className="w-4 h-4" />
            الرئيسية
          </Link>
          <span>/</span>
          <Link href="/lessons" className="hover:text-text-primary">
            الدروس
          </Link>
          <span>/</span>
          <span className="text-text-primary">{lesson.title}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Play className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">{lesson.title}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className="gap-1">
                  <BookOpen className="w-3 h-3" />
                  {topic.title}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {lesson.duration}
                </Badge>
                {completed && (
                  <Badge variant="secondary" className="gap-1 bg-success/10 text-success">
                    <CheckCircle2 className="w-3 h-3" />
                    مكتمل
                  </Badge>
                )}
              </div>
            </div>
            <FavoriteButton
              itemType="lesson"
              itemId={lesson.id}
              title={lesson.title}
              context={topic.title}
              showLabel
              className="px-3 py-2 bg-muted hover:bg-yellow-500/10"
            />
          </div>
          <Link href="/lessons">
            <Button variant="outline" className="gap-2">
              <ArrowRight className="w-4 h-4" />
              كل الدروس
            </Button>
          </Link>
        </div>

        {progress.progress > 0 && !completed && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="font-medium text-text-primary">تقدمك في هذا الدرس</span>
                <span className="text-text-secondary">{progress.progress}%</span>
              </div>
              <ProgressBar value={progress.progress} size="sm" />
            </CardContent>
          </Card>
        )}

        {lesson.videoUrl && (
          <VideoPlayer
            videoUrl={lesson.videoUrl}
            lessonId={lesson.id}
            title={lesson.title}
            startSeconds={watchSeconds}
            completed={completed}
            onComplete={() => {
              setCompleted(true);
              fetchLesson();
            }}
            onPositionSaved={(sec) => {
              setWatchSeconds(sec);
              if (progress.progress === 0 && sec > 0) {
                setData((d) =>
                  d ? { ...d, progress: { ...d.progress, progress: Math.max(5, Math.min(90, Math.round((sec / 1200) * 100))) } } : d
                );
              }
            }}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {lesson.summary && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-text-primary">ملخص الدرس</h2>
                </div>
                <p className="text-text-secondary leading-relaxed whitespace-pre-line">{lesson.summary}</p>
              </CardContent>
            </Card>
          )}

          {lesson.keyPoints.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center text-warning">
                    <ListChecks className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-text-primary">نقاط مهمة</h2>
                </div>
                <ul className="space-y-3">
                  {lesson.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-warning/10 text-warning rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-text-secondary">{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {(lesson.files.length > 0 || pdfs.length > 0) && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center text-success">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-text-primary">ملفات الدرس والمرفقات</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lesson.files.map((file, i) => (
                  <a
                    key={i}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary transition-colors group"
                  >
                    <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center text-success">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">{file.title}</p>
                      <p className="text-xs text-text-secondary">{file.type || 'ملف'}</p>
                    </div>
                    <Download className="w-5 h-5 text-text-secondary group-hover:text-primary" />
                  </a>
                ))}
                {pdfs.map((pdf) =>
                  pdf.locked ? (
                    <div
                      key={pdf.id}
                      className="flex items-center gap-3 p-4 rounded-xl border border-border opacity-60"
                    >
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-text-secondary">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">{pdf.title}</p>
                        <p className="text-xs text-text-secondary">للمشتركين فقط</p>
                      </div>
                    </div>
                  ) : (
                    <a
                      key={pdf.id}
                      href={pdf.fileUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary transition-colors group"
                    >
                      <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center text-success">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">{pdf.title}</p>
                        <p className="text-xs text-text-secondary">PDF</p>
                      </div>
                      <Download className="w-5 h-5 text-text-secondary group-hover:text-primary" />
                    </a>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {quiz && (
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary flex-shrink-0">
                  <ListChecks className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-text-primary">{quiz.title}</h2>
                  <p className="text-sm text-text-secondary">
                    {quiz.questionsCount} سؤال
                    {quiz.timeLimit ? ` • ${quiz.timeLimit} دقيقة` : ''} • درجة النجاح {quiz.passingScore}%
                  </p>
                </div>
                {quiz.locked ? (
                  <Link href="/subscribe">
                    <Button className="gap-2">
                      <Crown className="w-4 h-4" />
                      اشترك لفتح الاختبار
                    </Button>
                  </Link>
                ) : (
                  <Link href="/quizzes">
                    <Button className="gap-2">
                      <ListChecks className="w-4 h-4" />
                      ابدأ اختبار الدرس
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          {prevLesson ? (
            <Link href={`/lesson/${prevLesson.id}`} className="flex-1">
              <Card className="hover:shadow-lg transition-all">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-text-secondary">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary mb-1">الدرس السابق</p>
                    <p className="font-medium text-text-primary truncate">{prevLesson.title}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <div className="flex-1" />
          )}

          {nextLesson ? (
            <Link href={`/lesson/${nextLesson.id}`} className="flex-1">
              <Card className="hover:shadow-lg transition-all">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-xs text-text-secondary mb-1">الدرس التالي</p>
                    <p className="font-medium text-text-primary truncate">{nextLesson.title}</p>
                  </div>
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <ArrowLeft className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </div>
    </MainLayout>
  );
}
