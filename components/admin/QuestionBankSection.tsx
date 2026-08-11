'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit2, Trash2, X, Save, Database, Sparkles } from 'lucide-react';
import GenerateQuizFromSourceModal from '@/components/admin/GenerateQuizFromSourceModal';

interface BankQuestion {
  id: string;
  question: string;
  type: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
  explanation?: string | null;
  points: number;
  tags: string[];
  topicId?: string | null;
  lessonId?: string | null;
  topic?: { id: string; title: string; grade?: string | null } | null;
  lesson?: { id: string; title: string } | null;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'bg-green-500/15 text-green-600 border-green-500/30',
  medium: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  hard: 'bg-red-500/15 text-red-600 border-red-500/30',
};

export default function QuestionBankSection({
  topics,
  classFilter,
}: {
  topics: { id: string; title: string; grade?: string | null }[];
  classFilter: string;
}) {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [editing, setEditing] = useState<BankQuestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    question: '',
    type: 'multiple-choice',
    options: ['', ''],
    correctAnswer: '',
    difficulty: 'medium',
    points: '1',
    explanation: '',
    tags: '',
    topicId: '',
    lessonId: '',
  });

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (difficulty) params.set('difficulty', difficulty);
      if (topicFilter) params.set('topicId', topicFilter);
      if (classFilter) params.set('grade', classFilter);

      const res = await fetch(`/api/admin/question-bank?${params.toString()}`);
      const data = await res.json();
      if (data.success) setQuestions(data.data);
      else setError(data.error ?? 'حدث خطأ');
    } catch {
      setError('حدث خطأ في جلب الأسئلة');
    } finally {
      setLoading(false);
    }
  }, [search, difficulty, topicFilter, classFilter]);

  useEffect(() => {
    const t = setTimeout(fetchQuestions, 300);
    return () => clearTimeout(t);
  }, [fetchQuestions]);

  const resetForm = () => {
    setForm({
      question: '',
      type: 'multiple-choice',
      options: ['', ''],
      correctAnswer: '',
      difficulty: 'medium',
      points: '1',
      explanation: '',
      tags: '',
      topicId: '',
      lessonId: '',
    });
    setEditing(null);
    setError('');
  };

  const openEdit = (q: BankQuestion) => {
    setEditing(q);
    setForm({
      question: q.question,
      type: q.type,
      options: q.options.length ? q.options : ['', ''],
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty || 'medium',
      points: String(q.points ?? 1),
      explanation: q.explanation ?? '',
      tags: Array.isArray(q.tags) ? q.tags.join(', ') : '',
      topicId: q.topicId ?? '',
      lessonId: q.lessonId ?? '',
    });
    setError('');
    setShowForm(true);
  };

  const setOption = (index: number, value: string) => {
    const next = [...form.options];
    next[index] = value;
    setForm({ ...form, options: next });
  };

  const addOption = () => {
    if (form.options.length >= 10) return;
    setForm({ ...form, options: [...form.options, ''] });
  };

  const removeOption = (index: number) => {
    if (form.options.length <= 2) return;
    setForm({ ...form, options: form.options.filter((_, i) => i !== index) });
  };

  const saveQuestion = async () => {
    if (!form.question.trim()) {
      setError('اكتب نص السؤال');
      return;
    }
    const options = form.options.map((o) => o.trim()).filter(Boolean);
    if (options.length < 2) {
      setError('أضف خيارين على الأقل');
      return;
    }
    if (!form.correctAnswer.trim()) {
      setError('حدد الإجابة الصحيحة');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        question: form.question.trim(),
        type: form.type,
        options,
        correctAnswer: form.correctAnswer.trim(),
        difficulty: form.difficulty,
        points: Number(form.points) || 1,
        explanation: form.explanation.trim() || null,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 10),
        topicId: form.topicId || null,
        lessonId: form.lessonId || null,
      };

      const url = editing
        ? `/api/admin/question-bank/${editing.id}`
        : '/api/admin/question-bank';
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? 'فشل الحفظ');
        setSaving(false);
        return;
      }
      setShowForm(false);
      resetForm();
      fetchQuestions();
    } catch {
      setError('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (q: BankQuestion) => {
    if (!confirm('هل تريد حذف هذا السؤال؟')) return;
    try {
      const res = await fetch(`/api/admin/question-bank/${q.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        alert(data.error ?? 'فشل الحذف');
        return;
      }
      setQuestions((prev) => prev.filter((x) => x.id !== q.id));
    } catch {
      alert('فشل الحذف');
    }
  };

  const selectedTopicLessons = topics.find((t) => t.id === form.topicId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          بنك الأسئلة
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowSourceModal(true)}
            size="sm"
            variant="outline"
            className="gap-2 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
          >
            <Sparkles className="w-4 h-4" />
            توليد من رابط
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            إضافة سؤال
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3 mb-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في الأسئلة أو الوسوم..."
              className="pr-10"
            />
          </div>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border bg-card text-foreground"
          >
            <option value="">كل المستويات</option>
            <option value="easy">سهل</option>
            <option value="medium">متوسط</option>
            <option value="hard">صعب</option>
          </select>
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border bg-card text-foreground"
          >
            <option value="">كل الموضوعات</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p>لا توجد أسئلة مطابقة</p>
            <p className="text-sm mt-2">أضف أسئلة من هذا البنك لتوليد اختبارات تلقائياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q) => {
              const isTrueFalse = q.type === 'true-false';
              return (
                <div key={q.id} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${DIFFICULTY_STYLES[q.difficulty] ?? DIFFICULTY_STYLES.medium}`}
                        >
                          {DIFFICULTY_LABELS[q.difficulty] ?? 'متوسط'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {isTrueFalse ? 'صح/خطأ' : 'اختيار من متعدد'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{q.points ?? 1} نقطة</span>
                        {q.topic && (
                          <span className="text-xs text-muted-foreground">
                            {q.topic.title}
                            {q.topic.grade ? ` — ${q.topic.grade}` : ''}
                          </span>
                        )}
                        {q.lesson && (
                          <span className="text-xs text-muted-foreground">| درس: {q.lesson.title}</span>
                        )}
                      </div>
                      <p className="font-medium">{q.question}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {q.options.map((opt, i) => (
                          <span
                            key={i}
                            className={`text-xs px-2 py-1 rounded ${
                              opt === q.correctAnswer
                                ? 'bg-green-500/15 text-green-600 border border-green-500/30'
                                : 'bg-card border border-border text-muted-foreground'
                            }`}
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="text-sm text-muted-foreground mt-2">شرح: {q.explanation}</p>
                      )}
                      {q.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {q.tags.map((tag) => (
                            <span key={tag} className="text-xs text-muted-foreground">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(q)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowForm(false)}>
          <div
            className="bg-background rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{editing ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">نص السؤال</label>
                <textarea
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">النوع</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                  >
                    <option value="multiple-choice">اختيار من متعدد</option>
                    <option value="true-false">صح/خطأ</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">المستوى</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                  >
                    <option value="easy">سهل</option>
                    <option value="medium">متوسط</option>
                    <option value="hard">صعب</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">الخيارات</label>
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="radio"
                        name="correct"
                        checked={form.correctAnswer === opt}
                        onChange={() => setForm({ ...form, correctAnswer: opt })}
                        className="ml-2"
                      />
                      <Input
                        value={opt}
                        onChange={(e) => setOption(i, e.target.value)}
                        placeholder={`الخيار ${i + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(i)}
                        disabled={form.options.length <= 2}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-2" onClick={addOption} disabled={form.options.length >= 10}>
                  + إضافة خيار
                </Button>
                <p className="text-xs text-muted-foreground mt-1">حدد الإجابة الصحيحة بالنقر على الدائرة</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">الدرجة</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={form.points}
                    onChange={(e) => setForm({ ...form, points: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">الوسوم (مفصولة بفاصلة)</label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="مراجعة, امتحانات"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">الموضوع</label>
                  <select
                    value={form.topicId}
                    onChange={(e) => setForm({ ...form, topicId: e.target.value, lessonId: '' })}
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                  >
                    <option value="">بدون موضوع</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">الدرس</label>
                  <select
                    value={form.lessonId}
                    onChange={(e) => setForm({ ...form, lessonId: e.target.value })}
                    className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                    disabled={!form.topicId}
                  >
                    <option value="">بدون درس</option>
                    {selectedTopicLessons &&
                      Array.isArray((selectedTopicLessons as unknown as { lessons?: unknown }).lessons) &&
                      (selectedTopicLessons as unknown as { lessons?: { id: string; title: string }[] }).lessons?.map(
                        (l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        )
                      )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">الشرح (اختياري)</label>
                <textarea
                  value={form.explanation}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground min-h-[60px]"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  إلغاء
                </Button>
                <Button onClick={saveQuestion} disabled={saving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <GenerateQuizFromSourceModal
        show={showSourceModal}
        setShow={setShowSourceModal}
        topics={topics}
        onGenerated={fetchQuestions}
      />
    </Card>
  );
}
