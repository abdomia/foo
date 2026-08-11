'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/AuthProvider';
import {
  Smartphone,
  Monitor,
  Tablet,
  ShieldCheck,
  LogOut,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface Device {
  deviceId: string | null;
  deviceName: string;
  browser: string;
  os: string;
  userAgent: string | null;
  lastActiveAt: string | null;
  sessions: number;
  isCurrent: boolean;
}

function formatLastActive(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60 * 1000) return 'الآن';
  if (diff < 60 * 60 * 1000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
  if (diff < 24 * 60 * 60 * 1000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `منذ ${Math.floor(diff / 86400000)} يوم`;
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function DeviceIcon({ os }: { os: string }) {
  const osLower = os.toLowerCase();
  if (osLower.includes('tablet') || osLower.includes('ipad')) {
    return <Tablet className="w-6 h-6" />;
  }
  if (osLower.includes('android') || osLower.includes('ios') || osLower.includes('iphone')) {
    return <Smartphone className="w-6 h-6" />;
  }
  return <Monitor className="w-6 h-6" />;
}

export function DevicesSection() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [maxDevices, setMaxDevices] = useState(3);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/devices');
      const json = await res.json();
      if (json.success) {
        setDevices(json.data.devices);
        setMaxDevices(json.data.maxDevices);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchDevices();
    else setLoading(false);
  }, [user, fetchDevices]);

  const handleRevoke = async (device: Device) => {
    const isCurrent = device.isCurrent;
    const confirmed = isCurrent
      ? window.confirm('سيتم تسجيل خروجك من هذا الجهاز الحالي. هل تريد المتابعة؟')
      : window.confirm(`سيتم تسجيل الخروج من: ${device.deviceName}؟`);

    if (!confirmed) return;

    setRevoking(device.deviceId ?? '__unknown__');
    setMessage('');
    try {
      const res = await fetch('/api/auth/devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: device.deviceId ?? undefined }),
      });
      const json = await res.json();
      if (json.success) {
        if (json.loggedOut || isCurrent) {
          logout();
          setMessage('تم تسجيل الخروج من هذا الجهاز');
          setTimeout(() => router.push('/auth/login'), 1200);
          return;
        }
        setMessage('تم تسجيل الخروج من الجهاز بنجاح');
        fetchDevices();
      } else {
        setMessage(json.error ?? 'تعذر تسجيل الخروج من الجهاز');
      }
    } catch {
      setMessage('حدث خطأ في الاتصال');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-lg text-text-primary flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              إدارة الأجهزة
            </h2>
            <p className="text-xs text-text-secondary mt-1">الأجهزة التي دخلت منها إلى حسابك</p>
          </div>
          <Badge variant="secondary" className="w-fit gap-1 text-sm">
            <ShieldCheck className="w-4 h-4 text-success" />
            {devices.length} / {maxDevices} أجهزة نشطة
          </Badge>
        </div>

        {message && (
          <div className="bg-primary/10 border border-primary/20 text-text-primary rounded-xl p-4 text-sm flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
            {message}
          </div>
        )}

        <p className="text-sm text-text-secondary mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
          الحد الأقصى المسموح به هو {maxDevices} أجهزة. عند تجاوز العدد سيُطلب منك تسجيل الخروج من جهاز أقدم.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : devices.length === 0 ? (
          <p className="text-center text-text-secondary py-8">لا توجد أجهزة نشطة</p>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.deviceId ?? '__unknown__'}
                className="border border-border rounded-xl p-4 flex flex-wrap items-center gap-3 sm:gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <DeviceIcon os={device.os} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-text-primary">{device.deviceName}</p>
                    {device.isCurrent && <Badge className="text-[10px]">هذا الجهاز</Badge>}
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {device.browser} · {device.os}
                    {device.sessions > 1 ? ` · ${device.sessions} جلسات` : ''}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    آخر نشاط: {formatLastActive(device.lastActiveAt)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevoke(device)}
                  disabled={revoking === (device.deviceId ?? '__unknown__')}
                  className="gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  {revoking === (device.deviceId ?? '__unknown__') ? 'جاري...' : 'تسجيل الخروج'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
