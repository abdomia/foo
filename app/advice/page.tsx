'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { ArrowRight, Lightbulb, Play, FileText, Clock } from 'lucide-react';

interface Advice {
  id: string;
  title: string;
  content: string;
  videoUrl: string | null;
  type: string;
  order: number;
  createdAt: string;
}

export default function AdvicePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdvice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchAdvice = async () => {
    try {
      const gradeParam = user?.grade ? `?grade=${user.grade}` : '';
      const res = await fetch(`/api/admin/advice${gradeParam}`);
      const data = await res.json();
      if (data.success) {
        setAdvice(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch advice:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">نصائحي لك</h1>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowRight className="w-4 h-4" />
              العودة للرئيسية
            </Button>
          </Link>
        </div>

        {advice.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center mt-4">
              <Lightbulb className="w-16 h-16 mx-auto text-text-secondary mb-4" />
              <h3 className="text-xl font-bold text-text-primary mb-2">لا توجد نصائح حالياً</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {advice.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                        {item.type === 'video' ? (
                          <Play className="w-6 h-6 text-primary" />
                        ) : (
                          <FileText className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-text-primary mb-2">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
                          <div className="flex items-center gap-1">
                            {item.type === 'video' ? (
                              <>
                                <Play className="w-4 h-4" />
                                <span>فيديو</span>
                              </>
                            ) : (
                              <>
                                <FileText className="w-4 h-4" />
                                <span>نص</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(item.createdAt).toLocaleDateString('ar-EG')}</span>
                          </div>
                        </div>

                        {item.type === 'video' && item.videoUrl ? (
                          <div className="mt-4 rounded-xl overflow-hidden bg-black">
                            <iframe
                              src={item.videoUrl}
                              className="w-full aspect-video"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                              allowFullScreen
                              title={item.title}
                            />
                          </div>
                        ) : (
                          <div className="mt-4 p-4 bg-muted/30 rounded-xl">
                            <p className="text-text-primary leading-relaxed whitespace-pre-wrap">
                              {item.content}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
