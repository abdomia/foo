'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { Lesson, Topic } from '@/lib/data';
import { getExercisesByTopic } from '@/lib/data';
import { Play, Clock, CheckCircle2, ArrowRight, X, BarChart3, TrendingUp, Crown, Lock, BookOpen, FileText, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { VideoPlayer } from '@/components/video/VideoPlayer';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  TrendingUp,
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

export default function LessonsPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'explanations' | 'practices'>('explanations');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTopics();
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTopics();
    }
  }, [user?.id]);

  const fetchTopics = async () => {
    try {
      const gradeParam = user?.grade ? `?grade=${user.grade}` : '';
      const res = await fetch(`/api/admin/topics${gradeParam}`);
      const data = await res.json();
      if (data.success) {
        const topicsWithProgress = await Promise.all(data.data.map(async (topic: any) => {
          const lessonsWithProgress = await Promise.all(topic.lessons.map(async (lesson: any) => {
            if (!user?.id) return { ...lesson, completed: false };
            try {
              const progressRes = await fetch(`/api/user/lesson-progress?lessonId=${lesson.id}`);
              const progressData = await progressRes.json();
              return {
                ...lesson,
                completed: progressData.success && progressData.data?.completed
              };
            } catch {
              return { ...lesson, completed: false };
            }
          }));
          return { ...topic, lessons: lessonsWithProgress };
        }));
        setTopics(topicsWithProgress);
        if (data.data.length > 0) {
          setActiveTopicId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed automatic refreshUser to prevent infinite loop
  // refreshUser should be called manually when needed

  // Get current topic
  const currentTopic = activeTopicId
    ? topics.find((t: any) => t.id === activeTopicId)
    : topics[0];

  const canViewVideo = user?.isSubscribed;

  // For practices tab, show practice-specific lessons or exercises
    // For explanations tab, show only explanation lessons
    // For practices tab, show practice lessons AND exercises
    const explanationLessons = currentTopic?.lessons?.filter(
        (lesson: any) => !lesson.type || lesson.type === 'explanation'
    ) || [];

    const practiceLessons = currentTopic?.lessons?.filter(
        (lesson: any) => lesson.type === 'practice'
    ) || [];

    const practiceExercises = getExercisesByTopic(currentTopic?.id || '');

    // For practices tab, combine practice lessons and exercises
    const practiceItems = activeTab === 'practices'
        ? [...practiceLessons, ...practiceExercises]
        : explanationLessons;

    const handleLessonClick = (item: any) => {
        if (!user) {
            router.push('/auth/login');
            return;
        }

        // If it's an exercise (not a lesson with video)
        if (item.type && ['multiple-choice', 'true-false', 'numeric'].includes(item.type)) {
            // For exercises, we need to navigate to a practice page or show modal
            // For now, let's show an alert that this feature needs to be implemented
            alert('تمارين سيتم تطويرها قريبًا');
            return;
        }

if (!canViewVideo) {
            setShowSubscriptionModal(true);
            return;
          }
          let videoUrl = item.videoUrl;
          if (videoUrl && videoUrl.includes('youtube.com/watch')) {
            const videoId = new URL(videoUrl).searchParams.get('v');
            if (videoId) {
              videoUrl = `https://www.youtube.com/embed/${videoId}`;
            }
          }
          setSelectedLesson({ ...item, videoUrl });
          
          if (item.id) {
            fetch('/api/user/lesson-progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lessonId: item.id,
                progress: 50,
                completed: false,
              }),
            }).catch(err => console.error('Failed to track lesson progress:', err));
          }
        };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-text-secondary mt-2">جاري التحميل...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (topics.length === 0) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">الدروس التعليمية</h1>
            <p className="text-text-secondary mt-1">شاهد فيديوهات تعليمية لتعلم الإحصاء</p>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-text-secondary mb-4" />
              <p className="text-text-secondary">لا توجد مواضيع حالياً</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">الدروس التعليمية</h1>
            <p className="text-text-secondary mt-1">شاهد فيديوهات تعليمية لتعلم الإحصاء</p>
          </div>
          <div className="flex gap-2 bg-muted p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('explanations')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'explanations'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              الشروحات
            </button>
            <button
              onClick={() => {
                setActiveTab('practices');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'practices'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              التمارين
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-80 flex-shrink-0">
            <Card>
              <CardContent className="p-4">
                <h2 className="font-bold text-text-primary mb-4 px-2">المواضيع</h2>
                <div className="space-y-2">
                  {topics.map((topic: any) => {
                    const IconComponent = iconMap[topic.icon];
                    const isActive = currentTopic?.id === topic.id;
                    return (
                      <button
                        key={topic.id}
                        onClick={() => setActiveTopicId(topic.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-right ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted text-text-secondary'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isActive ? 'bg-primary/20' : 'bg-muted'
                        }`}>
                          {IconComponent && <IconComponent className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{topic.title}</p>
                          <p className="text-xs text-text-secondary">
                          {(() => { const c = topic.lessons?.filter((l: any) => l.completed).length || 0; const t = topic.lessons?.length || 1; return `${Math.round(c/t*100)}% (${c}/${t})`; })()}
                        </p>
                        </div>
                        {isActive && <ArrowRight className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex-1">
            {currentTopic && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                          {(() => {
                            const Icon = iconMap[currentTopic.icon];
                            return Icon ? <Icon className="w-6 h-6" /> : null;
                          })()}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-text-primary">{currentTopic.title}</h2>
                          <p className="text-text-secondary text-sm">{currentTopic.description}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{(() => {
                      const isPractice = activeTab === 'practices';
                      const items = currentTopic.lessons?.filter((l: any) => isPractice ? l.type === 'practice' : !l.type || l.type === 'explanation') || [];
                      const c = items.filter((l: any) => l.completed).length;
                      const t = items.length || 1;
                      return Math.round((c/t)*100);
                    })()}%</Badge>
                    </div>
                    <ProgressBar
                      value={(() => {
                        const isPractice = activeTab === 'practices';
                        const items = currentTopic.lessons?.filter((l: any) => isPractice ? l.type === 'practice' : !l.type || l.type === 'explanation') || [];
                        const c = items.filter((l: any) => l.completed).length;
                        const t = items.length || 1;
                        return Math.round((c/t)*100);
                      })()}
                      size="sm"
                      color={(() => {
                        const isPractice = activeTab === 'practices';
                        const items = currentTopic.lessons?.filter((l: any) => isPractice ? l.type === 'practice' : !l.type || l.type === 'explanation') || [];
                        const c = items.filter((l: any) => l.completed).length;
                        const t = items.length || 1;
                        return Math.round((c/t)*100) >= 100 ? 'success' : 'primary';
                      })()}
                    />
                  </CardContent>
                </Card>

                <div className="space-y-3">
                   {practiceItems.map((item: any, index: number) => (
                     <Card
                       key={item.id}
                       className={`cursor-pointer transition-all hover:shadow-md ${
                         selectedLesson?.id === item.id ? 'ring-2 ring-primary' : ''
                       }`}
                       onClick={() => handleLessonClick(item)}
                     >
                       <CardContent className="p-4">
                         <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                             item.completed
                               ? 'bg-success/10 text-success'
                               : canViewVideo && !item.type
                                 ? 'bg-primary/10 text-primary'
                                 : 'bg-muted text-text-secondary'
                           }`}>
                             {item.completed ? (
                               <CheckCircle2 className="w-6 h-6" />
                             ) : canViewVideo && !item.type ? (
                               <span>{index + 1}</span>
                             ) : (
                               <Lock className="w-6 h-6" />
                             )}
                           </div>
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2">
                               <h3 className="font-bold text-text-primary mb-1">{item.title}</h3>
                               {!canViewVideo && !item.type && (
                                 <Badge variant="secondary" className="gap-1">
                                   <Crown className="w-3 h-3" />
                                   للمشتركين
                                 </Badge>
                               )}
                             </div>
                             <p className="text-sm text-text-secondary">{item.description}</p>
                             <div className="flex items-center gap-4 mt-2">
                               <span className="text-xs text-text-secondary flex items-center gap-1">
                                 <Clock className="w-3 h-3" />
                                 {item.duration}
                               </span>
                             </div>
                           </div>
                           {!item.type && (
                             <Button variant="ghost" size="sm">
                               <Play className="w-4 h-4" />
                             </Button>
                           )}
                         </div>
                       </CardContent>
                     </Card>
                   ))}
                 </div>


              </div>
            )}
          </div>
        </div>
      </div>

      {selectedLesson && canViewVideo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold text-lg text-text-primary">{selectedLesson.title}</h3>
              <button
                onClick={() => setSelectedLesson(null)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
            <VideoPlayer
              videoUrl={selectedLesson.videoUrl}
              lessonId={selectedLesson.id}
              title={selectedLesson.title}
              onComplete={() => {
                setSelectedLesson(null);
                fetchTopics();
              }}
            />
            <div className="p-6">
              <h3 className="font-bold text-xl text-text-primary mb-2">{selectedLesson.title}</h3>
              <p className="text-text-secondary mb-4">{selectedLesson.description}</p>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedLesson.duration}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-black text-white border-white/20">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">هذا المحتوى للمشتركين فقط</h2>
              <p className="text-white/70 mb-6">
                اشترك الآن للحصول على وصول كامل لجميع الفيديوهات التعليمية والتمارين
              </p>
              <div className="space-y-3">
                <Link href="/subscribe" className="block">
                  <Button className="w-full gap-2 bg-white text-black hover:bg-white/90">
                    <Crown className="w-4 h-4" />
                    اشترك الآن
                  </Button>
                </Link>
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="w-full py-2 text-white/70 hover:text-white transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </MainLayout>
  );
}
