'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/AuthProvider';
import {
  ArrowRight,
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Printer,
  Users,
  CreditCard,
  Wallet,
  TrendingUp,
  ClipboardList,
  Eye,
  GraduationCap,
  ChevronUp,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

type Cell = string | number | null;
interface Column {
  key: string;
  label: string;
}
interface RowData {
  [key: string]: Cell;
}
interface SummaryItem {
  label: string;
  value: string | number;
}
interface ReportData {
  type: string;
  columns: Column[];
  rows: RowData[];
  summary: SummaryItem[];
}

const REPORT_TYPES = [
  { key: 'students', label: 'الطلاب', icon: Users },
  { key: 'subscriptions', label: 'الاشتراكات', icon: CreditCard },
  { key: 'payments', label: 'المدفوعات', icon: Wallet },
  { key: 'revenue', label: 'الإيرادات', icon: TrendingUp },
  { key: 'quizzes', label: 'الاختبارات', icon: ClipboardList },
  { key: 'lessonViews', label: 'مشاهدات الدروس', icon: Eye },
  { key: 'progress', label: 'تقدم الطلاب', icon: GraduationCap },
] as const;

function downloadBlob(content: BlobPart, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [type, setType] = useState<string>('students');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const tableRef = useRef<HTMLDivElement>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ type });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (search.trim()) params.set('search', search.trim());
      if (sortBy) params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error ?? 'تعذر تحميل التقرير');
      }
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [type, from, to, search, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(fetchReport, 300);
    return () => clearTimeout(timer);
  }, [fetchReport]);

  useEffect(() => {
    if (!authLoading && !user?.isAdmin) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const changeType = (key: string) => {
    setType(key);
    setSortBy(null);
    setSortOrder('desc');
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  const exportCsv = () => {
    if (!data) return;
    const header = data.columns.map((c) => c.label).join(',');
    const lines = data.rows.map((row) =>
      data.columns.map((c) => {
        const v = row[c.key];
        const s = v == null ? '' : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    );
    downloadBlob('\uFEFF' + [header, ...lines].join('\n'), `تقرير-${type}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportExcel = () => {
    if (!data) return;
    const worksheetData = data.rows.map((row) =>
      Object.fromEntries(data.columns.map((c) => [c.label, row[c.key] ?? '']))
    );
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, REPORT_TYPES.find((r) => r.key === type)?.label ?? 'تقرير');
    XLSX.writeFile(wb, `تقرير-${type}.xlsx`);
  };

  const exportPdf = () => {
    window.print();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user?.isAdmin) return null;

  const activeType = REPORT_TYPES.find((r) => r.key === type) ?? REPORT_TYPES[0];

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; inset: 0; width: 100%; padding: 16px; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 no-print">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-primary" />
              التقارير
            </h1>
            <p className="text-muted-foreground mt-1">تقارير تفصيلية للطلاب والاشتراكات والمدفوعات والإحصائيات</p>
          </div>
          <Link href="/admin" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted text-sm font-medium transition-colors">
            <ArrowRight className="w-4 h-4" />
            العودة للوحة التحكم
          </Link>
        </div>

        <div className="mb-6 no-print">
          <div className="flex flex-wrap gap-2">
            {REPORT_TYPES.map((r) => {
              const Icon = r.icon;
              const isActive = r.key === type;
              return (
                <button
                  key={r.key}
                  onClick={() => changeType(r.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-card border border-border text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 mb-6 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">من تاريخ</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">إلى تاريخ</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">بحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث بالاسم أو البريد..."
                  className="w-full pr-10"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={fetchReport} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              تحديث
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
              <FileText className="w-4 h-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf} className="gap-2">
              <Printer className="w-4 h-4" />
              PDF
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-4 text-sm mb-6 no-print">
            {error}
          </div>
        )}

        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6 no-print">
            {data.summary.map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="print-area">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">{activeType.label}</h2>
                {data && <p className="text-sm text-muted-foreground mt-0.5">{data.rows.length} صف</p>}
              </div>
              <Download className="w-5 h-5 text-muted-foreground" />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !data || data.rows.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">لا توجد بيانات</p>
            ) : (
              <div ref={tableRef} className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {data.columns.map((c) => {
                        const isSorted = sortBy === c.key;
                        return (
                          <th
                            key={c.key}
                            onClick={() => handleSort(c.key)}
                            className="text-right px-4 py-3 font-semibold text-foreground whitespace-nowrap cursor-pointer select-none no-print hover:bg-muted transition-colors"
                          >
                            <span className="inline-flex items-center gap-1">
                              {c.label}
                              {isSorted && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        {data.columns.map((c) => (
                          <td key={c.key} className="px-4 py-3 text-foreground whitespace-nowrap">
                            {row[c.key] ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
