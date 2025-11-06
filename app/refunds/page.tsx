'use client';

import { Box, Container, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, alpha, CircularProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { MoneyOff, Send, Info } from '@mui/icons-material';
import { gradients } from '@/lib/theme';
import ClientDate from '@/components/ClientDate';

interface Refund {
  id: string;
  sms: {
    id: string;
    phoneNumber: string;
    message: string;
    sentAt: string;
  };
  originalCost: number;
  refundAmount: number;
  reason: string;
  status: string;
  createdAt: string;
}

export default function RefundsPage() {
  const { api } = useAuth();
  const { mode } = useTheme();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundForm, setRefundForm] = useState({
    smsId: '',
    reason: '',
  });

  useEffect(() => {
    loadRefunds();
  }, []);

  const loadRefunds = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/refunds');
      if (response.data.success) {
        setRefunds(response.data.data.refunds || []);
      } else {
        setError(response.data.message || 'İadeler yüklenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('Refunds load error:', error);
      setError(error.response?.data?.message || 'İadeler yüklenirken bir hata oluştu');
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefundSubmit = async () => {
    if (!refundForm.smsId || !refundForm.reason) {
      setError('SMS ID ve sebep gerekli');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/refunds/process', {
        smsId: refundForm.smsId,
        reason: refundForm.reason,
      });

      if (response.data.success) {
        setSuccess('İade talebi oluşturuldu');
        setRefundDialogOpen(false);
        setRefundForm({ smsId: '', reason: '' });
        loadRefunds();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'İade talebi hatası');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'info';
      case 'processed':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <ProtectedRoute>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: mode === 'dark' ? '#121212' : '#f5f5f5',
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, mt: 1 }}>
              <Box>
                <Typography 
                  variant="h4" 
                  component="h1" 
                  sx={{ 
                    color: 'primary.main',
                    fontSize: '14px',
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  İade Yönetimi
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    fontSize: '14px',
                  }}
                >
                  Başarısız SMS'ler için iade talebi oluşturun ve iade durumlarını takip edin.
                </Typography>
              </Box>
            </Box>

            {/* Bilgi Mesajı - Büyük */}
            <Alert
              severity="info"
              icon={<Info sx={{ fontSize: 32 }} />}
              sx={{
                mb: 2,
                borderRadius: 2,
                bgcolor: alpha('#1976d2', 0.1),
                border: '1px solid',
                borderColor: alpha('#1976d2', 0.3),
                py: 3,
                px: 3,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontSize: '14px',
                  fontWeight: 600,
                  mb: 1,
                  color: 'primary.main',
                }}
              >
                İletilmeyen SMS'ler İçin Otomatik İade
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: '14px',
                  lineHeight: 1.6,
                }}
              >
                İletilmeyen SMS'ler için <strong>48 saat içerisinde</strong> krediniz otomatik olarak hesabınıza iade edilecektir. 
                İade işlemleri sistem tarafından otomatik olarak gerçekleştirilir ve herhangi bir işlem yapmanıza gerek yoktur.
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box />
              <Button
                variant="contained"
                startIcon={<MoneyOff />}
                onClick={() => setRefundDialogOpen(true)}
                sx={{
                  background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                  boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
                  borderRadius: 2,
                  padding: '8px 20px',
                    fontSize: '14px',
                    size: 'small',
                  fontWeight: 500,
                  textTransform: 'none',
                  '&:hover': {
                    boxShadow: '0 8px 25px rgba(25, 118, 210, 0.4)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s',
                }}
              >
                İade Talebi Oluştur
              </Button>
            </Box>

            {refunds.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 2, mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px' }}>
                  Henüz iade talebi bulunmuyor. İade talebi oluşturmak için "İade Talebi Oluştur" butonuna tıklayın.
                </Typography>
              </Box>
            )}

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

            {/* Refunds Table */}
            <Paper sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
                  <CircularProgress />
                </Box>
              ) : refunds.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Henüz iade talebi bulunmuyor. Yeni iade talebi oluşturmak için "İade Talebi Oluştur" butonuna tıklayın.
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Telefon</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Mesaj</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Orijinal Maliyet</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>İade Tutarı</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Sebep</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Durum</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tarih</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {refunds.map((refund) => (
                        <TableRow key={refund.id}>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{refund.sms.phoneNumber}</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{refund.sms.message.substring(0, 30)}...</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{Number(refund.originalCost)} kredi</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{Number(refund.refundAmount)} kredi</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{refund.reason}</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                            <Chip
                              label={refund.status}
                              color={getStatusColor(refund.status)}
                              size="small"
                              sx={{
                                fontSize: '0.65rem',
                                fontWeight: 500,
                                height: 20,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                            <ClientDate date={refund.createdAt} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>

          {/* Refund Dialog */}
          <Dialog open={refundDialogOpen} onClose={() => setRefundDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: '16px', fontWeight: 600, pb: 1 }}>İade Talebi Oluştur</DialogTitle>
            <DialogContent sx={{ pt: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                label="SMS ID"
                value={refundForm.smsId}
                onChange={(e) => setRefundForm({ ...refundForm, smsId: e.target.value })}
                margin="dense"
                required
                placeholder="UUID"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '12px',
                  },
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="Sebep"
                multiline
                rows={3}
                value={refundForm.reason}
                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                margin="dense"
                required
                placeholder="İade sebebini açıklayın"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '12px',
                  },
                }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 1.5 }}>
              <Button size="small" onClick={() => setRefundDialogOpen(false)} sx={{ fontSize: '12px' }}>İptal</Button>
              <Button size="small" onClick={handleRefundSubmit} variant="contained" disabled={loading} sx={{ fontSize: '12px' }}>
                {loading ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}
