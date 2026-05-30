'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically forwards root visitors cleanly to your login page
    router.replace('/login');
  }, [router]);

  return null;
}