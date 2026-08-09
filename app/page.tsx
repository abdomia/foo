'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useAuth } from '@/components/AuthProvider';

// Guest homepage and student dashboard are heavy (gsap/framer-motion vs recharts).
// Load only the page that actually renders so anonymous visitors never ship dashboard JS.
const LandingPage = dynamic(() => import('./landing/page'), { ssr: false });
const Dashboard = dynamic(() => import('./dashboard/page'), { ssr: false });

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
