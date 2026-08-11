'use client';

import { AlertTriangle, Clock, X } from 'lucide-react';

interface InsufficientDialogProps {
  open: boolean;
  details: {
    totalMinutes?: number;
    availableMinutes?: number;
    requiredDays?: number;
    studyDays?: number;
    dailyCap?: number;
    message?: string;
    overflowCount?: number;
  } | null;
  onClose: () => void;
}

export function InsufficientDialog({ open, details, onClose }: InsufficientDialogProps) {
  if (!open) return null;

  const hasNumbers = details && typeof details.totalMinutes === 'number';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-surface-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-pop-in">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-warning/10 text-warning rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-text-primary mb-1">الوقت المتاح لا يكفي</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {details?.message ??
                'إجمالي مدة الفيديوهات المختارة أكبر من الوقت الذي حددته. يمكنك تعديل الإعدادات وإعادة المحاولة.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {hasNumbers && (
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-text-secondary mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                مدة المحتوى
              </p>
              <p className="font-bold text-text-primary">{Math.round((details.totalMinutes ?? 0) / 60)} ساعة</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-text-secondary mb-1">الوقت المتاح</p>
              <p className="font-bold text-text-primary">{Math.round((details.availableMinutes ?? 0) / 60)} ساعة</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-text-secondary mb-1">أيام مطلوبة</p>
              <p className="font-bold text-text-primary">{details.requiredDays} يوم</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-text-secondary mb-1">أيام متاحة</p>
              <p className="font-bold text-text-primary">{details.studyDays} يوم</p>
            </div>
          </div>
        )}

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-5">
          <p className="text-sm font-bold text-primary mb-2">حلول مقترحة ✨</p>
          <ul className="text-sm text-text-secondary space-y-1.5 leading-relaxed">
            <li>• قلّل المحتوى (وحدة أو دروس أقل)</li>
            <li>• زد المدة اليومية للمذاكرة</li>
            <li>• مدد تاريخ النهاية</li>
            <li>• اختر خطة مكثفة أو راكبة مع كثافة أعلى</li>
          </ul>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
          >
            رجوع للتعديل
          </button>
        </div>
      </div>
    </div>
  );
}
