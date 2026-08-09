'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Video, Target, Award, Users, Clock, CheckCircle2,
  Sparkles, ArrowLeft, Play, Crown, TrendingUp, BarChart3,
  BrainCircuit, GraduationCap, HeartHandshake, Zap, Shield,
  Globe, LogIn, UserPlus, Menu, X, Sun, Moon, BookOpen,
  ChevronDown, Phone, Mail, MessageCircle, FileText, ClipboardList,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/components/AuthProvider';
import { CLASSES, getClassByKey, type ClassKey } from '@/lib/classes';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import platformHero from '@/public/platform-hero.png';

const ChatBot = dynamic(() =>
  import('@/components/chatbot/ChatBot').then((mod) => mod.ChatBot),
  { ssr: false }
);

gsap.registerPlugin(ScrollTrigger, useGSAP);

const stats = [
  { number: '1000+', label: 'طالب', icon: Users },
  { number: '50+', label: 'درس فيديو', icon: Video },
  { number: '95%', label: 'نسبة النجاح', icon: TrendingUp },
];

const features = [
  {
    icon: Video,
    title: 'فيديوهات تعليمية عالية الجودة',
    description: 'دروس مصورة بدقة عالية مع شروحات مفصلة من معلمين متخصصين في الرياضيات والإحصاء',
  },
  {
    icon: Target,
    title: 'تمارين تطبيقية',
    description: 'مجموعة كبيرة من التمارين لتنمية مهاراتك وتثبيت المعلومات',
  },
  {
    icon: BarChart3,
    title: 'اختبارات شهرية',
    description: 'اختبر معلوماتك بانتظام وتابع تقدمك في كل وحدة',
  },
  {
    icon: Award,
    title: 'شهادات إتمام',
    description: 'احصل على شهادات عند إكمال كل وحدة لتوثيق إنجازاتك',
  },
];

const whyJoin = [
  {
    icon: BrainCircuit,
    title: 'تعلم بطريقة حديثة',
    description: 'نستخدم أحدث أساليب التعليم الرقمي لجعل التعلم ممتعاً وفعالاً',
  },
  {
    icon: GraduationCap,
    title: 'محتوى مخصص للمنهج المصري',
    description: 'جميع الدروس مصممة خصيصاً للصف الثالث الثانوي المصري',
  },
  {
    icon: Clock,
    title: 'تعلم بمرونتك',
    description: 'ادرس في أي وقت ومن أي مكان حسب جدولك الشخصي',
  },
  {
    icon: HeartHandshake,
    title: 'دعم متواصل',
    description: 'فريق من المعلمين جاهز للإجابة على استفساراتك',
  },
  {
    icon: Zap,
    title: 'نتائج سريعة',
    description: 'رؤية تحسن ملموسة في درجاتك خلال أسابيع قليلة',
  },
  {
    icon: Shield,
    title: 'محتوى موثق',
    description: 'معلومات دقيقة ومحدثة وفقاً لأحدث مناهج وزارة التربية والتعليم',
  },
];

const testimonials = [
  {
    name: 'أحمد محمد',
    role: 'طالب الثانوية العامة',
    content: 'منصة رائعة ساعدتني كثيراً في فهم الرياضيات والإحصاء. الفيديوهات واضحة جداً والمعلم يشرح بطريقة سهلة.',
    avatar: 'أ',
  },
  {
    name: 'فاطمة علي',
    role: 'طالبة الثانوية العامة',
    content: 'الحمد لله حققت تقدماً كبيراً في الرياضيات والإحصاء بفضل هذه المنصة. أنصح بها كل طالب الثانوية.',
    avatar: 'ف',
  },
  {
    name: 'محمود سعيد',
    role: 'أحد أولياء الأمور',
    content: 'ابني تحسن كثيراً في المادة بعد الاشتراك. المحتوى ممتاز والأسعار مناسبة جداً.',
    avatar: 'م',
  },
];

