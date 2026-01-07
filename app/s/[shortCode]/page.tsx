'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import { Home, Refresh } from '@mui/icons-material';

export default function ShortLinkRedirectPage({ params }: { params: Promise<{ shortCode: string }> }) {
  const router = useRouter();
  const [shortCode, setShortCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Params'ı resolve et
    params.then((p: { shortCode: string }) => {
      setShortCode(p.shortCode);
    });
  }, [params]);

  useEffect(() => {
    if (!shortCode) return;

    // Kısa linke yönlendirme
    const redirect = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`/api/short-links/${shortCode}`, {
          method: 'GET',
          redirect: 'manual', // Manual redirect handling
        });

        // Redirect response (302, 301, etc.)
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location) {
            window.location.href = location;
            return;
          }
        }

        // Success response (200)
        if (response.ok) {
          // Try to get redirect location from response
          const location = response.headers.get('location');
          if (location) {
            window.location.href = location;
            return;
          }
        }

        // Error response
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(data.message || 'Kısa link bulunamadı');
          setLoading(false);
          return;
        }

        // Beklenmeyen durum
        setError('Yönlendirme hatası');
        setLoading(false);
      } catch (error: any) {
        console.error('Redirect error:', error);
        setError('Yönlendirme sırasında bir hata oluştu');
        setLoading(false);
      }
    };

    redirect();
  }, [shortCode]);

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
          p: 3,
        }}
      >
        <Alert 
          severity="error" 
          sx={{ 
            maxWidth: 500, 
            width: '100%',
            bgcolor: '#b71c1c',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '15px',
            py: 2,
            px: 2,
            boxShadow: '0 4px 12px rgba(183, 28, 28, 0.5)',
            border: '2px solid #ffffff',
            '& .MuiAlert-icon': {
              color: '#ffffff',
              fontSize: '24px',
            },
            '& .MuiAlert-message': {
              fontWeight: 700,
              fontSize: '15px',
            },
          }}
        >
          <Typography variant="h6" sx={{ mb: 1, color: '#ffffff', fontWeight: 700 }}>
            404 - Link bulunamadı!
          </Typography>
          <Typography variant="body2" sx={{ color: '#ffffff' }}>
            {error}
          </Typography>
        </Alert>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={() => router.push('/')}
          >
            Ana Sayfa
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => window.location.reload()}
          >
            Yeniden Dene
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        Yönlendiriliyor...
      </Typography>
    </Box>
  );
}
