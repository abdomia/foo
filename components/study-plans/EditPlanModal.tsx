'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, X } from 'lucide-react';
import { WEEK_ORDER, WEEKDAY_LABELS, INTENSITY_LABELS, CONTENT_TYPE_LABELS, type ContentType, type StudyIntensity } from '@/lib/study-plans/types';

interface EditPlanModalProps {
  open: boolean;
  current: {
    endDate: string;
    dailyMinutes: number;
    selectedDays: number[];
    contentType: string;
    studyIntensity: string;
  };
  onClose: () => void;
  onSave: (changes: {
    endDate: string;
    dailyMinutes: number;
    selectedDays: number[];
    contentType: ContentType;
    studyIntensity: StudyIntensity;
  }) => Promise<void>;
}

const DAY_MINUTES_OPTIONS = [30, 45, 60, 90, 120, 180];

export function EditPlanModal({ open, current, onClose, onSave }: EditPlanModalProps) {
  const [endDate, setEndDate] = useState(current.endDate);
  const [dailyMinutes, setDailyMinutes] = useState(current.dailyMinutes);
  const [selectedDays, setSelectedDays] = useState<number[]>(current.selectedDays);
  const [contentType, setContentType] = useState<ContentType>(current.contentType as ContentType);
  const [studyIntensity, setStudyIntensity] = useState<StudyIntensity>(current.studyIntensity as StudyIntensity);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      setError('اختر يوم مذاكرة واحداً على الأقل');
      return;
    }
    if (!endDate) {
      setError('حدد تاريخ النهاية');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ endDate, dailyMinutes, selectedDays, contentType, studyIntensity });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fade-in overflow-y-auto">
      <div className="bg-surface-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 my-8 animate-pop-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-text-primary">تعديل الخطة</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-text-primary mb-1.5">تاريخ النهاية</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-text-primary mb-2">المدة اليومية</label>
            <div className="grid grid-cols-3 gap-2">
              {DAY_MINUTES_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDailyMinutes(m)}
                  className={cn(
                    'h-10 rounded-xl border-2 text-sm font-bold transition-colors',
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

          <div>
            <label className="block text-sm font-bold text-text-primary mb-2">أيام المذاكرة</label>
            <div className="grid grid-cols-4 gap-2">
              {WEEK_ORDER.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'h-10 rounded-xl border-2 text-xs font-bold transition-colors',
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
            <label className="block text-sm font-bold text-text-primary mb-2">نوع المحتوى</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setContentType(t)}
                  className={cn(
                    'h-11 rounded-xl border-2 text-sm font-bold px-2 transition-colors',
                    contentType === t
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-secondary hover:border-primary/40'
                  )}
                >
                  {CONTENT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-text-primary mb-2">شدة الخطة</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(INTENSITY_LABELS) as StudyIntensity[]).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStudyIntensity(i)}
                  className={cn(
                    'h-11 rounded-xl border-2 text-sm font-bold transition-colors',
                    studyIntensity === i
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-secondary hover:border-primary/40'
                  )}
                >
                  {INTENSITY_LABELS[i]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-error bg-error/10 rounded-xl p-3">{error}</p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-11 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            حفظ التغييرات
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-11 rounded-xl border border-border text-text-primary font-bold hover:bg-muted transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
