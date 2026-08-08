'use client';

import { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Certificate, CertificateSimple } from '@/components/Certificate';

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
  order: number;
  imageUrl?: string; // Optional image URL for question description
}

export default function QuizzesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>([]);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [topicsMap, setTopicsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchQuizzes();
  }, [user?.grade]);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/admin/topics');
      const data = await res.json();
      if (data.success) {
        const map: Record<string, string> = {};
        data.data.forEach((topic: any) => {
          map[topic.id] = topic.title;
        });
        setTopicsMap(map);
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    }
  };

  const fetchQuizzes = async () => {
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
  };

  const startQuiz = (quiz: Quiz) => {
    if (quiz.locked) {
      router.push('/subscribe');
      return;
    }
    setSelectedQuiz(quiz);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizCompleted(false);
    setShowCelebration(false);
    if (quiz.timeLimit) {
      setTimeLeft(quiz.timeLimit * 60);
    }
  };

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || quizCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          setQuizCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, quizCompleted]);

  const handleAnswer = (answer: string) => {
    if (showResult || !selectedQuiz) return;

    const currentQuestion = selectedQuiz.questions[currentQuestionIndex];
    const isCorrect = String(currentQuestion.correctAnswer) === answer;

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setSelectedAnswer(answer);
    setShowResult(true);
  };

  const handleNext = () => {
    if (!selectedQuiz) return;

    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setQuizCompleted(true);
      const percentage = Math.round((score / selectedQuiz.questions.length) * 100);
      const passed = percentage >= selectedQuiz.passingScore;

      if (selectedQuiz.id) {
        fetch('/api/user/quiz-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizId: selectedQuiz.id,
            score: percentage,
            passed,
            answers: [],
          }),
        }).catch(error => console.error('Failed to save quiz result:', error));
      }

      if (passed) {
        setCompletedTopicIds(prev => [...new Set([...prev, selectedQuiz.topicId])]);
        setShowCelebration(true);
      }
    }
  };

  const closeQuiz = () => {
    setSelectedQuiz(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizCompleted(false);
    setTimeLeft(null);
    setShowCelebration(false);
  };

  const currentQuestion = selectedQuiz?.questions[currentQuestionIndex];
  const isCorrect = currentQuestion && selectedAnswer ? String(currentQuestion.correctAnswer) === selectedAnswer : false;
  const percentageScore = selectedQuiz
    ? Math.round((score / selectedQuiz.questions.length) * 100)
    : 0;
  const passed = selectedQuiz ? percentageScore >= selectedQuiz.passingScore : false;

  // Group quizzes by topic for tree view
  const groupedQuizzes = useMemo(() => {
    const groups: Record<string, Quiz[]> = {};
    quizzes.forEach(quiz => {
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
                {/* Quiz Tree View */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-text-primary mb-4">الاختبارات حسب الموضوعات</h2>
                    <div className="space-y-4">
                        {Object.entries(groupedQuizzes).map(([topicId, topicQuizzes]) => (
                            <div key={topicId} className="border border-border rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
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
                                        {topicQuizzes.map((quiz) => (
                                            <Card key={quiz.id} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => startQuiz(quiz)}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                                                            <ClipboardList className="w-6 h-6 text-secondary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 space-y-1">
                                                            <h4 className="font-bold text-text-primary">{quiz.title}</h4>
                                                            <p className="text-sm text-text-secondary">{quiz.description}</p>
                                                            <div className="flex items-center gap-4 text-sm mt-2">
                                                                <span className="text-text-secondary flex items-center gap-1">
                                                                    <Target className="w-3 h-3" />
                                                                    {quiz.questions.length} سؤال
                                                                </span>
                                                                <span className="text-text-secondary">
                                                                    درجة النجاح: {quiz.passingScore}%
                                                                </span>
                                                                {quiz.timeLimit && (
                                                                    <span className="text-text-secondary flex items-center gap-1 ml-4">
                                                                        <Clock className="w-3 h-3" />
                                                                        {quiz.timeLimit} دقيقة
                                                                    </span>
                                                                )}
                                                                {quiz.locked && (
                                                                    <Badge variant="secondary" className="gap-1">
                                                                        <Lock className="w-3 h-3" />
                                                                        {quiz.accessType === 'PREMIUM' ? 'للمشتركين المميزين' : 'للمشتركين'}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        ) : !quizCompleted ? (
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
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
                  {timeLeft !== null && (
                    <Badge variant={timeLeft < 60 ? 'destructive' : 'default'} className="gap-1">
                      <Clock className="w-4 h-4" />
                      {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                    </Badge>
                  )}
                </div>

                <ProgressBar
                  value={(currentQuestionIndex + 1) / selectedQuiz.questions.length * 100}
                  size="sm"
                  className="mb-6"
                />

                <>
                  {currentQuestion?.imageUrl && (
                    <div className="mb-4">
                      <img
                        src={currentQuestion.imageUrl}
                        alt="السؤال"
                        className="max-w-full h-auto rounded border border-gray-300"
                      />
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-text-primary mb-6">
                    {currentQuestion?.question}
                  </h3>
                </>

                {currentQuestion?.type === 'multiple-choice' && currentQuestion.options && (
                  <div className="space-y-3 mb-6">
                    {currentQuestion.options.map((option: string, index: number) => {
                      const isSelected = selectedAnswer === option;
                      const isCorrectOption = String(currentQuestion.correctAnswer) === option;

                      return (
                        <button
                          key={index}
                          onClick={() => handleAnswer(option)}
                          disabled={showResult}
                          className={cn(
                            'w-full p-4 rounded-xl text-right font-medium transition-all border-2',
                            !showResult && 'hover:border-primary cursor-pointer',
                            !isSelected && !showResult && 'border-border bg-surface',
                            isSelected && !showResult && 'border-primary bg-primary/5',
                            showResult && isCorrectOption && 'border-success bg-success/10 text-success',
                            showResult && isSelected && !isCorrectOption && 'border-error bg-error/10 text-error',
                            showResult && !isCorrectOption && 'border-border opacity-50'
                          )}
                        >
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-muted ml-3">
                            {String.fromCharCode(65 + index)}
                          </span>
                          {option}
                          {showResult && isCorrectOption && (
                            <CheckCircle2 className="w-5 h-5 mr-auto text-success" />
                          )}
                          {showResult && isSelected && !isCorrectOption && (
                            <XCircle className="w-5 h-5 mr-auto text-error" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQuestion?.type === 'true-false' && (
                  <div className="flex gap-4 mb-6">
                    {['صحيح', 'خطأ'].map((option) => {
                      const isSelected = selectedAnswer === option;
                      const isCorrectOption = String(currentQuestion.correctAnswer) === option;

                      return (
                        <button
                          key={option}
                          onClick={() => handleAnswer(option)}
                          disabled={showResult}
                          className={cn(
                            'flex-1 p-6 rounded-xl font-bold text-lg transition-all border-2',
                            !showResult && 'hover:border-primary cursor-pointer',
                            !isSelected && !showResult && 'border-border bg-surface',
                            isSelected && !showResult && 'border-primary bg-primary/5',
                            showResult && isCorrectOption && 'border-success bg-success/10 text-success',
                            showResult && isSelected && !isCorrectOption && 'border-error bg-error/10 text-error',
                            showResult && !isCorrectOption && 'border-border opacity-50'
                          )}
                        >
                          {option}
                          {showResult && isCorrectOption && (
                            <CheckCircle2 className="w-6 h-6 mr-auto" />
                          )}
                          {showResult && isSelected && !isCorrectOption && (
                            <XCircle className="w-6 h-6 mr-auto" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {showResult && (
                  <div className={cn(
                    'p-4 rounded-xl mb-6 flex items-center gap-3',
                    isCorrect ? 'bg-success/10' : 'bg-error/10'
                  )}>
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-success" />
                        <span className="font-bold text-success">إجابة صحيحة!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-6 h-6 text-error" />
                        <span className="font-bold text-error">إجابة خاطئة</span>
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button onClick={handleNext} className="gap-2">
                    {currentQuestionIndex < selectedQuiz.questions.length - 1 ? (
                      <>التالي <ArrowRight className="w-4 h-4" /></>
                    ) : (
                      'إنهاء الاختبار'
                    )}
                  </Button>

                  <div className="flex gap-1">
                    {selectedQuiz.questions.map((_, index) => (
                      <div
                        key={index}
                        className={cn(
                          'w-3 h-3 rounded-full transition-colors',
                          index === currentQuestionIndex ? 'bg-primary' : 'bg-muted'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8 text-center">
                <div className={cn(
                  'w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6',
                  passed ? 'bg-success/10' : 'bg-error/10'
                )}>
                  {passed ? (
                    <Trophy className="w-12 h-12 text-success" />
                  ) : (
                    <XCircle className="w-12 h-12 text-error" />
                  )}
                </div>

                <h2 className="text-2xl font-bold text-text-primary mb-2">
                  {passed ? 'تهانينا! لقد نجحت' : 'للأسف لم تنجح'}
                </h2>
                <p className="text-text-secondary mb-6">
                  {passed
                    ? 'أداء ممتاز! لقد اجتزت الاختبار بنجاح'
                    : `حاول مرة أخرى. تحتاج ${selectedQuiz.passingScore}% للنجاح`}
                </p>

                <div className="flex items-center justify-center gap-8 mb-8">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-text-primary">{percentageScore}%</p>
                    <p className="text-sm text-text-secondary">درجتك</p>
                  </div>
                  <div className="w-px h-16 bg-border" />
                  <div className="text-center">
                    <p className="text-4xl font-bold text-text-primary">
                      {score}/{selectedQuiz.questions.length}
                    </p>
                    <p className="text-sm text-text-secondary">الإجابات الصحيحة</p>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
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
              transition={{ type: "spring", duration: 0.5 }}
            >
              <Card className="max-w-3xl w-[90%] bg-gradient-to-br from-primary/20 to-success/20 border-primary">
                <CardContent className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
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
                    لقد أكملت جميع اختبارات هذا الموضوع بنجاح
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

function ClipboardList({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </svg>
  );
}
