'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import FavoriteButton from '@/components/FavoriteButton';
import {
  FileText,
  Download,
  BookOpen,
  PenTool,
  ClipboardList,
  Search,
  Crown,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { motion } from 'framer-motion';

const categoryConfig = {
  explanation: {
    label: 'شروحات وملخصات',
    icon: BookOpen,
    color: 'bg-blue-500',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-600',
  },
  solution: {
    label: 'التمارين و تدريبات',
    icon: PenTool,
    color: 'bg-green-500',
    borderColor: 'border-green-200',
    textColor: 'text-green-600',
  },
  quizzes: {
    label: 'بنك اسئلة',
    icon: ClipboardList,
    color: 'bg-purple-500',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-600',
  },
};

type CategoryType = 'explanation' | 'solution' | 'quizzes';

export default function PdfsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [allPdfs, setAllPdfs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('explanation');

  useEffect(() => {
    fetchPdfs();
  }, [user?.grade]);

  const fetchPdfs = async () => {
    try {
      const gradeParam = user?.grade ? `?grade=${encodeURIComponent(user.grade)}` : '';
      const res = await fetch(`/api/admin/pdfs${gradeParam}`);
      const data = await res.json();
      if (data.success) {
        setAllPdfs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch PDFs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPdfs = allPdfs
    .filter((pdf: any) => {
      const matchesSearch = 
        pdf.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pdf.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !activeCategory || pdf.category === activeCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  const categoryCounts = allPdfs.reduce((acc: any, pdf: any) => {
    const cat = pdf.category || 'explanation';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading || authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-text-secondary mt-2">جاري التحميل...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">ملفات PDF</h1>
            <p className="text-text-secondary mt-1">تحميل ملاحظات ومراجعات وكتبات متنوعة</p>
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث..."
              className="w-full pr-10 pl-4 py-2 bg-muted border-0 rounded-xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {(Object.keys(categoryConfig) as CategoryType[]).map((cat) => {
            const config = categoryConfig[cat];
            const IconComponent = config.icon;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-muted text-text-secondary hover:bg-muted/80'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                {config.label}
                <span className="text-xs opacity-70">({categoryCounts[cat] || 0})</span>
              </button>
            );
          })}
        </div>

        {filteredPdfs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-text-secondary mb-3" />
            <p className="text-text-secondary">لا توجد ملفات PDF</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPdfs.map((pdf: any, index: number) => {
              const config = categoryConfig[pdf.category as CategoryType] || categoryConfig.explanation;
              const IconComponent = config.icon;
              const locked = !!pdf.locked;
              const wrapper = locked ? (
                <motion.div
                  key={pdf.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="block cursor-pointer"
                  onClick={() => router.push('/subscribe')}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow relative">
                    <CardContent className="p-5">
                      <FavoriteButton
                        itemType="pdf"
                        itemId={pdf.id}
                        title={pdf.title}
                        className="absolute top-3 left-3 z-10 bg-surface/80 rounded-full p-1.5 shadow-sm"
                      />
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.color}/10`}>
                          <IconComponent className={`w-6 h-6 ${config.textColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-text-primary mb-1 line-clamp-2">{pdf.title}</h3>
                          {pdf.description && (
                            <p className="text-sm text-text-secondary line-clamp-2 mb-2">{pdf.description}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {config.label}
                            </Badge>
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Lock className="w-3 h-3" />
                              {pdf.accessType === 'PREMIUM' ? 'للمشتركين المميزين' : 'للمشتركين'}
                            </Badge>
                          </div>
                        </div>
                        <Lock className="w-4 h-4 text-text-secondary flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.a
                  key={pdf.id}
                  href={pdf.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="block"
                >
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer relative">
                    <CardContent className="p-5">
                      <FavoriteButton
                        itemType="pdf"
                        itemId={pdf.id}
                        title={pdf.title}
                        className="absolute top-3 left-3 z-10 bg-surface/80 rounded-full p-1.5 shadow-sm"
                      />
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.color}/10`}>
                          <IconComponent className={`w-6 h-6 ${config.textColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-text-primary mb-1 line-clamp-2">{pdf.title}</h3>
                          {pdf.description && (
                            <p className="text-sm text-text-secondary line-clamp-2 mb-2">{pdf.description}</p>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {config.label}
                          </Badge>
                        </div>
                        <ArrowRight className="w-4 h-4 text-text-secondary flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.a>
              );
              return wrapper;
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}