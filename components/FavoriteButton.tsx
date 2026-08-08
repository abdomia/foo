'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FavoriteButton({
  itemType,
  itemId,
  title,
  context,
  className,
  showLabel = false,
  onToggle,
}: {
  itemType: 'lesson' | 'pdf' | 'question';
  itemId: string;
  title?: string;
  context?: string;
  className?: string;
  showLabel?: boolean;
  onToggle?: (favorited: boolean) => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/favorites?itemType=${itemType}&itemId=${itemId}`);
      const json = await res.json();
      if (json.success) setFavorited(json.data.favorited);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [itemType, itemId]);

  useEffect(() => {
    if (user) fetchStatus();
    else {
      setFavorited(false);
      setLoading(false);
    }
  }, [user, fetchStatus]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setLoading(true);
    try {
      if (favorited) {
        const res = await fetch(`/api/user/favorites?itemType=${itemType}&itemId=${itemId}`, {
          method: 'DELETE',
        });
        const json = await res.json();
        if (json.success) {
          setFavorited(false);
          onToggle?.(false);
        }
      } else {
        const res = await fetch('/api/user/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemType, itemId, title, context }),
        });
        const json = await res.json();
        if (json.success) {
          setFavorited(true);
          onToggle?.(true);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={favorited ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg transition-colors',
        favorited
          ? 'text-yellow-500 hover:text-yellow-600'
          : 'text-text-secondary hover:text-yellow-500',
        className
      )}
    >
      <Star
        className={cn('w-5 h-5', favorited && 'fill-current')}
      />
      {showLabel && (
        <span className="text-sm font-medium">{favorited ? 'محفوظ' : 'حفظ'}</span>
      )}
    </button>
  );
}
