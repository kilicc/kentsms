'use client';

import { Box, Typography, Card } from '@mui/material';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

// Kayıt özelliği devre dışı bırakıldı
export default function RegisterPage() {
  const router = useRouter();
  const { mode } = useTheme();

  useEffect(() => {
    // Register sayfasına erişim engellendi, login'e yönlendir
    router.push('/login');
  }, [router]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 480,
          width: '100%',
          background: mode === 'dark' 
            ? 'rgba(30, 30, 30, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)',
          padding: 3,
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          <Image
            src="/kentsms-logo.svg"
            alt="Kent SMS Logo"
            width={200}
            height={60}
            style={{
              objectFit: 'contain',
              borderRadius: 8,
            }}
          />
        </Box>
        <Typography 
          variant="h5" 
          component="h1" 
          sx={{ 
            mb: 2, 
            fontWeight: 600,
            fontSize: '18px',
            color: 'primary.main',
          }}
        >
          Kayıt Özelliği Devre Dışı
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            fontSize: '13px',
            mb: 2,
          }}
        >
          Kayıt özelliği devre dışı bırakılmıştır. Hesap oluşturmak için lütfen yöneticinizle iletişime geçin.
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            fontSize: '12px',
          }}
        >
          Yönlendiriliyor...
        </Typography>
      </Card>
    </Box>
  );
}
