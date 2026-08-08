'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Sparkles } from 'lucide-react';
import AccessTypeSelect from '@/components/admin/AccessTypeSelect';

interface TopicItem {
  id: string;
  title: string;
  grade?: string | null;
}

export default function GenerateQuizModal({
  show,
  setShow,
  topics,
  onGenerated,
}: {
  show: boolean;
  setShow: (v: boolean) => void;
  topics: TopicItem[];
  onGenerated?: () => void;
}) {
  const [title, setTitle] = useState('');
  const [topicId, setTopicId] = useState('');
  const [accessType, setAccessType] = useState<'FREE' | 'SUBSCRIBER' | 'PREMIUM'>('FREE');
  const [grade, setGrade] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [passingScore, setPassingScore] = useState('70');
  const [dist, setDist] = useState({ easy: '5', medium: '5', hard: '2' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!show) return null;

  const close = () => {
    setShow(false);
    setError('');
  };

  const generate = async () => {
    if (!title.trim()) {
      setError('اكتب عنوان الاختبار');
      return;
    }
    if (!topicId) {
      setError('اختر الموضوع');
      return;
    }
    const total = Number(dist.easy) + Number(dist.medium) + Number(dist.hard);
    if (!total || total < 1) {
      setError('حدد عدداً من الأسئلة على الأقل');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          topicId,
          accessType,
          grade: grade || null,
          timeLimit: timeLimit ? Number(timeLimit) : null,
          passingScore: Number(passingScore) || 70,
          distribution: {
            easy: Number(dist.easy) || 0,
            medium: Number(dist.medium) || 0,
            hard: Number(dist.hard) || 0,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? 'فشل التوليد');
        setLoading(false);
        return;
      }
      alert(`تم توليد الاختبار بنجاح (${data.data.questions.length} سؤال)`);
      setShow(false);
      setTitle('');
      setTopicId('');
      setDist({ easy: '5', medium: '5', hard: '2' });
      onGenerated?.();
    } catch {
      setError('فشل التوليد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={close}>
      <div
        className="bg-background rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            توليد اختبار تلقائي
          </h3>
          <Button variant="ghost" size="icon" onClick={close}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            سينشئ هذا النموذج اختباراً عشوائياً من الأسئلة الموجودة في بنك الأسئلة حسب المستويات المحددة.
          </p>

          <div>
            <label className="text-sm font-medium mb-2 block">عنوان الاختبار</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: اختبار الفصل الأول" />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">الموضوع</label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
            >
              <option value="">اختر الموضوع</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                  {t.grade ? ` — ${t.grade}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-2 block">عدد الأسئلة السهلة</label>
              <Input
                type="number"
                min="0"
                max="200"
                value={dist.easy}
                onChange={(e) => setDist({ ...dist, easy: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">عدد الأسئلة المتوسطة</label>
              <Input
                type="number"
                min="0"
                max="200"
                value={dist.medium}
                onChange={(e) => setDist({ ...dist, medium: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">عدد الأسئلة الصعبة</label>
            <Input
              type="number"
              min="0"
              max="200"
              value={dist.hard}
              onChange={(e) => setDist({ ...dist, hard: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-2 block">مدة الاختبار (بالدقائق)</label>
              <Input
                type="number"
                min="0"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                placeholder="اختياري"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">درجة النجاح %</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">الصف الدراسي (اختياري)</label>
            <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="مثال: ثالثة إعدادي" />
          </div>

          <AccessTypeSelect value={accessType} onChange={setAccessType} />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={close}>
              إلغاء
            </Button>
            <Button onClick={generate} disabled={loading} className="gap-2">
              <Sparkles className="w-4 h-4" />
              {loading ? 'جاري التوليد...' : 'توليد الاختبار'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
