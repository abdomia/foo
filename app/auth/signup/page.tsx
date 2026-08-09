'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check, Phone, Camera, X, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading, user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [grade, setGrade] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [avatar, setAvatar] = useState<string | undefined>();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const passwordRequirements = [
    { met: password.length >= 6, text: '6 أحرف على الأقل' },
    { met: /[A-Z]/.test(password), text: 'حرف كبير واحد' },
    { met: /[0-9]/.test(password), text: 'رقم واحد' },
  ];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatar(base64);
        setAvatarPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatar(undefined);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    if (!acceptTerms) {
      setError('يجب الموافقة على الشروط والأحكام');
      return;
    }

    if (!phone.match(/^01[0-9]{9}$/)) {
      setError('رقم الواتساب غير صحيح');
      return;
    }

    if (!parentPhone.match(/^01[0-9]{9}$/)) {
      setError('رقم هاتف أحد الوالدين غير صحيح');
      return;
    }

    if (!grade) {
      setError('يرجى اختيار السنة الدراسية');
      return;
    }

    const result = await signup(name, email, password, phone, parentPhone, avatar, grade);
    if (result.success) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (result.user?.isAdmin) {
        router.push('/admin');
      } else if (redirect) {
        router.push(redirect);
      } else {
        router.push('/dashboard');
      }
    } else {
      setError(result.error || 'حدث خطأ أثناء إنشاء الحساب');
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
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">إنشاء حساب جديد</h1>
          <p className="text-text-secondary mt-2 text-sm sm:text-base">انضم إلينا وابدأ رحلتك في تعلم الرياضيات والإحصاء</p>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {error && (
                <div className="bg-error/10 border border-error/20 text-error rounded-xl p-4 text-sm">
                  {error}
                </div>
              )}

              <div className="flex flex-col items-center mb-4 sm:mb-6">
                <div className="relative">
                  {avatarPreview ? (
                    <div className="relative">
                      <div className="w-20 h-20 sm:w-24 rounded-full overflow-hidden border-4 border-primary/20">
                        <Image
                          src={avatarPreview}
                          alt="الصورة الشخصية"
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={removeAvatar}
                        className="absolute -top-2 -left-2 w-7 h-7 bg-error rounded-full flex items-center justify-center text-white hover:bg-error/80 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 sm:w-24 rounded-full bg-muted border-4 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-text-secondary" />
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 sm:mt-3 text-sm text-primary hover:underline"
                >
                  {avatarPreview ? 'تغيير الصورة' : 'إضافة صورة شخصية (اختياري)'}
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">الاسم</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="محمد أحمد"
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
                <label className="block text-sm font-medium text-text-primary">رقم الواتساب (صالح)</label>
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
                <label className="block text-sm font-medium text-text-primary">رقم هاتف أحد الوالدين</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
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
                <label className="block text-sm font-medium text-text-primary">السنة الدراسية</label>
                <div className="relative">
                  <GraduationCap className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary z-10" />
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    required
                    className={cn(
                      'w-full pr-11 pl-4 py-2.5 sm:py-3 rounded-xl border border-border bg-surface appearance-none',
                      'text-text-primary',
                      'focus:border-primary focus:ring-2 focus:ring-primary/20',
                      'transition-all'
                    )}
                    style={{ backgroundImage: 'none' }}
                  >
                    <option value="" disabled>اختر السنة الدراسية</option>
                    <option value="third_preparatory">الصف الثالث الاعدادي</option>
                    <option value="first_secondary">الصف الأول الثانوي</option>
                    <option value="second_secondary">الصف الثاني الثانوي (بكالوريا)</option>
                    <option value="third_secondary_math">الصف الثالث الثانوي (علمي رياضة)</option>
                    <option value="third_secondary_literary">الصف الثالث الثانوي (الشعبة الادبية)</option>
                  </select>
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

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 mt-1 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="terms" className="text-sm text-text-secondary">
                  أوافق على{' '}
                  <Link href="/terms" className="text-primary hover:underline">الشروط والأحكام</Link>
                  {' '}و{' '}
                  <Link href="/privacy" className="text-primary hover:underline">سياسة الخصوصية</Link>
                </label>
              </div>

              <Button type="submit" size="sm" className="w-full gap-2" disabled={isLoading}>
                {isLoading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <p className="text-center text-sm text-muted-foreground mb-4">أو أنشئ حساب باستخدام</p>
              <Button type="button" variant="outline" className="w-full gap-2" disabled>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
            </div>

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

        <p className="text-center text-sm text-text-secondary mt-6">
          <Link href="/subscribe" className="hover:text-primary transition-colors">
            اشترك الآن للوصول لجميع الفيديوهات
          </Link>
        </p>
      </div>
    </div>
  );
}
