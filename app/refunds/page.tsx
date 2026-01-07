'use client';

import { Box, Container, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Alert, alpha, CircularProgress, TextField, Button, Card, CardContent, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Accordion, AccordionSummary, AccordionDetails, Divider } from '@mui/material';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Info, ExpandMore, FilterList, MoneyOff, Assessment, People, AccountBalanceWallet, Close, BarChart } from '@mui/icons-material';
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
  remainingHours?: number;
  isExpired?: boolean;
  processedAt?: string;
}

export default function RefundsPage() {
  const { api, user, loading: authLoading } = useAuth();
  const { mode } = useTheme();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Admin için gelişmiş rapor durumları
  const [adminReport, setAdminReport] = useState<any>(null);
  const [loadingAdminReport, setLoadingAdminReport] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [expandedUser, setExpandedUser] = useState<string | false>(false);
  const [selectedRefundDetail, setSelectedRefundDetail] = useState<any | null>(null);
  const [refundDetailDialogOpen, setRefundDetailDialogOpen] = useState(false);

  const userRole = typeof user?.role === 'string' ? user.role.toLowerCase() : '';
  const isAdmin = !authLoading && (userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator');

  useEffect(() => {
    if (isAdmin) {
      loadAdminReport();
    } else {
      loadRefunds();
    }
  }, [isAdmin, selectedDate]);

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

  const loadAdminReport = async () => {
    try {
      setLoadingAdminReport(true);
      setError('');
      const response = await api.get('/admin/refunds-report', {
        params: { date: selectedDate }
      });
      if (response.data.success) {
        setAdminReport(response.data.data);
      } else {
        setError(response.data.message || 'İade raporu yüklenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('Admin refunds report load error:', error);
      setError(error.response?.data?.message || 'İade raporu yüklenirken bir hata oluştu');
      setAdminReport(null);
    } finally {
      setLoadingAdminReport(false);
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
                  {isAdmin ? 'İade Raporları (Admin)' : 'İade Yönetimi'}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    fontSize: '14px',
                  }}
                >
                  {isAdmin 
                    ? 'Tüm kullanıcıların iade edilen veya edilecek olan tüm raporlarını görüntüleyin.'
                    : 'Başarısız SMS\'ler için iade talebi oluşturun ve iade durumlarını takip edin.'
                  }
                </Typography>
              </Box>
            </Box>

            {/* Admin için gelişmiş rapor görünümü */}
            {isAdmin ? (
              <Box>
                {/* Tarih Filtreleme */}
                <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <Grid container spacing={1.5} alignItems="center">
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Tarih"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<FilterList />}
                        onClick={loadAdminReport}
                        disabled={loadingAdminReport}
                        sx={{
                          background: 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)',
                          boxShadow: '0 6px 20px rgba(30, 64, 175, 0.3)',
                          borderRadius: 2,
                          padding: '6px 16px',
                          fontSize: '12px',
                          fontWeight: 500,
                          textTransform: 'none',
                          '&:hover': {
                            boxShadow: '0 6px 16px rgba(30, 64, 175, 0.35)',
                            transform: 'translateY(-1px)',
                          },
                          transition: 'all 0.3s',
                        }}
                      >
                        Raporu Yükle
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>

                {error && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                {loadingAdminReport ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : adminReport ? (
                  <Box>
                    {/* Özet İstatistikler */}
                    <Paper sx={{ 
                      p: 2, 
                      mb: 2, 
                      borderRadius: 2, 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      background: mode === 'dark' 
                        ? 'linear-gradient(135deg, rgba(30, 64, 175, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)'
                        : 'linear-gradient(135deg, rgba(30, 64, 175, 0.05) 0%, rgba(249, 115, 22, 0.05) 100%)',
                      border: '1px solid rgba(30, 64, 175, 0.2)',
                    }}>
                      <Typography variant="h6" sx={{ fontSize: '15px', fontWeight: 600, mb: 1.5 }}>
                        📊 İade Raporu Özeti - {new Date(adminReport.date).toLocaleDateString('tr-TR')}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                            Toplam Kullanıcı
                          </Typography>
                          <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700 }}>
                            {adminReport.summary?.totalUsers || 0}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                            Toplam SMS
                          </Typography>
                          <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700 }}>
                            {adminReport.summary?.totalSMS || 0}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                            Başarısız SMS
                          </Typography>
                          <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#f44336' }}>
                            {adminReport.summary?.totalFailedSMS || 0}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                            Toplam İade
                          </Typography>
                          <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#ff9800' }}>
                            {adminReport.summary?.totalRefunds || 0}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                            Toplam İade Tutarı
                          </Typography>
                          <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#4caf50' }}>
                            {Number(adminReport.summary?.totalRefundAmount || 0).toLocaleString('tr-TR')} Kredi
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Detaylı İstatistik Kartları */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ 
                          borderRadius: 2, 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          background: mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(30, 64, 175, 0.15) 0%, rgba(249, 115, 22, 0.15) 100%)'
                            : 'linear-gradient(135deg, rgba(30, 64, 175, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)',
                          border: '1px solid rgba(30, 64, 175, 0.2)',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 20px rgba(30, 64, 175, 0.25)',
                          },
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <People sx={{ color: 'primary.main', fontSize: 28 }} />
                              <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', bgcolor: 'rgba(30, 64, 175, 0.1)', px: 1, py: 0.5, borderRadius: 1 }}>
                                Kullanıcılar
                              </Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
                              {adminReport.summary?.totalUsers || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                              İade raporu olan kullanıcı sayısı
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ 
                          borderRadius: 2, 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          background: mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(30, 64, 175, 0.15) 100%)'
                            : 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(30, 64, 175, 0.1) 100%)',
                          border: '1px solid rgba(33, 150, 243, 0.2)',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 20px rgba(33, 150, 243, 0.25)',
                          },
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <Assessment sx={{ color: '#2196f3', fontSize: 28 }} />
                              <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', bgcolor: 'rgba(33, 150, 243, 0.1)', px: 1, py: 0.5, borderRadius: 1 }}>
                                SMS
                              </Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 700, color: '#2196f3', mb: 0.5 }}>
                              {adminReport.summary?.totalSMS || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                              Gönderilen toplam SMS sayısı
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ 
                          borderRadius: 2, 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          background: mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(244, 67, 54, 0.15) 0%, rgba(211, 47, 47, 0.15) 100%)'
                            : 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(211, 47, 47, 0.1) 100%)',
                          border: '1px solid rgba(244, 67, 54, 0.2)',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 20px rgba(244, 67, 54, 0.25)',
                          },
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <MoneyOff sx={{ color: '#f44336', fontSize: 28 }} />
                              <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', bgcolor: 'rgba(244, 67, 54, 0.1)', px: 1, py: 0.5, borderRadius: 1 }}>
                                Başarısız
                              </Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 700, color: '#f44336', mb: 0.5 }}>
                              {adminReport.summary?.totalFailedSMS || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                              Başarısız SMS sayısı
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ 
                          borderRadius: 2, 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          background: mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(56, 142, 60, 0.15) 100%)'
                            : 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(56, 142, 60, 0.1) 100%)',
                          border: '1px solid rgba(76, 175, 80, 0.2)',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 20px rgba(76, 175, 80, 0.25)',
                          },
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <AccountBalanceWallet sx={{ color: '#4caf50', fontSize: 28 }} />
                              <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', bgcolor: 'rgba(76, 175, 80, 0.1)', px: 1, py: 0.5, borderRadius: 1 }}>
                                İade
                              </Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontSize: '24px', fontWeight: 700, color: '#4caf50', mb: 0.5 }}>
                              {Number(adminReport.summary?.totalRefundAmount || 0).toLocaleString('tr-TR')} Kredi
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                              Toplam iade tutarı
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* Kullanıcı Bazlı Detaylı Raporlar */}
                    {adminReport.reports && adminReport.reports.length > 0 ? (
                      <Box>
                        <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600, mb: 2 }}>
                          Kullanıcı Bazlı Detaylı Raporlar
                        </Typography>
                        {adminReport.reports.map((report: any) => (
                          <Accordion
                            key={report.user.id}
                            expanded={expandedUser === report.user.id}
                            onChange={(e, isExpanded) => setExpandedUser(isExpanded ? report.user.id : false)}
                            sx={{
                              mb: 1.5,
                              borderRadius: 2,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              '&:before': { display: 'none' },
                            }}
                          >
                            <AccordionSummary expandIcon={<ExpandMore />}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                                <Box>
                                  <Typography variant="body1" sx={{ fontSize: '14px', fontWeight: 600 }}>
                                    {report.user.username} ({report.user.email})
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    {report.todaySMS} SMS • {report.todayFailedSMS} Başarısız • {report.todayRefunds} İade • {Number(report.totalRefundAmount).toLocaleString('tr-TR')} Kredi
                                  </Typography>
                                </Box>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Box>
                                <Grid container spacing={2} sx={{ mb: 2 }}>
                                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                        Bugünkü SMS
                                      </Typography>
                                      <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700 }}>
                                        {report.todaySMS}
                                      </Typography>
                                    </Paper>
                                  </Grid>
                                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                        Başarısız SMS
                                      </Typography>
                                      <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#f44336' }}>
                                        {report.todayFailedSMS}
                                      </Typography>
                                    </Paper>
                                  </Grid>
                                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                        İade Sayısı
                                      </Typography>
                                      <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#ff9800' }}>
                                        {report.todayRefunds}
                                      </Typography>
                                    </Paper>
                                  </Grid>
                                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                        Toplam İade Tutarı
                                      </Typography>
                                      <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#4caf50' }}>
                                        {Number(report.totalRefundAmount).toLocaleString('tr-TR')} Kredi
                                      </Typography>
                                    </Paper>
                                  </Grid>
                                </Grid>

                                {report.refunds && report.refunds.length > 0 ? (
                                  <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Telefon</TableCell>
                                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Mesaj</TableCell>
                                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Orijinal Maliyet</TableCell>
                                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>İade Tutarı</TableCell>
                                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Sebep</TableCell>
                                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Durum</TableCell>
                                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>48 Saat</TableCell>
                                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tarih</TableCell>
                                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>İşlem</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {report.refunds.map((refund: any) => (
                                          <TableRow 
                                            key={refund.id}
                                            sx={{ 
                                              '&:hover': { bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
                                              cursor: 'pointer',
                                            }}
                                            onClick={() => {
                                              setSelectedRefundDetail(refund);
                                              setRefundDetailDialogOpen(true);
                                            }}
                                          >
                                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{refund.sms?.phoneNumber || '-'}</TableCell>
                                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                              {refund.sms?.message ? (refund.sms.message.length > 30 ? refund.sms.message.substring(0, 30) + '...' : refund.sms.message) : '-'}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{Number(refund.originalCost)} kredi</TableCell>
                                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{Number(refund.refundAmount)} kredi</TableCell>
                                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{refund.reason || '-'}</TableCell>
                                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                              <Chip
                                                label={
                                                  refund.status === 'processed' 
                                                    ? 'İade Edildi' 
                                                    : refund.status === 'pending' 
                                                      ? 'Beklemede' 
                                                      : refund.status
                                                }
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
                                              {refund.status === 'pending' && refund.remainingHours !== undefined ? (
                                                <Chip
                                                  label={`${Math.floor(refund.remainingHours)} saat kaldı`}
                                                  color={refund.isExpired ? 'success' : 'warning'}
                                                  size="small"
                                                  sx={{
                                                    fontSize: '0.65rem',
                                                    fontWeight: 500,
                                                    height: 20,
                                                  }}
                                                />
                                              ) : refund.status === 'processed' ? (
                                                <Chip
                                                  label="İade Edildi"
                                                  color="success"
                                                  size="small"
                                                  sx={{
                                                    fontSize: '0.65rem',
                                                    fontWeight: 500,
                                                    height: 20,
                                                  }}
                                                />
                                              ) : (
                                                <Typography variant="body2" sx={{ fontSize: '12px', color: 'text.secondary' }}>
                                                  -
                                                </Typography>
                                              )}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                              <ClientDate date={refund.createdAt} />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                              <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedRefundDetail(refund);
                                                  setRefundDetailDialogOpen(true);
                                                }}
                                                sx={{
                                                  fontSize: '0.65rem',
                                                  textTransform: 'none',
                                                  py: 0.25,
                                                  px: 1,
                                                }}
                                              >
                                                Detay
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                ) : (
                                  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                      Bu kullanıcı için iade kaydı bulunmuyor.
                                    </Typography>
                                  </Paper>
                                )}
                              </Box>
                            </AccordionDetails>
                          </Accordion>
                        ))}
                      </Box>
                    ) : (
                      <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Seçilen tarih için iade raporu bulunmuyor.
                        </Typography>
                      </Paper>
                    )}

                    {/* İade Detayları Dialog */}
                    <Dialog
                      open={refundDetailDialogOpen}
                      onClose={() => {
                        setRefundDetailDialogOpen(false);
                        setSelectedRefundDetail(null);
                      }}
                      maxWidth="md"
                      fullWidth
                    >
                      <DialogTitle sx={{ pb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600 }}>
                            💰 İade Detayları
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setRefundDetailDialogOpen(false);
                              setSelectedRefundDetail(null);
                            }}
                          >
                            <Close />
                          </IconButton>
                        </Box>
                      </DialogTitle>
                      <DialogContent>
                        {selectedRefundDetail && (
                          <Box>
                            <Grid container spacing={2}>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    Telefon Numarası
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500, mt: 0.5 }}>
                                    {selectedRefundDetail.sms?.phoneNumber || '-'}
                                  </Typography>
                                </Paper>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    Durum
                                  </Typography>
                                  <Box sx={{ mt: 0.5 }}>
                                    <Chip
                                      label={
                                        selectedRefundDetail.status === 'processed' 
                                          ? 'İade Edildi' 
                                          : selectedRefundDetail.status === 'pending' 
                                            ? 'Beklemede' 
                                            : selectedRefundDetail.status
                                      }
                                      color={getStatusColor(selectedRefundDetail.status)}
                                      size="small"
                                      sx={{ fontSize: '0.7rem', height: 22 }}
                                    />
                                  </Box>
                                </Paper>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    Orijinal Maliyet
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, mt: 0.5 }}>
                                    {Number(selectedRefundDetail.originalCost)} Kredi
                                  </Typography>
                                </Paper>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    İade Tutarı
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, mt: 0.5, color: '#4caf50' }}>
                                    {Number(selectedRefundDetail.refundAmount)} Kredi
                                  </Typography>
                                </Paper>
                              </Grid>
                              <Grid size={{ xs: 12 }}>
                                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    Mesaj
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontSize: '13px', mt: 0.5, wordBreak: 'break-word' }}>
                                    {selectedRefundDetail.sms?.message || '-'}
                                  </Typography>
                                </Paper>
                              </Grid>
                              <Grid size={{ xs: 12 }}>
                                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    Sebep
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontSize: '13px', mt: 0.5 }}>
                                    {selectedRefundDetail.reason || '-'}
                                  </Typography>
                                </Paper>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    Oluşturulma Tarihi
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500, mt: 0.5 }}>
                                    <ClientDate date={selectedRefundDetail.createdAt} />
                                  </Typography>
                                </Paper>
                              </Grid>
                              {selectedRefundDetail.status === 'pending' && selectedRefundDetail.remainingHours !== undefined && (
                                <Grid size={{ xs: 12, sm: 6 }}>
                                  <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.05)' }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                      Kalan Süre
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, mt: 0.5, color: '#ff9800' }}>
                                      {Math.floor(selectedRefundDetail.remainingHours)} saat
                                    </Typography>
                                  </Paper>
                                </Grid>
                              )}
                            </Grid>
                          </Box>
                        )}
                      </DialogContent>
                      <DialogActions sx={{ p: 1.5 }}>
                        <Button
                          onClick={() => {
                            setRefundDetailDialogOpen(false);
                            setSelectedRefundDetail(null);
                          }}
                          variant="outlined"
                          size="small"
                          sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '12px' }}
                        >
                          Kapat
                        </Button>
                      </DialogActions>
                    </Dialog>
                  </Box>
                ) : (
                  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Rapor yüklenemedi. Lütfen tekrar deneyin.
                    </Typography>
                  </Paper>
                )}
              </Box>
            ) : (
              <>
                {/* Normal kullanıcı görünümü */}
                {/* Bilgi Mesajı - Büyük */}
                <Alert
                  severity="info"
                  icon={<Info sx={{ fontSize: 32 }} />}
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    bgcolor: alpha('#1e40af', 0.1),
                    border: '1px solid',
                    borderColor: alpha('#1e40af', 0.3),
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

            {refunds.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 2, mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px' }}>
                  Henüz iade talebi bulunmuyor. İletilmeyen SMS'ler için iadeler otomatik olarak oluşturulacaktır.
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
                    Henüz iade talebi bulunmuyor. İletilmeyen SMS'ler için iadeler otomatik olarak oluşturulacaktır.
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
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>48 Saat</TableCell>
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
                              label={
                                refund.status === 'processed' 
                                  ? 'İade Edildi' 
                                  : refund.status === 'pending' 
                                    ? 'Beklemede' 
                                    : refund.status
                              }
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
                            {refund.status === 'pending' && refund.remainingHours !== undefined ? (
                              <Chip
                                label={`${Math.floor(refund.remainingHours)} saat kaldı`}
                                color={refund.isExpired ? 'success' : 'warning'}
                                size="small"
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: 500,
                                  height: 20,
                                }}
                              />
                            ) : refund.status === 'processed' ? (
                              <Chip
                                label="İade Edildi"
                                color="success"
                                size="small"
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: 500,
                                  height: 20,
                                }}
                              />
                            ) : (
                              <Typography variant="body2" sx={{ fontSize: '12px', color: 'text.secondary' }}>
                                -
                              </Typography>
                            )}
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
              </>
            )}
        </Box>
      </Box>
    </ProtectedRoute>
  );
}
