'use client';

import { Box, Container, Typography, Paper, Grid, TextField, Button, Alert, Card, CardContent, Tabs, Tab, Divider } from '@mui/material';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { Settings, Lock, Security } from '@mui/icons-material';
import { gradients } from '@/lib/theme';

export default function ProfilePage() {
  const { api, user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile form
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 2FA form
  const [twoFactorForm, setTwoFactorForm] = useState({
    twoFactorCode: '',
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      if (response.data.success) {
        const userData = response.data.data.user;
        setProfileForm({
          username: userData.username || '',
          email: userData.email || '',
        });
        setTwoFactorEnabled(userData.twoFactorEnabled || false);
      }
    } catch (error) {
      console.error('Profile load error:', error);
    }
  };

  const handleProfileSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put('/auth/profile', profileForm);
      if (response.data.success) {
        setSuccess('Profil güncellendi');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Profil güncelleme hatası');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (response.data.success) {
        setSuccess('Şifre değiştirildi');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Şifre değiştirme hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/enable-2fa');
      if (response.data.success) {
        setQrCode(response.data.data.qrCode);
        setSuccess('2FA secret oluşturuldu. QR kodu doğrulayın.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '2FA etkinleştirme hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/verify-2fa', {
        twoFactorCode: twoFactorForm.twoFactorCode,
      });

      if (response.data.success) {
        setSuccess('2FA başarıyla etkinleştirildi');
        setTwoFactorEnabled(true);
        setQrCode('');
        setTwoFactorForm({ twoFactorCode: '' });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '2FA doğrulama hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('2FA\'yı devre dışı bırakmak istediğinize emin misiniz?')) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/disable-2fa', {
        twoFactorCode: twoFactorForm.twoFactorCode,
        password: passwordForm.currentPassword,
      });

      if (response.data.success) {
        setSuccess('2FA devre dışı bırakıldı');
        setTwoFactorEnabled(false);
        setTwoFactorForm({ twoFactorCode: '' });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '2FA devre dışı bırakma hatası');
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
                mb: 2,
                fontSize: '34px',
                fontWeight: 600,
              }}
            >
              Profil Ayarları
            </Typography>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 3,
                fontSize: '14px',
              }}
            >
              Hesap bilgilerinizi, şifrenizi ve güvenlik ayarlarınızı yönetin.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}>
                {success}
              </Alert>
            )}

            <Paper sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab icon={<Settings />} label="Profil" />
                <Tab icon={<Lock />} label="Şifre" />
                <Tab icon={<Security />} label="2FA" />
              </Tabs>

              {/* Profil Tab */}
              {tabValue === 0 && (
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Kullanıcı Adı"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                        required
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="E-posta"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        required
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Button
                        variant="contained"
                        onClick={handleProfileSubmit}
                        disabled={loading}
                        sx={{
                          background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                          boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
                          borderRadius: 2,
                          padding: '10px 24px',
                          fontWeight: 500,
                          textTransform: 'none',
                          '&:hover': {
                            boxShadow: '0 8px 25px rgba(25, 118, 210, 0.4)',
                            transform: 'translateY(-2px)',
                          },
                          transition: 'all 0.3s',
                        }}
                      >
                        {loading ? 'Güncelleniyor...' : 'Güncelle'}
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              )}

              {/* Şifre Tab */}
              {tabValue === 1 && (
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Mevcut Şifre"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        required
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
                        label="Yeni Şifre"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        required
                        helperText="En az 8 karakter"
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
                        label="Yeni Şifre Tekrar"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        required
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Button
                        variant="contained"
                        onClick={handlePasswordSubmit}
                        disabled={loading}
                        sx={{
                          background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                          boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
                          borderRadius: 2,
                          padding: '10px 24px',
                          fontWeight: 500,
                          textTransform: 'none',
                          '&:hover': {
                            boxShadow: '0 8px 25px rgba(25, 118, 210, 0.4)',
                            transform: 'translateY(-2px)',
                          },
                          transition: 'all 0.3s',
                        }}
                      >
                        {loading ? 'Değiştiriliyor...' : 'Şifre Değiştir'}
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              )}

              {/* 2FA Tab */}
              {tabValue === 2 && (
                <CardContent sx={{ p: 3 }}>
                  <Typography 
                    variant="h6" 
                    gutterBottom
                    sx={{
                      fontSize: '20px',
                      fontWeight: 500,
                    }}
                  >
                    İki Faktörlü Kimlik Doğrulama (2FA)
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 3,
                      fontSize: '14px',
                    }}
                  >
                    Durum: {twoFactorEnabled ? 'Aktif' : 'Pasif'}
                  </Typography>

                  {!twoFactorEnabled ? (
                    <>
                      {qrCode ? (
                        <>
                          <Box sx={{ textAlign: 'center', mb: 3 }}>
                            <Image
                              src={qrCode}
                              alt="2FA QR Code"
                              width={200}
                              height={200}
                              style={{ maxWidth: '100%', height: 'auto' }}
                            />
                          </Box>
                          <TextField
                            fullWidth
                            label="2FA Kodu"
                            value={twoFactorForm.twoFactorCode}
                            onChange={(e) => setTwoFactorForm({ twoFactorCode: e.target.value })}
                            placeholder="6 haneli kod"
                            sx={{ 
                              mb: 2,
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              },
                            }}
                          />
                          <Button
                            variant="contained"
                            onClick={handleVerify2FA}
                            disabled={loading || twoFactorForm.twoFactorCode.length !== 6}
                            sx={{
                              background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                              boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
                              borderRadius: 2,
                              padding: '10px 24px',
                              fontWeight: 500,
                              textTransform: 'none',
                              '&:hover': {
                                boxShadow: '0 8px 25px rgba(25, 118, 210, 0.4)',
                                transform: 'translateY(-2px)',
                              },
                              transition: 'all 0.3s',
                            }}
                          >
                            {loading ? 'Doğrulanıyor...' : 'Doğrula ve Etkinleştir'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="contained"
                          onClick={handleEnable2FA}
                          disabled={loading}
                          sx={{
                            background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                            boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
                            borderRadius: 2,
                            padding: '10px 24px',
                            fontWeight: 500,
                            textTransform: 'none',
                            '&:hover': {
                              boxShadow: '0 8px 25px rgba(25, 118, 210, 0.4)',
                              transform: 'translateY(-2px)',
                            },
                            transition: 'all 0.3s',
                          }}
                        >
                          {loading ? 'Yükleniyor...' : '2FA Etkinleştir'}
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <TextField
                        fullWidth
                        label="2FA Kodu"
                        value={twoFactorForm.twoFactorCode}
                        onChange={(e) => setTwoFactorForm({ twoFactorCode: e.target.value })}
                        placeholder="6 haneli kod"
                        sx={{ 
                          mb: 2,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                      <TextField
                        fullWidth
                        label="Şifre"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        sx={{ 
                          mb: 2,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                      <Button
                        variant="contained"
                        color="error"
                        onClick={handleDisable2FA}
                        disabled={loading}
                        sx={{
                          boxShadow: '0 6px 20px rgba(244, 67, 54, 0.3)',
                          borderRadius: 2,
                          padding: '10px 24px',
                          fontWeight: 500,
                          textTransform: 'none',
                          '&:hover': {
                            boxShadow: '0 8px 25px rgba(244, 67, 54, 0.4)',
                            transform: 'translateY(-2px)',
                          },
                          transition: 'all 0.3s',
                        }}
                      >
                        {loading ? 'Devre dışı bırakılıyor...' : '2FA Devre Dışı Bırak'}
                      </Button>
                    </>
                  )}
                </CardContent>
              )}
            </Paper>
      </Box>
      </Box>
    </ProtectedRoute>
  );
}