const faqs = [
  {
    q: 'ما هي منصة الرائد؟',
    a: 'منصة تعليمية مصرية متخصصة في تعليم مادتي الرياضيات والإحصاء لطلاب الثانوية العامة والصف الثالث الإعدادي، نقدم فيديوهات تعليمية عالية الجودة مع تمارين تطبيقية واختبارات شهرية ومتابعة مستمرة.',
  },
  {
    q: 'كيف أبدأ الاشتراك؟',
    a: 'أنشئ حساباً مجانياً أولاً، ثم اختر صفك الدراسي والخطة المناسبة لك، وادفع عبر فودافون كاش أو فعّل اشتراكك بكود تفعيل، وسيتم فتح المحتوى فور تأكيد الدفع.',
  },
  {
    q: 'ما طرق الدفع المتاحة؟',
    a: 'يمكنك الدفع بسهولة عبر فودافون كاش أو تفعيل اشتراكك بكود تفعيل، مع إرسال إثبات الدفع عبر واتساب لتأكيد الاشتراك وتفعيله.',
  },
  {
    q: 'هل يمكن استخدام المنصة على جميع الأجهزة؟',
    a: 'نعم، المنصة تعمل بسلاسة على الموبايل والتابلت والكمبيوتر، وتُحفظ آخر مشاهدة تلقائياً لتكمل دروسك من أي جهاز وفي أي وقت.',
  },
  {
    q: 'كيف أتابع تقدمي في المادة؟',
    a: 'توفر المنصة تقريراً مفصلاً يوضح نسبة إكمال كل درس، ودرجاتك في الاختبارات، وعدد أيام التعلم المتتالية، ومستواك العام في كل وحدة.',
  },
  {
    q: 'ماذا يحدث عند انتهاء الاشتراك؟',
    a: 'سيتم إيقاف الوصول إلى المحتوى المخصص للمشتركين حتى تجدد اشتراكك، مع بقاء شهاداتك ونتائجك وأجهزتك المسجلة محفوظة في حسابك.',
  },
];

const pricingFeatures = [
  'جميع الفيديوهات التعليمية',
  'دروس جديدة كل أسبوع',
  'تمارين تطبيقية غير محدودة',
  'اختبارات شهرية',
  'شهادات إتمام',
  'دعم مباشر',
];

const teacherHighlights = [
  'أسلوب مبسط وواضح يناسب جميع مستويات الطلاب',
  'شرح تفصيلي لجميع أفكار المنهج مع التطبيق على أسئلة الامتحانات',
  'متابعة دورية ورد على جميع استفسارات الطلاب',
  'خبرة واسعة في تدريس الثانوية العامة والنظام الجديد',
];

const teacherStats = [
  { number: '15+', label: 'سنة خبرة' },
  { number: '5000+', label: 'طالب سابق' },
  { number: '95%', label: 'نسبة نجاح' },
];

const classIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  third_preparatory: GraduationCap,
  first_secondary: BookOpen,
  second_secondary: BarChart3,
  third_secondary_literary: Sparkles,
  third_secondary_math: Target,
};

function SectionReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    gsap.from(el, {
      opacity: 0,
      y: 40,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
    });
  }, { scope: ref });
  return <div ref={ref} className={className}>{children}</div>;
}

function StaggerGrid({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    gsap.from(el.children, {
      opacity: 0,
      y: 30,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
    });
  }, { scope: ref });
  return <div ref={ref}>{children}</div>;
}

