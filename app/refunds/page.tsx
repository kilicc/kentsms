'use client';

import { Box, Container, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, alpha, CircularProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography 
                  variant="h4" 
                  component="h1" 
                  sx={{ 
                    color: 'primary.main',
                    fontSize: '34px',
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
                mb: 3,
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
                  fontSize: '20px',
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
                  fontSize: '16px',
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
                İade Talebi Oluştur
              </Button>
            </Box>

            {refunds.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4, mb: 3 }}>
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
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : refunds.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Henüz iade talebi bulunmuyor. Yeni iade talebi oluşturmak için "İade Talebi Oluştur" butonuna tıklayın.
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Telefon</TableCell>
                        <TableCell>Mesaj</TableCell>
                        <TableCell>Orijinal Maliyet</TableCell>
                        <TableCell>İade Tutarı</TableCell>
                        <TableCell>Sebep</TableCell>
                        <TableCell>Durum</TableCell>
                        <TableCell>Tarih</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {refunds.map((refund) => (
                        <TableRow key={refund.id}>
                          <TableCell>{refund.sms.phoneNumber}</TableCell>
                          <TableCell>{refund.sms.message.substring(0, 30)}...</TableCell>
                          <TableCell>{Number(refund.originalCost)} kredi</TableCell>
                          <TableCell>{Number(refund.refundAmount)} kredi</TableCell>
                          <TableCell>{refund.reason}</TableCell>
                          <TableCell>
                            <Chip
                              label={refund.status}
                              color={getStatusColor(refund.status)}
                              size="small"
                              sx={{
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                height: 24,
                              }}
                            />
                          </TableCell>
                          <TableCell>
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
            <DialogTitle>İade Talebi Oluştur</DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                label="SMS ID"
                value={refundForm.smsId}
                onChange={(e) => setRefundForm({ ...refundForm, smsId: e.target.value })}
                margin="normal"
                required
                placeholder="UUID"
              />
              <TextField
                fullWidth
                label="Sebep"
                multiline
                rows={4}
                value={refundForm.reason}
                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                margin="normal"
                required
                placeholder="İade sebebini açıklayın"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRefundDialogOpen(false)}>İptal</Button>
              <Button onClick={handleRefundSubmit} variant="contained" disabled={loading}>
                {loading ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}
