'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

// Ana sayfa - Subdomain'e göre yönlendirme
export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Auth kontrolü tamamlanana kadar bekle
    if (loading) {
      return;
    }

    // Subdomain'i al
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const subdomain = hostname.split('.')[0];
    
    // Eğer kullanıcı giriş yapmışsa
    if (user) {
      // panel.kentsms.com -> /admin
      if (subdomain === 'panel') {
        router.push('/admin');
      } 
      // platform.kentsms.com veya localhost -> /dashboard
      else {
        router.push('/dashboard');
      }
    } else {
      // Kullanıcı giriş yapmamışsa login'e yönlendir
      router.push('/login');
    }
  }, [router, user, loading]);

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

