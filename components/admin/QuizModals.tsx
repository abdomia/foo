'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Save, X, Check } from 'lucide-react';
import AccessTypeSelect from '@/components/admin/AccessTypeSelect';

interface QuizFormQuestion {
  question: string;
  type: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
  explanation: string;
  imageUrl: string;
}

interface QuizFormData {
  title: string;
  description: string;
  accessType: string;
  timeLimit: string;
  passingScore: string;
  grade: string;
  questions: QuizFormQuestion[];
}

interface TopicOption {
  id: string;
  title: string;
}

export interface Quiz {
  id?: string;
  title: string;
  description?: string | null;
  topicId?: string;
  accessType?: string;
  timeLimit?: number | null;
  passingScore?: number | null;
  grade?: string | null;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id?: string;
  question: string;
  type: string;
  difficulty?: string;
  explanation?: string | null;
  options: string[];
  correctAnswer: string;
}

const quizFormInit: QuizFormData = {
  title: '',
  description: '',
  accessType: 'FREE',
  timeLimit: '',
  passingScore: '70',
  grade: '',
  questions: [],
};

interface QuizFormModalProps {
  showQuizForm: boolean;
  setShowQuizForm: (show: boolean) => void;
  topics: TopicOption[];
  selectedTopicId?: string | null;
  onSave: (quiz: Quiz) => void;
}

