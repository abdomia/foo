'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  Play,
  Award,
  Clock,
  BarChart3,
  Video,
  FileText,
  Target,
  ArrowRight,
  Crown,
  Sparkles,
  Copy,
  Phone,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CLASSES,
  getClassByKey,
  type ClassKey,
} from '@/lib/classes';

const VODAFONE_NUMBER = '01022916304';

const features = [
  { icon: Video, text: 'جميع الفيديوهات التعليمية', included: true },
  { icon: Clock, text: 'دروس جديدة كل أسبوع', included: true },
  { icon: Target, text: 'تمارين تطبيقية غير محدودة', included: true },
  { icon: BarChart3, text: 'اختبارات شهرية', included: true },
  { icon: Award, text: 'شهادات إتمام', included: true },
  { icon: Play, text: 'تحميل الفيديوهات', included: true },
  { icon: Sparkles, text: 'دعم مباشر', included: true },
];

interface PaymentState {
  show: boolean;
  transactionId: string;
  amount: string;
}

export default function SubscribePage() {
  const router = useRouter();
  const { user, subscribe, refreshUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'semester'>('monthly');
  const [selectedClass, setSelectedClass] = useState<ClassKey | null>(() => {
    if (typeof window === 'undefined') return null;
    const key = new URLSearchParams(window.location.search).get('class');
    return key && CLASSES.some((c) => c.key === key) ? (key as ClassKey) : null;
  });

  const activeClass = getClassByKey(selectedClass);
  const activePlans = activeClass?.plans ?? [];
  const selectedPlanData = activePlans.find((p) => p.id === selectedPlan);
  const [paymentState, setPaymentState] = useState<PaymentState | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState('');

  const handleSubscribe = async () => {
    if (!selectedClass) {
      setError('يرجى اختيار الفصل الدراسي أولاً');
      return;
    }

    if (!user) {
      router.push(`/auth/signup?redirect=${encodeURIComponent(`/subscribe?class=${selectedClass}`)}`);
      return;
    }

    setIsLoading(true);
    setError('');

    const planData = activePlans.find((p) => p.id === selectedPlan);
    const amount = planData?.price;
    const result = await subscribe(selectedPlan, 'vodafone_cash', selectedClass);

    if (result.success && result.paymentId) {
      setPaymentState({
        show: true,
        transactionId: result.paymentId,
        amount: String(amount ?? planData?.price ?? ''),
      });
    } else if (result.success && !result.paymentId) {
      if (user?.isSubscribed) {
        router.push(`/dashboard?class=${selectedClass}`);
      } else {
        setError('يرجى إتمام عملية الدفع أولاً');
      }
    } else {
      setError(result.error || 'حدث خطأ');
    }

    setIsLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaymentDone = () => {
    setShowSuccess(true);
  };

  const handleActivateCode = async () => {
    if (!activationCode.trim()) {
      setActivationError('يرجى إدخال كود التفعيل');
      return;
    }
    if (!user) return;

    setActivating(true);
    setActivationError('');

    try {
      const res = await fetch('/api/activate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activationCode.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshUser();
        router.push(`/dashboard?class=${selectedClass || user.grade || ''}`);
      } else {
        setActivationError(data.error || 'فشل تفعيل الاشتراك، تأكد من صحة الكود');
      }
    } catch {
      setActivationError('حدث خطأ أثناء تفعيل الاشتراك');
    } finally {
      setActivating(false);
    }
  };

  if (user?.isSubscribed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Crown className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">أنت مشترك بالفعل!</h1>
            <p className="text-muted-foreground mb-6">
              لديك اشتراك {user.subscriptionPlan === 'monthly' ? 'شهري' : user.subscriptionPlan === 'semester' ? 'فصل دراسي' : 'سنوي'} نشط
              {user.grade && getClassByKey(user.grade) && (
                <> - {getClassByKey(user.grade)!.name}</>
              )}
              {user.subscriptionExpiry && (
                <> - ينتهي في {new Date(user.subscriptionExpiry).toLocaleDateString('ar-EG')}</>
              )}
            </p>
            <div className="flex gap-3 justify-center">
              <Link href={`/dashboard${user.grade ? `?class=${user.grade}` : ''}`}>
                <Button className="gap-2">
                  <Play className="w-4 h-4" />
                  الذهاب للوحة التحكم
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">تم إتمام عملية الدفع</h1>
            <p className="text-muted-foreground mb-6">
              شكراً لك! يرجى إرسال إثبات الدفع عبر واتساب لتأكيد الاشتراك
            </p>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">رقم واتساب:</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-foreground font-mono">
                  {VODAFONE_NUMBER}
                </span>
                <button
                  onClick={() => copyToClipboard(VODAFONE_NUMBER)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-success" />
                  ) : (
                    <Copy className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <a
              href={`https://wa.me/${VODAFONE_NUMBER}?text=${encodeURIComponent('مرحباً، لقد قمت بالدفع وأود تأكيد اشتراكي')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full gap-2 mb-3" size="lg">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                تواصل معنا عبر واتساب
              </Button>
            </a>

            <div className="mt-6 pt-6 border-t border-border">
              <h2 className="font-bold text-foreground text-lg mb-1">تفعيل الاشتراك بكود</h2>
              <p className="text-sm text-muted-foreground mb-3">
                أدخل كود التفعيل الذي حصلت عليه لفتح مميزات الموقع فوراً
              </p>
              <Input
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                placeholder="أدخل كود التفعيل"
                className="mb-3 text-center font-mono tracking-widest"
                dir="ltr"
              />
              {activationError && (
                <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 mb-3">
                  {activationError}
                </div>
              )}
              <Button
                onClick={handleActivateCode}
                className="w-full gap-2"
                size="lg"
                disabled={activating}
              >
                {activating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري التفعيل...
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    تفعيل الاشتراك الآن
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              سيتم تفعيل اشتراكك فور تأكيد الدفع
            </p>

            <div className="mt-6 pt-6 border-t border-border">
              <Link href={`/dashboard?class=${selectedClass || ''}`}>
                <Button variant="outline" className="w-full gap-2">
                  العودة للوحة التحكم
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentState?.show) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Phone className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">الدفع عبر فودافون كاش</h1>
            <p className="text-muted-foreground mb-6">
              اتبع الخطوات التالية لإتمام عملية الدفع
            </p>

            {user?.grade && (
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-center gap-2">
                  <GraduationCap className="w-5 h-5 text-accent" />
                  <span className="text-sm font-medium text-foreground">
                    السنة الدراسية: {getClassByKey(user.grade)?.name || user.grade}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">رقم فودافون كاش:</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-foreground font-mono">
                  {VODAFONE_NUMBER}
                </span>
                <button
                  onClick={() => copyToClipboard(VODAFONE_NUMBER)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-success" />
                  ) : (
                    <Copy className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-muted rounded-xl p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-2">معرف العملية (للإرسال):</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-bold text-foreground font-mono">
                  {paymentState.transactionId}
                </span>
                <button
                  onClick={() => copyToClipboard(paymentState.transactionId)}
                  className="p-2 hover:bg-muted/80 rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-success" />
                  ) : (
                    <Copy className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div className="border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-600 font-medium mb-2">خطوات الدفع:</p>
              <ol className="text-sm text-muted-foreground space-y-1 text-right">
                <li>1. ابعت اسكرينة التحويل علي هذا الرقم: <span className='font-bold'> 01022916304</span></li>
              </ol>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setPaymentState(null);
                }}
                className="flex-1"
                disabled={isLoading}
              >
                إلغاء
              </Button>
              <Button
                onClick={handlePaymentDone}
                className="flex-1 gap-2"
                disabled={isLoading}
              >
                <Check className="w-4 h-4" />
                أكملت عملية الدفع
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              سيتم تفعيل اشتراكك فور تأكيد الدفع
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">اشتراك</Badge>
          <h1 className="text-4xl font-bold text-foreground mb-4">
           جميع الفيديوهات
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            اشترك الآن واحصل على وصول كامل لجميع الدروس التعليمية والتمارين
          </p>
        </div>

        <div className="mb-12 max-w-4xl mx-auto">
          <h2 className="text-center text-2xl font-bold text-foreground mb-2">اختر صفك الدراسي</h2>
          <p className="text-center text-muted-foreground mb-6">لدينا خطط مصممة خصيصاً لكل صف دراسي</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CLASSES.map((c) => (
              <button
                key={c.key}
                onClick={() => {
                  setSelectedClass(c.key);
                  setSelectedPlan(c.plans[0]?.id ?? 'monthly');
                  setError('');
                }}
                className={cn(
                  'p-4 rounded-xl border text-right transition-all cursor-pointer',
                  selectedClass === c.key
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <p className="font-bold text-foreground">{c.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  يبدأ من {Math.min(...c.plans.map((p) => p.price))} جنيه
                </p>
              </button>
            ))}
          </div>
        </div>

        {activeClass ? (
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {activePlans.map((plan, idx) => (
            <Card
              key={plan.id}
              className={cn(
                'relative cursor-pointer transition-all',
                selectedPlan === plan.id && 'ring-2 ring-primary',
                idx === activePlans.length - 1 && 'border-secondary'
              )}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {idx === activePlans.length - 1 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                  <Badge variant="default">الأفضل قيمة</Badge>
                </div>
              )}
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.period}</p>
                </div>

                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">جنيه</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{plan.period}</p>
                </div>

                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-success" />
                      </div>
                      <span className="text-sm text-foreground">
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        ) : (
          <div className="max-w-4xl mx-auto mb-16 text-center">
            <Card>
              <CardContent className="p-8">
                <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">اختر صفك الدراسي لعرض الأسعار والاشتراك</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">الاشتراك المختار:</span>
                <Badge variant="secondary">
                  {activeClass ? `${activeClass.name} - ${selectedPlanData?.name || ''}` : 'اختر الفصل'}
                </Badge>
              </div>

              <div className="flex items-center justify-between mb-6">
                <span className="text-muted-foreground">المجموع:</span>
                <div className="text-left">
                  <span className="text-2xl font-bold text-foreground">
                    {selectedPlanData?.price ?? '-'}
                  </span>
                  <span className="text-muted-foreground mr-1">جنيه</span>
                </div>
              </div>

              <div className="border border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <Phone className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">الدفع عبر فودافون كاش</p>
                    <p className="text-sm text-muted-foreground">آمن وفوري</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 mb-4">
                  {error}
                </div>
              )}

              <Button
                onClick={handleSubscribe}
                className="w-full gap-2"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري التحويل...
                  </>
                ) : (
                  <>
                    <Phone className="w-5 h-5" />
                    {user ? 'اشترك الآن' : 'سجل أولاً ثم اشترك'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              {!user && (
                <p className="text-center text-sm text-muted-foreground mt-3">
                  لديك حساب؟{' '}
                  <Link href="/auth/login" className="text-primary hover:underline">
                    تسجيل الدخول
                  </Link>
                </p>
              )}

              <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-4 h-4 text-success" />
                  إلغاء في أي وقت
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">ماذا ستحصل؟</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">فيديوهات عالية الجودة</h3>
              <p className="text-sm text-muted-foreground">دروس مصورة بجودة عالية مع شروحات مفصلة</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">ملفات PDF</h3>
              <p className="text-sm text-muted-foreground">ملخصات ودروس مكتوبة للتحميل والمراجعة</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-bold text-foreground mb-2">اختبارات</h3>
              <p className="text-sm text-muted-foreground">اختبر معلوماتك وحقق تقدم مستمر</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
