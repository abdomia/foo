'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react';

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

interface Props {
  quiz: { title: string; questions: QuizQuestion[] };
}

export function InteractiveQuiz({ quiz }: Props) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState<number[]>([]);

  const q = quiz.questions[current];
  if (!q) {
    return (
      <div className="text-sm text-text-secondary">
        ما فيش أسئلة متاحة دلوقتي في الاختبار ده، جرب تاني.
      </div>
    );
  }

  const isLast = current === quiz.questions.length - 1;
  const correctCount = answered.filter((a) => a >= 0).length;

  const choose = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setAnswered((prev) => [...prev, idx === q.answer ? 1 : 0]);
  };

  const next = () => {
    setSelected(null);
    setCurrent((c) => (c + 1) % quiz.questions.length);
  };

  const score = quiz.questions.length
    ? Math.round((correctCount / quiz.questions.length) * 100)
    : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-text-primary">{quiz.title}</h4>
        <span className="text-xs text-text-secondary">
          سؤال {current + 1} من {quiz.questions.length}
        </span>
      </div>

      <p className="font-medium text-text-primary">{q.question}</p>

      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          const isCorrect = idx === q.answer;
          const isSelected = idx === selected;
          return (
            <button
              key={idx}
              onClick={() => choose(idx)}
              disabled={selected !== null}
              className={cn(
                'w-full text-right px-3 py-2 rounded-xl border text-sm transition-all flex items-center gap-2',
                selected === null
                  ? 'border-border hover:border-primary/50 hover:bg-muted'
                  : isCorrect
                    ? 'border-success bg-success/10 text-success'
                    : isSelected
                      ? 'border-destructive bg-destructive/10 text-destructive'
                      : 'border-border opacity-60'
              )}
            >
              {selected !== null && isCorrect && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
              {selected !== null && isSelected && !isCorrect && <XCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="rounded-xl bg-muted/50 p-3 text-sm">
          <p className="mb-1">
            {selected === q.answer ? (
              <span className="text-success font-medium">✅ إجابة صحيحة!</span>
            ) : (
              <span className="text-destructive font-medium">❌ إجابة خاطئة — الإجابة الصحيحة: {q.options[q.answer]}</span>
            )}
          </p>
          {q.explanation && <p className="text-text-secondary mt-1">{q.explanation}</p>}
        </div>
      )}

      {selected !== null && !isLast && (
        <Button onClick={next} size="sm" className="w-full">
          السؤال التالي
        </Button>
      )}

      {selected !== null && isLast && (
        <div className="space-y-2">
          <div className="rounded-xl bg-primary/10 p-3 text-sm">
            <p className="font-bold text-text-primary mb-1">نتيجة الاختبار 🎯</p>
            <p className="text-text-secondary">
              أجبت بشكل صحيح على {correctCount} من {quiz.questions.length} ({score}%)
            </p>
            <p className="text-text-secondary mt-1">
              {score >= 80
                ? 'أداء رائع! 💪'
                : score >= 50
                  ? 'كويس، بس راجع النقاط اللي غلطت فيها.'
                  : 'تحتاج تراجع الدرس كويس، وارجع جرب تاني.'}
            </p>
          </div>
          <Button
            onClick={() => {
              setCurrent(0);
              setSelected(null);
              setAnswered([]);
            }}
            size="sm"
            variant="outline"
            className="w-full"
          >
            إعادة الاختبار
          </Button>
        </div>
      )}
    </div>
  );
}