export function QuizFormModal({ showQuizForm, setShowQuizForm, topics, selectedTopicId: initialTopicId, onSave }: QuizFormModalProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(initialTopicId || null);
  const [quizForm, setQuizForm] = useState<QuizFormData>(quizFormInit);

  const addQuestion = () => {
    setQuizForm({
      ...quizForm,
      questions: [
        ...quizForm.questions,
        { 
          question: '', 
          type: 'multiple-choice', 
          options: ['', '', '', ''], 
          correctAnswer: '',
          difficulty: 'medium',
          explanation: '',
          imageUrl: '' // Add image URL field
        },
      ],
    });
  };

  const updateQuestion = (index: number, field: string, value: string | string[]) => {
    const newQuestions = [...quizForm.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuizForm({ ...quizForm, questions: newQuestions });
  };

  const removeQuestion = (index: number) => {
    setQuizForm({ ...quizForm, questions: quizForm.questions.filter((_, i: number) => i !== index) });
  };

  const handleSave = () => {
    if (!selectedTopicId || !quizForm.title || quizForm.questions.length === 0) {
      if (!selectedTopicId) alert('يرجى اختيار الموضوع');
      else if (!quizForm.title) alert('يرجى إدخال عنوان الاختبار');
      else alert('يرجى إضافة سؤال واحد على الأقل');
      return;
    }
    onSave({
      ...quizForm,
      topicId: selectedTopicId,
      timeLimit: quizForm.timeLimit ? parseInt(quizForm.timeLimit) : null,
      passingScore: parseInt(quizForm.passingScore),
      grade: quizForm.grade || null,
      accessType: quizForm.accessType || 'FREE',
    });
    setQuizForm(quizFormInit);
    setShowQuizForm(false);
  };

  if (!showQuizForm) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>إضافة اختبار جديد</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowQuizForm(false)}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-sm font-medium mb-2 block">عنوان الاختبار</label>
            <Input
              value={quizForm.title}
              onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
              placeholder="مثال: اختبار مقاييس النزعة المركزية"
              className="bg-card border-border text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">الموضوع</label>
            <select
              value={selectedTopicId || ''}
              onChange={(e) => setSelectedTopicId(e.target.value || null)}
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground"
            >
              <option value="">اختر الموضوع</option>
              {topics.map((t: TopicOption) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">الوصف</label>
            <Input
              value={quizForm.description}
              onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
              placeholder="وصف الاختبار"
              className="bg-card border-border text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">السنة الدراسية</label>
            <select
              value={quizForm.grade}
              onChange={(e) => setQuizForm({ ...quizForm, grade: e.target.value })}
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground"
            >
              <option value="">كل السنوات</option>
              <option value="third_preparatory">الصف الثالث الاعدادي</option>
                  <option value="first_secondary">الصف الأول الثانوي</option>
              <option value="second_secondary">الصف الثاني الثانوي (بكالوريا)</option>
              <option value="third_secondary_math">الصف الثالث الثانوي (علمي رياضة)</option>
              <option value="third_secondary_literary">الصف الثالث الثانوي (الشعبة الادبية)</option>
            </select>
          </div>
          <AccessTypeSelect
            value={quizForm.accessType}
            onChange={(v) => setQuizForm({ ...quizForm, accessType: v })}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">الوقت (دقائق)</label>
              <Input
                type="number"
                value={quizForm.timeLimit}
                onChange={(e) => setQuizForm({ ...quizForm, timeLimit: e.target.value })}
                placeholder="اختياري"
                className="bg-card border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">درجة النجاح (%)</label>
              <Input
                type="number"
                value={quizForm.passingScore}
                onChange={(e) => setQuizForm({ ...quizForm, passingScore: e.target.value })}
                className="bg-card border-border text-foreground"
              />
            </div>
          </div>
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium">الأسئلة</label>
              <Button type="button" onClick={addQuestion} size="sm" variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة سؤال
              </Button>
            </div>
            {quizForm.questions.map((q: QuizFormQuestion, index: number) => (
              <div key={index} className="bg-muted/50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">سؤال {index + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(index)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <Input
                  value={q.question}
                  onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                  placeholder="نص السؤال"
                  className="bg-card border-border text-foreground mb-2"
                />
                <select
                  value={q.type}
                  onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground mb-2"
                >
                  <option value="multiple-choice">اختيار من متعدد</option>
                  <option value="true-false">صح أو خطأ</option>
                </select>
                <select
                  value={q.difficulty || 'medium'}
                  onChange={(e) => updateQuestion(index, 'difficulty', e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground mb-2"
                >
                  <option value="easy">سهل</option>
                  <option value="medium">متوسط</option>
                  <option value="hard">صعب</option>
                </select>
                <Input
                  value={q.explanation || ''}
                  onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                  placeholder="شرح الإجابة (يظهر بعد الاختبار)"
                  className="bg-card border-border text-foreground mb-2"
                />
  {q.type === 'multiple-choice' && (
    <>
      <div className="mb-3">
        <label className="text-sm font-medium mb-1 block">رابط صورة السؤال (اختياري)</label>
        <Input
          value={q.imageUrl || ''}
          onChange={(e) => updateQuestion(index, 'imageUrl', e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="bg-card border-border text-foreground"
        />
        {q.imageUrl && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.imageUrl} alt="السؤال" className="max-w-xs rounded border border-gray-300" />
          </div>
        )}
      </div>
      <div className="space-y-2">
        {q.options.map((opt: string, optIndex: number) => (
          <div key={optIndex} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${index}`}
              checked={q.correctAnswer === opt}
              onChange={() => updateQuestion(index, 'correctAnswer', opt)}
              className="accent-primary"
            />
            <Input
              value={opt}
              onChange={(e) => {
                const newOptions = [...q.options];
                newOptions[optIndex] = e.target.value;
                updateQuestion(index, 'options', newOptions);
              }}
              placeholder={`الخيار ${optIndex + 1}`}
              className="bg-card border-border text-foreground"
            />
          </div>
        ))}
      </div>
    </>
  )}
                {q.type === 'true-false' && (
                  <div className="flex gap-4">
                    {['صحيح', 'خطأ'].map((opt: string) => (
                      <label key={opt} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${index}`}
                          checked={q.correctAnswer === opt}
                          onChange={() => updateQuestion(index, 'correctAnswer', opt)}
                          className="accent-primary"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowQuizForm(false)} className="flex-1">
              إلغاء
            </Button>
            <Button onClick={handleSave} className="flex-1 gap-2" disabled={!quizForm.title || quizForm.questions.length === 0}>
              <Check className="w-4 h-4" />
              حفظ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface EditQuizModalProps {
  editingQuiz: Quiz | null;
  setEditingQuiz: (quiz: Quiz | null) => void;
  onSave: (quiz: Quiz) => void;
}

export function EditQuizModal({ editingQuiz, setEditingQuiz, onSave }: EditQuizModalProps) {
  if (!editingQuiz) return null;

  const handleSave = () => {
    onSave(editingQuiz);
    setEditingQuiz(null);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>تعديل الاختبار</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setEditingQuiz(null)}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-sm font-medium mb-2 block">عنوان الاختبار</label>
            <Input
              value={editingQuiz.title}
              onChange={(e) => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
              className="bg-card border-border text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">الوصف</label>
            <Input
              value={editingQuiz.description || ''}
              onChange={(e) => setEditingQuiz({ ...editingQuiz, description: e.target.value })}
              className="bg-card border-border text-foreground"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">الوقت (دقائق)</label>
              <Input
                type="number"
                value={editingQuiz.timeLimit || ''}
                onChange={(e) => setEditingQuiz({ ...editingQuiz, timeLimit: e.target.value ? parseInt(e.target.value) : null })}
                className="bg-card border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">درجة النجاح (%)</label>
            <Input
              type="number"
              value={editingQuiz.passingScore || ''}
              onChange={(e) => setEditingQuiz({ ...editingQuiz, passingScore: parseInt(e.target.value) })}
              className="bg-card border-border text-foreground"
            />
          </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">السنة الدراسية</label>
            <select
              value={editingQuiz.grade || ''}
              onChange={(e) => setEditingQuiz({ ...editingQuiz, grade: e.target.value || null })}
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground"
            >
              <option value="">كل السنوات</option>
              <option value="third_preparatory">الصف الثالث الاعدادي</option>
                  <option value="first_secondary">الصف الأول الثانوي</option>
              <option value="second_secondary">الصف الثاني الثانوي (بكالوريا)</option>
              <option value="third_secondary_math">الصف الثالث الثانوي (علمي رياضة)</option>
              <option value="third_secondary_literary">الصف الثالث الثانوي (الشعبة الادبية)</option>
            </select>
          </div>
          <AccessTypeSelect
            value={editingQuiz.accessType || 'FREE'}
            onChange={(v) => setEditingQuiz({ ...editingQuiz, accessType: v })}
          />
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium">الأسئلة</label>
              <Button
                type="button"
                onClick={() => setEditingQuiz({ ...editingQuiz, questions: [...editingQuiz.questions, { question: '', type: 'multiple-choice', options: ['', '', '', ''], correctAnswer: '', difficulty: 'medium', explanation: '' }] })}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة سؤال
              </Button>
            </div>
            {editingQuiz.questions.map((q: QuizQuestion, index: number) => (
              <div key={q.id || index} className="bg-muted/50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">سؤال {index + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditingQuiz({ ...editingQuiz, questions: editingQuiz.questions.filter((_, i: number) => i !== index) })}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <Input
                  value={q.question}
                  onChange={(e) => { const nq = [...editingQuiz.questions]; nq[index].question = e.target.value; setEditingQuiz({ ...editingQuiz, questions: nq }); }}
                  placeholder="نص السؤال"
                  className="bg-card border-border text-foreground mb-2"
                />
                <select
                  value={q.type}
                  onChange={(e) => { const nq = [...editingQuiz.questions]; nq[index].type = e.target.value; setEditingQuiz({ ...editingQuiz, questions: nq }); }}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground mb-2"
                >
                  <option value="multiple-choice">اختيار من متعدد</option>
                  <option value="true-false">صح أو خطأ</option>
                </select>
                <select
                  value={q.difficulty || 'medium'}
                  onChange={(e) => { const nq = [...editingQuiz.questions]; nq[index].difficulty = e.target.value; setEditingQuiz({ ...editingQuiz, questions: nq }); }}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground mb-2"
                >
                  <option value="easy">سهل</option>
                  <option value="medium">متوسط</option>
                  <option value="hard">صعب</option>
                </select>
                <Input
                  value={q.explanation || ''}
                  onChange={(e) => { const nq = [...editingQuiz.questions]; nq[index].explanation = e.target.value; setEditingQuiz({ ...editingQuiz, questions: nq }); }}
                  placeholder="شرح الإجابة (يظهر بعد الاختبار)"
                  className="bg-card border-border text-foreground mb-2"
                />
                {q.type === 'multiple-choice' && (
                  <div className="space-y-2">
                    {(q.options || []).map((opt: string, optIndex: number) => (
                      <div key={optIndex} className="flex items-center gap-2">
                        <input type="radio" name={`edit-correct-${index}`} checked={q.correctAnswer === opt} onChange={() => { const nq = [...editingQuiz.questions]; nq[index].correctAnswer = opt; setEditingQuiz({ ...editingQuiz, questions: nq }); }} className="accent-primary" />
                        <Input value={opt} onChange={(e) => { const nq = [...editingQuiz.questions]; nq[index].options[optIndex] = e.target.value; setEditingQuiz({ ...editingQuiz, questions: nq }); }} placeholder={`الخيار ${optIndex + 1}`} className="bg-card border-border text-foreground" />
                      </div>
                    ))}
                  </div>
                )}
                {q.type === 'true-false' && (
                  <div className="flex gap-4">
                    {['صحيح', 'خطأ'].map((opt: string) => (
                      <label key={opt} className="flex items-center gap-2">
                        <input type="radio" name={`edit-correct-${index}`} checked={q.correctAnswer === opt} onChange={() => { const nq = [...editingQuiz.questions]; nq[index].correctAnswer = opt; setEditingQuiz({ ...editingQuiz, questions: nq }); }} className="accent-primary" />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditingQuiz(null)} className="flex-1">
              إلغاء
            </Button>
            <Button onClick={handleSave} className="flex-1 gap-2">
              <Save className="w-4 h-4" />
              حفظ التغييرات
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}