'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { TypeOption } from '@/components/study-plans/TypeOption';
import { InsufficientDialog } from '@/components/study-plans/InsufficientDialog';
import {
  GraduationCap,
  BookOpen,
  ListChecks,
  CalendarRange,
  Gauge,
  Rocket,
  Play,
  FileText,
  ClipboardCheck,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  Loader2,
  Clock,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WEEK_ORDER,
  WEEKDAY_LABELS,
  CONTENT_TYPE_LABELS,
  INTENSITY_LABELS,
  DIFFICULTY_LABELS,
  PRIOR_KNOWLEDGE_LABELS,
  type ContentScope,
  type ContentType,
  type DifficultyLevel,
  type PriorKnowledge,
  type StudyIntensity,
} from '@/lib/study-plans/types';

interface GradeMeta {
  key: string;
  name: string;
  hasContent: boolean;
  lessonCount: number;
}

interface Topic {
  id: string;
  title: string;
  icon: string;
  order: number;
  lessonCount: number;
}

interface Lesson {
  id: string;
  title: string;
  topicId: string;
  type: string;
  duration: string;
}

const LOADING_MESSAGES = [
  'بحسب مدة كل فيديو...',
  'بوزع فيديوهاتك على أيام المذاكرة...',
  'بيرتب الدروس من السهل للصعب...',
  'بيدور على أفضل ترتيب ليك...',
  'بيجهز جدولك اليومي...',
  'خطوتك الأخيرة على وشك النهاية 🚀',
];

const STEPS = ['الصف', 'المحتوى', 'نوع الفيديوهات', 'الجدول', 'مستواك', 'تأكيد'];

