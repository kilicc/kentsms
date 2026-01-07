'use client';

import { Box, Paper, TextField, Button, Typography, Alert, Card, CardContent } from '@mui/material';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { gradients } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';

export default function LoginPage() {
  const router = useRouter();
  const { login: loginUser } = useAuth();
  const { mode } = useTheme();
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
        background: 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)',
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
        }}
      >
        {/* Header with gradient - HTML_TEMPLATES.html'e göre */}
        <Box
          sx={{
            background: 'linear-gradient(45deg, #1e40af 30%, #f97316 90%)',
            padding: 2,
            textAlign: 'center',
            color: 'white',
          }}
        >
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              mb: 1.5, 
              fontWeight: 700,
              fontSize: '32px',
              color: 'white',
              letterSpacing: '2px',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            KENT SMS
          </Typography>
          <Typography 
            variant="h5" 
            component="h2" 
            sx={{ 
              mb: 0.5, 
              fontWeight: 500,
              fontSize: '16px',
              color: 'rgba(255,255,255,0.95)',
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
                bgcolor: mode === 'dark' ? '#c62828' : '#b71c1c',
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
                background: 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)',
                boxShadow: '0 4px 12px rgba(30, 64, 175, 0.25)',
                borderRadius: 1.5,
                padding: '8px 20px',
                fontWeight: 500,
                fontSize: '13px',
                textTransform: 'none',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(30, 64, 175, 0.35)',
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

