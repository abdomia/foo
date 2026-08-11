'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PathPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/study-plans');
  }, [router]);

  return null;
}
