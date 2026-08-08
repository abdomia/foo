'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { exercises, topics } from '@/lib/data';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';
import { Target, CheckCircle2, XCircle, Lightbulb, ArrowRight, RotateCcw, Zap } from 'lucide-react';

export default function PracticePage() {
  const { user } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [xpEarned, setXpEarned] = useState<number | null>(null);

  const filteredExercises = selectedTopic 
    ? exercises.filter(e => e.topicId === selectedTopic)
    : exercises;

  const currentExercise = filteredExercises[currentExerciseIndex];
  const isCorrect = selectedAnswer === String(currentExercise?.correctAnswer);

  const handleSubmit = () => {
    if (!selectedAnswer) return;
    setShowResult(true);
    if (isCorrect) {
      setCompletedCount(prev => prev + 1);
    }
    if (user) {
      const earned = isCorrect ? 7 : 5;
      setXpEarned(earned);
      fetch('/api/user/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correct: isCorrect }),
      }).catch(() => {});
    }
  };

  const handleNext = () => {
    if (currentExerciseIndex < filteredExercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowHint(false);
      setXpEarned(null);
    }
  };

  const handleReset = () => {
    setCurrentExerciseIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setShowHint(false);
    setCompletedCount(0);
    setXpEarned(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">التدريب</h1>
            <p className="text-text-secondary mt-1">حل تمارين تطبيقية لتقوية فهمك</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <Target className="w-4 h-4" />
              {completedCount} / {filteredExercises.length}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 ml-1" />
              إعادة
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedTopic(null);
              setCurrentExerciseIndex(0);
              setSelectedAnswer(null);
              setShowResult(false);
            }}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              !selectedTopic 
                ? 'bg-primary text-white' 
                : 'bg-muted text-text-secondary hover:bg-border'
            )}
          >
            الكل ({exercises.length})
          </button>
          {topics.map((topic) => {
            const count = exercises.filter(e => e.topicId === topic.id).length;
            return (
              <button
                key={topic.id}
                onClick={() => {
                  setSelectedTopic(topic.id);
                  setCurrentExerciseIndex(0);
                  setSelectedAnswer(null);
                  setShowResult(false);
                }}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  selectedTopic === topic.id 
                    ? 'bg-primary text-white' 
                    : 'bg-muted text-text-secondary hover:bg-border'
                )}
              >
                {topic.title} ({count})
              </button>
            );
          })}
        </div>

        {filteredExercises.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
              <p className="text-text-secondary">لا توجد تمارين متاحة لهذا الموضوع</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">السؤال</span>
                  <Badge variant="default">{currentExerciseIndex + 1} / {filteredExercises.length}</Badge>
                </div>
                <Badge variant={
                  currentExercise?.type === 'multiple-choice' ? 'default' :
                  currentExercise?.type === 'true-false' ? 'secondary' : 'outline'
                }>
                  {currentExercise?.type === 'multiple-choice' ? 'اختيار من متعدد' :
                   currentExercise?.type === 'true-false' ? 'صح أو خطأ' : 'إجابة رقمية'}
                </Badge>
              </div>

              <h3 className="text-xl font-bold text-text-primary mb-6">{currentExercise?.question}</h3>

              {currentExercise?.type === 'multiple-choice' && currentExercise.options && (
                <div className="space-y-3 mb-6">
                  {currentExercise.options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrectOption = String(currentExercise.correctAnswer) === option;
                    
                    return (
                      <button
                        key={index}
                        onClick={() => !showResult && setSelectedAnswer(option)}
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
                      </button>
                    );
                  })}
                </div>
              )}

              {currentExercise?.type === 'true-false' && (
                <div className="flex gap-4 mb-6">
                  {['صحيح', 'خطأ'].map((option) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrectOption = String(currentExercise.correctAnswer) === option;
                    
                    return (
                      <button
                        key={option}
                        onClick={() => !showResult && setSelectedAnswer(option)}
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
                      </button>
                    );
                  })}
                </div>
              )}

              {currentExercise?.type === 'numeric' && (
                <div className="mb-6">
                  <input
                    type="number"
                    value={selectedAnswer || ''}
                    onChange={(e) => !showResult && setSelectedAnswer(e.target.value)}
                    disabled={showResult}
                    placeholder="أدخل الإجابة"
                    className={cn(
                      'w-full p-4 rounded-xl text-lg text-center font-medium border-2 transition-all',
                      !showResult && 'border-border focus:border-primary',
                      showResult && isCorrect && 'border-success bg-success/10',
                      showResult && !isCorrect && 'border-error bg-error/10'
                    )}
                  />
                  {showResult && !isCorrect && (
                    <p className="text-center mt-2 text-success">
                      الإجابة الصحيحة: {currentExercise.correctAnswer}
                    </p>
                  )}
                </div>
              )}

              {currentExercise?.hint && !showResult && (
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-2 text-warning mb-4 hover:underline"
                >
                  <Lightbulb className="w-4 h-4" />
                  {showHint ? 'إخفاء التلميح' : 'عرض تلميح'}
                </button>
              )}

              {showHint && currentExercise?.hint && (
                <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-6">
                  <p className="text-warning flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    <span>{currentExercise.hint}</span>
                  </p>
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
                      <span className="font-bold text-success">إجابة صحيحة! أحسنت</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-error" />
                      <span className="font-bold text-error">إجابة خاطئة. حاول مرة أخرى!</span>
                    </>
                  )}
                  {xpEarned !== null && user && (
                    <span className="flex items-center gap-1 text-sm font-bold text-primary mr-auto">
                      <Zap className="w-4 h-4" />
                      +{xpEarned} XP
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border">
                {!showResult ? (
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!selectedAnswer}
                    className="gap-2"
                  >
                    تحقق من الإجابة
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="gap-2">
                    {currentExerciseIndex < filteredExercises.length - 1 ? (
                      <>السؤال التالي <ArrowRight className="w-4 h-4" /></>
                    ) : (
                      'إنهاء التدريب'
                    )}
                  </Button>
                )}

                <div className="flex gap-1">
                  {filteredExercises.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        'w-2 h-2 rounded-full transition-colors',
                        index === currentExerciseIndex ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
