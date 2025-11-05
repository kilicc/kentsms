'use client';

import { Box, Paper, TextField, Button, Typography, Alert, Card, CardContent } from '@mui/material';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { gradients } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login: loginUser } = useAuth();
  const [formData, setFormData] = useState({
    login: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginUser(formData.login, formData.password);
      // login başarılıysa otomatik olarak dashboard'a yönlendirilir
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

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
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Header with gradient - HTML_TEMPLATES.html'e göre */}
        <Box
          sx={{
            background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
            padding: 2,
            textAlign: 'center',
            color: 'white',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 1.5,
            }}
          >
            <Image
              src="/logo3.png"
              alt="Logo"
              width={120}
              height={120}
              style={{
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
              }}
            />
          </Box>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              mb: 0.5, 
              fontWeight: 600,
              fontSize: '20px',
              color: 'white',
            }}
          >
            Giriş Yap
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'rgba(255,255,255,0.9)',
              fontSize: '11px',
            }}
          >
            Hesabınıza giriş yapın
          </Typography>
        </Box>

        {/* Form - HTML_TEMPLATES.html'e göre */}
        <CardContent sx={{ padding: 2 }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2, 
                borderRadius: 2,
              }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="Kullanıcı Adı veya E-posta"
                variant="outlined"
                size="small"
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    fontSize: '13px',
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="Şifre"
                type="password"
                variant="outlined"
                size="small"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    fontSize: '13px',
                  },
                }}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              size="small"
              sx={{
                mt: 1.5,
                mb: 1.5,
                background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)',
                borderRadius: 1.5,
                padding: '8px 20px',
                fontWeight: 500,
                fontSize: '13px',
                textTransform: 'none',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(25, 118, 210, 0.35)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.3s',
              }}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