export default function LandingPage() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [landingVideoId, setLandingVideoId] = useState('k3sRZvSlBNE');
  const [teacherName, setTeacherName] = useState('');
  const [pricingClass, setPricingClass] = useState<ClassKey>('third_secondary_math');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroImgRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [loginClass, setLoginClass] = useState<string | null>(null);

  const handleCategoryClick = (key: string) => {
    if (user) {
      router.push(`/subscribe?class=${key}`);
    } else {
      setLoginClass(key);
    }
  };

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(data => {
      if (data.success && data.data) {
        if (data.data.landingVideoUrl) {
          const url = data.data.landingVideoUrl;
          const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
          setLandingVideoId(match ? match[1] : url);
        }
        if (data.data.teacherName) {
          setTeacherName(data.data.teacherName);
        }
      }
    }).catch(() => {});
  }, []);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.nav-bar', { y: -30, opacity: 0, duration: 0.6, ease: 'power2.out' });
      gsap.from('.hero-logo', { scale: 0, opacity: 0, duration: 0.8, ease: 'back.out(1.7)' });
      gsap.from('.hero-title', { y: 40, opacity: 0, duration: 0.7, delay: 0.2, ease: 'power2.out' });
      gsap.from('.hero-subtitle', { y: 30, opacity: 0, duration: 0.7, delay: 0.35, ease: 'power2.out' });
      gsap.from('.hero-description', { y: 20, opacity: 0, duration: 0.6, delay: 0.5, ease: 'power2.out' });
      gsap.from('.hero-cta', { y: 20, opacity: 0, duration: 0.6, delay: 0.65, ease: 'power2.out', stagger: 0.1 });
    }, heroRef);
    return () => ctx.revert();
  }, { scope: heroRef });

  const handleToggle = useCallback(() => {
    const btn = toggleRef.current;
    if (btn) {
      gsap.to(btn, {
        rotation: 360,
        scale: 1.2,
        duration: 0.3,
        ease: 'back.out(2)',
        onComplete: () => {
          gsap.set(btn, { rotation: 0, scale: 1 });
        },
      });
    }
    toggleTheme();
  }, [toggleTheme]);

  const nextTestimonial = useCallback(() => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  }, []);

  const prevTestimonial = useCallback(() => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, []);

  const activePlans = getClassByKey(pricingClass)?.plans || [];

  return (
    <div className="min-h-screen bg-canvas overflow-x-hidden">
      <nav ref={navRef} className="nav-bar fixed top-0 left-0 right-0 z-50">
        <div className="glass-light border-b border-border/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Image
                  src="/bar.png"
                  alt="منصة الرائد"
                  width={36}
                  height={36}
                  className="w-8 h-8 sm:w-9 sm:h-9"
                />
                <span className="font-bold text-lg text-text-primary hidden sm:block">منصة الرائد</span>
              </div>

              <div className="hidden lg:flex items-center gap-6">
                <Link href="#courses" className="text-text-secondary hover:text-text-primary transition-colors text-sm">الدورات</Link>
                <Link href="#why-alraed" className="text-text-secondary hover:text-text-primary transition-colors text-sm">لماذا الرائد؟</Link>
                <Link href="#features" className="text-text-secondary hover:text-text-primary transition-colors text-sm">المميزات</Link>
                <Link href="#pricing" className="text-text-secondary hover:text-text-primary transition-colors text-sm">الأسعار</Link>
                <Link href="#testimonials" className="text-text-secondary hover:text-text-primary transition-colors text-sm">آراء الطلاب</Link>
              </div>

              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="hidden sm:block">
                  <Button variant="outline" size="sm" className="gap-2 border-border text-text-secondary hover:text-text-primary hover:border-primary/50">
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول</span>
                  </Button>
                </Link>
                <Link href="/auth/signup" className="hidden sm:block">
                  <Button size="sm" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    <span>إنشاء حساب</span>
                  </Button>
                </Link>
                <button
                  ref={toggleRef}
                  onClick={handleToggle}
                  className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-primary/50 transition-colors"
                >
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden border-border text-text-secondary"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden glass border-b border-border max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="px-4 py-3 space-y-2">
              <Link href="#courses" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-text-secondary hover:text-text-primary rounded-lg text-sm">الدورات</Link>
              <Link href="#why-alraed" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-text-secondary hover:text-text-primary rounded-lg text-sm">لماذا الرائد؟</Link>
              <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-text-secondary hover:text-text-primary rounded-lg text-sm">المميزات</Link>
              <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-text-secondary hover:text-text-primary rounded-lg text-sm">الأسعار</Link>
              <Link href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-text-secondary hover:text-text-primary rounded-lg text-sm">آراء الطلاب</Link>
              <Link href="#faq" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-text-secondary hover:text-text-primary rounded-lg text-sm">الأسئلة الشائعة</Link>
              <Link href="#teacher" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-text-secondary hover:text-text-primary rounded-lg text-sm">مدرسك</Link>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button
                  onClick={() => { handleToggle(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-text-secondary hover:text-text-primary rounded-lg text-sm"
                >
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <span>{theme === 'dark' ? 'المظهر الداكن' : 'المظهر الفاتح'}</span>
                </button>
                <div className="flex gap-2">
                  <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="gap-2 border-border text-text-secondary">
                      <LogIn className="w-4 h-4" />
                      <span>تسجيل الدخول</span>
                    </Button>
                  </Link>
                  <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      <span>إنشاء حساب</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center pt-20 pb-8 overflow-hidden"
        style={{ backgroundColor: 'var(--hero-bg)' }}
      >
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            <div className="w-full lg:w-1/2 text-center lg:text-right">
              <div className="hero-logo mb-6">
                <Image
                  src="/bar.png"
                  alt="منصة الرائد"
                  width={80}
                  height={80}
                  className="w-16 h-16 sm:w-20 sm:h-20 mx-auto lg:mx-0"
                  priority
                />
              </div>

              <h1 className="hero-title text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-4 leading-tight">
                منصة <span className="text-primary">الرائد</span>
              </h1>

              <p className="hero-subtitle text-lg sm:text-xl md:text-2xl text-text-secondary mb-3">
                منصتك التعليمية الأولى في الرياضيات والإحصاء
              </p>

              <p className="hero-description text-sm sm:text-base text-text-muted mb-6 max-w-lg mx-auto lg:mx-0">
                منصة تعليمية مصرية متخصصة في تعليم مادتي الرياضيات والإحصاء، نساعد طلاب الثانوية العامة على تحقيق أعلى الدرجات.
              </p>

              <div className="hero-cta flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link href="/subscribe">
                  <Button className="gap-2 text-sm sm:text-base px-6 sm:px-8 h-11 sm:h-12">
                    <Crown className="w-4 h-4" />
                    <span>اشترك الآن</span>
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="outline" size="default" className="gap-2 border-primary/50 text-primary hover:bg-primary/10 px-6 sm:px-8 h-11 sm:h-12">
                    <Play className="w-4 h-4" />
                    <span>ابدأ مجاناً</span>
                  </Button>
                </Link>
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <div className="hero-image" ref={heroImgRef}>
                <div className="relative aspect-[4/3] lg:aspect-square max-w-lg mx-auto">
                  <div className="absolute inset-0 rounded-3xl" style={{ backgroundColor: 'var(--hero-bg)' }} />
                  <Image
                    src={platformHero}
                    alt="منصة الرائد التعليمية"
                    fill
                    className="object-contain p-4 drop-shadow-2xl"
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-primary/10 rounded-full blur-xl" />
                <div className="absolute -top-4 -right-4 w-32 h-32 bg-accent/10 rounded-full blur-xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 sm:py-16 relative">
        <div className="container mx-auto px-4 max-w-5xl">
          <StaggerGrid>
            <div className="grid grid-cols-3 gap-6 sm:gap-10">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 rounded-2xl bg-surface-card border border-border flex items-center justify-center">
                    <stat.icon className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-text-primary">{stat.number}</p>
                  <p className="text-xs sm:text-sm text-text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </StaggerGrid>
        </div>
      </section>

      {/* Intro Video */}
      <section className="py-16 sm:py-24 lg:py-28 bg-muted-dark/50 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <SectionReveal>
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-border shadow-lg">
                  <iframe
                    src={`https://www.youtube.com/embed/${landingVideoId}`}
                    title="فيديو تعريفي لمنصة الرائد"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              </div>
              <div className="order-1 lg:order-2 text-center lg:text-right">
                <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">
                  انضم إلينا
                </Badge>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-4">
                  ابدأ رحلتك مع <span className="text-primary">الرائد</span>
                </h2>
                <p className="text-base sm:text-lg text-text-secondary leading-relaxed mb-6 max-w-lg mx-auto lg:mx-0">
                  انضم إلى آلاف الطلاب الذين اختاروا منصة الرائد لتعلم الرياضيات والإحصاء. نوفر لك أفضل الفيديوهات التعليمية،
                  تمارين تفاعلية، ومتابعة مستمرة لضمان تفوقك في مادتي الرياضيات والإحصاء.
                </p>
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                  <div className="flex items-center gap-2 text-text-primary">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-sm">محتوى حصري</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-primary">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-sm">متابعة شخصية</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-primary">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-sm">نتائج مضمونة</span>
                  </div>
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Why AlRaed? */}
      <section id="why-alraed" className="py-16 sm:py-24 lg:py-28 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <SectionReveal>
            <div className="text-center mb-12 sm:mb-16">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">
                لماذا الرائد؟
              </Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-4">
                لماذا يختار الطلاب <span className="text-primary">منصة الرائد</span>؟
              </h2>
              <p className="text-sm sm:text-base text-text-muted max-w-2xl mx-auto">
                نقدم لك تجربة تعليمية فريدة مصممة خصيصاً لضمان نجاحك
              </p>
            </div>
          </SectionReveal>

          <StaggerGrid>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {whyJoin.map((item, index) => (
                <Card key={index} className="bg-surface-card border-border card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-text-primary mb-1">{item.title}</h3>
                        <p className="text-sm text-text-muted">{item.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </StaggerGrid>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24 lg:py-28 bg-muted-dark/50 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <SectionReveal>
            <div className="text-center mb-12 sm:mb-16">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">
                ماذا نقدم
              </Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-4">
                محتوى تعليمي <span className="text-primary">شامل</span>
              </h2>
              <p className="text-sm sm:text-base text-text-muted max-w-2xl mx-auto">
                نوفر لك كل ما تحتاجه للنجاح في الرياضيات والإحصاء من فيديوهات ودروس تطبيقية واختبارات
              </p>
            </div>
          </SectionReveal>

          <StaggerGrid>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="bg-surface-card border-border card-hover">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-base font-bold text-text-primary mb-2">{feature.title}</h3>
                    <p className="text-sm text-text-muted">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </StaggerGrid>
        </div>
      </section>

      {/* Courses */}
      <section id="courses" className="py-16 sm:py-24 lg:py-28 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <SectionReveal>
            <div className="text-center mb-12 sm:mb-16">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">
                الدورات التعليمية
              </Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-4">
                اختر <span className="text-primary">دورتك</span> المناسبة
              </h2>
              <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto">
                خطط وأسعار مصممة خصيصاً لكل صف دراسي - اختر صفك وابدأ رحلتك التعليمية
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {CLASSES.map((c) => {
                const Icon = classIcons[c.key] || GraduationCap;
                return (
                  <button
                    key={c.key}
                    onClick={() => handleCategoryClick(c.key)}
                    className="text-right group bg-surface-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:-translate-y-1 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-bold text-text-primary text-lg mb-1">{c.short}</h3>
                    <p className="text-sm text-text-muted mb-4">
                      يبدأ من {Math.min(...c.plans.map((p) => p.price))} جنيه
                    </p>
                    <span className="inline-flex items-center gap-1 text-primary text-sm font-medium">
                      اشترك الآن
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </span>
                  </button>
                );
              })}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 sm:py-24 lg:py-28 bg-muted-dark/50 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <SectionReveal>
            <div className="text-center mb-12 sm:mb-16">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">
                الأسعار
              </Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-4">
                خطط <span className="text-primary">مرنة</span> تناسبك
              </h2>
              <p className="text-sm sm:text-base text-text-muted max-w-2xl mx-auto">
                اختر صفك الدراسي لعرض الخطط والأسعار المناسبة لك
              </p>
            </div>
          </SectionReveal>

          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {CLASSES.map((c) => (
              <button
                key={c.key}
                onClick={() => setPricingClass(c.key)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                  pricingClass === c.key
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-surface-card border border-border text-text-secondary hover:text-text-primary hover:border-primary/40'
                )}
              >
                {c.short}
              </button>
            ))}
          </div>

          <StaggerGrid>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {activePlans.map((plan) => {
                const featured = plan.id === 'yearly';
                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      'relative bg-surface-card border-border card-hover',
                      featured && 'ring-2 ring-primary shadow-xl lg:scale-105'
                    )}
                  >
                    {featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <Badge variant="default" className="whitespace-nowrap">الأكثر اختيارًا</Badge>
                      </div>
                    )}
                    <CardContent className="p-6 text-center">
                      <h3 className="font-bold text-text-primary text-lg mb-1">{plan.name}</h3>
                      <p className="text-sm text-text-muted mb-5">{plan.period}</p>
                      <div className="flex items-baseline justify-center gap-1 mb-6">
                        <span className="text-4xl font-bold text-text-primary">{plan.price}</span>
                        <span className="text-text-muted">جنيه</span>
                      </div>
                      <ul className="space-y-3 text-right mb-6">
                        {pricingFeatures.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Link href={`/subscribe?class=${pricingClass}`} className="block">
                        <Button
                          variant={featured ? 'default' : 'outline'}
                          className={cn('w-full gap-2', !featured && 'border-primary/40 text-primary hover:bg-primary/10')}
                        >
                          <Crown className="w-4 h-4" />
                          اشترك الآن
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </StaggerGrid>
        </div>
      </section>

      {/* Who We Are */}
      <section id="who-we-are" className="py-16 sm:py-24 lg:py-28 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <SectionReveal>
            <div className="text-center mb-12 sm:mb-16">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">
                من نحن
              </Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-4">
                نحن هنا لنكون شريكك في <span className="text-primary">رحلة النجاح</span>
              </h2>
              <p className="text-sm sm:text-base text-text-muted max-w-2xl mx-auto">
                منصة الرائد هي منصة تعليمية مصرية متخصصة في تعليم مادتي الرياضيات والإحصاء لطلاب الصف الثالث الثانوي
              </p>
            </div>
          </SectionReveal>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-border">
                <Image
                  src="/main_logo.jpeg"
                  alt="منصة الرائد"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>

            <SectionReveal>
              <div className="space-y-6">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary">
                  مرحباً بك في منصة الرائد
                </h2>
                <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
                  نحن هنا لنكون شريكك في رحلة النجاح الأكاديمي. نؤمن بأن كل طالب يستحق فرصة حقيقية للنجاح،
                  ولهذا نقدم محتوى تعليمياً عالي الجودة بطريقة سهلة وممتعة.
                </p>
                <div className="flex flex-wrap gap-4">
                  {['فريق متخصص', 'خبرة تعليمية', 'أكثر من 10 سنوات'].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-text-primary">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionReveal>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-12 sm:mt-16">
            <SectionReveal>
              <Card className="bg-surface-card border-border">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Globe className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-primary">رؤيتنا</h3>
                      <p className="text-sm text-text-muted">تعليم متاح للجميع</p>
                    </div>
                  </div>
                  <p className="text-text-secondary leading-relaxed">
                    أن نكون المنصة التعليمية الرائدة في مجال الرياضيات والإحصاء بمصر والعالم العربي
                  </p>
                </CardContent>
              </Card>
            </SectionReveal>

            <SectionReveal>
              <Card className="bg-surface-card border-border">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-primary">رسالتنا</h3>
                      <p className="text-sm text-text-muted">تبسيط التعليم</p>
                    </div>
                  </div>
                  <p className="text-text-secondary leading-relaxed">
                    تقديم تجربة تعليمية مبتكرة تساعد الطلاب على التفوق والتميز
                  </p>
                </CardContent>
              </Card>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-16 sm:py-24 lg:py-28 bg-muted-dark/50 relative">
        <div className="container mx-auto px-4 max-w-4xl">
          <SectionReveal>
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">
                آراء الطلاب
              </Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-4">
                ماذا يقول <span className="text-primary">طلابنا</span>
              </h2>
            </div>
          </SectionReveal>

          <div className="relative">
            <Card className="bg-surface-card border-border">
              <CardContent className="p-8 sm:p-10 text-center">
                <Avatar className="w-16 h-16 mx-auto mb-5 ring-2 ring-primary/20">
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {testimonials[currentTestimonial].avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="transition-opacity duration-300">
                  <p className="text-lg text-text-primary mb-5 leading-relaxed">
                    &ldquo;{testimonials[currentTestimonial].content}&rdquo;
                  </p>
                  <h4 className="font-bold text-text-primary">{testimonials[currentTestimonial].name}</h4>
                  <p className="text-sm text-text-muted">{testimonials[currentTestimonial].role}</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={prevTestimonial}
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-primary/50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`h-2.5 rounded-full transition-all cursor-pointer ${
                      index === currentTestimonial
                        ? 'bg-primary w-8'
                        : 'bg-border w-2.5 hover:bg-text-muted'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={nextTestimonial}
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-primary/50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 sm:py-24 lg:py-28 relative">
        <div className="container mx-auto px-4 max-w-3xl">
          <SectionReveal>
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">
                الأسئلة الشائعة
              </Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-4">
                لديك <span className="text-primary">سؤال؟</span> لدينا الجواب
              </h2>
              <p className="text-sm sm:text-base text-text-muted max-w-2xl mx-auto">
                جمعنا لك إجابات أكثر الأسئلة شيوعاً عن المنصة والاشتراك
              </p>
            </div>
          </SectionReveal>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const open = openFaq === index;
              return (
                <Card
                  key={index}
                  className={cn(
                    'bg-surface-card border-border transition-colors',
                    open && 'border-primary/40'
                  )}
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-right"
                  >
                    <span className="font-medium text-text-primary">{faq.q}</span>
                    <ChevronDown
                      className={cn(
                        'w-5 h-5 text-text-muted flex-shrink-0 transition-transform',
                        open && 'rotate-180 text-primary'
                      )}
                    />
                  </button>
                  {open && (
                    <div className="px-5 pb-5">
                      <p className="text-sm text-text-secondary leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Teacher */}
      <section id="teacher" className="py-16 sm:py-24 lg:py-28 bg-muted-dark/50 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <SectionReveal>
            <div className="text-center mb-12 sm:mb-16">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">
                تعرف على مدرسك
              </Badge>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-4">
                مدرسك <span className="text-primary">معك خطوة بخطوة</span>
              </h2>
              <p className="text-sm sm:text-base text-text-muted max-w-2xl mx-auto">
                خبرة طويلة في تدريس الرياضيات والإحصاء للثانوية العامة بأسلوب مبسط يحبه الطلاب
              </p>
            </div>
          </SectionReveal>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <SectionReveal>
              <div className="relative max-w-md mx-auto">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 border border-border" />
                <div className="relative h-full flex flex-col items-center justify-center p-10 text-center">
                  <div className="w-28 h-28 rounded-full bg-surface-card border border-primary/30 flex items-center justify-center mb-6 shadow-xl">
                    <GraduationCap className="w-14 h-14 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-text-primary mb-1">
                    {teacherName || 'معلم الرياضيات والإحصاء'}
                  </h3>
                  <p className="text-text-muted text-sm mb-4">خبير تدريس مادتي الرياضيات والإحصاء</p>
                  <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                    منصة الرائد
                  </Badge>
                </div>
                <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-primary/10 rounded-full blur-xl" />
                <div className="absolute -top-4 -right-4 w-32 h-32 bg-accent/10 rounded-full blur-xl" />
              </div>
            </SectionReveal>

            <SectionReveal>
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
                  {teacherName || 'مدرس الرياضيات والإحصاء'}
                </h3>
                <p className="text-primary font-medium mb-4">خبير تدريس مادتي الرياضيات والإحصاء</p>
                <p className="text-text-secondary leading-relaxed mb-6">
                  مدرس متخصص في مادتي الرياضيات والإحصاء للثانوية العامة، يقدم المنهج بأسلوب مبسط وسلس
                  يعتمد على الفهم قبل الحفظ، مع تدريب الطلاب على جميع أفكار الأسئلة الواردة في الامتحانات
                  وضمان تثبيت المعلومات من خلال تمارين واختبارات مستمرة.
                </p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  {teacherStats.map((s) => (
                    <div key={s.label} className="bg-surface-card border border-border rounded-2xl p-4 text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-text-primary">{s.number}</p>
                      <p className="text-xs text-text-muted mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                <ul className="space-y-3 mb-8">
                  {teacherHighlights.map((h) => (
                    <li key={h} className="flex items-start gap-3 text-sm text-text-secondary">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      {h}
                    </li>
                  ))}
                </ul>

                <Link href="/subscribe" className="inline-block">
                  <Button className="gap-2">
                    <Crown className="w-4 h-4" />
                    احجز مقعدك الآن
                  </Button>
                </Link>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <SectionReveal>
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary mb-4">
                جاهز لبدء رحلتك؟
              </h2>
              <p className="text-base sm:text-lg text-text-secondary mb-8 max-w-xl mx-auto">
                انضم إلى آلاف الطلاب الذين حققوا نجاحهم مع منصة الرائد
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/subscribe">
                  <Button className="gap-2 text-sm sm:text-base px-8 h-12">
                    <Crown className="w-4 h-4" />
                    <span>اشترك الآن</span>
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="outline" size="default" className="gap-2 border-primary/50 text-primary hover:bg-primary/10 px-8 h-12">
                    <span>ابدأ مجاناً</span>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </SectionReveal>
      </section>

      <ChatBot />

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-surface-card">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/bar.png"
                  alt="منصة الرائد"
                  width={40}
                  height={40}
                  className="w-9 h-9 sm:w-10 sm:h-10"
                />
                <span className="font-bold text-lg text-text-primary">منصة الرائد</span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed mb-4">
                منصة تعليمية مصرية متخصصة في تعليم مادتي الرياضيات والإحصاء، نساعد طلاب الثانوية العامة
                على تحقيق أعلى الدرجات.
              </p>
              <div className="flex items-center gap-3">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors text-text-muted hover:text-primary">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="https://wa.me/01022916304" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors text-text-muted hover:text-primary">
                  <MessageCircle className="w-5 h-5" />
                </a>
                <a href="mailto:contact@alraed.com" className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors text-text-muted hover:text-primary">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-text-primary mb-4">روابط سريعة</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/lessons" className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    الدروس التعليمية
                  </Link>
                </li>
                <li>
                  <Link href="/quizzes" className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    الاختبارات
                  </Link>
                </li>
                <li>
                  <Link href="/pdfs" className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    ملفات PDF
                  </Link>
                </li>
                <li>
                  <Link href="/subscribe" className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    الاشتراك والأسعار
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-text-primary mb-4">تواصل معنا</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3 text-text-muted">
                  <span className="w-9 h-9 bg-muted rounded-full flex items-center justify-center text-text-secondary">
                    <Phone className="w-4 h-4" />
                  </span>
                  <span dir="ltr">01022916304</span>
                </li>
                <li className="flex items-center gap-3 text-text-muted">
                  <span className="w-9 h-9 bg-muted rounded-full flex items-center justify-center text-text-secondary">
                    <Mail className="w-4 h-4" />
                  </span>
                  <span dir="ltr">contact@alraed.com</span>
                </li>
                <li className="flex items-center gap-3 text-text-muted">
                  <span className="w-9 h-9 bg-muted rounded-full flex items-center justify-center text-text-secondary">
                    <MessageCircle className="w-4 h-4" />
                  </span>
                  دعم فني عبر واتساب
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border text-center">
            <p className="text-sm text-text-muted">
              © 2026 منصة الرائد. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>

      {loginClass && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setLoginClass(null)}
          />
          <div className="relative bg-surface-card border border-border rounded-2xl max-w-md w-full p-8 text-center shadow-xl">
            <button
              onClick={() => setLoginClass(null)}
              className="absolute top-4 left-4 p-2 rounded-lg hover:bg-muted text-text-muted transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">يجب تسجيل الدخول أولاً</h3>
            <p className="text-text-secondary mb-6">
              للاشتراك في {getClassByKey(loginClass)?.short || 'الصف المختار'}، يرجى تسجيل الدخول أو إنشاء
              حساب جديد
            </p>
            <div className="flex flex-col gap-3">
              <Link href={`/auth/login?redirect=${encodeURIComponent(`/subscribe?class=${loginClass}`)}`}>
                <Button className="w-full gap-2">
                  <LogIn className="w-4 h-4" />
                  تسجيل الدخول
                </Button>
              </Link>
              <Link href={`/auth/signup?redirect=${encodeURIComponent(`/subscribe?class=${loginClass}`)}`}>
                <Button variant="outline" className="w-full gap-2">
                  <UserPlus className="w-4 h-4" />
                  إنشاء حساب جديد
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
