'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleRootRouting() {
      try {
        // Fetch the current session token securely
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // User is authenticated -> Send them to the workspace dashboard
          router.push('/dashboard');
        } else {
          // User is not authenticated -> Send them to the multi-step login
          router.push('/login');
        }
      } catch (err) {
        // Fallback safety route
        router.push('/login');
      }
    }

    handleRootRouting();
  }, [router]);

  // Clean loading screen while the app checks authorization states
  const loadingContainerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#020617',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'sans-serif',
    color: '#64748b',
    fontSize: '14px',
  };

  return (
    <div style={loadingContainerStyle}>
      <p>Initializing StreamSphere connections...</p>
    </div>
  );
}