'use client';

import { Box, Container, Typography, Paper, Grid, TextField, Button, Alert, Card, CardContent, Tabs, Tab, Divider, alpha, IconButton, Tooltip, Chip } from '@mui/material';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { Settings, Lock, Security, Person, Edit, CheckCircle, Info, Warning, QrCode, DarkMode, LightMode } from '@mui/icons-material';
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
            padding: { xs: 2, sm: 2.5, md: 3 },
            paddingLeft: { xs: 2, sm: 2.5, md: 3 },
            paddingRight: { xs: 2, sm: 2.5, md: 3 },
            paddingTop: { xs: 3, sm: 3.5, md: 4 },
            marginLeft: { xs: 0, md: '240px' },
            width: { xs: '100%', md: 'calc(100% - 240px)' },
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: { md: '1400px' },
            mx: { md: 'auto' },
          }}
        >
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Person sx={{ color: 'white', fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography 
                      variant="h4" 
                      component="h1" 
                      sx={{ 
                        color: 'primary.main', 
                        fontSize: '24px',
                        fontWeight: 700,
                        mb: 0.5,
                      }}
                    >
                      Profil Ayarları
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        fontSize: '14px',
                      }}
                    >
                      Hesap bilgilerinizi, şifrenizi ve güvenlik ayarlarınızı yönetin
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

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

            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)', background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(250,250,250,0.9) 100%)' }}>
              <Box sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <Tabs 
                  value={tabValue} 
                  onChange={(e, newValue) => setTabValue(newValue)}
                  sx={{
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '14px',
                      minHeight: 56,
                    },
                  }}
                >
                  <Tab icon={<Settings />} iconPosition="start" label="Profil" />
                  <Tab icon={<Lock />} iconPosition="start" label="Şifre" />
                  <Tab icon={<Security />} iconPosition="start" label="2FA" />
                </Tabs>
              </Box>

              {/* Profil Tab - Modern Tasarım */}
              {tabValue === 0 && (
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(220, 0, 78, 0.1) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Edit sx={{ color: 'primary.main', fontSize: 24 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 600 }}>
                      Profil Bilgileri
                    </Typography>
                  </Box>
                  <Grid container spacing={2.5}>
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
                            fontSize: '14px',
                            '&:hover': {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main',
                              },
                            },
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
                            fontSize: '14px',
                            '&:hover': {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main',
                              },
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Button
                        variant="contained"
                        onClick={handleProfileSubmit}
                        disabled={loading}
                        startIcon={<CheckCircle />}
                        sx={{
                          py: 1.5,
                          px: 3,
                          background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                          boxShadow: '0 8px 24px rgba(25, 118, 210, 0.3)',
                          borderRadius: 2,
                          fontSize: '16px',
                          fontWeight: 600,
                          textTransform: 'none',
                          '&:hover': {
                            boxShadow: '0 12px 32px rgba(25, 118, 210, 0.4)',
                            transform: 'translateY(-2px)',
                          },
                          '&:disabled': {
                            background: 'rgba(0,0,0,0.12)',
                            color: 'rgba(0,0,0,0.26)',
                          },
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        {loading ? 'Güncelleniyor...' : 'Profil Güncelle'}
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              )}

              {/* Şifre Tab - Modern Tasarım */}
              {tabValue === 1 && (
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(220, 0, 78, 0.1) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Lock sx={{ color: 'primary.main', fontSize: 24 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 600 }}>
                      Şifre Değiştir
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 3, p: 2, borderRadius: 2, background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)', border: '1px solid rgba(25, 118, 210, 0.1)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                      <Info sx={{ color: 'primary.main', fontSize: 20, mt: 0.5 }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500, mb: 0.5 }}>
                          Güvenlik İpuçları
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
                          Şifreniz en az 8 karakter olmalı ve güçlü bir kombinasyon içermelidir.
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Grid container spacing={2.5}>
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
                            fontSize: '14px',
                            '&:hover': {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main',
                              },
                            },
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
                            fontSize: '14px',
                            '&:hover': {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main',
                              },
                            },
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
                        error={passwordForm.newPassword !== passwordForm.confirmPassword && passwordForm.confirmPassword.length > 0}
                        helperText={passwordForm.newPassword !== passwordForm.confirmPassword && passwordForm.confirmPassword.length > 0 ? 'Şifreler eşleşmiyor' : ''}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            fontSize: '14px',
                            '&:hover': {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main',
                              },
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Button
                        variant="contained"
                        onClick={handlePasswordSubmit}
                        disabled={loading || passwordForm.newPassword !== passwordForm.confirmPassword}
                        startIcon={<CheckCircle />}
                        sx={{
                          py: 1.5,
                          px: 3,
                          background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                          boxShadow: '0 8px 24px rgba(25, 118, 210, 0.3)',
                          borderRadius: 2,
                          fontSize: '16px',
                          fontWeight: 600,
                          textTransform: 'none',
                          '&:hover': {
                            boxShadow: '0 12px 32px rgba(25, 118, 210, 0.4)',
                            transform: 'translateY(-2px)',
                          },
                          '&:disabled': {
                            background: 'rgba(0,0,0,0.12)',
                            color: 'rgba(0,0,0,0.26)',
                          },
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        {loading ? 'Değiştiriliyor...' : 'Şifre Değiştir'}
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              )}

              {/* 2FA Tab - Modern Tasarım */}
              {tabValue === 2 && (
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(220, 0, 78, 0.1) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Security sx={{ color: 'primary.main', fontSize: 24 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 600, mb: 0.5 }}>
                        İki Faktörlü Kimlik Doğrulama (2FA)
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={twoFactorEnabled ? 'Aktif' : 'Pasif'}
                          color={twoFactorEnabled ? 'success' : 'default'}
                          size="small"
                          icon={twoFactorEnabled ? <CheckCircle sx={{ fontSize: 14 }} /> : <Warning sx={{ fontSize: 14 }} />}
                          sx={{ fontSize: '12px', height: 24 }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  {!twoFactorEnabled ? (
                    <>
                      {qrCode ? (
                        <>
                          <Box sx={{ mb: 3, p: 2, borderRadius: 2, background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)', border: '1px solid rgba(25, 118, 210, 0.1)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'start', gap: 1, mb: 2 }}>
                              <Info sx={{ color: 'primary.main', fontSize: 20, mt: 0.5 }} />
                              <Box>
                                <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500, mb: 0.5 }}>
                                  QR Kodu Tarayın
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
                                  Authenticator uygulamanızla QR kodu tarayın ve 6 haneli kodu girin.
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, border: '2px dashed rgba(25, 118, 210, 0.2)' }}>
                              <Image
                                src={qrCode}
                                alt="2FA QR Code"
                                width={220}
                                height={220}
                                style={{ maxWidth: '100%', height: 'auto', borderRadius: 8 }}
                              />
                            </Box>
                          </Box>
                          <TextField
                            fullWidth
                            label="2FA Kodu"
                            value={twoFactorForm.twoFactorCode}
                            onChange={(e) => setTwoFactorForm({ twoFactorCode: e.target.value })}
                            placeholder="6 haneli kod"
                            sx={{ 
                              mb: 2.5,
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                fontSize: '14px',
                                '&:hover': {
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                  },
                                },
                              },
                            }}
                          />
                          <Button
                            variant="contained"
                            onClick={handleVerify2FA}
                            disabled={loading || twoFactorForm.twoFactorCode.length !== 6}
                            startIcon={<CheckCircle />}
                            sx={{
                              py: 1.5,
                              px: 3,
                              background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                              boxShadow: '0 8px 24px rgba(25, 118, 210, 0.3)',
                              borderRadius: 2,
                              fontSize: '16px',
                              fontWeight: 600,
                              textTransform: 'none',
                              '&:hover': {
                                boxShadow: '0 12px 32px rgba(25, 118, 210, 0.4)',
                                transform: 'translateY(-2px)',
                              },
                              '&:disabled': {
                                background: 'rgba(0,0,0,0.12)',
                                color: 'rgba(0,0,0,0.26)',
                              },
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          >
                            {loading ? 'Doğrulanıyor...' : 'Doğrula ve Etkinleştir'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Box sx={{ mb: 3, p: 2, borderRadius: 2, background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)', border: '1px solid rgba(25, 118, 210, 0.1)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                              <Info sx={{ color: 'primary.main', fontSize: 20, mt: 0.5 }} />
                              <Box>
                                <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500, mb: 0.5 }}>
                                  2FA Nedir?
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
                                  İki faktörlü kimlik doğrulama, hesabınızı ekstra bir güvenlik katmanı ile korur. Google Authenticator veya benzeri bir uygulama kullanmanız gerekir.
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                          <Button
                            variant="contained"
                            onClick={handleEnable2FA}
                            disabled={loading}
                            startIcon={<Security />}
                            sx={{
                              py: 1.5,
                              px: 3,
                              background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                              boxShadow: '0 8px 24px rgba(25, 118, 210, 0.3)',
                              borderRadius: 2,
                              fontSize: '16px',
                              fontWeight: 600,
                              textTransform: 'none',
                              '&:hover': {
                                boxShadow: '0 12px 32px rgba(25, 118, 210, 0.4)',
                                transform: 'translateY(-2px)',
                              },
                              '&:disabled': {
                                background: 'rgba(0,0,0,0.12)',
                                color: 'rgba(0,0,0,0.26)',
                              },
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          >
                            {loading ? 'Yükleniyor...' : '2FA Etkinleştir'}
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <Box sx={{ mb: 3, p: 2, borderRadius: 2, background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(56, 142, 60, 0.05) 100%)', border: '1px solid rgba(76, 175, 80, 0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                          <CheckCircle sx={{ color: 'success.main', fontSize: 20, mt: 0.5 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500, mb: 0.5 }}>
                              2FA Aktif
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
                              Hesabınız iki faktörlü kimlik doğrulama ile korunuyor. Devre dışı bırakmak için aşağıdaki bilgileri girin.
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <TextField
                        fullWidth
                        label="2FA Kodu"
                        value={twoFactorForm.twoFactorCode}
                        onChange={(e) => setTwoFactorForm({ twoFactorCode: e.target.value })}
                        placeholder="6 haneli kod"
                        sx={{ 
                          mb: 2.5,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            fontSize: '14px',
                            '&:hover': {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main',
                              },
                            },
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
                          mb: 2.5,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            fontSize: '14px',
                            '&:hover': {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main',
                              },
                            },
                          },
                        }}
                      />
                      <Button
                        variant="contained"
                        color="error"
                        onClick={handleDisable2FA}
                        disabled={loading}
                        startIcon={<Warning />}
                        sx={{
                          py: 1.5,
                          px: 3,
                          boxShadow: '0 8px 24px rgba(244, 67, 54, 0.3)',
                          borderRadius: 2,
                          fontSize: '16px',
                          fontWeight: 600,
                          textTransform: 'none',
                          '&:hover': {
                            boxShadow: '0 12px 32px rgba(244, 67, 54, 0.4)',
                            transform: 'translateY(-2px)',
                          },
                          '&:disabled': {
                            background: 'rgba(0,0,0,0.12)',
                            color: 'rgba(0,0,0,0.26)',
                          },
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        {loading ? 'Devre dışı bırakılıyor...' : '2FA Devre Dışı Bırak'}
                      </Button>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
      </Box>
      </Box>
    </ProtectedRoute>
  );
}

