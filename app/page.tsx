'use client';

import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import LandingPage from './landing/page';
import Dashboard from './dashboard/page';

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/bar.png"
            alt="منصة الرائد"
            width={64}
            height={64}
            className="animate-pulse rounded-xl"
          />
          <p className="text-text-secondary">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <LandingPage />;
}
