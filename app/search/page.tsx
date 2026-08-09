'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Search,
  X,
  BookOpen,
  Play,
  FileText,
  ClipboardList,
  HelpCircle,
  Lock,
  ArrowLeft,
  CornerDownLeft,
} from 'lucide-react';

type ResultType = 'lesson' | 'topic' | 'pdf' | 'quiz' | 'question';

interface SearchResult {
  type: ResultType;
  id: string;
  title?: string;
  question?: string;
  description?: string;
  snippet?: string;
  grade?: string | null;
  topic?: { id: string; title: string } | null;
  context?: string[];
  locked?: boolean;
  accessType?: string | null;
  difficulty?: string;
  options?: string[];
  href: string;
}

interface SearchData {
  query: string;
  total: number;
  counts: Record<string, number>;
  results: Record<string, SearchResult[]>;
}

const TYPE_META: Record<ResultType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  lesson: { label: 'الدروس', icon: Play },
  topic: { label: 'المواضيع', icon: BookOpen },
  pdf: { label: 'ملفات PDF', icon: FileText },
  quiz: { label: 'الاختبارات', icon: ClipboardList },
  question: { label: 'الأسئلة', icon: HelpCircle },
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
};

function SearchResults({ data }: { data: SearchData }) {
  const typeOrder: ResultType[] = ['lesson', 'topic', 'pdf', 'quiz', 'question'];

  return (
    <div className="space-y-6">
      {typeOrder.map((type) => {
        const items = data.results[type] ?? [];
        if (items.length === 0) return null;
        const meta = TYPE_META[type];
        const Icon = meta.icon;
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <Icon className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-text-primary">{meta.label}</h2>
              <Badge variant="secondary" className="text-xs">
                {items.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <Card key={`${type}-${item.id}`} className="overflow-hidden">
                  <Link href={item.href}>
                    <CardContent className="p-4 hover:bg-muted/40 transition-colors">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                            item.locked
                              ? 'bg-muted text-text-secondary'
                              : 'bg-primary/10 text-primary'
                          )}
                        >
                          {item.locked ? (
                            <Lock className="w-5 h-5" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-text-primary truncate">
                              {item.type === 'question' ? item.question : item.title}
                            </p>
                            {item.locked && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Lock className="w-3 h-3" />
                                {item.accessType === 'PREMIUM' ? 'مميز' : 'للمشتركين'}
                              </Badge>
                            )}
                          </div>
                          {item.type === 'question' ? (
                            <>
                              {item.topic && (
                                <p className="text-sm text-text-secondary mt-0.5">{item.topic.title}</p>
                              )}
                              {item.context && item.context.length > 0 && (
                                <p className="text-xs text-text-secondary mt-1">
                                  {item.context.join(' — ')}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">
                              {item.description || item.snippet || ''}
                            </p>
                          )}
                          {item.type === 'question' && item.difficulty && (
                            <p className="text-xs text-text-secondary mt-1">
                              {DIFFICULTY_LABELS[item.difficulty] ?? item.difficulty}
                              {item.options && item.options.length > 0
                                ? ` • ${item.options.length} خيارات`
                                : ''}
                            </p>
                          )}
                        </div>
                        <ArrowLeft className="w-4 h-4 text-text-secondary flex-shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function flattenResults(data: SearchData): SearchResult[] {
  const typeOrder: ResultType[] = ['lesson', 'topic', 'pdf', 'quiz', 'question'];
  return typeOrder.flatMap((type) => data.results[type] ?? []);
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setData(null);
      setHasSearched(false);
      setDropdownOpen(false);
      return;
    }
    setLoading(true);
    setDropdownOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setHasSearched(true);
          const url = new URL(window.location.href);
          url.searchParams.set('q', query.trim());
          window.history.replaceState({}, '', url.toString());
        }
      } catch {
        setHasSearched(true);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const dropdownItems = data ? flattenResults(data).slice(0, 8) : [];
  const showDropdown = dropdownOpen && query.trim().length >= 2;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">البحث</h1>
          <p className="text-text-secondary mt-1">
            ابحث في الدروس والمواضيع والملفات والاختبارات والأسئلة
          </p>
        </div>

        <Card ref={boxRef}>
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="ابحث عن درس، سؤال، اختبار... مثال: الانحراف المعياري"
                className="w-full pr-12 pl-12 py-3 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setDropdownOpen(false);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <button
                type="submit"
                className="absolute left-12 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90"
              >
                <CornerDownLeft className="w-4 h-4" />
              </button>
            </form>

            {showDropdown && (
              <div className="mt-2 rounded-xl border border-border bg-surface shadow-xl overflow-hidden animate-fade-in">
                {loading && dropdownItems.length === 0 && (
                  <div className="p-4 text-center text-sm text-text-secondary">
                    جاري البحث...
                  </div>
                )}
                {!loading && dropdownItems.length === 0 && (
                  <div className="p-4 text-center text-sm text-text-secondary">
                    لا توجد نتائج مطابقة
                  </div>
                )}
                {dropdownItems.length > 0 && (
                  <ul className="max-h-96 overflow-y-auto">
                    {dropdownItems.map((item) => {
                      const meta = TYPE_META[item.type];
                      const Icon = meta.icon;
                      const title =
                        item.type === 'question' ? item.question : item.title ?? '';
                      return (
                        <li key={`${item.type}-${item.id}`}>
                          <button
                            type="button"
                            onClick={() => {
                              setDropdownOpen(false);
                              router.push(item.href);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-muted/50 transition-colors"
                          >
                            <div
                              className={cn(
                                'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                                item.locked
                                  ? 'bg-muted text-text-secondary'
                                  : 'bg-primary/10 text-primary'
                              )}
                            >
                              {item.locked ? (
                                <Lock className="w-4 h-4" />
                              ) : (
                                <Icon className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-text-primary truncate">
                                {title}
                              </p>
                              {(item.type === 'question'
                                ? item.topic?.title
                                : item.description || item.snippet) && (
                                <p className="text-xs text-text-secondary truncate">
                                  {item.type === 'question'
                                    ? item.topic?.title
                                    : item.description || item.snippet}
                                </p>
                              )}
                            </div>
                            <span className="text-[11px] text-text-secondary flex-shrink-0 bg-muted px-2 py-0.5 rounded-full">
                              {meta.label}
                            </span>
                            <ArrowLeft className="w-4 h-4 text-text-secondary flex-shrink-0" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-text-secondary mt-3">جاري البحث...</p>
          </div>
        )}

        {!loading && !hasSearched && !data && (
          <Card>
            <CardContent className="p-10 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <p className="font-bold text-text-primary mb-1">ابحث في كل محتوى المنصة</p>
              <p className="text-text-secondary text-sm">
                اكتب كلمة أو جملة للبحث في الدروس والمواضيع وملفات PDF والاختبارات والأسئلة
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && hasSearched && data && data.total === 0 && (
          <Card>
            <CardContent className="p-10 text-center">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-text-secondary" />
              </div>
              <p className="font-bold text-text-primary mb-1">لا توجد نتائج</p>
              <p className="text-text-secondary text-sm">
                لم نجد أي نتائج مطابقة لـ «{data.query}» ، جرّب كلمات أخرى
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && hasSearched && data && data.total > 0 && (
          <>
            <p className="text-sm text-text-secondary">
              {data.total} نتيجة لـ <span className="font-bold text-text-primary">«{data.query}»</span>
            </p>
            <SearchResults data={data} />
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-text-secondary mt-2">جاري التحميل...</p>
            </div>
          </div>
        </MainLayout>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
