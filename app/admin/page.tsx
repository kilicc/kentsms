'use client';

import { Box, Container, Typography, Paper, Grid, Card, CardContent, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Tabs, Tab, Chip, alpha, Accordion, AccordionSummary, AccordionDetails, Checkbox, FormControlLabel, CircularProgress, Select, MenuItem, FormControl, InputLabel, Divider, InputAdornment, IconButton, Pagination } from '@mui/material';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { AdminPanelSettings, People, Sms, AccountBalanceWallet, Add, Assessment, ExpandMore, PersonAdd, Visibility, Search, FilterList, Delete, VpnKey, ContentCopy, AccountBalance } from '@mui/icons-material';
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
    remainingHours?: number;
    isExpired?: boolean;
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
  const { mode } = useTheme();
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
  const [paymentRequestDetailDialogOpen, setPaymentRequestDetailDialogOpen] = useState(false);
  const [selectedPaymentRequestDetail, setSelectedPaymentRequestDetail] = useState<any | null>(null);
  // API Keys states
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [createApiKeyDialogOpen, setCreateApiKeyDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState({ userId: '', name: '', description: '', credit: 0 });
  const [apiKeyDetailDialogOpen, setApiKeyDetailDialogOpen] = useState(false);
  const [selectedApiKeyDetail, setSelectedApiKeyDetail] = useState<any | null>(null);
  
  // System Credit states
  const [systemCredit, setSystemCredit] = useState<number>(0);
  const [loadingSystemCredit, setLoadingSystemCredit] = useState(false);
  const [systemCreditDialogOpen, setSystemCreditDialogOpen] = useState(false);
  const [systemCreditAction, setSystemCreditAction] = useState<'set' | 'add'>('add');
  const [systemCreditAmount, setSystemCreditAmount] = useState<number>(0);
  
  // User management search and filter
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkCreditDialogOpen, setBulkCreditDialogOpen] = useState(false);
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const userItemsPerPage = 10;

  useEffect(() => {
    // URL'den tab parametresini oku (client-side only)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
        if (tab) {
        const tabNum = parseInt(tab, 10);
        if (!isNaN(tabNum) && tabNum >= 0 && tabNum <= 5) {
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
      if (tabValue === 4) {
        loadApiKeys();
        loadUsers(); // Kullanıcı listesi API key oluşturma için gerekli
      }
      if (tabValue === 5) {
        loadSystemCredit();
      }
    }
  }, [user, tabValue, selectedDate]);

  const loadStats = async () => {
    try {
      const [statsResponse, systemCreditResponse] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/system-credit'),
      ]);
      
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }
      
      if (systemCreditResponse.data.success) {
        setSystemCredit(systemCreditResponse.data.data.systemCredit || 0);
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

  const loadApiKeys = async () => {
    try {
      setLoadingApiKeys(true);
      setError('');
      const response = await api.get('/admin/api-keys');
      if (response.data.success) {
        setApiKeys(response.data.data.apiKeys || []);
      } else {
        setError(response.data.message || 'API key\'ler yüklenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('API keys load error:', error);
      setError(error.response?.data?.message || 'API key\'ler yüklenirken bir hata oluştu');
      setApiKeys([]);
    } finally {
      setLoadingApiKeys(false);
    }
  };

  const loadSystemCredit = async () => {
    try {
      setLoadingSystemCredit(true);
      setError('');
      const response = await api.get('/admin/system-credit');
      if (response.data.success) {
        setSystemCredit(response.data.data.systemCredit || 0);
      } else {
        setError(response.data.message || 'Sistem kredisi yüklenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('System credit load error:', error);
      setError(error.response?.data?.message || 'Sistem kredisi yüklenirken bir hata oluştu');
    } finally {
      setLoadingSystemCredit(false);
    }
  };

  const handleUpdateSystemCredit = async () => {
    if (!systemCreditAmount || systemCreditAmount <= 0) {
      setError('Geçerli bir miktar girin');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put('/admin/system-credit', {
        action: systemCreditAction,
        amount: systemCreditAmount,
      });

      if (response.data.success) {
        setSuccess(`Sistem kredisi ${systemCreditAction === 'set' ? 'güncellendi' : 'artırıldı'}`);
        setSystemCredit(response.data.data.systemCredit);
        setSystemCreditDialogOpen(false);
        setSystemCreditAmount(0);
        setSystemCreditAction('add');
      } else {
        setError(response.data.message || 'Sistem kredisi güncellenemedi');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Sistem kredisi güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
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

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`${username} kullanıcısını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve kullanıcının tüm verileri (mesajlar, kişiler, şablonlar vb.) silinecektir!`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.delete(`/admin/users/${userId}`);
      if (response.data.success) {
        setSuccess(`${username} kullanıcısı başarıyla silindi.`);
        // Seçili kullanıcılar listesinden de kaldır
        setSelectedUsers(prev => prev.filter(id => id !== userId));
        loadUsers();
        loadStats();
      } else {
        setError(response.data.error || response.data.message || 'Kullanıcı silinirken hata oluştu');
      }
    } catch (err: any) {
      console.error('Kullanıcı silme hatası:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Kullanıcı silinirken hata oluştu';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkCreditSubmit = async () => {
    if (selectedUsers.length === 0 || creditAmount <= 0) {
      setError('Lütfen geçerli bir kredi miktarı girin ve en az bir kullanıcı seçin');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let successCount = 0;
      let failCount = 0;

      for (const userId of selectedUsers) {
        try {
          await api.post(`/admin/users/${userId}/credit`, {
            amount: creditAmount,
            reason: 'Admin toplu kredi yükleme',
          });
          successCount++;
        } catch (err: any) {
          failCount++;
          console.error(`Kredi ekleme hatası (${userId}):`, err);
        }
      }

      if (successCount > 0) {
        setSuccess(`${successCount} kullanıcıya ${creditAmount.toLocaleString()} kredi başarıyla eklendi (ana krediden paylaştırıldı)${failCount > 0 ? ` (${failCount} başarısız)` : ''}`);
        setBulkCreditDialogOpen(false);
        setSelectedUsers([]);
        setCreditAmount(0);
        loadUsers();
        loadStats(); // Sistem kredisi de yenilenecek
      } else {
        setError('Kredi eklenemedi');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Toplu kredi ekleme hatası');
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
                <Tab icon={<VpnKey />} label="API Kullanıcıları" />
                <Tab icon={<AccountBalance />} label="Sistem Kredisi" />
              </Tabs>
            </Paper>

            {/* Stats Cards */}
            {stats && (
              <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card 
                    sx={{ 
                      borderRadius: 2, 
                      background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(69, 160, 73, 0.1) 100%)',
                      border: '1px solid rgba(76, 175, 80, 0.2)',
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
                        Ana Sistem Kredisi
                      </Typography>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '18px',
                          color: '#4caf50',
                        }}
                      >
                        {systemCredit.toLocaleString('tr-TR')}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{
                          fontSize: '11px',
                          display: 'block',
                          mt: 0.5,
                        }}
                      >
                        Tüm kullanıcılar bu krediden kullanır
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Typography 
                    variant="h6"
                    sx={{
                      fontSize: '18px',
                      fontWeight: 500,
                    }}
                  >
                    Kullanıcılar
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedUsers.length > 0 && (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={() => setBulkCreditDialogOpen(true)}
                        sx={{
                          textTransform: 'none',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}
                      >
                        Toplu Kredi Ekle ({selectedUsers.length})
                      </Button>
                    )}
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
                </Box>
                
                {/* Search and Filter */}
                <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    placeholder="Kullanıcı adı veya email ara..."
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      setUserCurrentPage(1);
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ flex: 1, minWidth: 200 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Rol Filtresi</InputLabel>
                    <Select
                      value={userRoleFilter}
                      label="Rol Filtresi"
                      onChange={(e) => {
                        setUserRoleFilter(e.target.value);
                        setUserCurrentPage(1);
                      }}
                    >
                      <MenuItem value="all">Tüm Roller</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="moderator">Moderator</MenuItem>
                      <MenuItem value="user">User</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {(() => {
                  // Filter users
                  let filteredUsers = users.filter((u) => {
                    const matchesSearch = userSearchQuery === '' || 
                      u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                      u.email.toLowerCase().includes(userSearchQuery.toLowerCase());
                    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                    return matchesSearch && matchesRole;
                  });

                  // Pagination
                  const totalPages = Math.ceil(filteredUsers.length / userItemsPerPage);
                  const startIndex = (userCurrentPage - 1) * userItemsPerPage;
                  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + userItemsPerPage);

                  return filteredUsers.length > 0 ? (
                    <>
                      {/* Select All */}
                      <Box sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Checkbox
                          checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                          indeterminate={selectedUsers.length > 0 && selectedUsers.length < paginatedUsers.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(prev => [...new Set([...prev, ...paginatedUsers.map(u => u.id)])]);
                            } else {
                              setSelectedUsers(prev => prev.filter(id => !paginatedUsers.map(u => u.id).includes(id)));
                            }
                          }}
                          size="small"
                        />
                        <Typography variant="body2" sx={{ fontSize: '12px', color: 'text.secondary', ml: 1 }}>
                          {selectedUsers.length > 0 ? `${selectedUsers.length} seçili` : 'Tümünü seç'}
                        </Typography>
                      </Box>
                      
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Seç</TableCell>
                              <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kullanıcı Adı</TableCell>
                              <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>E-posta</TableCell>
                              <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kredi</TableCell>
                              <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Rol</TableCell>
                              <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>İşlemler</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {paginatedUsers.map((u) => (
                              <TableRow 
                                key={u.id}
                                sx={{ 
                                  cursor: 'pointer',
                                  '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                                }}
                              >
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  <Checkbox
                                    checked={selectedUsers.includes(u.id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      setSelectedUsers(prev => 
                                        prev.includes(u.id) 
                                          ? prev.filter(id => id !== u.id)
                                          : [...prev, u.id]
                                      );
                                    }}
                                    size="small"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{u.username}</TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{u.email}</TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{u.credit}</TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  <Chip
                                    label={u.role}
                                    size="small"
                                    color={u.role === 'admin' ? 'error' : u.role === 'moderator' ? 'warning' : 'default'}
                                    sx={{ fontSize: '0.65rem', height: 20 }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  <Box sx={{ display: 'flex', gap: 0.75 }}>
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
                                      Kredi
                                    </Button>
                                    {u.username !== 'admin' && (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        startIcon={<Delete />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteUser(u.id, u.username);
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
                                        Sil
                                      </Button>
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                          <Pagination
                            count={totalPages}
                            page={userCurrentPage}
                            onChange={(e, page) => setUserCurrentPage(page)}
                            color="primary"
                            size="small"
                          />
                        </Box>
                      )}
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        {users.length === 0
                          ? 'Henüz kullanıcı bulunmuyor'
                          : 'Arama kriterlerinize uygun kullanıcı bulunamadı'}
                      </Typography>
                    </Box>
                  );
                })()}
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
                                      <TableCell>48 Saat</TableCell>
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
                                            label={
                                              refund.status === 'processed' 
                                                ? 'İade Edildi' 
                                                : refund.status === 'pending' 
                                                  ? 'Beklemede' 
                                                  : refund.status
                                            }
                                            color={refund.status === 'processed' ? 'success' : refund.status === 'pending' ? 'warning' : 'error'}
                                            size="small"
                                            sx={{ fontSize: '0.75rem', fontWeight: 500, height: 24 }}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          {refund.status === 'pending' && refund.remainingHours !== undefined ? (
                                            <Chip
                                              label={`${Math.floor(refund.remainingHours)} saat kaldı`}
                                              color={refund.isExpired ? 'success' : 'warning'}
                                              size="small"
                                              sx={{ fontSize: '0.75rem', fontWeight: 500, height: 24 }}
                                            />
                                          ) : refund.status === 'processed' ? (
                                            <Chip
                                              label="İade Edildi"
                                              color="success"
                                              size="small"
                                              sx={{ fontSize: '0.75rem', fontWeight: 500, height: 24 }}
                                            />
                                          ) : (
                                            <Typography variant="body2" sx={{ fontSize: '12px', color: 'text.secondary' }}>
                                              -
                                            </Typography>
                                          )}
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
                              <TableRow 
                                key={request.id}
                                onClick={() => {
                                  setSelectedPaymentRequestDetail(request);
                                  setPaymentRequestDetailDialogOpen(true);
                                }}
                                sx={{
                                  cursor: 'pointer',
                                  '&:hover': {
                                    backgroundColor: alpha('#1976d2', 0.05),
                                  },
                                }}
                              >
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
                                        onClick={(e) => {
                                          e.stopPropagation();
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
                                        onClick={(e) => {
                                          e.stopPropagation();
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

          {/* Payment Request Detail Dialog */}
          <Dialog open={paymentRequestDetailDialogOpen} onClose={() => setPaymentRequestDetailDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontSize: '16px', fontWeight: 600, pb: 1 }}>
              Ödeme Talebi Detayları
            </DialogTitle>
            <DialogContent sx={{ pt: 1.5 }}>
              {selectedPaymentRequestDetail && (
                <Box>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 0.5, color: 'text.secondary' }}>
                        Kullanıcı Bilgileri
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                          <strong>Kullanıcı Adı:</strong> {selectedPaymentRequestDetail.user?.username || '-'}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                          <strong>E-posta:</strong> {selectedPaymentRequestDetail.user?.email || '-'}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                          <strong>Kullanıcı ID:</strong> {selectedPaymentRequestDetail.user?.id || '-'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 0.5, color: 'text.secondary' }}>
                        Ödeme Bilgileri
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                          <strong>Tutar:</strong> {Number(selectedPaymentRequestDetail.amount)} {selectedPaymentRequestDetail.currency || 'TRY'}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                          <strong>Kredi:</strong> {selectedPaymentRequestDetail.credits} SMS
                          {selectedPaymentRequestDetail.bonus > 0 && ` + ${selectedPaymentRequestDetail.bonus} bonus`}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                          <strong>Ödeme Yöntemi:</strong> {selectedPaymentRequestDetail.paymentMethod || '-'}
                        </Typography>
                        {selectedPaymentRequestDetail.transactionId && (
                          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                            <strong>Transaction ID:</strong>
                            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.65rem', ml: 0.5 }}>
                              {selectedPaymentRequestDetail.transactionId}
                            </Typography>
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 0.5, color: 'text.secondary' }}>
                        Durum Bilgileri
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                          <strong>Durum:</strong>{' '}
                          <Chip
                            label={
                              selectedPaymentRequestDetail.status === 'approved' ? 'Onaylandı' :
                              selectedPaymentRequestDetail.status === 'rejected' ? 'Reddedildi' :
                              'Beklemede'
                            }
                            color={
                              selectedPaymentRequestDetail.status === 'approved' ? 'success' :
                              selectedPaymentRequestDetail.status === 'rejected' ? 'error' :
                              'warning'
                            }
                            size="small"
                            sx={{ fontSize: '0.65rem', height: 20, ml: 0.5 }}
                          />
                        </Typography>
                        {selectedPaymentRequestDetail.approver && (
                          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                            <strong>Onaylayan:</strong> {selectedPaymentRequestDetail.approver.username || '-'}
                          </Typography>
                        )}
                        {selectedPaymentRequestDetail.rejectionReason && (
                          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5, color: 'error.main' }}>
                            <strong>Red Sebebi:</strong> {selectedPaymentRequestDetail.rejectionReason}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 0.5, color: 'text.secondary' }}>
                        Tarih Bilgileri
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                          <strong>Oluşturulma:</strong> <ClientDate date={selectedPaymentRequestDetail.createdAt} />
                        </Typography>
                        {selectedPaymentRequestDetail.updatedAt && (
                          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                            <strong>Güncellenme:</strong> <ClientDate date={selectedPaymentRequestDetail.updatedAt} />
                          </Typography>
                        )}
                        {selectedPaymentRequestDetail.approvedAt && (
                          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                            <strong>Onaylanma:</strong> <ClientDate date={selectedPaymentRequestDetail.approvedAt} />
                          </Typography>
                        )}
                        {selectedPaymentRequestDetail.rejectedAt && (
                          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                            <strong>Reddedilme:</strong> <ClientDate date={selectedPaymentRequestDetail.rejectedAt} />
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    {(selectedPaymentRequestDetail.adminNotes || selectedPaymentRequestDetail.notes) && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 0.5, color: 'text.secondary' }}>
                          Notlar
                        </Typography>
                        <Paper sx={{ p: 1.5, backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f5f5f5', borderRadius: 1 }}>
                          <Typography variant="body2" sx={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                            {selectedPaymentRequestDetail.adminNotes || selectedPaymentRequestDetail.notes || '-'}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 1.5 }}>
              <Button size="small" onClick={() => setPaymentRequestDetailDialogOpen(false)} sx={{ fontSize: '12px' }}>
                Kapat
              </Button>
              {selectedPaymentRequestDetail?.status === 'pending' && (
                <>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => {
                      setPaymentRequestDetailDialogOpen(false);
                      setSelectedRequest(selectedPaymentRequestDetail);
                      setAdminNotes('');
                      setApproveDialogOpen(true);
                    }}
                    sx={{ fontSize: '12px' }}
                  >
                    Onayla
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={() => {
                      setPaymentRequestDetailDialogOpen(false);
                      setSelectedRequest(selectedPaymentRequestDetail);
                      setRejectionReason('');
                      setAdminNotes('');
                      setRejectDialogOpen(true);
                    }}
                    sx={{ fontSize: '12px' }}
                  >
                    Reddet
                  </Button>
                </>
              )}
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

          {/* Bulk Credit Dialog */}
          <Dialog open={bulkCreditDialogOpen} onClose={() => setBulkCreditDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: '16px', fontWeight: 600, pb: 1 }}>Toplu Kredi Yükle ({selectedUsers.length} kullanıcı)</DialogTitle>
            <DialogContent sx={{ pt: 1.5 }}>
              <Alert severity="info" sx={{ mb: 2, fontSize: '12px' }}>
                {selectedUsers.length} kullanıcıya aynı miktarda kredi yüklenecektir.
              </Alert>
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
              <Button size="small" onClick={() => setBulkCreditDialogOpen(false)} sx={{ fontSize: '12px' }}>İptal</Button>
              <Button size="small" onClick={handleBulkCreditSubmit} variant="contained" disabled={loading || creditAmount <= 0} sx={{ fontSize: '12px' }}>
                {loading ? 'Yükleniyor...' : 'Kredi Yükle'}
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

          {/* API Keys Tab */}
          {tabValue === 4 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600 }}>
                  API Kullanıcıları
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Assessment />}
                    onClick={async () => {
                      try {
                        setLoadingApiKeys(true);
                        setError('');
                        const response = await api.post('/admin/test-api');
                        if (response.data.success) {
                          const testData = response.data.data;
                          setSuccess(
                            `API testleri tamamlandı! ${testData.summary.success}/${testData.summary.total} test başarılı (${testData.summary.successRate}%)`
                          );
                          // Test sonuçlarını göster
                          console.log('Test Results:', testData.tests);
                          // API key listesini yenile
                          loadApiKeys();
                        } else {
                          setError(response.data.message || 'API testleri çalıştırılamadı');
                        }
                      } catch (err: any) {
                        setError(err.response?.data?.message || 'API testleri çalıştırılırken bir hata oluştu');
                      } finally {
                        setLoadingApiKeys(false);
                      }
                    }}
                    disabled={loadingApiKeys}
                    sx={{
                      borderRadius: 1.5,
                      padding: '6px 16px',
                      fontSize: '12px',
                      fontWeight: 500,
                      textTransform: 'none',
                    }}
                  >
                    API Testleri Çalıştır
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateApiKeyDialogOpen(true)}
                    sx={{
                      background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)',
                      borderRadius: 1.5,
                      padding: '6px 16px',
                      fontSize: '12px',
                      fontWeight: 500,
                      textTransform: 'none',
                    }}
                  >
                    Yeni API Key Oluştur
                  </Button>
                </Box>
              </Box>

              {loadingApiKeys ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : apiKeys.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Henüz API key oluşturulmamış
                  </Typography>
                </Paper>
              ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>API Key</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Kullanıcı</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>İsim</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600 }} align="center">Kredi</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600 }} align="center">Toplam SMS</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600 }} align="center">Toplam İade</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Durum</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Son Kullanım</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600 }} align="center">İşlemler</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {apiKeys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell sx={{ fontSize: '12px', fontFamily: 'monospace' }}>
                            {key.apiKey}
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>
                            {key.user ? (
                              <Box>
                                <Typography variant="body2" sx={{ fontSize: '12px', fontWeight: 500 }}>
                                  {key.user.username}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                  {key.user.email}
                                </Typography>
                              </Box>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>{key.name || '-'}</TableCell>
                          <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 600 }}>
                            {key.user?.credit || 0}
                          </TableCell>
                          <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 600, color: '#2196f3' }}>
                            {key.stats?.totalSms || 0}
                          </TableCell>
                          <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 600, color: '#ff9800' }}>
                            {key.stats?.totalRefunds || 0}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={key.isActive ? 'Aktif' : 'Pasif'}
                              color={key.isActive ? 'success' : 'default'}
                              size="small"
                              sx={{ fontSize: '0.65rem', height: 20 }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '11px' }}>
                            {key.lastUsedAt ? <ClientDate date={key.lastUsedAt} /> : '-'}
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                              onClick={() => {
                                setSelectedApiKeyDetail(key);
                                setApiKeyDetailDialogOpen(true);
                              }}
                              sx={{
                                fontSize: '11px',
                                textTransform: 'none',
                                borderRadius: 1.5,
                                mr: 0.5,
                              }}
                            >
                              Detay
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<Delete />}
                              onClick={async () => {
                                if (confirm(`Bu API key'i silmek istediğinizden emin misiniz?`)) {
                                  try {
                                    setLoadingApiKeys(true);
                                    const response = await api.delete(`/admin/api-keys/${key.id}`);
                                    if (response.data.success) {
                                      setSuccess('API key başarıyla silindi');
                                      loadApiKeys();
                                    } else {
                                      setError(response.data.message || 'API key silinemedi');
                                    }
                                  } catch (err: any) {
                                    setError(err.response?.data?.message || 'API key silinirken bir hata oluştu');
                                  } finally {
                                    setLoadingApiKeys(false);
                                  }
                                }
                              }}
                              sx={{
                                fontSize: '11px',
                                textTransform: 'none',
                                borderRadius: 1.5,
                              }}
                            >
                              Sil
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Create API Key Dialog */}
          <Dialog open={createApiKeyDialogOpen} onClose={() => setCreateApiKeyDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: '16px', fontWeight: 600, pb: 1 }}>Yeni API Key Oluştur</DialogTitle>
            <DialogContent sx={{ pt: 1.5 }}>
              <FormControl fullWidth size="small" margin="dense">
                <InputLabel sx={{ fontSize: '12px' }}>Kullanıcı *</InputLabel>
                <Select
                  value={newApiKey.userId}
                  onChange={(e) => setNewApiKey({ ...newApiKey, userId: e.target.value })}
                  label="Kullanıcı *"
                  sx={{ fontSize: '12px' }}
                >
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id} sx={{ fontSize: '12px' }}>
                      {u.username} ({u.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                size="small"
                label="İsim"
                value={newApiKey.name}
                onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
                margin="dense"
                placeholder="Örn: Müşteri API Key"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '12px',
                  },
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="Açıklama"
                value={newApiKey.description}
                onChange={(e) => setNewApiKey({ ...newApiKey, description: e.target.value })}
                margin="dense"
                multiline
                rows={2}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '12px',
                  },
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="Başlangıç Kredisi"
                type="number"
                value={newApiKey.credit}
                onChange={(e) => setNewApiKey({ ...newApiKey, credit: parseInt(e.target.value) || 0 })}
                margin="dense"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '12px',
                  },
                }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 1.5 }}>
              <Button size="small" onClick={() => setCreateApiKeyDialogOpen(false)} sx={{ fontSize: '12px' }}>İptal</Button>
              <Button
                size="small"
                onClick={async () => {
                  if (!newApiKey.userId) {
                    setError('Kullanıcı seçilmelidir');
                    return;
                  }
                  try {
                    setLoadingApiKeys(true);
                    setError('');
                    const response = await api.post('/admin/api-keys', newApiKey);
                    if (response.data.success) {
                      setSuccess('API key başarıyla oluşturuldu! API Key ve Secret bilgilerini kopyalayın.');
                      setSelectedApiKeyDetail({
                        apiKey: response.data.data.apiKey,
                        apiSecret: response.data.data.apiSecret,
                        name: response.data.data.name,
                        username: response.data.data.username,
                      });
                      setApiKeyDetailDialogOpen(true);
                      setCreateApiKeyDialogOpen(false);
                      setNewApiKey({ userId: '', name: '', description: '', credit: 0 });
                      loadApiKeys();
                    } else {
                      setError(response.data.message || 'API key oluşturulamadı');
                    }
                  } catch (err: any) {
                    setError(err.response?.data?.message || 'API key oluşturulurken bir hata oluştu');
                  } finally {
                    setLoadingApiKeys(false);
                  }
                }}
                variant="contained"
                disabled={loadingApiKeys || !newApiKey.userId}
                sx={{ fontSize: '12px' }}
              >
                {loadingApiKeys ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* API Key Detail Dialog */}
          <Dialog open={apiKeyDetailDialogOpen} onClose={() => setApiKeyDetailDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: '16px', fontWeight: 600, pb: 1 }}>
              {selectedApiKeyDetail?.name ? `${selectedApiKeyDetail.name} - API Bilgileri` : 'API Key Bilgileri'}
            </DialogTitle>
            <DialogContent sx={{ pt: 1.5 }}>
              {selectedApiKeyDetail?.apiKey && selectedApiKeyDetail?.apiSecret ? (
                <Box>
                  <Alert severity="warning" sx={{ mb: 2, fontSize: '12px' }}>
                    Bu bilgileri güvenli bir yerde saklayın. API Secret bir daha gösterilmeyecektir!
                  </Alert>
                  <TextField
                    fullWidth
                    size="small"
                    label="API Key (User)"
                    value={selectedApiKeyDetail.apiKey}
                    margin="dense"
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedApiKeyDetail.apiKey);
                              setSuccess('API Key kopyalandı!');
                            }}
                          >
                            <ContentCopy sx={{ fontSize: 16 }} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="API Secret (Pass)"
                    value={selectedApiKeyDetail.apiSecret}
                    margin="dense"
                    type="password"
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedApiKeyDetail.apiSecret);
                              setSuccess('API Secret kopyalandı!');
                            }}
                          >
                            <ContentCopy sx={{ fontSize: 16 }} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      },
                    }}
                  />
                  {selectedApiKeyDetail.username && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px', mt: 1, display: 'block' }}>
                      Kullanıcı: {selectedApiKeyDetail.username}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '12px', mb: 1 }}>
                    <strong>API Key:</strong> {selectedApiKeyDetail?.apiKey || '-'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '12px', mb: 1 }}>
                    <strong>Kullanıcı:</strong> {selectedApiKeyDetail?.user?.username || '-'} ({selectedApiKeyDetail?.user?.email || '-'})
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '12px', mb: 1 }}>
                    <strong>Kredi:</strong> {selectedApiKeyDetail?.user?.credit || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '12px', mb: 1 }}>
                    <strong>Toplam SMS:</strong> {selectedApiKeyDetail?.stats?.totalSms || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '12px', mb: 1 }}>
                    <strong>Toplam İade:</strong> {selectedApiKeyDetail?.stats?.totalRefunds || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '12px', mb: 1 }}>
                    <strong>Durum:</strong> {selectedApiKeyDetail?.isActive ? 'Aktif' : 'Pasif'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '12px' }}>
                    <strong>Son Kullanım:</strong> {selectedApiKeyDetail?.lastUsedAt ? <ClientDate date={selectedApiKeyDetail.lastUsedAt} /> : '-'}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 1.5 }}>
              <Button size="small" onClick={() => setApiKeyDetailDialogOpen(false)} sx={{ fontSize: '12px' }}>
                Kapat
              </Button>
            </DialogActions>
          </Dialog>

          {/* System Credit Tab */}
          {tabValue === 5 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600 }}>
                  Sistem Kredisi Yönetimi
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    setSystemCreditDialogOpen(true);
                    setSystemCreditAction('add');
                    setSystemCreditAmount(0);
                  }}
                  sx={{
                    borderRadius: 1.5,
                    padding: '6px 16px',
                    fontSize: '12px',
                    fontWeight: 500,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                    '&:hover': {
                      boxShadow: '0 4px 16px rgba(25, 118, 210, 0.4)',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.3s',
                  }}
                >
                  Kredi Ekle/Güncelle
                </Button>
              </Box>

              {loadingSystemCredit ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Card
                  sx={{
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    p: 3,
                    background: mode === 'dark'
                      ? 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)'
                      : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  }}
                >
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography
                      variant="h3"
                      sx={{
                        fontSize: '48px',
                        fontWeight: 700,
                        color: 'primary.main',
                        mb: 1,
                      }}
                    >
                      {systemCredit.toLocaleString()}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontSize: '14px',
                        color: 'text.secondary',
                        mb: 2,
                      }}
                    >
                      Sistem Kredisi (SMS)
                    </Typography>
                    <Chip
                      label="Tüm kullanıcılar bu krediden SMS gönderir"
                      color="info"
                      size="small"
                      sx={{
                        fontSize: '11px',
                        fontWeight: 500,
                      }}
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontSize: '13px', fontWeight: 600, mb: 1 }}>
                      Sistem Kredisi Hakkında
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '12px', color: 'text.secondary', mb: 1 }}>
                      • Tüm kullanıcılar sistem kredisinden SMS gönderir
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '12px', color: 'text.secondary', mb: 1 }}>
                      • Her SMS = 1 kredi (mesaj uzunluğu önemli değil)
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '12px', color: 'text.secondary', mb: 1 }}>
                      • Başarısız SMS'ler 48 saat sonra otomatik olarak sisteme iade edilir
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '12px', color: 'text.secondary' }}>
                      • Sistem kredisi tükendiğinde hiçbir kullanıcı SMS gönderemez
                    </Typography>
                  </Box>
                </Card>
              )}
            </Box>
          )}

          {/* System Credit Update Dialog */}
          <Dialog open={systemCreditDialogOpen} onClose={() => setSystemCreditDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: '16px', fontWeight: 600 }}>
              Sistem Kredisi {systemCreditAction === 'set' ? 'Güncelle' : 'Ekle'}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 1 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>İşlem Tipi</InputLabel>
                  <Select
                    value={systemCreditAction}
                    label="İşlem Tipi"
                    onChange={(e) => setSystemCreditAction(e.target.value as 'set' | 'add')}
                  >
                    <MenuItem value="add">Kredi Ekle</MenuItem>
                    <MenuItem value="set">Kredi Belirle</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label={systemCreditAction === 'set' ? 'Yeni Sistem Kredisi' : 'Eklenecek Kredi'}
                  type="number"
                  value={systemCreditAmount}
                  onChange={(e) => setSystemCreditAmount(parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0 }}
                  helperText={
                    systemCreditAction === 'set'
                      ? `Mevcut kredi: ${systemCredit.toLocaleString()} → Yeni kredi: ${systemCreditAmount.toLocaleString()}`
                      : `Mevcut kredi: ${systemCredit.toLocaleString()} → Yeni kredi: ${(systemCredit + systemCreditAmount).toLocaleString()}`
                  }
                />
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 1.5 }}>
              <Button size="small" onClick={() => setSystemCreditDialogOpen(false)} sx={{ fontSize: '12px' }}>
                İptal
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleUpdateSystemCredit}
                disabled={loading || systemCreditAmount <= 0}
                sx={{
                  fontSize: '12px',
                  background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                }}
              >
                {loading ? <CircularProgress size={16} /> : systemCreditAction === 'set' ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}

