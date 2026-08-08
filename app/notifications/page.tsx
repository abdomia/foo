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
  Bell,
  Megaphone,
  BookOpen,
  FileText,
  ClipboardList,
  Trophy,
  Star,
  CreditCard,
  ArrowLeft,
  CheckCheck,
} from 'lucide-react';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_META: Record<string, { label: string; icon: typeof Bell }> = {
  new_lesson: { label: 'دروس', icon: BookOpen },
  new_quiz: { label: 'اختبارات', icon: ClipboardList },
  new_pdf: { label: 'ملفات', icon: FileText },
  announcement: { label: 'إعلان', icon: Megaphone },
  subscription_expiring: { label: 'الاشتراك', icon: CreditCard },
  quiz_result: { label: 'نتائج', icon: Star },
  achievement: { label: 'إنجاز', icon: Trophy },
};

function formatRelative(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} يوم`;
  return new Date(dateStr).toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/user/notifications');
      const json = await res.json();
      if (json.success) setNotifications(json.data.notifications);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchNotifications();
    else setLoading(false);
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  const toggleRead = async (n: AppNotification) => {
    const next = !n.read;
    setNotifications((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read: next } : x)),
    );
    try {
      await fetch(`/api/user/notifications/${n.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: next }),
      });
    } catch {
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: n.read } : x)),
      );
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    try {
      await fetch('/api/user/notifications/read-all', { method: 'POST' });
    } catch {
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">الإشعارات</h1>
            <p className="text-text-secondary mt-1">
              {unreadCount > 0
                ? `لديك ${unreadCount} إشعار غير مقروء`
                : 'لا توجد إشعارات غير مقروءة'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={markAllRead}
                disabled={markingAll}
              >
                <CheckCheck className="w-4 h-4" />
                تعليم الكل كمقروء
              </Button>
            )}
            <Link href="/lessons">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                العودة للدروس
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-text-secondary mt-2">جاري تحميل الإشعارات...</p>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-primary" />
              </div>
              <p className="font-bold text-text-primary mb-1">لا توجد إشعارات بعد</p>
              <p className="text-text-secondary text-sm">
                سنخبرك بكل جديد: الدروس والاختبارات والملفات والإعلانات
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const meta = TYPE_META[n.type] ?? { label: 'تنبيه', icon: Bell };
              const Icon = meta.icon;
              return (
                <Card
                  key={n.id}
                  className={`overflow-hidden transition-colors ${
                    n.read ? 'opacity-70' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          n.read ? 'bg-muted text-text-secondary' : 'bg-primary/10 text-primary'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`font-bold ${n.read ? 'text-text-secondary' : 'text-text-primary'}`}>
                            {n.title}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {meta.label}
                          </Badge>
                          {!n.read && <span className="w-2 h-2 bg-primary rounded-full" />}
                        </div>
                        {n.body && (
                          <p className="text-sm text-text-secondary mt-0.5">{n.body}</p>
                        )}
                        <p className="text-xs text-text-secondary/70 mt-1">
                          {formatRelative(n.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {n.link && (
                          <Link href={n.link}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              onClick={() => {
                                if (!n.read) toggleRead(n);
                              }}
                            >
                              فتح
                              <ArrowLeft className="w-3 h-3" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRead(n)}
                          aria-label={n.read ? 'تعليم كغير مقروء' : 'تعليم كمقروء'}
                        >
                          {n.read ? 'غير مقروء' : 'مقروء'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
