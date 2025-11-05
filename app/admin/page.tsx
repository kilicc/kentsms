'use client';

import { Box, Container, Typography, Paper, Grid, Card, CardContent, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Tabs, Tab, Chip, alpha, Accordion, AccordionSummary, AccordionDetails, Checkbox, FormControlLabel, CircularProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { AdminPanelSettings, People, Sms, AccountBalanceWallet, Add, Assessment, ExpandMore } from '@mui/icons-material';
import { gradients } from '@/lib/theme';
import { useRouter } from 'next/navigation';
import ClientDate from '@/components/ClientDate';

interface User {
  id: string;
  username: string;
  email: string;
  credit: number;
  role: string;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  totalContacts: number;
  totalSMS: number;
  totalPayments: number;
  totalRevenue: number;
}

interface RefundReport {
  user: {
    id: string;
    username: string;
    email: string;
  };
  todaySMS: number;
  todayFailedSMS: number;
  todayRefunds: number;
  totalRefundAmount: number;
  refunds: Array<{
    id: string;
    sms: {
      id: string;
      phoneNumber: string;
      message: string;
      sentAt: string;
      status: string;
    };
    originalCost: number;
    refundAmount: number;
    reason: string;
    status: string;
    createdAt: string;
  }>;
}

interface RefundsReportResponse {
  date: string;
  reports: RefundReport[];
  summary: {
    totalUsers: number;
    totalSMS: number;
    totalFailedSMS: number;
    totalRefunds: number;
    totalRefundAmount: number;
  };
}

export default function AdminDashboardPage() {
  const { api, user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [tabValue, setTabValue] = useState(0);
  const [refundsReport, setRefundsReport] = useState<RefundsReportResponse | null>(null);
  const [refundsReportLoading, setRefundsReportLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedRefunds, setSelectedRefunds] = useState<string[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    // Check if user is admin
    if (user) {
      if (user.role !== 'admin' && user.role !== 'moderator') {
        router.push('/dashboard');
        return;
      }
      // User is admin, load data
      loadStats();
      loadUsers();
      if (tabValue === 1) {
        loadRefundsReport();
      }
      if (tabValue === 2) {
        loadPaymentRequests();
      }
    }
  }, [user, tabValue, selectedDate]);

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Stats load error:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      if (response.data.success) {
        setUsers(response.data.data.users);
      }
    } catch (error) {
      console.error('Users load error:', error);
    }
  };

  const loadPaymentRequests = async () => {
    try {
      setLoadingPaymentRequests(true);
      const response = await api.get('/admin/payment-requests');
      if (response.data.success) {
        setPaymentRequests(response.data.data.requests || []);
      }
    } catch (error: any) {
      console.error('Payment requests load error:', error);
      setError(error.response?.data?.message || 'Ödeme talepleri yüklenirken hata oluştu');
    } finally {
      setLoadingPaymentRequests(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/admin/payment-requests/${selectedRequest.id}/approve`, {
        adminNotes,
      });

      if (response.data.success) {
        setSuccess('Ödeme talebi başarıyla onaylandı');
        setApproveDialogOpen(false);
        setSelectedRequest(null);
        setAdminNotes('');
        loadPaymentRequests();
        loadUsers(); // Kullanıcı listesini güncelle
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Ödeme talebi onaylanırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest || !rejectionReason) {
      setError('Red sebebi gerekli');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/admin/payment-requests/${selectedRequest.id}/reject`, {
        rejectionReason,
        adminNotes,
      });

      if (response.data.success) {
        setSuccess('Ödeme talebi reddedildi');
        setRejectDialogOpen(false);
        setSelectedRequest(null);
        setRejectionReason('');
        setAdminNotes('');
        loadPaymentRequests();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Ödeme talebi reddedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadRefundsReport = async () => {
    setRefundsReportLoading(true);
    try {
      const response = await api.get(`/admin/refunds-report?date=${selectedDate}`);
      if (response.data.success) {
        setRefundsReport(response.data.data);
      }
    } catch (error) {
      console.error('Refunds report load error:', error);
      setError('İade raporu yüklenirken hata oluştu');
    } finally {
      setRefundsReportLoading(false);
    }
  };

  const handleRefundToggle = (refundId: string) => {
    setSelectedRefunds((prev) =>
      prev.includes(refundId)
        ? prev.filter((id) => id !== refundId)
        : [...prev, refundId]
    );
  };

  const handleSelectAllRefunds = (refunds: RefundReport['refunds']) => {
    if (selectedRefunds.length === refunds.length) {
      setSelectedRefunds([]);
    } else {
      setSelectedRefunds(refunds.map((r) => r.id));
    }
  };

  const handleCreditSubmit = async () => {
    if (!selectedUser || creditAmount <= 0) {
      setError('Geçerli bir kredi miktarı girin');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/admin/users/${selectedUser.id}/credit`, {
        amount: creditAmount,
        reason: 'Admin kredi yükleme',
      });

      if (response.data.success) {
        setSuccess('Kredi yüklendi');
        setCreditDialogOpen(false);
        setCreditAmount(0);
        setSelectedUser(null);
        loadUsers();
        loadStats();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kredi yükleme hatası');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking user role
  if (!user) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Typography>Yükleniyor...</Typography>
      </Box>
    );
  }

  // Redirect if not admin
  if (user.role !== 'admin' && user.role !== 'moderator') {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Typography variant="h6" color="error">
          Admin yetkisi gerekli
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Bu sayfaya erişmek için admin yetkisine sahip olmalısınız.
        </Typography>
      </Box>
    );
  }

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
              Admin Paneli
            </Typography>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 3,
                fontSize: '14px',
              }}
            >
              Sistem istatistiklerini görüntüleyin ve kullanıcıları yönetin.
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

            {/* Tabs */}
            <Paper sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', mb: 3 }}>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab icon={<People />} label="Kullanıcılar" />
                <Tab icon={<Assessment />} label="İade Raporu" />
                <Tab icon={<AccountBalanceWallet />} label="Ödeme Talepleri" />
              </Tabs>
            </Paper>

            {/* Stats Cards */}
            {stats && (
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card 
                    sx={{ 
                      borderRadius: 2, 
                      background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)',
                      border: '1px solid rgba(25, 118, 210, 0.1)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <CardContent>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          fontSize: '14px',
                        }}
                      >
                        Toplam Kullanıcı
                      </Typography>
                      <Typography 
                        variant="h4" 
                        color="primary" 
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '34px',
                        }}
                      >
                        {stats.totalUsers}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card 
                    sx={{ 
                      borderRadius: 2, 
                      background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)',
                      border: '1px solid rgba(25, 118, 210, 0.1)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <CardContent>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          fontSize: '14px',
                        }}
                      >
                        Toplam SMS
                      </Typography>
                      <Typography 
                        variant="h4" 
                        color="primary" 
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '34px',
                        }}
                      >
                        {stats.totalSMS}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card 
                    sx={{ 
                      borderRadius: 2, 
                      background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)',
                      border: '1px solid rgba(25, 118, 210, 0.1)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <CardContent>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          fontSize: '14px',
                        }}
                      >
                        Toplam Gelir
                      </Typography>
                      <Typography 
                        variant="h4" 
                        color="primary" 
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '34px',
                        }}
                      >
                        {stats.totalRevenue.toLocaleString('tr-TR')} TRY
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Tab Content */}
            {tabValue === 0 && (
              <Paper sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography 
                    variant="h6"
                    sx={{
                      fontSize: '20px',
                      fontWeight: 500,
                    }}
                  >
                    Kullanıcılar
                  </Typography>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Kullanıcı Adı</TableCell>
                        <TableCell>E-posta</TableCell>
                        <TableCell>Kredi</TableCell>
                        <TableCell>Rol</TableCell>
                        <TableCell>İşlemler</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>{u.username}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.credit}</TableCell>
                          <TableCell>{u.role}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Add />}
                              onClick={() => {
                                setSelectedUser(u);
                                setCreditDialogOpen(true);
                              }}
                              sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 500,
                              }}
                            >
                              Kredi Yükle
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {tabValue === 1 && (
              <Box>
                <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    label="Tarih Seç"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={loadRefundsReport}
                    disabled={refundsReportLoading}
                    sx={{
                      background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                      boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                    }}
                  >
                    Raporu Yükle
                  </Button>
                </Box>

                {refundsReport && (
                  <>
                    {/* Summary Cards */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)', border: '1px solid rgba(25, 118, 210, 0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                          <CardContent>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px' }}>
                              Toplam Kullanıcı
                            </Typography>
                            <Typography variant="h5" color="primary" sx={{ fontWeight: 600, fontSize: '28px' }}>
                              {refundsReport.summary.totalUsers}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)', border: '1px solid rgba(25, 118, 210, 0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                          <CardContent>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px' }}>
                              Toplam SMS
                            </Typography>
                            <Typography variant="h5" color="primary" sx={{ fontWeight: 600, fontSize: '28px' }}>
                              {refundsReport.summary.totalSMS}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)', border: '1px solid rgba(25, 118, 210, 0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                          <CardContent>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px' }}>
                              Toplam İade
                            </Typography>
                            <Typography variant="h5" color="primary" sx={{ fontWeight: 600, fontSize: '28px' }}>
                              {refundsReport.summary.totalRefunds}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)', border: '1px solid rgba(25, 118, 210, 0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                          <CardContent>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px' }}>
                              Toplam İade Tutarı
                            </Typography>
                            <Typography variant="h5" color="primary" sx={{ fontWeight: 600, fontSize: '28px' }}>
                              {refundsReport.summary.totalRefundAmount} kredi
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* User Reports */}
                    {refundsReport.reports.map((report) => (
                      <Accordion key={report.user.id} sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
                            <Box>
                              <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 600 }}>
                                {report.user.username}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                                {report.user.email}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              <Chip label={`${report.todaySMS} SMS`} color="primary" size="small" />
                              <Chip label={`${report.todayFailedSMS} Başarısız`} color="error" size="small" />
                              <Chip label={`${report.todayRefunds} İade`} color="warning" size="small" />
                              <Chip label={`${report.totalRefundAmount} kredi`} color="success" size="small" />
                            </Box>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {report.refunds.length > 0 ? (
                            <>
                              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                  {report.refunds.length} iade kaydı
                                </Typography>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={selectedRefunds.length === report.refunds.length && report.refunds.every((r) => selectedRefunds.includes(r.id))}
                                      indeterminate={selectedRefunds.some((id) => report.refunds.some((r) => r.id === id)) && !report.refunds.every((r) => selectedRefunds.includes(r.id))}
                                      onChange={() => handleSelectAllRefunds(report.refunds)}
                                    />
                                  }
                                  label="Tümünü Seç"
                                />
                              </Box>
                              <TableContainer>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell padding="checkbox" />
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
                                    {report.refunds.map((refund) => (
                                      <TableRow key={refund.id}>
                                        <TableCell padding="checkbox">
                                          <Checkbox
                                            checked={selectedRefunds.includes(refund.id)}
                                            onChange={() => handleRefundToggle(refund.id)}
                                          />
                                        </TableCell>
                                        <TableCell>{refund.sms.phoneNumber}</TableCell>
                                        <TableCell>{refund.sms.message.substring(0, 30)}...</TableCell>
                                        <TableCell>{refund.originalCost} kredi</TableCell>
                                        <TableCell>{refund.refundAmount} kredi</TableCell>
                                        <TableCell>{refund.reason}</TableCell>
                                        <TableCell>
                                          <Chip
                                            label={refund.status}
                                            color={refund.status === 'processed' ? 'success' : refund.status === 'pending' ? 'warning' : 'error'}
                                            size="small"
                                            sx={{ fontSize: '0.75rem', fontWeight: 500, height: 24 }}
                                          />
                                        </TableCell>
                                        <TableCell><ClientDate date={refund.createdAt} /></TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                              Bu kullanıcı için iade kaydı bulunmuyor.
                            </Typography>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}

                    {refundsReport.reports.length === 0 && (
                      <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Seçilen tarihte SMS gönderen veya iadesi olan kullanıcı bulunmuyor.
                        </Typography>
                      </Paper>
                    )}
                  </>
                )}

                {!refundsReport && !refundsReportLoading && (
                  <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Raporu yüklemek için tarih seçin ve "Raporu Yükle" butonuna tıklayın.
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {/* Payment Requests Tab */}
            {tabValue === 2 && (
              <Box>
                <Paper sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', p: 3 }}>
                  <Typography 
                    variant="h6" 
                    gutterBottom
                    sx={{
                      fontSize: '20px',
                      fontWeight: 500,
                      mb: 3,
                    }}
                  >
                    Ödeme Talepleri
                  </Typography>
                  {loadingPaymentRequests ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : paymentRequests.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Henüz ödeme talebi bulunmuyor.
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Kullanıcı</TableCell>
                            <TableCell>Tutar</TableCell>
                            <TableCell>Kredi</TableCell>
                            <TableCell>Ödeme Yöntemi</TableCell>
                            <TableCell>Transaction ID</TableCell>
                            <TableCell>Durum</TableCell>
                            <TableCell>Tarih</TableCell>
                            <TableCell>İşlemler</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paymentRequests.map((request) => {
                            const getStatusColor = (status: string) => {
                              switch (status) {
                                case 'approved':
                                  return 'success';
                                case 'rejected':
                                  return 'error';
                                case 'pending':
                                  return 'warning';
                                default:
                                  return 'default';
                              }
                            };

                            const getStatusLabel = (status: string) => {
                              switch (status) {
                                case 'approved':
                                  return 'Onaylandı';
                                case 'rejected':
                                  return 'Reddedildi';
                                case 'pending':
                                  return 'Beklemede';
                                default:
                                  return status;
                              }
                            };

                            return (
                              <TableRow key={request.id}>
                                <TableCell>
                                  {request.user?.username || '-'}
                                  <br />
                                  <Typography variant="caption" color="text.secondary">
                                    {request.user?.email || '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell>{Number(request.amount)} {request.currency || 'TRY'}</TableCell>
                                <TableCell>{request.credits} SMS {request.bonus > 0 ? `+ ${request.bonus} bonus` : ''}</TableCell>
                                <TableCell>{request.paymentMethod || '-'}</TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                    {request.transactionId ? request.transactionId.substring(0, 20) + '...' : '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={getStatusLabel(request.status)}
                                    color={getStatusColor(request.status)}
                                    size="small"
                                    sx={{
                                      fontSize: '0.75rem',
                                      fontWeight: 500,
                                      height: 24,
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <ClientDate date={request.createdAt} />
                                </TableCell>
                                <TableCell>
                                  {request.status === 'pending' && (
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        color="success"
                                        onClick={() => {
                                          setSelectedRequest(request);
                                          setAdminNotes('');
                                          setApproveDialogOpen(true);
                                        }}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                      >
                                        Onayla
                                      </Button>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        color="error"
                                        onClick={() => {
                                          setSelectedRequest(request);
                                          setRejectionReason('');
                                          setAdminNotes('');
                                          setRejectDialogOpen(true);
                                        }}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                      >
                                        Reddet
                                      </Button>
                                    </Box>
                                  )}
                                  {request.status === 'approved' && request.approver && (
                                    <Typography variant="caption" color="text.secondary">
                                      {request.approver.username} tarafından onaylandı
                                    </Typography>
                                  )}
                                  {request.status === 'rejected' && (
                                    <Typography variant="caption" color="error">
                                      {request.rejectionReason || 'Reddedildi'}
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Box>
            )}

          {/* Approve Payment Request Dialog */}
          <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Ödeme Talebini Onayla</DialogTitle>
            <DialogContent>
              {selectedRequest && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Kullanıcı: <strong>{selectedRequest.user?.username}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Tutar: <strong>{Number(selectedRequest.amount)} {selectedRequest.currency || 'TRY'}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Kredi: <strong>{selectedRequest.credits} SMS {selectedRequest.bonus > 0 ? `+ ${selectedRequest.bonus} bonus` : ''}</strong>
                  </Typography>
                  {selectedRequest.transactionId && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Transaction ID: <strong style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{selectedRequest.transactionId}</strong>
                    </Typography>
                  )}
                </Box>
              )}
              <TextField
                fullWidth
                label="Admin Notları (Opsiyonel)"
                multiline
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                margin="normal"
                placeholder="Onay ile ilgili notlarınızı buraya yazabilirsiniz..."
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setApproveDialogOpen(false)}>İptal</Button>
              <Button onClick={handleApproveRequest} variant="contained" color="success" disabled={loading}>
                {loading ? 'Onaylanıyor...' : 'Onayla'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Reject Payment Request Dialog */}
          <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Ödeme Talebini Reddet</DialogTitle>
            <DialogContent>
              {selectedRequest && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Kullanıcı: <strong>{selectedRequest.user?.username}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Tutar: <strong>{Number(selectedRequest.amount)} {selectedRequest.currency || 'TRY'}</strong>
                  </Typography>
                </Box>
              )}
              <TextField
                fullWidth
                label="Red Sebebi *"
                multiline
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                margin="normal"
                required
                placeholder="Red sebebini açıklayın..."
                error={!rejectionReason}
                helperText={!rejectionReason ? 'Red sebebi zorunludur' : ''}
              />
              <TextField
                fullWidth
                label="Admin Notları (Opsiyonel)"
                multiline
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                margin="normal"
                placeholder="Red ile ilgili notlarınızı buraya yazabilirsiniz..."
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRejectDialogOpen(false)}>İptal</Button>
              <Button onClick={handleRejectRequest} variant="contained" color="error" disabled={loading || !rejectionReason}>
                {loading ? 'Reddediliyor...' : 'Reddet'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Credit Dialog */}
          <Dialog open={creditDialogOpen} onClose={() => setCreditDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Kredi Yükle - {selectedUser?.username}</DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                label="Kredi Miktarı"
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                margin="normal"
                required
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCreditDialogOpen(false)}>İptal</Button>
              <Button onClick={handleCreditSubmit} variant="contained" disabled={loading}>
                {loading ? 'Yükleniyor...' : 'Yükle'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}

