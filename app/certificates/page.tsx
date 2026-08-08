'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { CertificateView } from '@/components/CertificateView';
import { Award, ShieldCheck, Download, X, CheckCircle2 } from 'lucide-react';

interface Certificate {
  id: string;
  certificateId: string;
  courseId: string;
  courseTitle: string;
  completionPercent: number;
  studentName: string;
  teacherName: string;
  issuedAt: string;
  verifyUrl: string;
  qrDataUrl: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function CertificatesPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Certificate | null>(null);

  const fetchCertificates = useCallback(async () => {
    try {
      const res = await fetch('/api/user/certificates');
      const json = await res.json();
      if (json.success) setCertificates(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchCertificates();
    else setLoading(false);
  }, [user, fetchCertificates]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">شهاداتي</h1>
            <p className="text-text-secondary mt-1">
              الشهادات التي حصلت عليها عند إكمال الوحدات والبرنامج
            </p>
          </div>
          <Link href="/certificates/verify">
            <Button variant="outline" className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              التحقق من شهادة
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-text-secondary mt-2">جاري تحميل الشهادات...</p>
            </div>
          </div>
        ) : certificates.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-primary" />
              </div>
              <p className="font-bold text-text-primary mb-1">لا توجد شهادات بعد</p>
              <p className="text-text-secondary text-sm mb-4">
                أكمل الوحدات التعليمية بالكامل لتحصل على شهاداتك تلقائياً
              </p>
              <Link href="/lessons">
                <Button className="gap-2">ابدأ بالدروس</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((cert) => (
              <Card key={cert.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-text-primary">{cert.courseTitle}</p>
                        <p className="text-xs text-text-secondary">
                          صدرت في {formatDate(cert.issuedAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {cert.completionPercent}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-text-secondary" dir="ltr">
                      {cert.certificateId}
                    </span>
                    <div className="flex gap-2">
                      <Link href={cert.verifyUrl}>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <ShieldCheck className="w-4 h-4" />
                          تحقق
                        </Button>
                      </Link>
                      <Button size="sm" className="gap-1" onClick={() => setSelected(cert)}>
                        <Download className="w-4 h-4" />
                        عرض الشهادة
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="relative bg-surface-card rounded-2xl p-6 w-full max-w-3xl my-auto">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
            <h3 className="font-bold text-lg text-text-primary mb-4">شهادة {selected.courseTitle}</h3>
            <CertificateView
              studentName={selected.studentName}
              courseTitle={selected.courseTitle}
              completionPercent={selected.completionPercent}
              teacherName={selected.teacherName}
              certificateId={selected.certificateId}
              issuedAt={selected.issuedAt}
              qrDataUrl={selected.qrDataUrl}
            />
          </div>
        </div>
      )}
    </MainLayout>
  );
}
