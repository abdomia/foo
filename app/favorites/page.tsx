'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import {
  Star,
  Play,
  FileText,
  HelpCircle,
  Lock,
  Trash2,
  ArrowLeft,
} from 'lucide-react';

interface FavoriteItem {
  id: string;
  itemId: string;
  type: 'lesson' | 'pdf' | 'question';
  title: string;
  context: string | null;
  description: string;
  locked?: boolean;
  accessType?: string | null;
  difficulty?: string;
  createdAt: string;
  href: string;
}

const TYPE_META = {
  lesson: { label: 'الدروس', icon: Play },
  pdf: { label: 'ملفات PDF', icon: FileText },
  question: { label: 'الأسئلة', icon: HelpCircle },
} as const;

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
};

export default function FavoritesPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch('/api/user/favorites');
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchFavorites();
    else setLoading(false);
  }, [user, fetchFavorites]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  const remove = async (item: FavoriteItem) => {
    try {
      const res = await fetch(`/api/user/favorites?itemType=${item.type}&itemId=${item.itemId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      }
    } catch {
      // ignore
    }
  };

  if (isLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-text-secondary mt-2">جاري تحميل المفضلة...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const groups = (['lesson', 'pdf', 'question'] as const)
    .map((type) => ({ type, meta: TYPE_META[type], items: items.filter((i) => i.type === type) }))
    .filter((g) => g.items.length > 0);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">المفضلة</h1>
            <p className="text-text-secondary mt-1">المواضيع والأسئلة والملفات التي حفظتها</p>
          </div>
          <Link href="/lessons">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              تصفح المحتوى
            </Button>
          </Link>
        </div>

        {groups.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
              <p className="font-bold text-text-primary mb-1">لا توجد عناصر في المفضلة بعد</p>
              <p className="text-text-secondary text-sm mb-4">
                اضغط على أيقونة النجمة في الدروس أو الملفات أو الأسئلة لحفظها هنا
              </p>
              <Link href="/lessons">
                <Button className="gap-2">
                  <Play className="w-4 h-4" />
                  ابدأ بالدروس
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          groups.map(({ type, meta, items: groupItems }) => {
            const Icon = meta.icon;
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="font-bold text-text-primary">{meta.label}</h2>
                  <Badge variant="secondary" className="text-xs">
                    {groupItems.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {groupItems.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              item.locked ? 'bg-muted text-text-secondary' : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {item.locked ? <Lock className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-text-primary">{item.title}</p>
                              {item.locked && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Lock className="w-3 h-3" />
                                  {item.accessType === 'PREMIUM' ? 'مميز' : 'للمشتركين'}
                                </Badge>
                              )}
                              {type === 'question' && item.difficulty && (
                                <Badge variant="secondary" className="text-xs">
                                  {DIFFICULTY_LABELS[item.difficulty] ?? item.difficulty}
                                </Badge>
                              )}
                            </div>
                            {item.context && (
                              <p className="text-sm text-text-secondary mt-0.5">{item.context}</p>
                            )}
                            {item.description && (
                              <p className="text-sm text-text-secondary line-clamp-2">{item.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Link href={item.href}>
                              <Button variant="ghost" size="sm" className="gap-1">
                                فتح
                                <ArrowLeft className="w-3 h-3" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(item)}
                              aria-label="إزالة من المفضلة"
                            >
                              <Trash2 className="w-4 h-4 text-error" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </MainLayout>
  );
}
