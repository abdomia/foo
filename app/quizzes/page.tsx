'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  X,
  Award,
  Download,
  BookOpen,
  ChevronUp,
  ChevronDown,
  Lock,
  Layers,
  HelpCircle,
  ListChecks,
  Flag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Certificate, CertificateSimple } from '@/components/Certificate';
import FavoriteButton from '@/components/FavoriteButton';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  topicId: string;
  timeLimit: number | null;
  passingScore: number;
  questions: Question[];
  locked?: boolean;
  accessType?: string;
}

interface Question {
  id: string;
  question: string;
  type: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
  explanation?: string | null;
  order: number;
  imageUrl?: string;
}

interface AnalysisItem {
  questionId: string;
  question: string;
  type: string;
  difficulty: string;
  correctAnswer: string;
  explanation: string | null;
  selected: string | null;
  correct: boolean;
}

interface UserQuizRecord {
  quizId: string;
  attempts: number;
  bestScore: number;
  score: number;
  passed: boolean;
  answers?: AnalysisItem[];
}

const DIFFICULTY_META: Record<string, { label: string; className: string; dot: string }> = {
  easy: { label: 'سهل', className: 'bg-success/10 text-success border-transparent', dot: 'bg-success' },
  medium: { label: 'متوسط', className: 'bg-warning/10 text-warning border-transparent', dot: 'bg-warning' },
  hard: { label: 'صعب', className: 'bg-error/10 text-error border-transparent', dot: 'bg-error' },
};

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const meta = DIFFICULTY_META[difficulty] || DIFFICULTY_META.medium;
  return (
    <Badge variant="secondary" className={cn('gap-1', meta.className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </Badge>
  );
}

export default function QuizzesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [phase, setPhase] = useState<'intro' | 'in-progress' | 'result'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [topicsMap, setTopicsMap] = useState<Record<string, string>>({});
  const [userResults, setUserResults] = useState<Record<string, UserQuizRecord>>({});
  const [resultAnalysis, setResultAnalysis] = useState<AnalysisItem[]>([]);
  const [resultScore, setResultScore] = useState(0);
  const [resultPassed, setResultPassed] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    fetchTopics();
  }, []);

  useEffect(() => {
    fetchUserResults();
  }, []);

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/admin/topics');
      const data = (await res.json()) as { success: boolean; data: { id: string; title: string }[] };
      if (data.success) {
        const map: Record<string, string> = {};
        data.data.forEach((topic) => {
          map[topic.id] = topic.title;
        });
        setTopicsMap(map);
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    }
  };

  const fetchUserResults = async () => {
    try {
      const res = await fetch('/api/user/quiz-results');
      const data = (await res.json()) as { success: boolean; data: UserQuizRecord[] };
      if (data.success) {
        const map: Record<string, UserQuizRecord> = {};
        data.data.forEach((r) => {
          map[r.quizId] = {
            quizId: r.quizId,
            attempts: r.attempts || 1,
            bestScore: r.bestScore || r.score || 0,
            score: r.score || 0,
            passed: !!r.passed,
            answers: r.answers,
          };
        });
        setUserResults(map);
      }
    } catch (error) {
      console.error('Failed to fetch quiz results:', error);
    }
  };

  const fetchQuizzes = useCallback(async () => {
    try {
      const gradeParam = user?.grade ? `?grade=${user.grade}` : '';
      const res = await fetch(`/api/admin/quizzes${gradeParam}`);
      const data = await res.json();
      if (data.success) {
        setQuizzes(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.grade]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const openQuiz = (quiz: Quiz) => {
    if (quiz.locked) {
      router.push('/subscribe');
      return;
    }
    setSelectedQuiz(quiz);
    setPhase('intro');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeLeft(null);
    setResultAnalysis([]);
    setResultScore(0);
    setResultPassed(false);
  };

  const startQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setPhase('in-progress');
    setCurrentQuestionIndex(0);
    setAnswers({});
    if (quiz.timeLimit && quiz.timeLimit > 0) {
      setTimeLeft(quiz.timeLimit * 60);
    } else {
      setTimeLeft(null);
    }
  };

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || phase !== 'in-progress') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          submitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  const selectAnswer = (questionId: string, answer: string) => {
    if (phase !== 'in-progress') return;
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const submitQuiz = useCallback(async () => {
    if (!selectedQuiz || submittingRef.current) return;
    submittingRef.current = true;

    const percentage = Math.round(
      (Object.keys(answers).length > 0
        ? Object.keys(answers).filter(
            (qid) => String(selectedQuiz.questions.find((q) => q.id === qid)?.correctAnswer) === answers[qid]
          ).length
        : 0) / selectedQuiz.questions.length * 100
    );
    const passed = percentage >= selectedQuiz.passingScore;
    setResultScore(percentage);
    setResultPassed(passed);
    setPhase('result');

    try {
      const res = await fetch('/api/user/quiz-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: selectedQuiz.id,
          score: percentage,
          passed,
          answers: Object.entries(answers).map(([id, selected]) => ({ id, selected })),
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.analysis) {
        setResultAnalysis(data.data.analysis);
      } else if (data.data?.answers) {
        setResultAnalysis(data.data.answers);
      }
    } catch (error) {
      console.error('Failed to save quiz result:', error);
    }

    if (passed) {
      setShowCelebration(true);
    }

    fetchUserResults();
    submittingRef.current = false;
  }, [answers, selectedQuiz]);

  const closeQuiz = () => {
    setSelectedQuiz(null);
    setPhase('intro');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeLeft(null);
    setShowCelebration(false);
    submittingRef.current = false;
  };

  const currentQuestion = selectedQuiz?.questions[currentQuestionIndex];

  const answeredCount = selectedQuiz
    ? selectedQuiz.questions.filter((q) => answers[q.id] !== undefined).length
    : 0;

  const difficultySummary = useMemo(() => {
    if (!selectedQuiz) return { easy: 0, medium: 0, hard: 0 };
    return selectedQuiz.questions.reduce(
      (acc, q) => {
        const d = q.difficulty || 'medium';
        if (d === 'easy') acc.easy++;
        else if (d === 'hard') acc.hard++;
        else acc.medium++;
        return acc;
      },
      { easy: 0, medium: 0, hard: 0 }
    );
  }, [selectedQuiz]);

  const wrongAnswers = resultAnalysis.filter((a) => !a.correct);

  const groupedQuizzes = useMemo(() => {
    const groups: Record<string, Quiz[]> = {};
    quizzes.forEach((quiz) => {
      if (!groups[quiz.topicId]) {
        groups[quiz.topicId] = [];
      }
      groups[quiz.topicId].push(quiz);
    });
    return groups;
  }, [quizzes]);

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

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">الاختبارات</h1>
          <p className="text-text-secondary mt-1">اختبر معلوماتك من خلال اختبارات قصيرة</p>
        </div>

        {!selectedQuiz ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-text-primary mb-4">الاختبارات حسب الموضوعات</h2>
              <div className="space-y-4">
                {Object.entries(groupedQuizzes).map(([topicId, topicQuizzes]) => (
                  <div key={topicId} className="border border-border rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => setExpandedTopic(expandedTopic === topicId ? null : topicId)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-text-primary">{topicsMap[topicId] || topicId}</h3>
                          <p className="text-sm text-text-secondary">{topicQuizzes.length} اختبار</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {expandedTopic === topicId ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {expandedTopic === topicId && (
                      <div className="p-4 bg-background border-t border-border space-y-3">
                        {topicQuizzes.map((quiz) => {
                          const record = userResults[quiz.id];
                          return (
                            <Card key={quiz.id} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => openQuiz(quiz)}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                                    <ListChecks className="w-6 h-6 text-secondary" />
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-1 mr-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-bold text-text-primary">{quiz.title}</h4>
                                      {record && (
                                        <Badge variant="secondary" className="gap-1 text-xs bg-success/10 text-success">
                                          <Trophy className="w-3 h-3" />
                                          أفضل نتيجة {record.bestScore}%
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-text-secondary">{quiz.description}</p>
                                    <div className="flex items-center gap-4 text-sm mt-2 flex-wrap">
                                      <span className="text-text-secondary flex items-center gap-1">
                                        <Target className="w-3 h-3" />
                                        {quiz.questions.length} سؤال
                                      </span>
                                      <span className="text-text-secondary flex items-center gap-1">
                                        <Layers className="w-3 h-3" />
                                        درجة النجاح {quiz.passingScore}%
                                      </span>
                                      {quiz.timeLimit && quiz.timeLimit > 0 && (
                                        <span className="text-text-secondary flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {quiz.timeLimit} دقيقة
                                        </span>
                                      )}
                                      {record && record.attempts > 0 && (
                                        <span className="text-text-secondary flex items-center gap-1">
                                          <RotateCcw className="w-3 h-3" />
                                          {record.attempts} محاولة
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {quiz.locked && (
                                    <Badge variant="secondary" className="gap-1 flex-shrink-0">
                                      <Lock className="w-3 h-3" />
                                      {quiz.accessType === 'PREMIUM' ? 'للمشتركين المميزين' : 'للمشتركين'}
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : phase === 'intro' ? (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-text-primary">{selectedQuiz.title}</h2>
                    <p className="text-text-secondary mt-1">{selectedQuiz.description}</p>
                  </div>
                  <button
                    onClick={closeQuiz}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-muted/50 text-center">
                    <Target className="w-6 h-6 mx-auto text-primary mb-2" />
                    <p className="text-2xl font-bold text-text-primary">{selectedQuiz.questions.length}</p>
                    <p className="text-xs text-text-secondary">سؤال</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 text-center">
                    <Flag className="w-6 h-6 mx-auto text-warning mb-2" />
                    <p className="text-2xl font-bold text-text-primary">{selectedQuiz.passingScore}%</p>
                    <p className="text-xs text-text-secondary">درجة النجاح</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 text-center">
                    <Clock className="w-6 h-6 mx-auto text-secondary mb-2" />
                    <p className="text-2xl font-bold text-text-primary">
                      {selectedQuiz.timeLimit && selectedQuiz.timeLimit > 0 ? `${selectedQuiz.timeLimit} د` : '—'}
                    </p>
                    <p className="text-xs text-text-secondary">الوقت المتاح</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 text-center">
                    <RotateCcw className="w-6 h-6 mx-auto text-accent mb-2" />
                    <p className="text-2xl font-bold text-text-primary">
                      {userResults[selectedQuiz.id]?.attempts || 0}
                    </p>
                    <p className="text-xs text-text-secondary">محاولات سابقة</p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-sm font-bold text-text-primary mb-2 flex items-center gap-1">
                    <Layers className="w-4 h-4" />
                    مستوى الأسئلة
                  </p>
                  <div className="flex gap-4 flex-wrap">
                    {difficultySummary.easy > 0 && (
                      <span className="flex items-center gap-2 text-sm text-text-secondary">
                        <span className="w-2 h-2 rounded-full bg-success" />
                        سهل: {difficultySummary.easy}
                      </span>
                    )}
                    {difficultySummary.medium > 0 && (
                      <span className="flex items-center gap-2 text-sm text-text-secondary">
                        <span className="w-2 h-2 rounded-full bg-warning" />
                        متوسط: {difficultySummary.medium}
                      </span>
                    )}
                    {difficultySummary.hard > 0 && (
                      <span className="flex items-center gap-2 text-sm text-text-secondary">
                        <span className="w-2 h-2 rounded-full bg-error" />
                        صعب: {difficultySummary.hard}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => startQuiz(selectedQuiz)}
                  className="w-full gap-2 py-6 text-lg"
                >
                  <PlayIcon className="w-5 h-5" />
                  ابدأ الاختبار
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : phase === 'in-progress' ? (
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={closeQuiz}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-text-secondary" />
                    </button>
                    <div>
                      <h2 className="font-bold text-text-primary">{selectedQuiz.title}</h2>
                      <p className="text-sm text-text-secondary">
                        السؤال {currentQuestionIndex + 1} من {selectedQuiz.questions.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {timeLeft !== null && (
                      <Badge variant={timeLeft < 60 ? 'destructive' : 'default'} className="gap-1">
                        <Clock className="w-4 h-4" />
                        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      {answeredCount}/{selectedQuiz.questions.length}
                    </Badge>
                  </div>
                </div>

                <ProgressBar
                  value={(answeredCount / selectedQuiz.questions.length) * 100}
                  size="sm"
                  className="mb-6"
                />

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {selectedQuiz.questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-xs font-bold transition-colors',
                        index === currentQuestionIndex
                          ? 'bg-primary text-white'
                          : answers[selectedQuiz.questions[index].id] !== undefined
                            ? 'bg-success/20 text-success'
                            : 'bg-muted text-text-secondary hover:bg-border'
                      )}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                {currentQuestion?.imageUrl && (
                  <div className="mb-4">
                    <img
                      src={currentQuestion.imageUrl}
                      alt="السؤال"
                      className="max-w-full h-auto rounded border border-gray-300"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                  <h3 className="text-xl font-bold text-text-primary">{currentQuestion?.question}</h3>
                  {currentQuestion && <DifficultyBadge difficulty={currentQuestion.difficulty} />}
                </div>

                {currentQuestion?.type === 'multiple-choice' && currentQuestion.options && (
                  <div className="space-y-3 mb-6">
                    {currentQuestion.options.map((option: string, index: number) => {
                      const isSelected = answers[currentQuestion.id] === option;
                      return (
                        <button
                          key={index}
                          onClick={() => selectAnswer(currentQuestion.id, option)}
                          className={cn(
                            'w-full p-4 rounded-xl text-right font-medium transition-all border-2',
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-surface hover:border-primary cursor-pointer'
                          )}
                        >
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-muted ml-3">
                            {String.fromCharCode(65 + index)}
                          </span>
                          {option}
                          {isSelected && <CheckCircle2 className="w-5 h-5 mr-auto text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQuestion?.type === 'true-false' && (
                  <div className="flex gap-4 mb-6">
                    {['صحيح', 'خطأ'].map((option) => {
                      const isSelected = answers[currentQuestion.id] === option;
                      return (
                        <button
                          key={option}
                          onClick={() => selectAnswer(currentQuestion.id, option)}
                          className={cn(
                            'flex-1 p-6 rounded-xl font-bold text-lg transition-all border-2',
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-surface hover:border-primary cursor-pointer'
                          )}
                        >
                          {option}
                          {isSelected && <CheckCircle2 className="w-5 h-5 mr-auto text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border flex-wrap gap-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      السابق
                    </Button>
                    {currentQuestionIndex < selectedQuiz.questions.length - 1 && (
                      <Button
                        onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                        className="gap-2"
                      >
                        التالي
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Button
                    variant={answeredCount === selectedQuiz.questions.length ? 'default' : 'outline'}
                    onClick={submitQuiz}
                    className="gap-2"
                  >
                    <Flag className="w-4 h-4" />
                    إنهاء الاختبار
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardContent className="p-8 text-center">
                <div className={cn(
                  'w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6',
                  resultPassed ? 'bg-success/10' : 'bg-error/10'
                )}>
                  {resultPassed ? (
                    <Trophy className="w-12 h-12 text-success" />
                  ) : (
                    <XCircle className="w-12 h-12 text-error" />
                  )}
                </div>

                <h2 className="text-2xl font-bold text-text-primary mb-2">
                  {resultPassed ? 'تهانينا! لقد نجحت' : 'للأسف لم تنجح'}
                </h2>
                <p className="text-text-secondary mb-6">
                  {resultPassed
                    ? 'أداء ممتاز! لقد اجتزت الاختبار بنجاح'
                    : `حاول مرة أخرى. تحتاج ${selectedQuiz.passingScore}% للنجاح`}
                </p>

                <div className="flex items-center justify-center gap-8 mb-8 flex-wrap">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-text-primary">{resultScore}%</p>
                    <p className="text-sm text-text-secondary">درجتك</p>
                  </div>
                  <div className="w-px h-16 bg-border" />
                  <div className="text-center">
                    <p className="text-4xl font-bold text-success">
                      {selectedQuiz.questions.length - wrongAnswers.length}/{selectedQuiz.questions.length}
                    </p>
                    <p className="text-sm text-text-secondary">إجابات صحيحة</p>
                  </div>
                  <div className="w-px h-16 bg-border" />
                  <div className="text-center">
                    <p className="text-4xl font-bold text-error">{wrongAnswers.length}</p>
                    <p className="text-sm text-text-secondary">إجابات خاطئة</p>
                  </div>
                </div>

                <div className="flex gap-4 justify-center flex-wrap">
                  <Button onClick={() => startQuiz(selectedQuiz)} variant="outline" className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    إعادة الاختبار
                  </Button>
                  <Button onClick={closeQuiz} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    رجوع للاختبارات
                  </Button>
                </div>
              </CardContent>
            </Card>

            {wrongAnswers.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-error" />
                    تحليل الأخطاء
                  </h3>
                  <div className="space-y-4">
                    {wrongAnswers.map((item, i) => (
                      <div key={item.questionId} className="p-4 rounded-xl bg-error/5 border border-error/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-text-primary">
                            {i + 1}. {item.question}
                          </span>
                          <div className="flex items-center gap-2">
                            <FavoriteButton
                              itemType="question"
                              itemId={item.questionId}
                              title={item.question}
                              context={selectedQuiz.title}
                              className="p-1 hover:bg-yellow-500/10 rounded"
                            />
                            <DifficultyBadge difficulty={item.difficulty} />
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className="flex items-center gap-2 text-error">
                            <XCircle className="w-4 h-4 flex-shrink-0" />
                            <span>
                              إجابتك: <b>{item.selected || 'لم تجب'}</b>
                            </span>
                          </p>
                          <p className="flex items-center gap-2 text-success">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            <span>
                              الإجابة الصحيحة: <b>{item.correctAnswer}</b>
                            </span>
                          </p>
                          {item.explanation && (
                            <p className="flex items-start gap-2 text-text-secondary bg-muted/50 p-3 rounded-lg">
                              <Award className="w-4 h-4 flex-shrink-0 text-warning" />
                              <span>{item.explanation}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 50 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              <Card className="max-w-3xl w-[90%] bg-gradient-to-br from-primary/20 to-success/20 border-primary">
                <CardContent className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-6"
                  >
                    <Award className="w-12 h-12 text-white" />
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl font-bold text-text-primary mb-2"
                  >
                    تهانينا!
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-text-secondary mb-6"
                  >
                    لقد اجتزت الاختبار بنجاح
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mb-6"
                  >
                    <CertificateSimple userName={user?.name || 'الطالب'} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex gap-4 flex-wrap"
                  >
                    <Button
                      onClick={() => setShowCelebration(false)}
                      variant="outline"
                      className="flex-1 md:flex-1"
                    >
                      إغلاق
                    </Button>
                    <Button
                      onClick={() => setShowCertificate(true)}
                      className="flex-1 md:flex-1 gap-2"
                    >
                      <Download className="w-4 h-4" />
                      تحميل الشهادة
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showCertificate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full bg-black text-white border-white/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="font-bold text-lg text-white">شهادة إتمام الاختبار</h3>
              <button onClick={() => setShowCertificate(false)}>
                <X className="w-5 h-5 text-white" />
              </button>
            </CardHeader>
            <CardContent className="p-5">
              <Certificate userName={user?.name || 'الطالب'} />
            </CardContent>
          </Card>
        </div>
      )}
    </MainLayout>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}
