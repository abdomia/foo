'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-surface-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-pop-in">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
              tone === 'danger' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'
            )}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-text-primary mb-1">{title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{message}</p>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-muted rounded-lg text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 h-11 rounded-xl font-bold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2',
              tone === 'danger' ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary/90'
            )}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-11 rounded-xl font-bold border border-border text-text-primary hover:bg-muted transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
