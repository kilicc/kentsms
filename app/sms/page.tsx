'use client';

import { Box, Container, Typography, Paper, TextField, Button, Grid, Alert } from '@mui/material';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { Send } from '@mui/icons-material';

export default function SMSInterfacePage() {
  const { api } = useAuth();
  const [formData, setFormData] = useState({
    phone: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/sms/send', {
        phone: formData.phone,
        message: formData.message,
        serviceName: 'CepSMS',
      });

      if (response.data.success) {
        setSuccess('SMS başarıyla gönderildi');
        setFormData({ phone: '', message: '' });
        // Success mesajını 3 saniye sonra otomatik kapat
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'SMS gönderim hatası');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Navbar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            padding: { xs: 2, sm: 3, md: 3 },
            paddingLeft: { xs: 2, sm: 3, md: 2 },
            marginLeft: { xs: 0, md: '280px' },
            width: { xs: '100%', md: 'calc(100% - 280px)' },
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: { md: '1400px' },
            mx: { md: 'auto' },
          }}
        >
            <Typography 
              variant="h4" 
              component="h1" 
              gutterBottom 
              sx={{ 
                color: 'primary.main', 
                mb: 3,
                fontSize: '34px',
                fontWeight: 600,
              }}
            >
              SMS Gönder
            </Typography>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 3,
                fontSize: '14px',
              }}
            >
              CepSMS servisini kullanarak tek bir telefon numarasına SMS gönderin.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                {success}
              </Alert>
            )}

            <Paper sx={{ p: 4, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Telefon Numarası"
                      variant="outlined"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="905xxxxxxxxx"
                      required
                      helperText="Telefon numarasını 90 veya 5 ile başlayarak girin (örn: 905551234567)"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Mesaj İçeriği"
                      variant="outlined"
                      multiline
                      rows={8}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      helperText={`Mesaj karakter sayısı: ${formData.message.length}`}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(25, 118, 210, 0.05)', 
                      borderRadius: 2,
                      mb: 2,
                    }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px', mb: 1 }}>
                        <strong>Servis:</strong> CepSMS
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px' }}>
                        <strong>Maliyet:</strong> 1 SMS = 1 Kredi
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      startIcon={<Send />}
                      disabled={loading}
                      fullWidth
                      sx={{
                        background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                        boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
                        borderRadius: 2,
                        padding: '12px 24px',
                        fontWeight: 500,
                        textTransform: 'none',
                        fontSize: '16px',
                        '&:hover': {
                          boxShadow: '0 8px 25px rgba(25, 118, 210, 0.4)',
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.3s',
                      }}
                    >
                      {loading ? 'Gönderiliyor...' : 'SMS Gönder'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}