export default function NewStudyPlanPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [step, setStep] = useState(0);
  const [grades, setGrades] = useState<GradeMeta[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const [grade, setGrade] = useState('');
  const [scope, setScope] = useState<ContentScope>('full');
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [lessonIds, setLessonIds] = useState<string[]>([]);
  const [contentType, setContentType] = useState<ContentType>('both');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([6, 0, 1, 2, 3, 4]);
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('average');
  const [priorKnowledge, setPriorKnowledge] = useState<PriorKnowledge>('none');
  const [studyIntensity, setStudyIntensity] = useState<StudyIntensity>('balanced');

  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(0);
  const [error, setError] = useState('');
  const [insufficient, setInsufficient] = useState<{ totalMinutes?: number; availableMinutes?: number; requiredDays?: number; studyDays?: number; dailyCap?: number; message?: string; overflowCount?: number } | null>(null);

  const loadMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/study-plans/meta', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setGrades(json.data.grades);
        const firstWithContent = json.data.grades.find((g: GradeMeta) => g.hasContent);
        if (firstWithContent) setGrade(firstWithContent.key);
      }
    } catch (e) {
      console.error('Failed to load meta:', e);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!grade) return;
    let active = true;
    const loadContent = async () => {
      try {
        const res = await fetch(`/api/study-plans/meta?grade=${grade}`, { cache: 'no-store' });
        const json = await res.json();
        if (active && json.success) {
          setTopics(json.data.topics);
          setLessons(json.data.lessons);
          setExpandedTopic(json.data.topics[0]?.id ?? null);
          setUnitIds([]);
          setLessonIds([]);
        }
      } catch (e) {
        console.error('Failed to load topics:', e);
      }
    };
    loadContent();
    return () => {
      active = false;
    };
  }, [grade]);

  useEffect(() => {
    if (!submitting) return;
    setSubmitMessage(0);
    const interval = setInterval(() => {
      setSubmitMessage((m) => (m + 1) % LOADING_MESSAGES.length);
    }, 1600);
    return () => clearInterval(interval);
  }, [submitting]);

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const defaultStart = todayKey;
  const defaultEnd = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);

  const canProceed = () => {
    if (step === 0) return Boolean(grade);
    if (step === 1) {
      if (scope === 'units') return unitIds.length > 0;
      if (scope === 'lessons') return lessonIds.length > 0;
      return true;
    }
    if (step === 2) return true;
    if (step === 3) {
      const s = startDate || defaultStart;
      const e = endDate || defaultEnd;
      return Boolean(s && e && e >= s && selectedDays.length > 0);
    }
    return true;
  };

  const next = () => {
    setError('');
    if (!canProceed()) {
      setError('أكمل الاختيارات المطلوبة أولاً');
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const back = () => {
    setError('');
    if (step > 0) setStep(step - 1);
  };

  const toggleUnit = (id: string) => {
    setUnitIds((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  };

  const toggleLesson = (id: string) => {
    setLessonIds((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));
  };

  const toggleDay = (d: number) => {
    setSelectedDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const createPlan = async () => {
    setError('');
    setSubmitting(true);
    const body = {
      grade,
      contentScope: scope,
      contentType,
      unitIds: scope === 'units' || scope === 'lessons' ? unitIds : [],
      lessonIds: scope === 'lessons' ? lessonIds : [],
      startDate: startDate || defaultStart,
      endDate: endDate || defaultEnd,
      selectedDays,
      dailyMinutes,
      difficultyLevel,
      priorKnowledge,
      studyIntensity,
    };
    try {
      const res = await fetch('/api/study-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        const planId = json.data?.plan?.id;
        router.push(planId ? `/study-plans/${planId}` : '/study-plans');
        return;
      }
      if (json.code === 'insufficient_time') {
        setInsufficient(json.details ?? { message: json.error });
        setSubmitting(false);
        return;
      }
      setError(json.error || 'حدث خطأ غير متوقع');
      setSubmitting(false);
    } catch (e) {
      setError('تعذر الاتصال بالخادم');
      setSubmitting(false);
    }
  };

  const selectedUnitsCount = unitIds.length;
  const selectedLessonsCount = lessonIds.length;

  const stepLabels = (i: number) => (
    <div
      key={i}
      className={cn(
        'flex items-center gap-2',
        i < step ? 'text-success' : i === step ? 'text-primary' : 'text-text-muted'
      )}
    >
      <span
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2',
          i < step
            ? 'border-success bg-success text-white'
            : i === step
              ? 'border-primary bg-primary text-white'
              : 'border-border'
        )}
      >
        {i < step ? <Check className="w-3 h-3" /> : i + 1}
      </span>
      <span className="hidden sm:block text-xs font-bold">{STEPS[i]}</span>
    </div>
  );

  const contentCount = scope === 'units' ? selectedUnitsCount : scope === 'lessons' ? selectedLessonsCount : topics.length;

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            أنشئ خطتك الذكية
          </h1>
          <p className="text-text-secondary mt-1">خطوات قليلة ونظبط لك جدول مذاكرة يوم بيوم 🤖</p>
        </div>

        <div className="flex items-center justify-between px-1 py-3 overflow-x-auto">
          {STEPS.map((_, i) => stepLabels(i))}
        </div>

        <Card>
          <CardContent className="p-6">
            {/* STEP 0: grade */}
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-text-primary">اختار صفك الدراسي</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {grades.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      disabled={!g.hasContent}
                      onClick={() => {
                        setGrade(g.key);
                        setError('');
                      }}
                      className={cn(
                        'p-4 rounded-2xl border-2 text-right transition-all',
                        grade === g.key
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40',
                        !g.hasContent && 'opacity-40 pointer-events-none'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <GraduationCap className={cn('w-6 h-6', grade === g.key ? 'text-primary' : 'text-text-secondary')} />
                        {g.hasContent && <span className="text-xs text-text-secondary">{g.lessonCount} درس</span>}
                      </div>
                      <p className="font-bold text-text-primary mt-2">{g.name}</p>
                      {!g.hasContent && <p className="text-xs text-text-secondary mt-1">المحتوى قادم قريباً</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 1: content scope */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-text-primary">ايه اللي هتذاكره؟</h2>
                <div className="grid grid-cols-3 gap-3">
                  <TypeOption
                    value="full"
                    label="المنهج كامل"
                    description={`كل الوحدات (${topics.length})`}
                    icon={<BookOpen className="w-6 h-6" />}
                    selected={scope === 'full'}
                    onClick={() => {
                      setScope('full');
                      setError('');
                    }}
                    color="bg-primary/10 text-primary"
                  />
                  <TypeOption
                    value="units"
                    label="وحدات محددة"
                    description="اختار وحدات معينة بس"
                    icon={<ListChecks className="w-6 h-6" />}
                    selected={scope === 'units'}
                    onClick={() => {
                      setScope('units');
                      setError('');
                    }}
                    color="bg-secondary/10 text-secondary"
                  />
                  <TypeOption
                    value="lessons"
                    label="دروس محددة"
                    description="اختار دروس معينة بس"
                    icon={<ClipboardCheck className="w-6 h-6" />}
                    selected={scope === 'lessons'}
                    onClick={() => {
                      setScope('lessons');
                      setError('');
                    }}
                    color="bg-accent/10 text-accent"
                  />
                </div>

                {scope !== 'full' && (
                  <div className="space-y-2 mt-2">
                    {topics.map((t) => {
                      const topicSelected = unitIds.includes(t.id);
                      const topicLessons = lessons.filter((l) => l.topicId === t.id);
                      const isExpanded = expandedTopic === t.id;
                      return (
                        <div key={t.id} className="border border-border rounded-2xl overflow-hidden">
                          <div className="flex items-center gap-3 p-3">
                            <button
                              type="button"
                              onClick={() => scope === 'units' && toggleUnit(t.id)}
                              className={cn(
                                'w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0',
                                topicSelected ? 'border-primary bg-primary' : 'border-border'
                              )}
                            >
                              {topicSelected && <Check className="w-4 h-4 text-white" />}
                            </button>
                            <div className="flex-1 min-w-0 text-right">
                              <p className="font-bold text-text-primary text-sm truncate">{t.title}</p>
                              <p className="text-xs text-text-secondary">{topicLessons.length} درس</p>
                            </div>
                            {scope === 'lessons' && (
                              <button
                                type="button"
                                onClick={() => setExpandedTopic(isExpanded ? null : t.id)}
                                className="p-1 hover:bg-muted rounded-lg text-text-secondary"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                          {scope === 'lessons' && isExpanded && (
                            <div className="border-t border-border bg-muted/30 p-3 space-y-1.5">
                              {topicLessons.map((l) => {
                                const selected = lessonIds.includes(l.id);
                                return (
                                  <button
                                    key={l.id}
                                    type="button"
                                    onClick={() => toggleLesson(l.id)}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors"
                                  >
                                    <span
                                      className={cn(
                                        'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0',
                                        selected ? 'border-primary bg-primary' : 'border-border'
                                      )}
                                    >
                                      {selected && <Check className="w-3 h-3 text-white" />}
                                    </span>
                                    <span className="flex-1 text-right text-sm font-medium text-text-primary truncate">{l.title}</span>
                                    <span className="text-xs text-text-secondary flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {l.duration || '—'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="text-sm text-text-secondary">
                  تم اختيار <span className="font-bold text-primary">{contentCount}</span> وحدة
                  {scope === 'lessons' && <> و <span className="font-bold text-primary">{selectedLessonsCount}</span> درس</>}
                </p>
              </div>
            )}

            {/* STEP 2: content type */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-text-primary">عايز تشوف فيديوهات إيه؟</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TypeOption
                    value="explanation"
                    label={CONTENT_TYPE_LABELS.explanation}
                    description="فيديوهات الشرح للمناهج"
                    icon={<Play className="w-6 h-6" />}
                    selected={contentType === 'explanation'}
                    onClick={() => setContentType('explanation')}
                    color="bg-blue-500/10 text-blue-500"
                  />
                  <TypeOption
                    value="practice"
                    label={CONTENT_TYPE_LABELS.practice}
                    description="فيديوهات التدريبات والتمارين"
                    icon={<FileText className="w-6 h-6" />}
                    selected={contentType === 'practice'}
                    onClick={() => setContentType('practice')}
                    color="bg-green-500/10 text-green-500"
                  />
                  <TypeOption
                    value="both"
                    label={CONTENT_TYPE_LABELS.both}
                    description="شرح وبعدين تدريبات عليه"
                    icon={<ListChecks className="w-6 h-6" />}
                    selected={contentType === 'both'}
                    onClick={() => setContentType('both')}
                    color="bg-primary/10 text-primary"
                  />
                  <TypeOption
                    value="review"
                    label={CONTENT_TYPE_LABELS.review}
                    description="مراجعة شاملة قبل الامتحانات"
                    icon={<RefreshCcw className="w-6 h-6" />}
                    selected={contentType === 'review'}
                    onClick={() => setContentType('review')}
                    color="bg-purple-500/10 text-purple-500"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: dates + days + daily minutes */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-text-primary">امتى هتذاكر؟</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-1.5">تاريخ البداية</label>
                    <input
                      type="date"
                      value={startDate || defaultStart}
                      min={defaultStart}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-border bg-background text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-1.5">تاريخ النهاية</label>
                    <input
                      type="date"
                      value={endDate || defaultEnd}
                      min={startDate || defaultStart}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-border bg-background text-text-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-primary mb-2">أيام المذاكرة</label>
                  <div className="grid grid-cols-4 gap-2">
                    {WEEK_ORDER.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={cn(
                          'h-11 rounded-xl border-2 text-xs font-bold transition-colors',
                          selectedDays.includes(d)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-text-secondary hover:border-primary/40'
                        )}
                      >
                        {WEEKDAY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-primary mb-2">كم دقيقة تقدر تذاكر في اليوم؟</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[30, 45, 60, 90, 120, 180].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDailyMinutes(m)}
                        className={cn(
                          'h-12 rounded-xl border-2 text-sm font-bold transition-colors',
                          dailyMinutes === m
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-text-secondary hover:border-primary/40'
                        )}
                      >
                        {m} دقيقة
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: level + knowledge + intensity */}
            {step === 4 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-text-primary">قوّي الخطة شوية على مزاجك</h2>

                <div>
                  <label className="block text-sm font-bold text-text-primary mb-2">مستواك في المادة</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.keys(DIFFICULTY_LABELS) as DifficultyLevel[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficultyLevel(d)}
                        className={cn(
                          'h-11 rounded-xl border-2 text-sm font-bold transition-colors',
                          difficultyLevel === d
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-text-secondary hover:border-primary/40'
                        )}
                      >
                        {DIFFICULTY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-primary mb-2">هل درست المنهج قبل كده؟</label>
                  <div className="space-y-2">
                    {(Object.keys(PRIOR_KNOWLEDGE_LABELS) as PriorKnowledge[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriorKnowledge(p)}
                        className={cn(
                          'w-full h-12 rounded-xl border-2 px-4 text-sm font-bold text-right transition-colors',
                          priorKnowledge === p
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-text-secondary hover:border-primary/40'
                        )}
                      >
                        {PRIOR_KNOWLEDGE_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-primary mb-2">كثافة الخطة</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(INTENSITY_LABELS) as StudyIntensity[]).map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setStudyIntensity(i)}
                        className={cn(
                          'h-12 rounded-xl border-2 text-sm font-bold transition-colors',
                          studyIntensity === i
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-text-secondary hover:border-primary/40'
                        )}
                      >
                        {INTENSITY_LABELS[i]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary mt-2">
                    {studyIntensity === 'light' && 'خطة خفيفة: محتوى أقل يومياً، تناسب المراجعة البطيئة'}
                    {studyIntensity === 'balanced' && 'خطة متوازنة: توازن بين الكمية والوقت'}
                    {studyIntensity === 'intensive' && 'خطة مكثفة: استفد بكل دقيقة قبل الامتحان 💪'}
                  </p>
                </div>
              </div>
            )}

            {/* STEP 5: review + create */}
            {step === 5 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Rocket className="w-6 h-6 text-primary" />
                  راجع اختياراتك
                </h2>
                <div className="bg-muted/40 rounded-2xl p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">الصف</span>
                    <span className="font-bold text-text-primary">{grades.find((g) => g.key === grade)?.name ?? grade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">المحتوى</span>
                    <span className="font-bold text-text-primary">
                      {scope === 'full' ? 'المنهج كامل' : scope === 'units' ? `${unitIds.length} وحدات` : `${lessonIds.length} دروس`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">نوع الفيديوهات</span>
                    <span className="font-bold text-text-primary">{CONTENT_TYPE_LABELS[contentType]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">الفترة</span>
                    <span className="font-bold text-text-primary">
                      {startDate || defaultStart} ← {endDate || defaultEnd}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">أيام المذاكرة</span>
                    <span className="font-bold text-text-primary">{selectedDays.length} أيام ({selectedDays.map((d) => WEEKDAY_LABELS[d]).join('، ')})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">المدة اليومية</span>
                    <span className="font-bold text-text-primary">{dailyMinutes} دقيقة</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">المستوى</span>
                    <span className="font-bold text-text-primary">{DIFFICULTY_LABELS[difficultyLevel]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">كثافة الخطة</span>
                    <span className="font-bold text-text-primary">{INTENSITY_LABELS[studyIntensity]}</span>
                  </div>
                </div>

                {error && <p className="text-sm text-error bg-error/10 rounded-xl p-3">{error}</p>}

                <button
                  onClick={createPlan}
                  disabled={submitting}
                  className="w-full h-13 py-3.5 rounded-xl bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {submitting ? 'جاري إنشاء خطتك...' : 'أنشئ خطتي الذكية 🎉'}
                </button>
              </div>
            )}

            {step < 5 && (
              <div className="flex justify-between mt-8 pt-4 border-t border-border">
                <Button variant="outline" onClick={back} disabled={step === 0} className="gap-2">
                  <ArrowRight className="w-4 h-4" />
                  السابق
                </Button>
                <Button onClick={next} className="gap-2">
                  التالي
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {submitting && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface-card border border-border rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center animate-pop-in">
              <div className="w-16 h-16 mx-auto relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="font-bold text-text-primary mt-4 text-lg">{LOADING_MESSAGES[submitMessage]}</p>
              <p className="text-sm text-text-secondary mt-2">الخطة بتتظبط ليك دلوقتي 🤖</p>
            </div>
          </div>
        )}

        <InsufficientDialog
          open={Boolean(insufficient)}
          details={insufficient}
          onClose={() => {
            setInsufficient(null);
            setStep(3);
          }}
        />
      </div>
    </MainLayout>
  );
}
