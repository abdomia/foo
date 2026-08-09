'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  parentPhone: string;
  avatar?: string;
  grade?: string;
  isSubscribed: boolean;
  subscriptionPlan?: 'monthly' | 'yearly' | 'semester';
  subscriptionExpiry?: string;
  isAdmin?: boolean;
  role?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, force?: boolean) => Promise<{
    success: boolean;
    error?: string;
    user?: User;
    code?: string;
    maxDevices?: number;
    deviceCount?: number;
  }>;
  signup: (name: string, email: string, password: string, phone: string, parentPhone: string, avatar?: string, grade?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  subscribe: (plan: 'monthly' | 'yearly' | 'semester', paymentMethod: 'vodafone_cash', classKey?: string, amount?: number) => Promise<{ success: boolean; error?: string; paymentId?: string }>;
  cancelSubscription: () => void;
  updateAvatar: (avatar: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface DeviceInfo {
  deviceId: string;
  deviceName?: string;
  browser?: string;
  os?: string;
  userAgent: string;
}

export function getDeviceInfo(): DeviceInfo {
  let deviceId = '';
  try {
    deviceId = localStorage.getItem('device_id') ?? '';
    if (!deviceId) {
      deviceId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : 'anon-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      localStorage.setItem('device_id', deviceId);
    }
  } catch {
    deviceId = 'anon-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  }

  const userAgent = navigator.userAgent;
  let deviceName = '';
  let browser = '';
  let os = '';

  try {
    const uaData = (
      navigator as unknown as { userAgentData?: { platform?: string; brands?: { brand: string }[] } }
    ).userAgentData;
    if (uaData?.brands?.length) {
      const brand = uaData.brands.find((b) => b.brand && b.brand !== 'Not/A)Brand' && !b.brand.includes('Chromium'));
      if (brand) browser = brand.brand;
    }
    if (uaData?.platform) os = uaData.platform;
  } catch {
    // ignore
  }

  if (!browser) {
    if (/Edg\//i.test(userAgent)) browser = 'Edge';
    else if (/OPR\//i.test(userAgent)) browser = 'Opera';
    else if (/Chrome\//i.test(userAgent)) browser = 'Chrome';
    else if (/Firefox\//i.test(userAgent)) browser = 'Firefox';
    else if (/Safari\//i.test(userAgent)) browser = 'Safari';
  }
  if (!os) {
    if (/Windows/i.test(userAgent)) os = 'Windows';
    else if (/Android/i.test(userAgent)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(userAgent)) os = 'iOS';
    else if (/Macintosh/i.test(userAgent)) os = 'macOS';
    else if (/Linux/i.test(userAgent)) os = 'Linux';
  }

  if (!deviceName) {
    if (/iPhone/i.test(userAgent)) deviceName = 'iPhone';
    else if (/iPad/i.test(userAgent)) deviceName = 'iPad';
    else if (/Android/i.test(userAgent)) deviceName = 'هاتف Android';
    else if (/Windows/i.test(userAgent)) deviceName = 'كمبيوتر Windows';
    else if (/Macintosh/i.test(userAgent)) deviceName = 'Mac';
    else deviceName = `${os || 'جهاز'} - ${browser || 'متصفح'}`;
  }

  return { deviceId, deviceName, browser, os, userAgent };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          return data.user as User;
        }
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchMe().finally(() => setIsLoading(false));
  }, [fetchMe]);

  const login = async (email: string, password: string, force = false) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, force, ...getDeviceInfo() }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        return { success: true, user: data.user as User };
      }

      return {
        success: false,
        error: data.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        code: data.code,
        maxDevices: data.maxDevices,
        deviceCount: data.deviceCount,
      };
    } catch {
      return { success: false, error: 'حدث خطأ في الاتصال بالخادم' };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    phone: string,
    parentPhone: string,
    avatar?: string,
    grade?: string
  ) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, parentPhone, avatar, grade, ...getDeviceInfo() }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        return { success: true, user: data.user as User };
      }

      return { success: false, error: data.error || 'يرجى ملء جميع الحقول بشكل صحيح' };
    } catch {
      return { success: false, error: 'حدث خطأ في الاتصال بالخادم' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Non-critical
    }
  };

  const subscribe = async (
    plan: 'monthly' | 'yearly' | 'semester',
    paymentMethod: 'vodafone_cash',
    classKey?: string
  ) => {
    if (!user) return { success: false, error: 'يجب تسجيل الدخول أولاً' };

    setIsLoading(true);

    try {
      const res = await fetch('/api/payment/vodafone-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          paymentMethod,
          classKey,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.data?.transactionId) {
          setIsLoading(false);
          return { success: true, paymentId: data.data.transactionId };
        }

        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: data.error || 'فشل في عملية الدفع' };
    } catch {
      setIsLoading(false);
      return { success: false, error: 'حدث خطأ في الاتصال بالخادم' };
    }
  };

  const cancelSubscription = () => {
    fetch('/api/user/subscription/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
        }
      }
    });
  };

  const updateAvatar = (avatar: string) => {
    fetch('/api/user/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar }),
    }).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
        }
      }
    });
  };

  const refreshUser = async () => {
    await fetchMe();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, subscribe, cancelSubscription, updateAvatar, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
