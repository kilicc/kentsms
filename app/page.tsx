'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Ana sayfa - Subdomain'e göre yönlendirme
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Subdomain'i al
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const subdomain = hostname.split('.')[0];
    
    // panel.finsms.io -> /admin
    if (subdomain === 'panel') {
      router.push('/admin');
    } 
    // platform.finsms.io veya localhost -> /dashboard
    else {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <p>Yönlendiriliyor...</p>
    </div>
  );
}

