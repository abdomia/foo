'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ShieldCheck, Award } from 'lucide-react';

interface CertData {
  certificateId: string;
  courseTitle: string;
  completionPercent: number;
  studentName: string;
  teacherName: string;
  issuedAt: string;
  qrDataUrl: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function CertificateVerifyResultPage() {
  const params = useParams<{ certId: string }>();
  const certId = typeof params?.certId === 'string' ? params.certId : '';
  const [cert, setCert] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!certId) {
      setError('رقم الشهادة مطلوب');
      setLoading(false);
      return;
    }
    fetch(`/api/certificates/verify/${encodeURIComponent(certId)}`)
      .then(async (res) => {
        const json = await res.json();
        if (json.success) {
          setCert(json.data);
        } else {
          setError(json.error ?? 'الشهادة غير موجودة');
        }
      })
      .catch(() => setError('حدث خطأ أثناء التحقق'))
      .finally(() => setLoading(false));
  }, [certId]);

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary">التحقق من الشهادة</h1>
          <p className="text-text-secondary mt-1">
            رقم الشهادة: <span dir="ltr" className="font-mono">{certId}</span>
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-10 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-text-secondary mt-3">جاري التحقق...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-10 text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <p className="font-bold text-text-primary mb-1">الشهادة غير صالحة</p>
              <p className="text-text-secondary text-sm mb-4">{error}</p>
              <Link href="/certificates/verify">
                <Button variant="outline">محاولة أخرى</Button>
              </Link>
            </CardContent>
          </Card>
        ) : cert ? (
          <>
            <Card className="border-success/30 bg-success/5">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-success/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-7 h-7 text-success" />
                </div>
                <div>
                  <p className="font-bold text-success text-lg">شهادة موثقة</p>
                  <p className="text-sm text-text-secondary">
                    هذه الشهادة صادرة فعلاً عن منصة الرائد
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary text-lg">{cert.studentName}</p>
                    <p className="text-sm text-text-secondary">حصل على شهادة إتمام</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-text-secondary mb-1">الكورس</p>
                    <p className="font-bold text-text-primary">{cert.courseTitle}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-text-secondary mb-1">نسبة الإنجاز</p>
                    <p className="font-bold text-text-primary">{cert.completionPercent}%</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-text-secondary mb-1">المدرس</p>
                    <p className="font-bold text-text-primary">{cert.teacherName}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-text-secondary mb-1">تاريخ الإصدار</p>
                    <p className="font-bold text-text-primary">{formatDate(cert.issuedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                  <div className="bg-white p-2 rounded-lg flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cert.qrDataUrl} alt="QR" className="w-24 h-24" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary mb-1 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-success" />
                      تم التحقق بنجاح
                    </p>
                    <p className="text-xs text-text-secondary">
                      امسح رمز QR للتأكد من صحة الشهادة في أي وقت
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </MainLayout>
  );
}
