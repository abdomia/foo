'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Sparkles, Link as LinkIcon, FileText, MonitorPlay } from 'lucide-react';
import AccessTypeSelect from '@/components/admin/AccessTypeSelect';

interface TopicItem {
  id: string;
  title: string;
  grade?: string | null;
}

type SourceType = 'pdf' | 'youtube';

function detectSourceType(raw: string): SourceType | null {
  const url = raw.trim();
  if (/\.pdf($|\?)/i.test(url) || /^https?:\/\/.+\.pdf/i.test(url)) return 'pdf';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return null;
}

export default function GenerateQuizFromSourceModal({
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
  const [sourceUrl, setSourceUrl] = useState('');
  const [title, setTitle] = useState('');
  const [topicId, setTopicId] = useState('');
  const [accessType, setAccessType] = useState<'FREE' | 'SUBSCRIBER' | 'PREMIUM'>('FREE');
  const [grade, setGrade] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [passingScore, setPassingScore] = useState('70');
  const [questionCount, setQuestionCount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const detected = useMemo(() => detectSourceType(sourceUrl), [sourceUrl]);

  if (!show) return null;

  const close = () => {
    setShow(false);
    setError('');
  };

  const generate = async () => {
    if (!sourceUrl.trim()) {
      setError('الصق رابط ملف PDF أو فيديو يوتيوب');
      return;
    }
    if (!detected) {
      setError('تعذر التعرف على الرابط. استخدم رابط ملف PDF (ينتهي بـ .pdf) أو رابط يوتيوب.');
      return;
    }
    if (!title.trim()) {
      setError('اكتب عنوان الاختبار');
      return;
    }
    if (!topicId) {
      setError('اختر الموضوع');
      return;
    }
    const count = Number(questionCount);
    if (!count || count < 1 || count > 40) {
      setError('عدد الأسئلة يجب أن يكون بين 1 و 40');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/quizzes/generate-from-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: sourceUrl.trim(),
          sourceType: detected,
          title: title.trim(),
          topicId,
          accessType,
          grade: grade || null,
          timeLimit: timeLimit ? Number(timeLimit) : null,
          passingScore: Number(passingScore) || 70,
          questionCount: count,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? 'فشل التوليد');
        setLoading(false);
        return;
      }
      alert(`تم إنشاء الاختبار "${data.data.title}" بنجاح (${data.generatedCount} سؤال)`);
      setShow(false);
      setSourceUrl('');
      setTitle('');
      setTopicId('');
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
            توليد اختبار من رابط
          </h3>
          <Button variant="ghost" size="icon" onClick={close}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            الصق رابط ملف PDF أو فيديو يوتيوب وسيقوم النظام بقراءة المحتوى وإنشاء اختبار جاهز تلقائياً بدون أي تدخل.
          </p>

          <div>
            <label className="text-sm font-medium mb-2 block">رابط المحتوى (PDF أو يوتيوب)</label>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/file.pdf أو https://youtube.com/watch?v=..."
              dir="ltr"
            />
            {detected && (
              <p className="text-xs mt-2 flex items-center gap-1">
                {detected === 'pdf' ? (
                  <>
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-blue-500">تم التعرف: ملف PDF</span>
                  </>
                ) : (
                  <>
                    <MonitorPlay className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-red-500">تم التعرف: فيديو يوتيوب</span>
                  </>
                )}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-2 block">عنوان الاختبار</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: اختبار الدرس الثاني" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">عدد الأسئلة</label>
              <Input
                type="number"
                min="1"
                max="40"
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
              />
            </div>
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
              <LinkIcon className="w-4 h-4" />
              {loading ? 'جاري التوليد...' : 'إنشاء الاختبار'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
