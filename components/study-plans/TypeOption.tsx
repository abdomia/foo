'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface TypeOptionProps {
  value: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
}

export function TypeOption({ value, label, description, icon, selected, onClick, color = 'bg-primary/10 text-primary', disabled }: TypeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative text-right p-4 rounded-2xl border-2 transition-all duration-200 text-left w-full',
        selected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border hover:border-primary/40 hover:bg-muted/40',
        disabled && 'opacity-40 pointer-events-none'
      )}
    >
      {selected && (
        <span className="absolute top-3 left-3 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center animate-pop-in">
          <Check className="w-4 h-4" />
        </span>
      )}
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-2', color)}>{icon}</div>
      <p className="font-bold text-text-primary">{label}</p>
      {description && <p className="text-xs text-text-secondary mt-1 leading-relaxed">{description}</p>}
    </button>
  );
}
