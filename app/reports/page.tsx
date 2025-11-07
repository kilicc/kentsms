'use client';

import { Box, Container, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, TextField, Button, Alert, CircularProgress, Select, MenuItem, FormControl, InputLabel, Tabs, Tab, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Assessment, FilterList, BarChart, People, Payment, MoneyOff, Send, AccountBalanceWallet } from '@mui/icons-material';
import { gradients } from '@/lib/theme';
import ClientDate from '@/components/ClientDate';

interface SmsMessage {
  id: string;
  phoneNumber: string;
  message: string;
  status: string;
  cost: number;
  sentAt: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  contact?: {
    name: string;
    phone: string;
  };
}

export default function SMSReportsPage() {
  const { api, user } = useAuth();
  const { mode } = useTheme();
  type ReportsTab = 'sms' | 'bulk' | 'stats' | 'payments';
  const [tabValue, setTabValue] = useState<ReportsTab>('sms');
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; username: string; email: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  // SMS Reports filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    userId: '',
    phoneNumber: '',
    messageSearch: '',
  });
  
  // Bulk SMS Reports filters
  const [bulkFilters, setBulkFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    userId: '',
    messageSearch: '',
  });
  
  // Statistics filters
  const [statsFilters, setStatsFilters] = useState({
    startDate: '',
    endDate: '',
  });
  
  // Payment Reports filters
  const [paymentFilters, setPaymentFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    userId: '',
    paymentMethod: '',
    minAmount: '',
    maxAmount: '',
    transactionId: '',
  });
  
  // Statistics states
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(false);
  const [paymentRequestsError, setPaymentRequestsError] = useState('');
  
  // Bulk SMS Reports states
  const [bulkSmsReports, setBulkSmsReports] = useState<any[]>([]);
  const [loadingBulkReports, setLoadingBulkReports] = useState(false);
  const [selectedBulkReport, setSelectedBulkReport] = useState<any | null>(null);
  const [bulkReportDetails, setBulkReportDetails] = useState<any[]>([]);
  const [loadingBulkDetails, setLoadingBulkDetails] = useState(false);
  const [bulkDetailDialogOpen, setBulkDetailDialogOpen] = useState(false);

  const userRole = typeof user?.role === 'string' ? user.role.toLowerCase() : '';
  const isAdmin = userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator';

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    // URL'den today parametresini oku ve bugünkü tarihi filtrele
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const today = params.get('today');
      if (today === 'true' && tabValue === 'sms') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        setFilters((prev) => ({
          ...prev,
          startDate: todayStr,
          endDate: todayStr,
        }));
      }
    }
  }, []);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get('/admin/users');
      if (response.data.success) {
        setUsers(response.data.data.users || []);
      }
    } catch (error) {
      console.error('Users load error:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.status = filters.status;
      if (isAdmin && filters.userId) params.userId = filters.userId;
      if (filters.phoneNumber) params.phoneNumber = filters.phoneNumber;
      if (filters.messageSearch) params.messageSearch = filters.messageSearch;

      // Admin ise admin endpoint, değilse kullanıcı endpoint
      const endpoint = isAdmin ? '/admin/sms-history' : '/bulk-sms/history';
      const response = await api.get(endpoint, { params });
      if (response.data.success) {
        let messages = response.data.data.messages || [];
        
        // Client-side filtering for phone and message if API doesn't support it
        if (filters.phoneNumber && !params.phoneNumber) {
          messages = messages.filter((msg: SmsMessage) => 
            msg.phoneNumber.includes(filters.phoneNumber)
          );
        }
        if (filters.messageSearch && !params.messageSearch) {
          messages = messages.filter((msg: SmsMessage) => 
            msg.message.toLowerCase().includes(filters.messageSearch.toLowerCase())
          );
        }
        
        setMessages(messages);
      } else {
        setError(response.data.message || 'Veri yüklenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('History load error:', error);
      setError(error.response?.data?.message || 'SMS geçmişi yüklenirken bir hata oluştu');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBulkReports = async () => {
    try {
      setLoadingBulkReports(true);
      const params: any = { limit: 100 };
      if (bulkFilters.startDate) params.startDate = bulkFilters.startDate;
      if (bulkFilters.endDate) params.endDate = bulkFilters.endDate;
      if (bulkFilters.status) params.status = bulkFilters.status;
      if (isAdmin && bulkFilters.userId) params.userId = bulkFilters.userId;
      if (bulkFilters.messageSearch) params.messageSearch = bulkFilters.messageSearch;

      const endpoint = isAdmin ? '/admin/sms-history' : '/bulk-sms/history';
      const response = await api.get(endpoint, { params });
      
      if (response.data.success) {
        let messages = response.data.data.messages || [];
        
        // Client-side filtering
        if (bulkFilters.messageSearch && !params.messageSearch) {
          messages = messages.filter((msg: any) => 
            (msg.message || '').toLowerCase().includes(bulkFilters.messageSearch.toLowerCase())
          );
        }
        if (bulkFilters.userId && !params.userId && isAdmin) {
          messages = messages.filter((msg: any) => 
            msg.user?.id === bulkFilters.userId
          );
        }
        if (bulkFilters.startDate) {
          messages = messages.filter((msg: any) => 
            new Date(msg.sentAt) >= new Date(bulkFilters.startDate)
          );
        }
        if (bulkFilters.endDate) {
          const endDate = new Date(bulkFilters.endDate);
          endDate.setHours(23, 59, 59, 999);
          messages = messages.filter((msg: any) => 
            new Date(msg.sentAt) <= endDate
          );
        }
        
        // Mesajları grupla (aynı mesaj içeriğine sahip olanları)
        const groupedMessages = new Map<string, {
          message: string;
          recipients: number;
          successCount: number;
          failedCount: number;
          sentAt: string;
          status: string;
          messageIds: string[];
        }>();

        messages.forEach((msg: any) => {
          const messageText = msg.message || '';
          const messageKey = messageText.substring(0, 50);
          
          if (!groupedMessages.has(messageKey)) {
            groupedMessages.set(messageKey, {
              message: messageText,
              recipients: 0,
              successCount: 0,
              failedCount: 0,
              sentAt: msg.sentAt,
              status: 'sent',
              messageIds: [] as string[],
            });
          }

          const group = groupedMessages.get(messageKey)!;
          group.recipients++;
          if (!group.messageIds) {
            group.messageIds = [];
          }
          group.messageIds.push(msg.id);
          if (msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'iletildi' || msg.status === 'gönderildi') {
            group.successCount++;
          } else if (msg.status === 'failed' || msg.status === 'iletilmedi' || msg.status === 'zaman_aşımı') {
            group.failedCount++;
          }
          if (new Date(msg.sentAt) > new Date(group.sentAt)) {
            group.sentAt = msg.sentAt;
          }
          if (group.failedCount > 0 && group.successCount > 0) {
            group.status = 'partial';
          } else if (group.failedCount > 0) {
            group.status = 'failed';
          } else {
            group.status = 'sent';
          }
        });

        let reports = Array.from(groupedMessages.values())
          .map((group) => ({
            message: group.message.length > 50 ? group.message.substring(0, 50) + '...' : group.message,
            fullMessage: group.message,
            recipients: group.recipients,
            status: group.status,
            sentAt: group.sentAt,
            successCount: group.successCount,
            failedCount: group.failedCount,
            messageIds: group.messageIds || [],
          }))
          .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

        // Status filter
        if (bulkFilters.status) {
          reports = reports.filter((report) => report.status === bulkFilters.status);
        }

        setBulkSmsReports(reports);
      }
    } catch (error) {
      console.error('Bulk reports load error:', error);
    } finally {
      setLoadingBulkReports(false);
    }
  };

  const handleViewBulkReportDetails = async (report: any) => {
    setSelectedBulkReport(report);
    setBulkDetailDialogOpen(true);
    setLoadingBulkDetails(true);
    
    try {
      // Mesaj içeriğine göre filtrele
      const params: any = {};
      if (bulkFilters.startDate) params.startDate = bulkFilters.startDate;
      if (bulkFilters.endDate) params.endDate = bulkFilters.endDate;
      if (bulkFilters.userId) params.userId = bulkFilters.userId;
      
      const endpoint = isAdmin ? '/admin/sms-history' : '/bulk-sms/history';
      const response = await api.get(endpoint, { params });
      if (response.data.success) {
        const filtered = (response.data.data.messages || []).filter((msg: any) => {
          const msgText = msg.message || '';
          const reportText = report.fullMessage || report.message || '';
          return msgText === reportText;
        }).map((msg: any) => ({
          ...msg,
          phoneNumber: msg.phoneNumber || msg.phone_number,
          sentAt: msg.sentAt || msg.sent_at,
          network: msg.network || null,
        }));
        setBulkReportDetails(filtered);
      }
    } catch (error: any) {
      console.error('Bulk report details load error:', error);
      // Hata durumunda boş liste göster
      setBulkReportDetails([]);
    } finally {
      setLoadingBulkDetails(false);
    }
  };

  const loadStats = async () => {
    if (!isAdmin) return;
    
    try {
      setLoadingStats(true);
      setStatsError('');
      const params: any = {};
      if (statsFilters.startDate) params.startDate = statsFilters.startDate;
      if (statsFilters.endDate) params.endDate = statsFilters.endDate;
      
      const response = await api.get('/admin/stats', { params });
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setStatsError(response.data.message || 'İstatistikler yüklenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('Stats load error:', error);
      setStatsError(error.response?.data?.message || 'İstatistikler yüklenirken bir hata oluştu');
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadPaymentRequests = async () => {
    if (!isAdmin) return;
    
    try {
      setLoadingPaymentRequests(true);
      setPaymentRequestsError('');
      const params: any = {};
      if (paymentFilters.startDate) params.startDate = paymentFilters.startDate;
      if (paymentFilters.endDate) params.endDate = paymentFilters.endDate;
      if (paymentFilters.status) params.status = paymentFilters.status;
      if (paymentFilters.userId) params.userId = paymentFilters.userId;
      if (paymentFilters.paymentMethod) params.paymentMethod = paymentFilters.paymentMethod;
      if (paymentFilters.minAmount) params.minAmount = paymentFilters.minAmount;
      if (paymentFilters.maxAmount) params.maxAmount = paymentFilters.maxAmount;
      if (paymentFilters.transactionId) params.transactionId = paymentFilters.transactionId;
      
      const response = await api.get('/admin/payment-requests', { params });
      if (response.data.success) {
        let requests = response.data.data.requests || [];
        
        // Client-side filtering if API doesn't support all filters
        if (paymentFilters.transactionId && !params.transactionId) {
          requests = requests.filter((req: any) => 
            req.transactionId?.toLowerCase().includes(paymentFilters.transactionId.toLowerCase())
          );
        }
        if (paymentFilters.minAmount && !params.minAmount) {
          requests = requests.filter((req: any) => 
            Number(req.amount) >= Number(paymentFilters.minAmount)
          );
        }
        if (paymentFilters.maxAmount && !params.maxAmount) {
          requests = requests.filter((req: any) => 
            Number(req.amount) <= Number(paymentFilters.maxAmount)
          );
        }
        if (paymentFilters.paymentMethod && !params.paymentMethod) {
          requests = requests.filter((req: any) => 
            req.paymentMethod?.toLowerCase().includes(paymentFilters.paymentMethod.toLowerCase())
          );
        }
        if (paymentFilters.userId && !params.userId) {
          requests = requests.filter((req: any) => 
            req.user?.id === paymentFilters.userId
          );
        }
        if (paymentFilters.startDate) {
          requests = requests.filter((req: any) => 
            new Date(req.createdAt) >= new Date(paymentFilters.startDate)
          );
        }
        if (paymentFilters.endDate) {
          const endDate = new Date(paymentFilters.endDate);
          endDate.setHours(23, 59, 59, 999);
          requests = requests.filter((req: any) => 
            new Date(req.createdAt) <= endDate
          );
        }
        if (paymentFilters.status && !params.status) {
          requests = requests.filter((req: any) => 
            req.status === paymentFilters.status
          );
        }
        
        setPaymentRequests(requests);
      } else {
        setPaymentRequestsError(response.data.message || 'Ödeme raporları yüklenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('Payment requests load error:', error);
      setPaymentRequestsError(error.response?.data?.message || 'Ödeme raporları yüklenirken bir hata oluştu');
      setPaymentRequests([]);
    } finally {
      setLoadingPaymentRequests(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'success';
      case 'delivered':
        return 'info';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  // Main tab change effect - loads data when tab changes
  useEffect(() => {
    if (tabValue === 'sms') {
      loadHistory();
    } else if (tabValue === 'bulk') {
      loadBulkReports();
    } else if (tabValue === 'stats' && isAdmin) {
      loadStats();
    } else if (tabValue === 'payments' && isAdmin) {
      loadPaymentRequests();
    }
  }, [tabValue, isAdmin]);

  // Filter change effects
  useEffect(() => {
    if (tabValue === 'sms') {
      loadHistory();
    }
  }, [filters.userId, filters.startDate, filters.endDate, filters.status, filters.phoneNumber, filters.messageSearch, tabValue]);

  useEffect(() => {
    if (tabValue === 'bulk') {
      loadBulkReports();
    }
  }, [bulkFilters.startDate, bulkFilters.endDate, bulkFilters.status, bulkFilters.userId, bulkFilters.messageSearch, tabValue]);

  useEffect(() => {
    if (tabValue === 'stats' && isAdmin) {
      loadStats();
    }
  }, [statsFilters.startDate, statsFilters.endDate, tabValue, isAdmin]);

  useEffect(() => {
    if (tabValue === 'payments' && isAdmin) {
      loadPaymentRequests();
    }
  }, [paymentFilters.startDate, paymentFilters.endDate, paymentFilters.status, paymentFilters.userId, paymentFilters.paymentMethod, paymentFilters.minAmount, paymentFilters.maxAmount, paymentFilters.transactionId, tabValue, isAdmin]);

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
              Raporlar
            </Typography>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2,
                fontSize: '14px',
              }}
            >
              Sistem raporlarını ve istatistiklerini görüntüleyin.
            </Typography>

            {/* Tabs */}
            <Tabs 
              value={tabValue} 
              onChange={(e, newValue) => setTabValue(newValue as ReportsTab)}
              sx={{ mb: 2 }}
            >
              <Tab label="SMS Raporları" icon={<Assessment />} value="sms" />
              <Tab label="Toplu SMS" icon={<Send />} value="bulk" />
              {isAdmin && (
                <>
                  <Tab label="İstatistikler" icon={<BarChart />} value="stats" />
                  <Tab label="Ödeme Raporları" icon={<Payment />} value="payments" />
                </>
              )}
            </Tabs>

            {/* SMS Reports Tab */}
            {tabValue === 'sms' && (
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2,
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  SMS Raporları
                </Typography>

            {/* Filters */}
            <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontSize: '13px', fontWeight: 600, color: 'text.secondary' }}>
                Filtreleme Seçenekleri
              </Typography>
              <Grid container spacing={1.5} alignItems="center">
                {isAdmin && (
                  <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ fontSize: '12px' }}>Kullanıcı</InputLabel>
                      <Select
                        value={filters.userId}
                        onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                        label="Kullanıcı"
                        title="Kullanıcı filtresi"
                        sx={{
                          fontSize: '12px',
                          borderRadius: 1.5,
                        }}
                      >
                        <MenuItem value="" sx={{ fontSize: '12px' }}>Tüm Kullanıcılar</MenuItem>
                        {users.map((u) => (
                          <MenuItem key={u.id} value={u.id} sx={{ fontSize: '12px' }}>
                            {u.username} ({u.email})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 2.4 : 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Başlangıç Tarihi"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        fontSize: '12px',
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 2.4 : 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Bitiş Tarihi"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        fontSize: '12px',
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 2.4 : 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Durum"
                    select
                    SelectProps={{ native: true }}
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        fontSize: '12px',
                      },
                    }}
                    inputProps={{
                      'aria-label': 'SMS durumu filtresi',
                      title: 'SMS durumu filtresi',
                    }}
                  >
                    <option value="">Tümü</option>
                    <option value="sent">Gönderildi</option>
                    <option value="delivered">İletildi</option>
                    <option value="failed">Başarısız</option>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 2.4 : 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Telefon Numarası"
                    value={filters.phoneNumber}
                    onChange={(e) => setFilters({ ...filters, phoneNumber: e.target.value })}
                    placeholder="Ara..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        fontSize: '12px',
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 2.4 : 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Mesaj İçeriği"
                    value={filters.messageSearch}
                    onChange={(e) => setFilters({ ...filters, messageSearch: e.target.value })}
                    placeholder="Ara..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        fontSize: '12px',
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 2.4 : 3 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<FilterList />}
                    onClick={loadHistory}
                    disabled={loading}
                    sx={{
                      background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                      boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
                      borderRadius: 2,
                      padding: '6px 16px',
                      fontSize: '12px',
                      fontWeight: 500,
                      textTransform: 'none',
                      '&:hover': {
                        boxShadow: '0 6px 16px rgba(25, 118, 210, 0.35)',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.3s',
                    }}
                  >
                    Filtrele
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* Error Message */}
            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {/* Messages Table */}
            <Paper sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 1.5 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : messages.length === 0 ? (
                <Box sx={{ p: 1.5, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                    {filters.startDate || filters.endDate || filters.status || filters.userId
                      ? 'Filtre kriterlerine uygun SMS bulunamadı'
                      : 'Henüz SMS gönderilmemiş'}
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {isAdmin && (
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kullanıcı</TableCell>
                        )}
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kişi</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Telefon</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Mesaj</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Durum</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Maliyet</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tarih</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {messages.map((message) => (
                        <TableRow key={message.id}>
                          {isAdmin && (
                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                              {message.user?.username || '-'}
                              <br />
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                {message.user?.email || '-'}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{message.contact?.name || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{message.phoneNumber}</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{message.message.substring(0, 50)}...</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                            <Chip
                              label={message.status}
                              color={getStatusColor(message.status)}
                              size="small"
                              sx={{
                                fontSize: '0.65rem',
                                fontWeight: 500,
                                height: 20,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{Number(message.cost)} kredi</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                            <ClientDate date={message.sentAt} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
              </Box>
            )}

            {/* Bulk SMS Tab */}
            {tabValue === 'bulk' && (
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2,
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  Toplu SMS Raporları
                </Typography>

                {/* Bulk SMS Filters */}
                {isAdmin && (
                  <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontSize: '13px', fontWeight: 600, color: 'text.secondary' }}>
                      Filtreleme Seçenekleri
                    </Typography>
                    <Grid container spacing={1.5} alignItems="center">
                      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel sx={{ fontSize: '12px' }}>Kullanıcı</InputLabel>
                          <Select
                            value={bulkFilters.userId}
                            onChange={(e) => setBulkFilters({ ...bulkFilters, userId: e.target.value })}
                            label="Kullanıcı"
                            title="Toplu SMS kullanıcı filtresi"
                            sx={{
                              fontSize: '12px',
                              borderRadius: 1.5,
                            }}
                          >
                            <MenuItem value="" sx={{ fontSize: '12px' }}>Tüm Kullanıcılar</MenuItem>
                            {users.map((u) => (
                              <MenuItem key={u.id} value={u.id} sx={{ fontSize: '12px' }}>
                                {u.username} ({u.email})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Başlangıç Tarihi"
                          type="date"
                          value={bulkFilters.startDate}
                          onChange={(e) => setBulkFilters({ ...bulkFilters, startDate: e.target.value })}
                          InputLabelProps={{ shrink: true }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1.5,
                              fontSize: '12px',
                            },
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Bitiş Tarihi"
                          type="date"
                          value={bulkFilters.endDate}
                          onChange={(e) => setBulkFilters({ ...bulkFilters, endDate: e.target.value })}
                          InputLabelProps={{ shrink: true }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1.5,
                              fontSize: '12px',
                            },
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Durum"
                          select
                          SelectProps={{ native: true }}
                          value={bulkFilters.status}
                          onChange={(e) => setBulkFilters({ ...bulkFilters, status: e.target.value })}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1.5,
                              fontSize: '12px',
                            },
                          }}
                          inputProps={{
                            'aria-label': 'Toplu SMS durumu filtresi',
                            title: 'Toplu SMS durumu filtresi',
                          }}
                        >
                          <option value="">Tümü</option>
                          <option value="sent">Başarılı</option>
                          <option value="failed">Başarısız</option>
                          <option value="partial">Kısmen Başarılı</option>
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Mesaj İçeriği"
                          value={bulkFilters.messageSearch}
                          onChange={(e) => setBulkFilters({ ...bulkFilters, messageSearch: e.target.value })}
                          placeholder="Ara..."
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1.5,
                              fontSize: '12px',
                            },
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                )}

                {loadingBulkReports ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : bulkSmsReports.length === 0 ? (
                  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Henüz toplu SMS raporu bulunmuyor
                    </Typography>
                  </Paper>
                ) : (
                  <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Mesaj Şablonu</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Alıcılar</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Başarılı</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Başarısız</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Durum</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tarih</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {bulkSmsReports.map((report, index) => {
                          const getStatusColor = (status: string) => {
                            switch (status) {
                              case 'sent':
                                return 'success';
                              case 'failed':
                                return 'error';
                              case 'partial':
                                return 'warning';
                              default:
                                return 'default';
                            }
                          };

                          const getStatusLabel = (status: string) => {
                            switch (status) {
                              case 'sent':
                                return 'Başarılı';
                              case 'failed':
                                return 'Başarısız';
                              case 'partial':
                                return 'Kısmen Başarılı';
                              default:
                                return status;
                            }
                          };

                          return (
                            <TableRow 
                              key={index}
                              onClick={() => handleViewBulkReportDetails(report)}
                              sx={{
                                cursor: 'pointer',
                                '&:hover': {
                                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                                },
                              }}
                            >
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                <Typography variant="body2" sx={{ fontSize: '12px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {report.fullMessage || report.message}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                {report.recipients} kişi
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75, color: '#4caf50', fontWeight: 600 }}>
                                {report.successCount}
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75, color: '#f44336', fontWeight: 600 }}>
                                {report.failedCount}
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                <Chip
                                  label={getStatusLabel(report.status)}
                                  color={getStatusColor(report.status)}
                                  size="small"
                                  sx={{
                                    fontSize: '0.65rem',
                                    fontWeight: 500,
                                    height: 20,
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                <ClientDate date={report.sentAt} />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* Bulk SMS Details Dialog */}
            <Dialog
              open={bulkDetailDialogOpen}
              onClose={() => setBulkDetailDialogOpen(false)}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: 2,
                  backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
                },
              }}
            >
              <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600 }}>
                  Toplu SMS Detayları
                </Typography>
                <IconButton
                  onClick={() => setBulkDetailDialogOpen(false)}
                  size="small"
                  sx={{ color: 'text.secondary' }}
                >
                  <Close />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers>
                {selectedBulkReport && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontSize: '13px', fontWeight: 600, color: 'text.secondary' }}>
                      Mesaj İçeriği
                    </Typography>
                    <Paper sx={{ p: 1.5, mb: 2, borderRadius: 1.5, backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
                      <Typography variant="body2" sx={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                        {selectedBulkReport.fullMessage || selectedBulkReport.message}
                      </Typography>
                    </Paper>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          Toplam Alıcı
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 600 }}>
                          {selectedBulkReport.recipients} kişi
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          Başarılı
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 600, color: '#4caf50' }}>
                          {selectedBulkReport.successCount}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          Başarısız
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 600, color: '#f44336' }}>
                          {selectedBulkReport.failedCount}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          Tarih
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 600 }}>
                          <ClientDate date={selectedBulkReport.sentAt} />
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}
                
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontSize: '13px', fontWeight: 600, color: 'text.secondary' }}>
                  Alıcı Detayları
                </Typography>
                
                {loadingBulkDetails ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : bulkReportDetails.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    Detay bulunamadı
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Telefon</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Durum</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Operatör</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tarih</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {bulkReportDetails.map((detail: any) => (
                          <TableRow key={detail.id}>
                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                              {detail.phoneNumber || detail.phone_number}
                            </TableCell>
                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                              <Chip
                                label={detail.status === 'iletildi' ? 'İletildi' : 
                                       detail.status === 'iletilmedi' ? 'İletilmedi' : 
                                       detail.status === 'zaman_aşımı' ? 'Zaman Aşımı' : 
                                       detail.status === 'rapor_bekliyor' ? 'Rapor Bekliyor' : 
                                       detail.status === 'gönderildi' ? 'Gönderildi' : 
                                       detail.status || '-'}
                                color={
                                  detail.status === 'iletildi' ? 'success' : 
                                  detail.status === 'iletilmedi' || detail.status === 'zaman_aşımı' ? 'error' : 
                                  detail.status === 'rapor_bekliyor' ? 'warning' : 
                                  'default'
                                }
                                size="small"
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: 500,
                                  height: 20,
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                              {detail.network || '-'}
                            </TableCell>
                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                              <ClientDate date={detail.sentAt || detail.sent_at} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </DialogContent>
              <DialogActions sx={{ p: 1.5 }}>
                <Button
                  onClick={() => setBulkDetailDialogOpen(false)}
                  variant="outlined"
                  size="small"
                  sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '12px' }}
                >
                  Kapat
                </Button>
              </DialogActions>
            </Dialog>

            {/* Statistics Tab - Admin Only */}
            {tabValue === 'stats' && isAdmin && (
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2,
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  Sistem İstatistikleri
                </Typography>

                {/* Statistics Filters */}
                <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontSize: '13px', fontWeight: 600, color: 'text.secondary' }}>
                    Tarih Aralığı Filtreleme
                  </Typography>
                  <Grid container spacing={1.5} alignItems="center">
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Başlangıç Tarihi"
                        type="date"
                        value={statsFilters.startDate}
                        onChange={(e) => setStatsFilters({ ...statsFilters, startDate: e.target.value })}
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
                      <TextField
                        fullWidth
                        size="small"
                        label="Bitiş Tarihi"
                        type="date"
                        value={statsFilters.endDate}
                        onChange={(e) => setStatsFilters({ ...statsFilters, endDate: e.target.value })}
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
                        onClick={loadStats}
                        disabled={loadingStats}
                        sx={{
                          background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                          boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
                          borderRadius: 2,
                          padding: '6px 16px',
                          fontSize: '12px',
                          fontWeight: 500,
                          textTransform: 'none',
                          '&:hover': {
                            boxShadow: '0 6px 16px rgba(25, 118, 210, 0.35)',
                            transform: 'translateY(-1px)',
                          },
                          transition: 'all 0.3s',
                        }}
                      >
                        Filtrele
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>

                {statsError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setStatsError('')}>
                    {statsError}
                  </Alert>
                )}

                {loadingStats ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : stats ? (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card sx={{ 
                        borderRadius: 2, 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)',
                        border: '1px solid rgba(25, 118, 210, 0.1)',
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        },
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <People sx={{ color: 'primary.main', fontSize: 20 }} />
                            <Typography variant="subtitle2" sx={{ fontSize: '12px', color: 'text.secondary' }}>
                              Toplam Kullanıcı
                            </Typography>
                          </Box>
                          <Typography variant="h4" sx={{ fontSize: '24px', fontWeight: 700, color: 'primary.main' }}>
                            {stats.totalUsers || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card sx={{ 
                        borderRadius: 2, 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.05) 0%, rgba(25, 118, 210, 0.05) 100%)',
                        border: '1px solid rgba(33, 150, 243, 0.1)',
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        },
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <People sx={{ color: '#2196f3', fontSize: 20 }} />
                            <Typography variant="subtitle2" sx={{ fontSize: '12px', color: 'text.secondary' }}>
                              Toplam Rehber
                            </Typography>
                          </Box>
                          <Typography variant="h4" sx={{ fontSize: '24px', fontWeight: 700, color: '#2196f3' }}>
                            {stats.totalContacts || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card sx={{ 
                        borderRadius: 2, 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(56, 142, 60, 0.05) 100%)',
                        border: '1px solid rgba(76, 175, 80, 0.1)',
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        },
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Assessment sx={{ color: '#4caf50', fontSize: 20 }} />
                            <Typography variant="subtitle2" sx={{ fontSize: '12px', color: 'text.secondary' }}>
                              Toplam SMS
                            </Typography>
                          </Box>
                          <Typography variant="h4" sx={{ fontSize: '24px', fontWeight: 700, color: '#4caf50' }}>
                            {stats.totalSMS || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card sx={{ 
                        borderRadius: 2, 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 193, 7, 0.05) 100%)',
                        border: '1px solid rgba(255, 152, 0, 0.1)',
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        },
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <BarChart sx={{ color: '#ff9800', fontSize: 20 }} />
                            <Typography variant="subtitle2" sx={{ fontSize: '12px', color: 'text.secondary' }}>
                              Bu Ay SMS
                            </Typography>
                          </Box>
                          <Typography variant="h4" sx={{ fontSize: '24px', fontWeight: 700, color: '#ff9800' }}>
                            {stats.smsThisMonth || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card sx={{ 
                        borderRadius: 2, 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.05) 0%, rgba(123, 31, 162, 0.05) 100%)',
                        border: '1px solid rgba(156, 39, 176, 0.1)',
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        },
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Payment sx={{ color: '#9c27b0', fontSize: 20 }} />
                            <Typography variant="subtitle2" sx={{ fontSize: '12px', color: 'text.secondary' }}>
                              Toplam Ödeme
                            </Typography>
                          </Box>
                          <Typography variant="h4" sx={{ fontSize: '24px', fontWeight: 700, color: '#9c27b0' }}>
                            {stats.totalPayments || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card sx={{ 
                        borderRadius: 2, 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(56, 142, 60, 0.05) 100%)',
                        border: '1px solid rgba(76, 175, 80, 0.1)',
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        },
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <AccountBalanceWallet sx={{ color: '#4caf50', fontSize: 20 }} />
                            <Typography variant="subtitle2" sx={{ fontSize: '12px', color: 'text.secondary' }}>
                              Toplam Gelir
                            </Typography>
                          </Box>
                          <Typography variant="h4" sx={{ fontSize: '24px', fontWeight: 700, color: '#4caf50' }}>
                            {Number(stats.totalRevenue || 0).toLocaleString('tr-TR')} TRY
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card sx={{ 
                        borderRadius: 2, 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.05) 0%, rgba(211, 47, 47, 0.05) 100%)',
                        border: '1px solid rgba(244, 67, 54, 0.1)',
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        },
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <MoneyOff sx={{ color: '#f44336', fontSize: 20 }} />
                            <Typography variant="subtitle2" sx={{ fontSize: '12px', color: 'text.secondary' }}>
                              Bekleyen Ödeme
                            </Typography>
                          </Box>
                          <Typography variant="h4" sx={{ fontSize: '24px', fontWeight: 700, color: '#f44336' }}>
                            {stats.pendingPaymentRequests || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                ) : (
                  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      İstatistikler yüklenemedi
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {/* Payment Reports Tab - Admin Only */}
            {tabValue === 'payments' && isAdmin && (
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2,
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  Ödeme Raporları
                </Typography>

                {/* Payment Reports Filters */}
                <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontSize: '13px', fontWeight: 600, color: 'text.secondary' }}>
                    Filtreleme Seçenekleri
                  </Typography>
                  <Grid container spacing={1.5} alignItems="center">
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel sx={{ fontSize: '12px' }}>Kullanıcı</InputLabel>
                        <Select
                          value={paymentFilters.userId}
                          onChange={(e) => setPaymentFilters({ ...paymentFilters, userId: e.target.value })}
                          label="Kullanıcı"
                          title="Ödeme raporları kullanıcı filtresi"
                          sx={{
                            fontSize: '12px',
                            borderRadius: 1.5,
                          }}
                        >
                          <MenuItem value="" sx={{ fontSize: '12px' }}>Tüm Kullanıcılar</MenuItem>
                          {users.map((u) => (
                            <MenuItem key={u.id} value={u.id} sx={{ fontSize: '12px' }}>
                              {u.username} ({u.email})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Başlangıç Tarihi"
                        type="date"
                        value={paymentFilters.startDate}
                        onChange={(e) => setPaymentFilters({ ...paymentFilters, startDate: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Bitiş Tarihi"
                        type="date"
                        value={paymentFilters.endDate}
                        onChange={(e) => setPaymentFilters({ ...paymentFilters, endDate: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Durum"
                        select
                        SelectProps={{ native: true }}
                        value={paymentFilters.status}
                        onChange={(e) => setPaymentFilters({ ...paymentFilters, status: e.target.value })}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                        inputProps={{
                          'aria-label': 'Ödeme durumu filtresi',
                          title: 'Ödeme durumu filtresi',
                        }}
                      >
                        <option value="">Tümü</option>
                        <option value="pending">Beklemede</option>
                        <option value="approved">Onaylandı</option>
                        <option value="rejected">Reddedildi</option>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Ödeme Yöntemi"
                        value={paymentFilters.paymentMethod}
                        onChange={(e) => setPaymentFilters({ ...paymentFilters, paymentMethod: e.target.value })}
                        placeholder="Ara..."
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Min Tutar"
                        type="number"
                        value={paymentFilters.minAmount}
                        onChange={(e) => setPaymentFilters({ ...paymentFilters, minAmount: e.target.value })}
                        placeholder="0"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Max Tutar"
                        type="number"
                        value={paymentFilters.maxAmount}
                        onChange={(e) => setPaymentFilters({ ...paymentFilters, maxAmount: e.target.value })}
                        placeholder="0"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Transaction ID"
                        value={paymentFilters.transactionId}
                        onChange={(e) => setPaymentFilters({ ...paymentFilters, transactionId: e.target.value })}
                        placeholder="Ara..."
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<FilterList />}
                        onClick={loadPaymentRequests}
                        disabled={loadingPaymentRequests}
                        sx={{
                          background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                          boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
                          borderRadius: 2,
                          padding: '6px 16px',
                          fontSize: '12px',
                          fontWeight: 500,
                          textTransform: 'none',
                          '&:hover': {
                            boxShadow: '0 6px 16px rgba(25, 118, 210, 0.35)',
                            transform: 'translateY(-1px)',
                          },
                          transition: 'all 0.3s',
                        }}
                      >
                        Filtrele
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>

                {paymentRequestsError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setPaymentRequestsError('')}>
                    {paymentRequestsError}
                  </Alert>
                )}

                {loadingPaymentRequests ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : paymentRequests.length === 0 ? (
                  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Henüz ödeme talebi bulunmuyor
                    </Typography>
                  </Paper>
                ) : (
                  <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
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
                            <TableRow key={request.id} sx={{ '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                <Box>
                                  <Typography variant="body2" sx={{ fontSize: '12px', fontWeight: 500 }}>
                                    {request.user?.username || '-'}
                                  </Typography>
                                  {request.user?.email && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                      {request.user.email}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                <Typography variant="body2" sx={{ fontSize: '12px', fontWeight: 500 }}>
                                  {Number(request.amount)} {request.currency || 'TRY'}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                {request.credits} SMS {request.bonus > 0 ? `+ ${request.bonus} bonus` : ''}
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                {request.paymentMethod || '-'}
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                {request.transactionId ? (
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.65rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {request.transactionId}
                                  </Typography>
                                ) : '-'}
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
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
      </Box>
      </Box>
    </ProtectedRoute>
  );
}

