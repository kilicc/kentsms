'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Auth kontrolü tamamlandıktan sonra ve user yoksa login'e yönlendir
    if (!loading && !user && !redirecting) {
      setRedirecting(true);
      // Token kontrolü yap
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) {
        // Token yok, login'e yönlendir
        router.push('/login');
      }
      // Token varsa ama user yoksa, checkAuth henüz tamamlanmamış olabilir
      // Bu durumda bir süre bekle
    }
  }, [user, loading, router, redirecting]);

  // Loading durumunda göster
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography>Yükleniyor...</Typography>
      </Box>
    );
  }

  // User yoksa ve token da yoksa, null döndür (login'e yönlendirme yapılacak)
  if (!user) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      return null; // Login'e yönlendirilecek
    }
    // Token var ama user yok, loading göster
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography>Kimlik doğrulanıyor...</Typography>
      </Box>
    );
  }

  // User var, içeriği göster
  return <>{children}</>;
}

