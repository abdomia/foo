'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Crown,
  Wallet,
  Clock,
  Video,
  ClipboardList,
  FileText,
  Activity,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface Cards {
  totalStudents: number;
  activeSubscribers: number;
  revenue: number;
  pendingPayments: number;
  totalLessons: number;
  totalQuizzes: number;
  totalPdfs: number;
  activeUsers: number;
}

interface DashboardData {
  cards: Cards;
  charts: {
    newUsers: { day: string; count: number }[];
    subscriptions: { day: string; count: number }[];
    revenueTrend: { day: string; amount: number }[];
    mostViewedLessons: { id: string; title: string; views: number; watchSeconds: number }[];
    mostFailedQuestions: {
      id: string;
      question: string;
      total: number;
      fails: number;
      failRate: number;
    }[];
    quizPerformance: {
      id: string;
      title: string;
      attempts: number;
      avgScore: number;
      passRate: number;
    }[];
  };
}

const TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid var(--border, #e2e8f0)',
  fontSize: '13px',
  direction: 'rtl' as const,
};

function shortLabel(text: string, max = 22): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function formatMoney(n: number): string {
  return n.toLocaleString('ar-EG') + ' ج.م';
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'primary',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tone?: 'primary' | 'success' | 'warning' | 'error';
}) {
  const tones: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
  };
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-text-secondary">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-text-primary mt-1 leading-tight">
              {value}
            </p>
            {sub && <p className="text-[11px] text-text-muted mt-0.5 truncate">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tones[tone]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/dashboard')
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        if (json.success) setData(json.data);
        else setError(json.error ?? 'فشل تحميل الإحصائيات');
      })
      .catch(() => {
        if (mounted) setError('فشل الاتصال بالخادم');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-text-secondary">
          <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-3" />
          <p>{error || 'لا توجد بيانات'}</p>
        </CardContent>
      </Card>
    );
  }

  const c = data.charts;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Users} label="إجمالي الطلاب" value={data.cards.totalStudents.toLocaleString('ar-EG')} />
        <StatCard icon={Crown} label="المشتركين النشطين" value={data.cards.activeSubscribers.toLocaleString('ar-EG')} tone="success" />
        <StatCard icon={Wallet} label="الإيرادات" value={formatMoney(data.cards.revenue)} tone="warning" />
        <StatCard
          icon={Clock}
          label="مدفوعات معلقة"
          value={data.cards.pendingPayments.toLocaleString('ar-EG')}
          tone="error"
        />
        <StatCard icon={Video} label="الدروس" value={data.cards.totalLessons.toLocaleString('ar-EG')} />
        <StatCard icon={ClipboardList} label="الاختبارات" value={data.cards.totalQuizzes.toLocaleString('ar-EG')} />
        <StatCard icon={FileText} label="ملفات PDF" value={data.cards.totalPdfs.toLocaleString('ar-EG')} />
        <StatCard
          icon={Activity}
          label="مستخدمون نشطون"
          value={data.cards.activeUsers.toLocaleString('ar-EG')}
          sub="خلال آخر 30 يوم"
        />
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <ChartCard title="مستخدمون جدد (30 يوم)" icon={TrendingUp}>
          <AreaChart data={c.newUsers} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} interval={4} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => `اليوم ${String(v)}`} />
            <Area type="monotone" dataKey="count" name="مستخدمين" stroke="#0f766e" strokeWidth={2} fill="url(#gradUsers)" />
          </AreaChart>
        </ChartCard>

        <ChartCard title="اشتراكات جديدة (30 يوم)" icon={Crown}>
          <BarChart data={c.subscriptions} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} interval={4} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => `اليوم ${String(v)}`} />
            <Bar dataKey="count" name="اشتراكات" fill="#0f766e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="الإيرادات (30 يوم)" icon={Wallet}>
          <AreaChart data={c.revenueTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} interval={4} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => `اليوم ${String(v)}`} formatter={(v) => [formatMoney(Number(v ?? 0)), 'الإيراد']} />
            <Area type="monotone" dataKey="amount" name="الإيراد" stroke="#d97706" strokeWidth={2} fill="url(#gradRevenue)" />
          </AreaChart>
        </ChartCard>

        <ChartCard title="الأكثر مشاهدة" icon={Video}>
          <BarChart data={c.mostViewedLessons} layout="vertical" margin={{ top: 5, right: 5, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="title"
              width={120}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => shortLabel(v)}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [String(v ?? ''), n === 'views' ? 'مشاهدة' : 'دقيقة']} />
            <Bar dataKey="views" name="views" fill="#0f766e" radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ChartCard>

        <ChartCard title="الأسئلة الأكثر فشلاً" icon={AlertTriangle}>
          <BarChart data={c.mostFailedQuestions} layout="vertical" margin={{ top: 5, right: 5, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="question"
              width={120}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => shortLabel(v)}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [String(v ?? ''), n === 'fails' ? 'إجابة خاطئة' : '']} />
            <Bar dataKey="fails" name="fails" fill="#dc2626" radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ChartCard>

        <ChartCard title="أداء الاختبارات" icon={ClipboardList}>
          <BarChart data={c.quizPerformance} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="title" tick={{ fontSize: 10 }} tickFormatter={(v: string) => shortLabel(v, 10)} interval={0} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, 100]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="avgScore" name="متوسط الدرجات" fill="#0f766e" radius={[4, 4, 0, 0]} barSize={14} />
            <Bar dataKey="passRate" name="نسبة النجاح" fill="#d97706" radius={[4, 4, 0, 0]} barSize={14} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}
