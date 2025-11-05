'use client';

import { Box, Container, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, TextField, Button, Alert, CircularProgress, Select, MenuItem, FormControl, InputLabel, Tabs, Tab, Card, CardContent } from '@mui/material';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { Assessment, FilterList, BarChart, People, Payment, MoneyOff } from '@mui/icons-material';
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
  const [tabValue, setTabValue] = useState(0);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; username: string; email: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    userId: '',
  });
  
  // Statistics states
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
    if (tabValue === 0) {
      loadHistory();
    } else if (tabValue === 1) {
      loadStats();
    } else if (tabValue === 2) {
      loadPaymentRequests();
    }
  }, [isAdmin, tabValue]);

  useEffect(() => {
    // URL'den today parametresini oku ve bugünkü tarihi filtrele
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const today = params.get('today');
      if (today === 'true' && tabValue === 0) {
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

  useEffect(() => {
    if (tabValue === 0) {
      loadHistory();
    }
  }, [filters.userId, filters.startDate, filters.endDate]);

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

      // Admin ise admin endpoint, değilse kullanıcı endpoint
      const endpoint = isAdmin ? '/admin/sms-history' : '/bulk-sms/history';
      const response = await api.get(endpoint, { params });
      if (response.data.success) {
        setMessages(response.data.data.messages || []);
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

  const loadStats = async () => {
    if (!isAdmin) return;
    
    try {
      setLoadingStats(true);
      const response = await api.get('/admin/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Stats load error:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadPaymentRequests = async () => {
    if (!isAdmin) return;
    
    try {
      setLoadingPaymentRequests(true);
      const response = await api.get('/admin/payment-requests');
      if (response.data.success) {
        setPaymentRequests(response.data.data.requests || []);
      }
    } catch (error) {
      console.error('Payment requests load error:', error);
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
              onChange={(e, newValue) => setTabValue(newValue)}
              sx={{ mb: 2 }}
            >
              <Tab label="SMS Raporları" icon={<Assessment />} />
              {isAdmin && (
                <>
                  <Tab label="İstatistikler" icon={<BarChart />} />
                  <Tab label="Ödeme Raporları" icon={<Payment />} />
                </>
              )}
            </Tabs>

            {/* SMS Reports Tab */}
            {tabValue === 0 && (
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
              <Grid container spacing={2} alignItems="center">
                {isAdmin && (
                  <Grid size={{ xs: 12, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ fontSize: '12px' }}>Kullanıcı</InputLabel>
                      <Select
                        value={filters.userId}
                        onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                        label="Kullanıcı"
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
                <Grid size={{ xs: 12, md: isAdmin ? 2.25 : 3 }}>
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
                <Grid size={{ xs: 12, md: isAdmin ? 2.25 : 3 }}>
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
                <Grid size={{ xs: 12, md: isAdmin ? 2.25 : 3 }}>
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
                    }}
                  >
                    <option value="">Tümü</option>
                    <option value="sent">Gönderildi</option>
                    <option value="delivered">İletildi</option>
                    <option value="failed">Başarısız</option>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: isAdmin ? 2.25 : 3 }}>
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
      </Box>
    </ProtectedRoute>
  );
}

