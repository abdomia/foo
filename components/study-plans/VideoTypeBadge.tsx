'use client';

import { cn } from '@/lib/utils';
import { VIDEO_TYPE_LABELS, type VideoType } from '@/lib/study-plans/types';

const BADGE_COLORS: Record<VideoType, string> = {
  explanation: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  practice: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
  review: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
  exam: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
};

export function VideoTypeBadge({ type, className }: { type: string; className?: string }) {
  const t = (Object.keys(VIDEO_TYPE_LABELS) as VideoType[]).includes(type as VideoType)
    ? (type as VideoType)
    : 'explanation';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold',
        BADGE_COLORS[t],
        className
      )}
    >
      {VIDEO_TYPE_LABELS[t]}
    </span>
  );
}
