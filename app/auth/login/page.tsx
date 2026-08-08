'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_not_configured: 'Google OAuth غير مكون - تحقق من الإعدادات',
  oauth_failed: 'فشل تسجيل الدخول مع Google - قد تكون الحساب غير موثق',
  token_failed: 'فشل التوكن - الحساب يتطلب تدقيق Google',
  no_email: 'لم يتم الوصول للبريد الإلكتروني',
  no_code: 'كود غير صالح',
  access_denied: 'تم رفض الوصول',
  invalid_request: 'طلب غير صالح',
};

function oauthErrorFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const error = new URLSearchParams(window.location.search).get('error');
  if (!error) return '';
  return OAUTH_ERROR_MESSAGES[error] || 'خطأ: ' + error;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(oauthErrorFromUrl);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await login(email, password);
    if (result.success) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (result.user?.isAdmin) {
        router.push('/admin');
      } else if (result.user?.role === 'parent') {
        router.push('/parent');
      } else if (redirect) {
        router.push(redirect);
      } else {
        router.push('/dashboard');
      }
    } else {
      setError(result.error || 'حدث خطأ أثناء تسجيل الدخول');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 sm:mb-6">
            <Image
              src="/bar.png"
              alt="منصة الرائد"
              width={80}
              height={80}
              className="w-16 sm:w-20 md:w-24 h-auto rounded-xl"
            />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">تسجيل الدخول</h1>
          <p className="text-text-secondary mt-2 text-sm sm:text-base">مرحباً بك مجدداً في منصتك التعليمية</p>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {error && (
                <div className="bg-error/10 border border-error/20 text-error rounded-xl p-4 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    className={cn(
                      'w-full pr-11 pl-4 py-2.5 sm:py-3 rounded-xl border border-border bg-surface',
                      'text-text-primary placeholder:text-text-secondary/50',
                      'focus:border-primary focus:ring-2 focus:ring-primary/20',
                      'transition-all'
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-text-primary">كلمة المرور</label>
                  <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                    نسيت كلمة المرور؟
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className={cn(
                      'w-full pr-11 pl-11 py-2.5 sm:py-3 rounded-xl border border-border bg-surface',
                      'text-text-primary placeholder:text-text-secondary/50',
                      'focus:border-primary focus:ring-2 focus:ring-primary/20',
                      'transition-all'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="remember" className="text-sm text-text-secondary">
                  تذكرني
                </label>
              </div>

              <Button type="submit" size="sm" className="w-full gap-2" disabled={isLoading}>
                {isLoading ? 'جاري الدخول...' : 'تسجيل الدخول'}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>
            <div className="mt-6 pt-6 border-t">
              <p className="text-center text-sm text-muted-foreground mb-4">أو سجل باستخدام</p>
              <Button type="button" variant="outline" className="w-full gap-2" disabled>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google (قيد التطوير)
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-text-secondary">
                ليس لديك حساب؟{' '}
                <Link href="/auth/signup" className="text-primary font-medium hover:underline">
                  إنشاء حساب جديد
                </Link>
                {' أو '}
                <Link href="/auth/parent" className="text-primary font-medium hover:underline">
                  حساب ولي أمر
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-text-secondary mt-6">
          <Link href="/subscribe" className="hover:text-primary transition-colors">
            اشترك الآن للوصول لجميع الفيديوهات
          </Link>
        </p>
      </div>
    </div>
  );
}
