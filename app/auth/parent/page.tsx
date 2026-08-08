'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check, Phone, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ParentSignupPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      router.push(user.role === 'parent' ? '/parent' : '/dashboard');
    }
  }, [user, router]);

  const passwordRequirements = [
    { met: password.length >= 6, text: '6 أحرف على الأقل' },
    { met: /[0-9]/.test(password), text: 'رقم واحد' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    if (!phone.match(/^01[0-9]{9}$/)) {
      setError('رقم الواتساب غير صحيح');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/parent-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/parent');
      } else {
        setError(data.error || 'حدث خطأ أثناء إنشاء الحساب');
      }
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setSubmitting(false);
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
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">حساب ولي الأمر</h1>
          <p className="text-text-secondary mt-2 text-sm sm:text-base">
            تابع تقدم أبنائك ونتائجهم في منصة الرائد
          </p>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {error && (
                <div className="bg-error/10 border border-error/20 text-error rounded-xl p-4 text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl text-sm text-text-primary">
                <Users className="w-5 h-5 text-primary flex-shrink-0" />
                <span>
                  سيتم ربط حسابك تلقائياً بأبنائك الذين سجّلوا رقم هاتفك كرقم ولي أمر عند إنشاء حسابهم.
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">الاسم</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="وليك أحمد"
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
                <label className="block text-sm font-medium text-text-primary">
                  رقم الواتساب (نفس الرقم المسجل عند أبنائك)
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
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
                <label className="block text-sm font-medium text-text-primary">كلمة المرور</label>
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

                <div className="space-y-1.5 mt-2">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center transition-colors',
                        req.met ? 'bg-success text-white' : 'bg-muted'
                      )}>
                        {req.met && <Check className="w-3 h-3" />}
                      </div>
                      <span className={req.met ? 'text-success' : 'text-text-secondary'}>
                        {req.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">تأكيد كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className={cn(
                      'w-full pr-11 pl-4 py-2.5 sm:py-3 rounded-xl border border-border bg-surface',
                      'text-text-primary placeholder:text-text-secondary/50',
                      'focus:border-primary focus:ring-2 focus:ring-primary/20',
                      'transition-all'
                    )}
                  />
                </div>
              </div>

              <Button type="submit" size="sm" className="w-full gap-2" disabled={isLoading || submitting}>
                {submitting ? 'جاري الإنشاء...' : 'إنشاء حساب ولي الأمر'}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-text-secondary">
                لديك حساب بالفعل؟{' '}
                <Link href="/auth/login" className="text-primary font-medium hover:underline">
                  تسجيل الدخول
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
