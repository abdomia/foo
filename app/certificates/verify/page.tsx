'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

export default function CertificateVerifyPage() {
  const router = useRouter();
  const [certId, setCertId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = certId.trim();
    if (!id) return;
    router.push(`/certificates/verify/${encodeURIComponent(id)}`);
  };

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">التحقق من الشهادة</h1>
          <p className="text-text-secondary mt-1">
            أدخل رقم الشهادة الموجود أسفل الشهادة للتحقق من صحتها
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                value={certId}
                onChange={(e) => setCertId(e.target.value)}
                placeholder="مثال: CERT-4F3A9B2C1D"
                dir="ltr"
                className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground text-center font-mono tracking-wider"
              />
              <Button type="submit" disabled={!certId.trim()} className="w-full gap-2">
                <ShieldCheck className="w-4 h-4" />
                تحقق من الشهادة
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
