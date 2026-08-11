'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/AuthProvider';
import { DevicesSection } from '@/components/profile/DevicesSection';
import { getClassByKey } from '@/lib/classes';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  Zap,
  Trophy,
  Flame,
  BookOpen,
  ClipboardList,
  Target,
  Clock,
  Camera,
  Crown,
  Settings,
} from 'lucide-react';

interface GamificationData {
  level: number;
  totalXp: number;
  streak: number;
  streakBest: number;
  questionsAnswered: number;
  quizzesTaken: number;
  unitsCompleted: number;
}

interface ProgressStats {
  lessonsCompleted: number;
  totalLessons: number;
  completionPercent: number;
  quizzesTaken: number;
  averageQuizScore: number;
  totalHours: number;
  learningMinutes: number;
  streak: number;
}

function formatDate(iso?: string): string {
  if (!iso) return 'غير معروف';
  return new Date(iso).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatLearningTime(hours: number, minutes: number): string {
  if (hours >= 1) {
    const h = Math.floor(hours);
    const m = minutes - h * 60;
    return m > 0 ? `${h} ساعة ${m} دقيقة` : `${h} ساعة`;
  }
  return `${minutes} دقيقة`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, updateAvatar, refreshUser } = useAuth();
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [progress, setProgress] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/user/gamification');
      const json = await res.json();
      if (json.success) setGamification(json.data);
    } catch {
      // ignore
    }
    try {
      const res = await fetch('/api/user/progress');
      const json = await res.json();
      if (json.success) setProgress(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
    else setLoading(false);
  }, [user, fetchData]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً. الحد الأقصى 2 ميجابايت');
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      updateAvatar(dataUrl);
      setTimeout(() => {
        refreshUser();
        setUploading(false);
      }, 500);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!user) return null;

  const classLabel = getClassByKey(user.grade)?.name ?? 'لم يحدد الصف';

  const stats: { label: string; value: string; icon: typeof Zap }[] = [
    { label: 'نقاط الخبرة XP', value: String(gamification?.totalXp ?? 0), icon: Zap },
    { label: 'المستوى', value: String(gamification?.level ?? 1), icon: Trophy },
    { label: 'أيام متتالية', value: String(gamification?.streak ?? progress?.streak ?? 0), icon: Flame },
    { label: 'دروس مكتملة', value: String(progress?.lessonsCompleted ?? 0), icon: BookOpen },
    { label: 'اختبارات', value: String(gamification?.quizzesTaken ?? progress?.quizzesTaken ?? 0), icon: ClipboardList },
    { label: 'متوسط الدرجات', value: `${progress?.averageQuizScore ?? 0}%`, icon: Target },
    { label: 'وقت التعلم', value: formatLearningTime(progress?.totalHours ?? 0, progress?.learningMinutes ?? 0), icon: Clock },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">الملف الشخصي</h1>
            <p className="text-text-secondary mt-1">معلوماتك وإحصائيات تقدمك في المنصة</p>
          </div>
          <Link href="/">
            <Badge variant="outline" className="gap-1 px-3 py-1.5">
              <Settings className="w-4 h-4" />
              تطويري
            </Badge>
          </Link>
        </div>

        <Card className="overflow-hidden">
          <div className="h-24 bg-gradient-to-l from-primary to-accent" />
          <CardContent className="p-6 -mt-12">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-surface-card bg-surface-card flex-shrink-0">
                {user.avatar ? (
                  <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <User className="w-10 h-10 text-primary" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs py-1 flex items-center justify-center gap-1 hover:bg-black/70"
                  aria-label="تغيير الصورة"
                >
                  <Camera className="w-3 h-3" />
                  {uploading ? 'جاري...' : 'تغيير'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-text-primary">{user.name}</h2>
                  {user.isSubscribed && (
                    <Badge variant="secondary" className="gap-1">
                      <Crown className="w-3 h-3 text-warning" />
                      مشترك {user.subscriptionPlan === 'yearly' ? 'سنوي' : user.subscriptionPlan === 'monthly' ? 'شهري' : ''}
                    </Badge>
                  )}
                </div>
                <p className="text-text-secondary mt-1">عضو منذ {formatDate(user.createdAt)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-text-secondary">البريد الإلكتروني</p>
                  <p className="font-medium text-text-primary truncate" dir="ltr">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-text-secondary">الهاتف</p>
                  <p className="font-medium text-text-primary truncate" dir="ltr">{user.phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <GraduationCap className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-text-secondary">الصف</p>
                  <p className="font-medium text-text-primary truncate">{classLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-text-secondary">تاريخ التسجيل</p>
                  <p className="font-medium text-text-primary truncate">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-text-primary">إحصائياتي</h2>
            {loading && <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-text-primary truncate">{stat.value}</p>
                      <p className="text-xs text-text-secondary truncate">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <DevicesSection />
      </div>
    </MainLayout>
  );
}
