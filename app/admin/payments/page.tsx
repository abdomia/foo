'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Check, X, Clock, Phone, CreditCard, User, ArrowRight } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  plan: string;
  transactionId: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.isAdmin) {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/admin/payments');
      const data = await res.json();
      if (data.success) {
        setPayments(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (paymentId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action }),
      });
      
      const data = await res.json();
      if (data.success) {
        fetchPayments();
      } else {
        alert(data.error || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Verification failed:', error);
    }
  };

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const completedPayments = payments.filter(p => p.status === 'completed');

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">مديرية المدفوعات</h1>
            <p className="text-muted-foreground mt-1">التحقق من مدفوعات فودافون كاش</p>
          </div>
          <Button onClick={() => router.push('/admin')} variant="outline" className="gap-2">
            <ArrowRight className="w-4 h-4" />
            العودة للوحة التحكم
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="space-y-8">
            {/* Pending Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  المدفوعات في انتظار المراجعة
                  <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {pendingPayments.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingPayments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">لا توجد مدفوعات في الانتظار</p>
                ) : (
                  <div className="space-y-4">
                    {pendingPayments.map((payment) => (
                      <div key={payment.id} className="border border-border rounded-xl p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-xl flex items-center justify-center">
                              <Phone className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{payment.user.name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{payment.user.phone}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                Ref: {payment.transactionId}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold">{payment.amount}</p>
                              <p className="text-xs text-muted-foreground">{payment.plan}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleVerify(payment.id, 'approve')}
                                size="sm"
                                className="gap-1 bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-4 h-4" />
                                تفعيل
                              </Button>
                              <Button
                                onClick={() => handleVerify(payment.id, 'reject')}
                                variant="destructive"
                                size="sm"
                                className="gap-1"
                              >
                                <X className="w-4 h-4" />
                                رفض
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completed Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  المدفوعات المفعلة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completedPayments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">لا توجد مدفوعات مفعلة</p>
                ) : (
                  <div className="space-y-2">
                    {completedPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Check className="w-4 h-4 text-green-500" />
                          <div>
                            <span className="font-medium">{payment.user.name}</span>
                            <span className="text-muted-foreground mr-2">({payment.amount} EGP)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{payment.plan}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}