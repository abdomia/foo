'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  BookOpen,
  PenTool,
  ClipboardList,
  TrendingUp,
  X,
  Menu,
  Sun,
  Moon,
  LogIn,
  UserPlus,
  LogOut,
  Crown,
  Settings,
  ChevronDown,
  User,
  FileText,
  Lightbulb,
  Map,
  Search,
  Star,
  Bell,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/components/AuthProvider';
import { getClassByKey } from '@/lib/classes';
const navItems = [
  { href: '/', label: 'الرئيسية', icon: Home },
  { href: '/lessons', label: 'الدروس', icon: BookOpen },
  { href: '/pdfs', label: 'PDFs', icon: FileText },
  { href: '/quizzes', label: 'الاختبارات', icon: ClipboardList },
  { href: '/search', label: 'البحث', icon: Search },
  { href: '/favorites', label: 'المفضلة', icon: Star },
  { href: '/path', label: 'خطتي', icon: Map },
  { href: '/progress', label: 'تطويري', icon: TrendingUp },
  { href: '/advice', label: 'نصائحي لك', icon: Lightbulb },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const loadUnread = async () => {
      try {
        const res = await fetch('/api/user/notifications');
        const json = await res.json();
        if (active && json.success) setUnreadCount(json.data.unreadCount);
      } catch {
        // ignore
      }
    };
    const loadGamification = async () => {
      try {
        const res = await fetch('/api/user/gamification');
        const json = await res.json();
        if (active && json.success) {
          setStreak(json.data.streak);
          setLevel(json.data.level);
        }
      } catch {
        // ignore
      }
    };
    loadUnread();
    loadGamification();
    const interval = setInterval(() => {
      loadUnread();
      loadGamification();
    }, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  // Removed refreshUser call to prevent infinite loop

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    router.push('/');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-surface rounded-lg shadow-md"
      >
        <Menu className="w-6 h-6 text-text-primary" />
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 h-full w-64 bg-surface-card z-50 transition-transform duration-300',
          'left-0 border-r border-border -translate-x-full lg:translate-x-0 lg:right-0 lg:left-auto lg:border-l',
          isOpen ? 'translate-x-0' : ''
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">إ</span>
                </div>
                <div>
                  <h1 className="font-bold text-lg text-text-primary">الرائد</h1>
                  <p className="text-xs text-text-secondary">
                    {getClassByKey(user?.grade)?.name || 'كل الصفوف'}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-1 hover:bg-muted rounded"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
          </div>

            <nav className="flex-1 p-4">
              <ul className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                        isActive
                          ? 'bg-primary text-white shadow-md'
                          : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
              {user && (
                <li>
                  <Link
                    href="/notifications"
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                      pathname === '/notifications'
                        ? 'bg-primary text-white shadow-md'
                        : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                    )}
                  >
                    <div className="relative">
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -left-1.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="font-medium">الإشعارات</span>
                  </Link>
                </li>
              )}
              {user?.isAdmin && (
                <li>
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                      pathname.startsWith('/admin')
                        ? 'bg-primary text-white shadow-md'
                        : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                    )}
                  >
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">لوحة التحكم</span>
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          <div className="p-4 border-t border-border space-y-3">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted hover:bg-border transition-colors"
            >
              <span className="font-medium text-text-primary">المظهر</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">{theme === 'dark' ? 'داكن' : 'فاتح'}</span>
                <div className={cn(
                  'w-9 h-5 rounded-full p-0.5 transition-colors duration-300 flex items-center',
                  theme === 'dark' ? 'bg-primary justify-end' : 'bg-text-muted justify-start'
                )}>
                  <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
                    {theme === 'dark' ? (
                      <Moon className="w-2.5 h-2.5 text-primary" />
                    ) : (
                      <Sun className="w-2.5 h-2.5 text-warning" />
                    )}
                  </div>
                </div>
              </div>
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-l from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20">
                        <Image
                          src={user.avatar}
                          alt={user.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20">
                        <Image
                          src="/bar.png"
                          alt="منصة الرائد"
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="text-right">
                      <p className="font-medium text-text-primary text-sm">{user.name}</p>
                    </div>
                  </div>
                  <ChevronDown className={cn(
                    'w-4 h-4 text-text-secondary transition-transform',
                    showUserMenu && 'rotate-180'
                  )} />
                </button>

                {showUserMenu && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in">
                    {user.isSubscribed ? (
                      <div className="px-4 py-3 bg-success/10 border-b border-border">
                        <div className="flex items-center gap-2 text-success">
                          <Crown className="w-4 h-4" />
                          <span className="text-sm font-medium">مشترك {user.subscriptionPlan === 'yearly' ? 'سنوي' : 'شهري'}</span>
                        </div>
                      </div>
                    ) : (
                      <Link
                        href="/subscribe"
                        onClick={() => {
                          setShowUserMenu(false);
                          setIsOpen(false);
                        }}
                        className="flex items-center gap-2 px-4 py-3 text-warning hover:bg-warning/10 transition-colors"
                      >
                        <Crown className="w-4 h-4" />
                        <span className="text-sm font-medium">اشترك الآن</span>
                      </Link>
                    )}
                    <Link
                      href="/progress"
                      onClick={() => {
                        setShowUserMenu(false);
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-2 px-4 py-3 text-text-secondary hover:bg-muted transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm">الإعدادات</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-error hover:bg-error/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">تسجيل الخروج</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/auth/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="font-medium">تسجيل الدخول</span>
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-text-primary hover:bg-muted transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="font-medium">إنشاء حساب</span>
                </Link>
              </div>
            )}

            <div className="bg-gradient-to-l from-primary/10 to-accent/10 rounded-xl p-4">
              <p className="text-sm text-text-secondary mb-2">المستوى {level} · تعلم كل يوم</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <span className="font-bold text-text-primary">{streak} أيام متتالية</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
