'use client';

import { Box, Container, Typography, Paper, Grid, Card, CardContent, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Tabs, Tab, Chip, alpha, Accordion, AccordionSummary, AccordionDetails, Checkbox, FormControlLabel, CircularProgress, Select, MenuItem, FormControl, InputLabel, Divider } from '@mui/material';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { AdminPanelSettings, People, Sms, AccountBalanceWallet, Add, Assessment, ExpandMore, PersonAdd, Visibility } from '@mui/icons-material';
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
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'user', credit: 0 });
  const [userDetailsDialogOpen, setUserDetailsDialogOpen] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  useEffect(() => {
    // URL'den tab parametresini oku (client-side only)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) {
        const tabNum = parseInt(tab, 10);
        if (!isNaN(tabNum) && tabNum >= 0 && tabNum <= 3) {
          setTabValue(tabNum);
        }
      }
    }
  }, []);

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
        // Raporlar tab - users listesi zaten yüklü
      }
      if (tabValue === 2) {
        loadRefundsReport();
      }
      if (tabValue === 3) {
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

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      setError('Kullanıcı adı, email ve şifre gerekli');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/admin/users', {
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        credit: newUser.credit || 0,
      });

      if (response.data.success) {
        setSuccess('Kullanıcı başarıyla oluşturuldu');
        setCreateUserDialogOpen(false);
        setNewUser({ username: '', email: '', password: '', role: 'user', credit: 0 });
        loadUsers();
        loadStats();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kullanıcı oluşturma hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleViewUserDetails = async (userId: string) => {
    setLoadingUserDetails(true);
    setUserDetailsDialogOpen(true);
    setSelectedUserDetails(null);

    try {
      const response = await api.get(`/admin/users/${userId}/details`);
      if (response.data.success) {
        setSelectedUserDetails(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kullanıcı detayları yüklenirken hata oluştu');
    } finally {
      setLoadingUserDetails(false);
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
            <Typography 
              variant="h4" 
              component="h1" 
              gutterBottom 
              sx={{ 
                color: 'primary.main', 
                mb: 2.5,
                mt: 1,
                fontSize: '18px',
                fontWeight: 600,
              }}
            >
              Admin Paneli
            </Typography>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2,
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
            <Paper sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', mb: 2 }}>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab icon={<People />} label="Kullanıcılar" />
                <Tab icon={<Sms />} label="Raporlar" />
                <Tab icon={<Assessment />} label="İade Raporu" />
                <Tab icon={<AccountBalanceWallet />} label="Ödeme Talepleri" />
              </Tabs>
            </Paper>

            {/* Stats Cards */}
            {stats && (
              <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
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
                          fontSize: '18px',
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
                          fontSize: '18px',
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
                          fontSize: '18px',
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
                      fontSize: '18px',
                      fontWeight: 500,
                    }}
                  >
                    Kullanıcılar
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PersonAdd />}
                    onClick={() => {
                      setNewUser({ username: '', email: '', password: '', role: 'user', credit: 0 });
                      setCreateUserDialogOpen(true);
                    }}
                    sx={{
                      background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)',
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontSize: '12px',
                      fontWeight: 500,
                      py: 0.75,
                      px: 1.5,
                    }}
                  >
                    Yeni Kullanıcı
                  </Button>
                </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kullanıcı Adı</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>E-posta</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kredi</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Rol</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>İşlemler</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {users.map((u) => (
                            <TableRow 
                              key={u.id}
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                              }}
                            >
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{u.username}</TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{u.email}</TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{u.credit}</TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{u.role}</TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                <Box sx={{ display: 'flex', gap: 0.75 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<Add />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedUser(u);
                                      setCreditDialogOpen(true);
                                    }}
                                    sx={{
                                      borderRadius: 1.5,
                                      textTransform: 'none',
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      py: 0.5,
                                      px: 1,
                                    }}
                                  >
                                    Kredi Yükle
                                  </Button>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
              </Paper>
            )}

            {tabValue === 1 && (
              <Paper sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography 
                    variant="h6"
                    sx={{
                      fontSize: '18px',
                      fontWeight: 500,
                    }}
                  >
                    Kullanıcı Raporları
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kullanıcı Adı</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>E-posta</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kredi</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Rol</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>İşlemler</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow 
                          key={u.id}
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                          }}
                          onClick={() => handleViewUserDetails(u.id)}
                        >
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{u.username}</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{u.email}</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{u.credit}</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{u.role}</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewUserDetails(u.id);
                              }}
                              sx={{
                                borderRadius: 1.5,
                                textTransform: 'none',
                                fontSize: '12px',
                                fontWeight: 500,
                                py: 0.5,
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
              </Paper>
            )}

            {tabValue === 2 && (
              <Box>
                <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    label="Tarih Seç"
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
                  <Button
                    size="small"
                    variant="contained"
                    onClick={loadRefundsReport}
                    disabled={refundsReportLoading}
                    sx={{
                      background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)',
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontSize: '12px',
                      fontWeight: 500,
                      py: 0.75,
                      px: 1.5,
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
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
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
                          <CardContent sx={{ p: 1.5 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                              Toplam SMS
                            </Typography>
                            <Typography variant="h5" color="primary" sx={{ fontWeight: 600, fontSize: '22px' }}>
                              {refundsReport.summary.totalSMS}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)', border: '1px solid rgba(25, 118, 210, 0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                          <CardContent sx={{ p: 1.5 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                              Toplam İade
                            </Typography>
                            <Typography variant="h5" color="primary" sx={{ fontWeight: 600, fontSize: '22px' }}>
                              {refundsReport.summary.totalRefunds}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ borderRadius: 2, background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)', border: '1px solid rgba(25, 118, 210, 0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                          <CardContent sx={{ p: 1.5 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                              Toplam İade Tutarı
                            </Typography>
                            <Typography variant="h5" color="primary" sx={{ fontWeight: 600, fontSize: '22px' }}>
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
                      <Paper sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Seçilen tarihte SMS gönderen veya iadesi olan kullanıcı bulunmuyor.
                        </Typography>
                      </Paper>
                    )}
                  </>
                )}

                {!refundsReport && !refundsReportLoading && (
                  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Raporu yüklemek için tarih seçin ve "Raporu Yükle" butonuna tıklayın.
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {/* Payment Requests Tab */}
            {tabValue === 3 && (
              <Box>
                <Paper sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', p: 1.5 }}>
                  <Typography 
                    variant="h6" 
                    gutterBottom
                    sx={{
                      fontSize: '18px',
                      fontWeight: 500,
                      mb: 2,
                    }}
                  >
                    Ödeme Talepleri
                  </Typography>
                  {loadingPaymentRequests ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 1.5 }}>
                    <CircularProgress size={24} />
                  </Box>
                  ) : paymentRequests.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                        Henüz ödeme talebi bulunmuyor.
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kullanıcı</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tutar</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kredi</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Ödeme Yöntemi</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Transaction ID</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Durum</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tarih</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>İşlemler</TableCell>
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
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  {request.user?.username || '-'}
                                  <br />
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                    {request.user?.email || '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{Number(request.amount)} {request.currency || 'TRY'}</TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{request.credits} SMS {request.bonus > 0 ? `+ ${request.bonus} bonus` : ''}</TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{request.paymentMethod || '-'}</TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>
                                    {request.transactionId ? request.transactionId.substring(0, 20) + '...' : '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  <Chip
                                    label={getStatusLabel(request.status)}
                                    color={getStatusColor(request.status)}
                                    size="small"
                                    sx={{
                                      fontSize: '0.65rem',
                                      fontWeight: 500,
                                      height: 20,
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  <ClientDate date={request.createdAt} />
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  {request.status === 'pending' && (
                                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        color="success"
                                        onClick={() => {
                                          setSelectedRequest(request);
                                          setAdminNotes('');
                                          setApproveDialogOpen(true);
                                        }}
                                        sx={{ textTransform: 'none', fontSize: '0.7rem', py: 0.5, px: 1 }}
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
                                        sx={{ textTransform: 'none', fontSize: '0.7rem', py: 0.5, px: 1 }}
                                      >
                                        Reddet
                                      </Button>
                                    </Box>
                                  )}
                                  {request.status === 'approved' && request.approver && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                      {request.approver.username} tarafından onaylandı
                                    </Typography>
                                  )}
                                  {request.status === 'rejected' && (
                                    <Typography variant="caption" color="error" sx={{ fontSize: '10px' }}>
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
            <DialogTitle sx={{ fontSize: '16px', fontWeight: 600, pb: 1 }}>Ödeme Talebini Onayla</DialogTitle>
            <DialogContent sx={{ pt: 1.5 }}>
              {selectedRequest && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: '12px' }}>
                    Kullanıcı: <strong>{selectedRequest.user?.username}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: '12px' }}>
                    Tutar: <strong>{Number(selectedRequest.amount)} {selectedRequest.currency || 'TRY'}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: '12px' }}>
                    Kredi: <strong>{selectedRequest.credits} SMS {selectedRequest.bonus > 0 ? `+ ${selectedRequest.bonus} bonus` : ''}</strong>
                  </Typography>
                  {selectedRequest.transactionId && (
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: '12px' }}>
                      Transaction ID: <strong style={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>{selectedRequest.transactionId}</strong>
                    </Typography>
                  )}
                </Box>
              )}
              <TextField
                fullWidth
                size="small"
                label="Admin Notları (Opsiyonel)"
                multiline
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                margin="dense"
                placeholder="Onay ile ilgili notlarınızı buraya yazabilirsiniz..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '12px',
                  },
                }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 1.5 }}>
              <Button size="small" onClick={() => setApproveDialogOpen(false)} sx={{ fontSize: '12px' }}>İptal</Button>
              <Button size="small" onClick={handleApproveRequest} variant="contained" color="success" disabled={loading} sx={{ fontSize: '12px' }}>
                {loading ? 'Onaylanıyor...' : 'Onayla'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Reject Payment Request Dialog */}
          <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: '16px', fontWeight: 600, pb: 1 }}>Ödeme Talebini Reddet</DialogTitle>
            <DialogContent sx={{ pt: 1.5 }}>
              {selectedRequest && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: '12px' }}>
                    Kullanıcı: <strong>{selectedRequest.user?.username}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: '12px' }}>
                    Tutar: <strong>{Number(selectedRequest.amount)} {selectedRequest.currency || 'TRY'}</strong>
                  </Typography>
                </Box>
              )}
              <TextField
                fullWidth
                size="small"
                label="Red Sebebi *"
                multiline
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                margin="dense"
                required
                placeholder="Red sebebini açıklayın..."
                error={!rejectionReason}
                helperText={!rejectionReason ? 'Red sebebi zorunludur' : ''}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '12px',
                  },
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="Admin Notları (Opsiyonel)"
                multiline
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                margin="dense"
                placeholder="Red ile ilgili notlarınızı buraya yazabilirsiniz..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '12px',
                  },
                }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 1.5 }}>
              <Button size="small" onClick={() => setRejectDialogOpen(false)} sx={{ fontSize: '12px' }}>İptal</Button>
              <Button size="small" onClick={handleRejectRequest} variant="contained" color="error" disabled={loading || !rejectionReason} sx={{ fontSize: '12px' }}>
                {loading ? 'Reddediliyor...' : 'Reddet'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Credit Dialog */}
          <Dialog open={creditDialogOpen} onClose={() => setCreditDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: '16px', fontWeight: 600, pb: 1 }}>Kredi Yükle - {selectedUser?.username}</DialogTitle>
            <DialogContent sx={{ pt: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                label="Kredi Miktarı"
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                margin="dense"
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '12px',
                  },
                }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 1.5 }}>
              <Button size="small" onClick={() => setCreditDialogOpen(false)} sx={{ fontSize: '12px' }}>İptal</Button>
              <Button size="small" onClick={handleCreditSubmit} variant="contained" disabled={loading} sx={{ fontSize: '12px' }}>
                {loading ? 'Yükleniyor...' : 'Yükle'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Create User Dialog */}
          <Dialog open={createUserDialogOpen} onClose={() => setCreateUserDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: '16px', fontWeight: 600, pb: 1 }}>Yeni Kullanıcı Oluştur</DialogTitle>
            <DialogContent sx={{ pt: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                label="Kullanıcı Adı *"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                margin="dense"
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '12px',
                  },
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="E-posta *"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                margin="dense"
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '12px',
                  },
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="Şifre *"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                margin="dense"
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '12px',
                  },
                }}
              />
              <FormControl fullWidth size="small" margin="dense" sx={{ mt: 1 }}>
                <InputLabel sx={{ fontSize: '12px' }}>Rol</InputLabel>
                <Select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  label="Rol"
                  sx={{ fontSize: '12px' }}
                >
                  <MenuItem value="user" sx={{ fontSize: '12px' }}>Kullanıcı</MenuItem>
                  <MenuItem value="admin" sx={{ fontSize: '12px' }}>Admin</MenuItem>
                  <MenuItem value="moderator" sx={{ fontSize: '12px' }}>Moderatör</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                size="small"
                label="Başlangıç Kredisi"
                type="number"
                value={newUser.credit}
                onChange={(e) => setNewUser({ ...newUser, credit: parseInt(e.target.value) || 0 })}
                margin="dense"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '12px',
                  },
                }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 1.5 }}>
              <Button size="small" onClick={() => setCreateUserDialogOpen(false)} sx={{ fontSize: '12px' }}>İptal</Button>
              <Button size="small" onClick={handleCreateUser} variant="contained" disabled={loading} sx={{ fontSize: '12px' }}>
                {loading ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* User Details Dialog */}
          <Dialog open={userDetailsDialogOpen} onClose={() => setUserDetailsDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontSize: '16px', fontWeight: 600, pb: 1 }}>
              {selectedUserDetails?.user?.username || 'Kullanıcı'} Detayları
            </DialogTitle>
            <DialogContent sx={{ pt: 1.5 }}>
              {loadingUserDetails ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : selectedUserDetails ? (
                <Box>
                  {/* User Info */}
                  <Paper sx={{ p: 1.5, mb: 2, borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontSize: '14px', fontWeight: 600, mb: 1 }}>
                      Kullanıcı Bilgileri
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                          Kullanıcı Adı: <strong>{selectedUserDetails.user.username}</strong>
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                          E-posta: <strong>{selectedUserDetails.user.email}</strong>
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                          Kredi: <strong>{selectedUserDetails.user.credit}</strong>
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                          Rol: <strong>{selectedUserDetails.user.role}</strong>
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                          Toplam SMS: <strong>{selectedUserDetails.stats.totalSMS}</strong>
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                          Toplam Ödeme Talebi: <strong>{selectedUserDetails.stats.totalPaymentRequests}</strong>
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* SMS Messages */}
                  <Typography variant="subtitle2" sx={{ fontSize: '14px', fontWeight: 600, mb: 1 }}>
                    Son SMS Mesajları ({selectedUserDetails.smsMessages.length})
                  </Typography>
                  <TableContainer sx={{ mb: 2, maxHeight: 200 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Telefon</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Mesaj</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Durum</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tarih</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedUserDetails.smsMessages.length > 0 ? (
                          selectedUserDetails.smsMessages.map((sms: any) => (
                            <TableRow key={sms.id}>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{sms.phoneNumber}</TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{sms.message.substring(0, 30)}...</TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                <Chip
                                  label={sms.status}
                                  color={sms.status === 'sent' ? 'success' : sms.status === 'failed' ? 'error' : 'warning'}
                                  size="small"
                                  sx={{ fontSize: '0.65rem', height: 20 }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                <ClientDate date={sms.sentAt} />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} sx={{ textAlign: 'center', py: 2, fontSize: '12px' }}>
                              SMS mesajı bulunamadı
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Payment Requests */}
                  <Typography variant="subtitle2" sx={{ fontSize: '14px', fontWeight: 600, mb: 1 }}>
                    Ödeme Talepleri ({selectedUserDetails.paymentRequests.length})
                  </Typography>
                  <TableContainer sx={{ maxHeight: 200 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tutar</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kredi</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Durum</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tarih</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedUserDetails.paymentRequests.length > 0 ? (
                          selectedUserDetails.paymentRequests.map((req: any) => (
                            <TableRow key={req.id}>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{req.amount} {req.currency}</TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{req.credits} SMS</TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                <Chip
                                  label={req.status === 'approved' ? 'Onaylandı' : req.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                                  color={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'error' : 'warning'}
                                  size="small"
                                  sx={{ fontSize: '0.65rem', height: 20 }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                <ClientDate date={req.createdAt} />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} sx={{ textAlign: 'center', py: 2, fontSize: '12px' }}>
                              Ödeme talebi bulunamadı
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontSize: '12px' }}>
                  Kullanıcı detayları yükleniyor...
                </Typography>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 1.5 }}>
              <Button size="small" onClick={() => setUserDetailsDialogOpen(false)} sx={{ fontSize: '12px' }}>
                Kapat
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}

