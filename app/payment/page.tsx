'use client';

import { Box, Container, Typography, Paper, Grid, Card, CardContent, Button, TextField, Select, MenuItem, FormControl, InputLabel, Alert, Chip, Divider, alpha, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, InputAdornment, Pagination } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import React from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { AccountBalanceWallet, QrCode, Info, CheckCircle, Warning, Edit, Delete, Add, Settings, Visibility, Search, FilterList, CreditCard, TrendingUp, Star, Security, Speed, LocalOffer } from '@mui/icons-material';
import { gradients } from '@/lib/theme';
import Image from 'next/image';
import ClientDate from '@/components/ClientDate';

interface PaymentPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  bonus: number;
}

interface CryptoCurrency {
  id?: string;
  symbol: string;
  name: string;
  decimals: number;
  minAmount: number;
  networkFee: number;
  confirmations: number;
  walletAddress?: string;
  isActive?: boolean;
}

export default function CryptoPaymentPage() {
  const { api, user } = useAuth();
  const { mode } = useTheme();
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';
  const [tabValue, setTabValue] = useState(0);
  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [currencies, setCurrencies] = useState<CryptoCurrency[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [cryptoPrice, setCryptoPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [txHash, setTxHash] = useState('');
  const [exactAmount, setExactAmount] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const paymentInfoRef = useRef<HTMLDivElement>(null);
  
  // Payment history search and filter
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [paymentCurrentPage, setPaymentCurrentPage] = useState(1);
  const paymentItemsPerPage = 10;
  
  // Admin management states
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [cryptoDialogOpen, setCryptoDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PaymentPackage | null>(null);
  const [editingCrypto, setEditingCrypto] = useState<CryptoCurrency | null>(null);
  const [packageForm, setPackageForm] = useState({ name: '', credits: 0, price: 0, currency: 'TRY', bonus: 0, isActive: true });
  const [cryptoForm, setCryptoForm] = useState({ symbol: '', name: '', decimals: 18, minAmount: 0, networkFee: 0, confirmations: 3, walletAddress: '', isActive: true });
  
  // Admin payment request states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadPackages();
    loadCurrencies();
    if (user) {
      loadPaymentRequests();
    }
  }, [user]);

  const loadPackages = async () => {
    try {
      const response = await api.get('/payment/packages');
      if (response.data.success) {
        setPackages(response.data.data.packages);
      }
    } catch (error) {
      console.error('Packages load error:', error);
    }
  };

  const loadCurrencies = async () => {
    try {
      const response = await api.get('/payment/crypto-currencies');
      if (response.data.success) {
        setCurrencies(response.data.data.currencies);
      }
    } catch (error) {
      console.error('Currencies load error:', error);
    }
  };

  const handlePackageSelect = async (packageId: string) => {
    setSelectedPackage(packageId);
    if (selectedCurrency) {
      await loadCryptoPrice(selectedCurrency);
    }
  };

  const handleCurrencySelect = async (currency: string) => {
    setSelectedCurrency(currency);
    if (selectedPackage) {
      await loadCryptoPrice(currency);
    }
  };

  const loadCryptoPrice = async (currency: string) => {
    try {
      const response = await api.get(`/payment/crypto-price/${currency}?fiat=TRY`);
      if (response.data.success) {
        setCryptoPrice(response.data.data.price);
      }
    } catch (error) {
      console.error('Crypto price error:', error);
    }
  };

  const handleCreatePayment = async () => {
    if (!selectedPackage || !selectedCurrency) {
      setError('Paket ve kripto para seçmelisiniz');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const packageData = packages.find((p) => p.id === selectedPackage);
      const response = await api.post('/payment/crypto-create', {
        packageId: selectedPackage,
        cryptoCurrency: selectedCurrency,
        fiatAmount: packageData?.price || 0,
        fiatCurrency: 'TRY',
      });

      if (response.data.success) {
        setPaymentData(response.data.data);
        setSuccess('Ödeme başarıyla oluşturuldu. Lütfen ödeme bilgilerini kontrol edin.');
        
        // Sayfayı ödeme bilgileri alanına kaydır
        setTimeout(() => {
          if (paymentInfoRef.current) {
            paymentInfoRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 100);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ödeme oluşturma hatası');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentRequests = async () => {
    if (!user) return;
    
    try {
      setLoadingRequests(true);
      // Admin ise tüm ödeme talepleri, değilse sadece kullanıcının talepleri
      const endpoint = user.role === 'admin' || user.role === 'moderator' 
        ? '/admin/payment-requests' 
        : '/payment-requests';
      const response = await api.get(endpoint);
      if (response.data.success) {
        const requests = response.data.data.requests || [];
        // Yeni→eski sıralama (created_at descending)
        const sortedRequests = requests.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || a.created_at).getTime();
          const dateB = new Date(b.createdAt || b.created_at).getTime();
          return dateB - dateA; // Yeni önce
        });
        setPaymentRequests(sortedRequests);
      }
    } catch (error) {
      console.error('Payment requests load error:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!txHash || !exactAmount) {
      setError('Lütfen Hash/TXID ve tam tutarı girin');
      return;
    }

    if (!paymentData) {
      setError('Önce ödeme oluşturmalısınız');
      return;
    }

    setSubmittingPayment(true);
    setError('');
    setSuccess('');

    try {
      const packageData = packages.find((p) => p.id === selectedPackage);
      const response = await api.post('/payment-requests', {
        amount: paymentData.fiatAmount || packageData?.price || 0,
        currency: 'TRY',
        paymentMethod: `crypto-${selectedCurrency}`,
        credits: paymentData.credits || packageData?.credits || 0,
        bonus: paymentData.bonus || packageData?.bonus || 0,
        description: `${selectedCurrency} ile ödeme - Paket: ${packageData?.name || ''}`,
        transactionId: txHash,
      });

      if (response.data.success) {
        setSuccess('Ödeme talebi başarıyla oluşturuldu. Admin onayı bekleniyor...');
        setTxHash('');
        setExactAmount('');
        setPaymentData(null);
        setSelectedPackage('');
        setSelectedCurrency('');
        loadPaymentRequests();
        
        // Sayfayı yukarı kaydır
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ödeme talebi oluşturulurken hata oluştu');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Admin management handlers
  const handleSavePackage = async () => {
    try {
      setLoading(true);
      setError('');
      if (editingPackage) {
        await api.put(`/admin/payment-packages/${editingPackage.id}`, packageForm);
        setSuccess('Paket başarıyla güncellendi');
      } else {
        await api.post('/admin/payment-packages', packageForm);
        setSuccess('Paket başarıyla oluşturuldu');
      }
      setPackageDialogOpen(false);
      loadPackages();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Paket kaydedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCrypto = async () => {
    try {
      setLoading(true);
      setError('');
      if (editingCrypto && editingCrypto.id) {
        await api.put(`/admin/crypto-currencies/${editingCrypto.id}`, cryptoForm);
        setSuccess('Kripto para birimi başarıyla güncellendi');
      } else {
        await api.post('/admin/crypto-currencies', cryptoForm);
        setSuccess('Kripto para birimi başarıyla oluşturuldu');
      }
      setCryptoDialogOpen(false);
      loadCurrencies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kripto para birimi kaydedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Admin payment request handlers
  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      setLoading(true);
      setError('');
      const response = await api.post(`/admin/payment-requests/${selectedRequest.id}/approve`, {
        adminNotes: adminNotes || undefined,
      });
      
      if (response.data.success) {
        setSuccess('Ödeme talebi başarıyla onaylandı');
        setApproveDialogOpen(false);
        setSelectedRequest(null);
        setAdminNotes('');
        loadPaymentRequests();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ödeme talebi onaylanırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest || !rejectionReason) {
      setError('Red sebebi gerekli');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      const response = await api.post(`/admin/payment-requests/${selectedRequest.id}/reject`, {
        rejectionReason,
        adminNotes: adminNotes || undefined,
      });
      
      if (response.data.success) {
        setSuccess('Ödeme talebi başarıyla reddedildi');
        setRejectDialogOpen(false);
        setSelectedRequest(null);
        setRejectionReason('');
        setAdminNotes('');
        loadPaymentRequests();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ödeme talebi reddedilirken hata oluştu');
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
            {/* Tabs for Admin/User view */}
            {(user?.role === 'admin' || user?.role === 'moderator') && (
              <Tabs 
                value={tabValue} 
                onChange={(e, newValue) => setTabValue(newValue)}
                sx={{ mb: 2 }}
              >
                <Tab label="Ödeme Talepleri" icon={<AccountBalanceWallet />} />
                <Tab label="Yönetim" icon={<Settings />} />
              </Tabs>
            )}

            {tabValue === 0 ? (
              <>
                {isAdmin ? (
                  // Admin için sadece ödeme talepleri listesi
                  <>
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
                      Ödeme Talepleri
                    </Typography>

                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2,
                        fontSize: '14px',
                      }}
                    >
                      Kullanıcıların açtığı ödeme taleplerini onaylayın veya reddedin.
                    </Typography>

                    {error && (
                      <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                        {error}
                      </Alert>
                    )}

                    {success && (
                      <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}>
                        {success}
                      </Alert>
                    )}

                    {/* Ödeme Talepleri - Admin için */}
                    <Card 
                      sx={{ 
                        borderRadius: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        mt: 2,
                      }}
                    >
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography 
                          variant="h6" 
                          gutterBottom
                          sx={{
                            fontSize: '16px',
                            fontWeight: 500,
                            mb: 2,
                          }}
                        >
                          Tüm Ödeme Talepleri
                        </Typography>
                        {loadingRequests ? (
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
                          <>
                            {/* Search and Filter */}
                            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                              <TextField
                                size="small"
                                placeholder="Kullanıcı, transaction ID veya tutar ara..."
                                value={paymentSearchQuery}
                                onChange={(e) => {
                                  setPaymentSearchQuery(e.target.value);
                                  setPaymentCurrentPage(1);
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
                                <InputLabel>Durum Filtresi</InputLabel>
                                <Select
                                  value={paymentStatusFilter}
                                  label="Durum Filtresi"
                                  onChange={(e) => {
                                    setPaymentStatusFilter(e.target.value);
                                    setPaymentCurrentPage(1);
                                  }}
                                >
                                  <MenuItem value="all">Tümü</MenuItem>
                                  <MenuItem value="pending">Beklemede</MenuItem>
                                  <MenuItem value="approved">Onaylandı</MenuItem>
                                  <MenuItem value="rejected">Reddedildi</MenuItem>
                                </Select>
                              </FormControl>
                            </Box>
                            
                            {(() => {
                              // Filter payment requests
                              let filteredRequests = paymentRequests.filter((request) => {
                                const matchesSearch = paymentSearchQuery === '' || 
                                  (request.user?.username || '').toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
                                  (request.user?.email || '').toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
                                  (request.transactionId || '').toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
                                  String(request.amount || '').includes(paymentSearchQuery);
                                const matchesStatus = paymentStatusFilter === 'all' || request.status === paymentStatusFilter;
                                return matchesSearch && matchesStatus;
                              });

                              // Pagination
                              const totalPages = Math.ceil(filteredRequests.length / paymentItemsPerPage);
                              const startIndex = (paymentCurrentPage - 1) * paymentItemsPerPage;
                              const paginatedRequests = filteredRequests.slice(startIndex, startIndex + paymentItemsPerPage);

                              return filteredRequests.length > 0 ? (
                            <>
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
                                      <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Oluşturulma</TableCell>
                                      <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>İşlemler</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {paginatedRequests.map((request) => {
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
                                        {request.status !== 'pending' && (
                                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                            {request.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                                          </Typography>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                    })}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                              {totalPages > 1 && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                  <Pagination
                                    count={totalPages}
                                    page={paymentCurrentPage}
                                    onChange={(e, page) => setPaymentCurrentPage(page)}
                                    color="primary"
                                    size="small"
                                  />
                                </Box>
                              )}
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                              {paymentRequests.length === 0
                                ? 'Henüz ödeme talebi bulunmuyor'
                                : 'Arama kriterlerinize uygun ödeme talebi bulunamadı'}
                            </Typography>
                          );
                            })()}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  // Normal kullanıcı için kripto ödeme bölümü
                  <>
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <AccountBalanceWallet sx={{ color: 'white', fontSize: 32 }} />
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
                            Kripto Ödeme
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              fontSize: '14px',
                            }}
                          >
                            Güvenli ve hızlı kripto para ile SMS kredisi satın alın
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {error && (
                      <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                        {error}
                      </Alert>
                    )}

                    {success && (
                      <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}>
                        {success}
                      </Alert>
                    )}

                    {/* Paket Seçimi - Modern Tasarım */}
            <Card 
              sx={{ 
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                mb: 3,
                border: '1px solid rgba(0,0,0,0.05)',
                background: mode === 'dark' 
                  ? 'linear-gradient(135deg, rgba(30,30,30,0.9) 0%, rgba(42,42,42,0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(250,250,250,0.9) 100%)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <CreditCard sx={{ color: 'primary.main', fontSize: 24 }} />
                  <Typography 
                    variant="h6" 
                    sx={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: 'text.primary',
                    }}
                  >
                    Kredi Paketi Seçin
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  {packages.map((pkg, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={pkg.id}>
                      <Card
                        sx={{
                          border: selectedPackage === pkg.id 
                            ? '2px solid #1e40af' 
                            : '1px solid rgba(0,0,0,0.1)',
                          cursor: 'pointer',
                          background: selectedPackage === pkg.id 
                            ? 'linear-gradient(135deg, rgba(30, 64, 175, 0.08) 0%, rgba(249, 115, 22, 0.08) 100%)'
                            : 'white',
                          borderRadius: 3,
                          boxShadow: selectedPackage === pkg.id
                            ? '0 8px 24px rgba(30, 64, 175, 0.2)'
                            : '0 2px 12px rgba(0,0,0,0.08)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': selectedPackage === pkg.id ? {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: 'linear-gradient(90deg, #1e40af 0%, #f97316 100%)',
                          } : {},
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                            borderColor: selectedPackage === pkg.id ? '#1e40af' : 'rgba(30, 64, 175, 0.3)',
                          },
                        }}
                        onClick={() => handlePackageSelect(pkg.id)}
                      >
                        <CardContent sx={{ p: 2.5, position: 'relative' }}>
                          {selectedPackage === pkg.id && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                p: 0.5,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <CheckCircle sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                          )}
                          {pkg.bonus > 0 && (
                            <Chip
                              icon={<LocalOffer sx={{ fontSize: 14 }} />}
                              label={`+${pkg.bonus} Bonus`}
                              color="success"
                              size="small"
                              sx={{ 
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                height: 24,
                                boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                              }}
                            />
                          )}
                          <Box sx={{ textAlign: 'center', mt: pkg.bonus > 0 ? 3 : 0 }}>
                            <Typography 
                              variant="body2"
                              sx={{
                                fontSize: '13px',
                                fontWeight: 500,
                                color: 'text.secondary',
                                mb: 1,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                              }}
                            >
                              {pkg.name}
                            </Typography>
                            <Typography 
                              variant="h4" 
                              color="primary"
                              sx={{
                                fontSize: '32px',
                                fontWeight: 700,
                                mb: 0.5,
                                background: selectedPackage === pkg.id
                                  ? 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)'
                                  : 'linear-gradient(135deg, #1e40af 0%, #1e40af 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                              }}
                            >
                              {pkg.credits}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              sx={{
                                fontSize: '12px',
                                color: 'text.secondary',
                                mb: 2,
                              }}
                            >
                              SMS Kredisi
                            </Typography>
                            <Divider sx={{ my: 1.5 }} />
                            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5 }}>
                              <Typography 
                                variant="h6" 
                                sx={{
                                  fontSize: '20px',
                                  fontWeight: 600,
                                  color: 'text.primary',
                                }}
                              >
                                {pkg.price}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{
                                  fontSize: '14px',
                                }}
                              >
                                {pkg.currency}
                              </Typography>
                            </Box>
                            {pkg.bonus > 0 && (
                              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
                                <Typography 
                                  variant="caption" 
                                  sx={{
                                    fontSize: '11px',
                                    color: 'success.main',
                                    fontWeight: 500,
                                  }}
                                >
                                  <Star sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                                  {pkg.bonus} Bonus SMS Hediye!
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            {/* Kripto Para Seçimi ve Ödeme Oluştur - Modern Tasarım */}
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card 
                  sx={{ 
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    background: mode === 'dark' 
                  ? 'linear-gradient(135deg, rgba(30,30,30,0.9) 0%, rgba(42,42,42,0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(250,250,250,0.9) 100%)',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <TrendingUp sx={{ color: 'primary.main', fontSize: 24 }} />
                      </Box>
                      <Typography 
                        variant="h6" 
                        sx={{
                          fontSize: '18px',
                          fontWeight: 600,
                          color: 'text.primary',
                        }}
                      >
                        Kripto Para Seçin
                      </Typography>
                    </Box>
                    <FormControl fullWidth sx={{ mb: 2.5 }}>
                      <InputLabel sx={{ fontSize: '14px' }}>Kripto Para Birimi</InputLabel>
                      <Select
                        value={selectedCurrency}
                        onChange={(e) => handleCurrencySelect(e.target.value)}
                        label="Kripto Para Birimi"
                        sx={{
                          borderRadius: 2,
                          fontSize: '14px',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0,0,0,0.15)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        }}
                      >
                        {currencies.map((currency) => (
                          <MenuItem key={currency.symbol} value={currency.symbol} sx={{ fontSize: '14px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                }}
                              >
                                {currency.symbol.substring(0, 2)}
                              </Box>
                              {currency.name} ({currency.symbol})
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {cryptoPrice > 0 && selectedPackage && (
                      <Box 
                        sx={{ 
                          mt: 2,
                          p: 2,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.05) 0%, rgba(249, 115, 22, 0.05) 100%)',
                          border: '1px solid rgba(30, 64, 175, 0.1)',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Info sx={{ color: 'primary.main', fontSize: 18 }} />
                          <Typography 
                            variant="body2" 
                            sx={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: 'text.secondary',
                            }}
                          >
                            Güncel Fiyat
                          </Typography>
                        </Box>
                        <Typography 
                          variant="h6" 
                          sx={{
                            fontSize: '20px',
                            fontWeight: 600,
                            color: 'primary.main',
                          }}
                        >
                          {cryptoPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY
                        </Typography>
                      </Box>
                    )}

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<AccountBalanceWallet />}
                      onClick={handleCreatePayment}
                      disabled={loading || !selectedPackage || !selectedCurrency}
                      sx={{
                        mt: 3,
                        py: 1.5,
                        background: 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)',
                        boxShadow: '0 8px 24px rgba(30, 64, 175, 0.3)',
                        borderRadius: 2,
                        fontSize: '16px',
                        fontWeight: 600,
                        textTransform: 'none',
                        '&:hover': {
                          boxShadow: '0 12px 32px rgba(30, 64, 175, 0.4)',
                          transform: 'translateY(-2px)',
                        },
                        '&:disabled': {
                          background: 'rgba(0,0,0,0.12)',
                          color: 'rgba(0,0,0,0.26)',
                        },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      {loading ? 'Ödeme Oluşturuluyor...' : 'Ödeme Oluştur'}
                    </Button>

                    {(!selectedPackage || !selectedCurrency) && (
                      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Warning sx={{ color: 'warning.main', fontSize: 18 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
                          Lütfen paket ve kripto para seçin
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card 
                  sx={{ 
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    background: mode === 'dark' 
                  ? 'linear-gradient(135deg, rgba(30,30,30,0.9) 0%, rgba(42,42,42,0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(250,250,250,0.9) 100%)',
                    height: '100%',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(56, 142, 60, 0.1) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Security sx={{ color: 'success.main', fontSize: 24 }} />
                      </Box>
                      <Typography 
                        variant="h6" 
                        sx={{
                          fontSize: '18px',
                          fontWeight: 600,
                          color: 'text.primary',
                        }}
                      >
                        Güvenli Ödeme
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'start', gap: 1.5 }}>
                        <CheckCircle sx={{ color: 'success.main', fontSize: 20, mt: 0.5 }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 500, mb: 0.5 }}>
                            Hızlı İşlem
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
                            Ödemeniz anında doğrulanır ve krediniz hesabınıza yüklenir
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'start', gap: 1.5 }}>
                        <Security sx={{ color: 'primary.main', fontSize: 20, mt: 0.5 }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 500, mb: 0.5 }}>
                            Güvenli Ödeme
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
                            Blockchain teknolojisi ile güvenli ödeme
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'start', gap: 1.5 }}>
                        <Speed sx={{ color: 'info.main', fontSize: 20, mt: 0.5 }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 500, mb: 0.5 }}>
                            Otomatik Doğrulama
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
                            Sistem otomatik olarak ödemenizi doğrular
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Ödeme Detayları - Modern Tasarım */}
            {paymentData && (
              <Grid container spacing={3} sx={{ mt: 4 }} ref={paymentInfoRef}>
                <Grid size={{ xs: 12 }}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.08) 0%, rgba(249, 115, 22, 0.08) 100%)',
                      border: '1px solid rgba(30, 64, 175, 0.1)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'linear-gradient(90deg, #1e40af 0%, #f97316 100%)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CheckCircle sx={{ color: 'white', fontSize: 28 }} />
                        </Box>
                        <Box>
                          <Typography
                            variant="h5"
                            sx={{
                              fontSize: '26px',
                              fontWeight: 700,
                              color: 'primary.main',
                              mb: 0.5,
                            }}
                          >
                            Ödeme Bilgileri
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
                            Ödemenizi tamamlamak için aşağıdaki bilgileri kullanın
                          </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 3 }} />

                      {/* Ödeme Otomatik Doğrulama Bilgilendirmesi */}
                      <Alert
                        severity="info"
                        icon={<Info />}
                        sx={{
                          mb: 2,
                          borderRadius: 2,
                          bgcolor: alpha('#1e40af', 0.1),
                        }}
                      >
                        <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 500, mb: 0.5 }}>
                          Ödeme Otomatik Doğrulama
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '13px' }}>
                          Ödemeniz yapıldıktan sonra sistem otomatik olarak doğrulayacak ve SMS krediniz hesabınıza yüklenecektir.
                        </Typography>
                      </Alert>

                      <Grid container spacing={3}>
                        {/* Sol Panel - Cüzdan Adresi ve QR Kod */}
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Card
                            sx={{
                              mb: 3,
                              borderRadius: 3,
                              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                              border: '1px solid rgba(0,0,0,0.08)',
                              background: 'background.paper',
                            }}
                          >
                            <CardContent sx={{ p: 2.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <AccountBalanceWallet sx={{ color: 'primary.main', fontSize: 22 }} />
                                <Typography
                                  variant="h6"
                                  sx={{
                                    fontSize: '17px',
                                    fontWeight: 600,
                                    color: 'text.primary',
                                  }}
                                >
                                  {paymentData.currency} Cüzdan Adresi
                                </Typography>
                              </Box>
                              <TextField
                                fullWidth
                                label="Cüzdan Adresi"
                                value={paymentData.walletAddress}
                                InputProps={{
                                  readOnly: true,
                                  sx: {
                                    fontFamily: 'monospace',
                                    fontSize: '13px',
                                  },
                                }}
                                sx={{
                                  mb: 2,
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f5f5f5',
                                    '&:hover': {
                                      bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#eeeeee',
                                    },
                                  },
                                }}
                              />
                              <Button
                                fullWidth
                                variant="contained"
                                onClick={() => {
                                  navigator.clipboard.writeText(paymentData.walletAddress);
                                  setSuccess('Cüzdan adresi kopyalandı!');
                                }}
                                sx={{
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  py: 1.25,
                                  background: 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)',
                                  boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)',
                                  '&:hover': {
                                    boxShadow: '0 6px 16px rgba(30, 64, 175, 0.4)',
                                    transform: 'translateY(-1px)',
                                  },
                                  transition: 'all 0.3s',
                                }}
                              >
                                Adresi Kopyala
                              </Button>
                            </CardContent>
                          </Card>

                          <Card
                            sx={{
                              borderRadius: 3,
                              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                              border: '1px solid rgba(0,0,0,0.08)',
                              background: 'background.paper',
                            }}
                          >
                            <CardContent sx={{ p: 2.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <QrCode sx={{ color: 'primary.main', fontSize: 22 }} />
                                <Typography
                                  variant="h6"
                                  sx={{
                                    fontSize: '17px',
                                    fontWeight: 600,
                                    color: 'text.primary',
                                  }}
                                >
                                  QR Kod
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'center',
                                  p: 3,
                                  bgcolor: 'background.paper',
                                  borderRadius: 3,
                                  border: '2px dashed rgba(30, 64, 175, 0.2)',
                                  background: mode === 'dark' 
                  ? 'linear-gradient(135deg, rgba(30,30,30,0.9) 0%, rgba(42,42,42,0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(250,250,250,0.9) 100%)',
                                }}
                              >
                                <Image
                                  src={paymentData.qrCodeData}
                                  alt="QR Code"
                                  width={280}
                                  height={280}
                                  style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    borderRadius: 12,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  }}
                                />
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px', mt: 2, display: 'block', textAlign: 'center' }}>
                                QR kodu taratarak hızlıca ödeme yapabilirsiniz
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>

                        {/* Sağ Panel - Ödeme Bilgileri ve Form */}
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Card
                            sx={{
                              mb: 3,
                              borderRadius: 3,
                              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                              border: '1px solid rgba(0,0,0,0.08)',
                              background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.05) 0%, rgba(249, 115, 22, 0.05) 100%)',
                            }}
                          >
                            <CardContent sx={{ p: 2.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <CreditCard sx={{ color: 'primary.main', fontSize: 22 }} />
                                <Typography
                                  variant="h6"
                                  sx={{
                                    fontSize: '17px',
                                    fontWeight: 600,
                                    color: 'text.primary',
                                  }}
                                >
                                  Ödeme Miktarı
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  p: 2.5,
                                  bgcolor: 'background.paper',
                                  borderRadius: 2,
                                  border: '1px solid rgba(30, 64, 175, 0.2)',
                                  textAlign: 'center',
                                }}
                              >
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '13px' }}>
                                  Göndermeniz Gereken Tutar:
                                </Typography>
                                <Typography
                                  variant="h4"
                                  sx={{
                                    fontSize: '32px',
                                    fontWeight: 700,
                                    mb: 1,
                                    background: 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                  }}
                                >
                                  {paymentData.cryptoAmount} {paymentData.currency}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px' }}>
                                    ≈
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 600, color: 'text.secondary' }}>
                                    {paymentData.fiatAmount} TRY
                                  </Typography>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>

                          <Divider sx={{ my: 3 }} />

                          {/* Transfer Hash/TXID ve Tutar Girişi */}
                          <Typography
                            variant="h6"
                            gutterBottom
                            sx={{
                              fontSize: '16px',
                              fontWeight: 500,
                              mb: 2,
                            }}
                          >
                            3. Adım: Ödeme Bilgilerini Girin
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mb: 2,
                              fontSize: '14px',
                            }}
                          >
                            Ödemenizi yaptıktan sonra, transfer <strong>Hash/TXID</strong> ve gönderdiğiniz <strong>tam tutarı (TRY)</strong> girin.
                          </Typography>

                          <TextField
                            fullWidth
                            label="Transfer Hash / TXID"
                            placeholder="Örn: 0xa1b2c3d4e5f67890..."
                            value={txHash}
                            onChange={(e) => setTxHash(e.target.value)}
                            sx={{
                              mb: 2,
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              },
                            }}
                            helperText="Blockchain'deki işlem hash'inizi veya TXID'nizi girin"
                          />

                          <TextField
                            fullWidth
                            label="Gönderilen Tam Tutar (TRY)"
                            placeholder="Örn: 90000.00"
                            type="number"
                            value={exactAmount}
                            onChange={(e) => setExactAmount(e.target.value)}
                            inputProps={{
                              step: '0.01',
                              min: 0,
                            }}
                            sx={{
                              mb: 2,
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              },
                            }}
                            helperText="Gönderdiğiniz tam tutarı ondalık sayılarla birlikte girin (örn: 90000.00 TRY)"
                          />

                          <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleSubmitPayment}
                            disabled={submittingPayment || !txHash || !exactAmount}
                            sx={{
                              background: 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)',
                              boxShadow: '0 6px 20px rgba(30, 64, 175, 0.3)',
                              borderRadius: 2,
                              padding: '8px 20px',
                              fontSize: '14px',
                              fontWeight: 500,
                              textTransform: 'none',
                              size: 'small',
                              '&:hover': {
                                boxShadow: '0 8px 25px rgba(30, 64, 175, 0.4)',
                                transform: 'translateY(-2px)',
                              },
                              transition: 'all 0.3s',
                            }}
                          >
                            {submittingPayment ? 'Gönderiliyor...' : 'Ödeme Bilgilerini Gönder'}
                          </Button>
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 3 }} />

                      {/* Önemli Bilgiler */}
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: alpha('#ff9800', 0.1),
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: alpha('#ff9800', 0.3),
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Warning sx={{ color: 'warning.main', fontSize: 24 }} />
                          <Typography
                            variant="h6"
                            sx={{
                              fontSize: '16px',
                              fontWeight: 600,
                              color: 'warning.main',
                            }}
                          >
                            Önemli Bilgiler
                          </Typography>
                        </Box>
                        <Box component="ul" sx={{ pl: 3, m: 0 }}>
                          <Typography component="li" variant="body2" sx={{ mb: 1.5, fontSize: '14px' }}>
                            Ödeme talebiniz oluşturulduktan sonra, yukarıdaki adrese <strong>tam tutarı</strong> göndermeniz gerekmektedir.
                          </Typography>
                          <Typography component="li" variant="body2" sx={{ mb: 1.5, fontSize: '14px' }}>
                            Ödemeniz onaylandıktan sonra, SMS krediniz <strong>otomatik olarak</strong> hesabınıza yüklenecektir.
                          </Typography>
                          <Typography component="li" variant="body2" sx={{ mb: 1.5, fontSize: '14px' }}>
                            Bir sorunla karşılaşırsanız, lütfen <strong>toplusmssmsatalimmi@gmail.com</strong> adresine e-posta gönderin.
                          </Typography>
                          <Typography component="li" variant="body2" sx={{ fontSize: '14px' }}>
                            Son geçerlilik: <strong><ClientDate date={paymentData.expiresAt} /></strong>
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

                    {/* Ödeme Talepleri - Normal kullanıcı için */}
                    <Card 
                      sx={{ 
                        borderRadius: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        mt: 2,
                      }}
                    >
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography 
                          variant="h6" 
                          gutterBottom
                          sx={{
                            fontSize: '16px',
                            fontWeight: 500,
                            mb: 2,
                          }}
                        >
                          Ödeme Taleplerim
                        </Typography>
                        {loadingRequests ? (
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
                                  <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tutar</TableCell>
                                  <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kredi</TableCell>
                                  <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Ödeme Yöntemi</TableCell>
                                  <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Durum</TableCell>
                                  <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Oluşturulma</TableCell>
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
                                      <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{Number(request.amount)} {request.currency || 'TRY'}</TableCell>
                                      <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{request.credits} SMS {request.bonus > 0 ? `+ ${request.bonus} bonus` : ''}</TableCell>
                                      <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{request.paymentMethod || '-'}</TableCell>
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
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            ) : null}

            {/* Admin Management Tab */}
            {tabValue === 1 && isAdmin ? (
              <Box>
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
                  Ödeme Yönetimi
                </Typography>

                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 2,
                    fontSize: '14px',
                  }}
                >
                  Kredi paketlerini ve kripto para birimlerini yönetin.
                </Typography>

                {/* Payment Packages Management */}
                <Card sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 500 }}>
                        Kredi Paketleri
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => {
                          setEditingPackage(null);
                          setPackageForm({ name: '', credits: 0, price: 0, currency: 'TRY', bonus: 0, isActive: true });
                          setPackageDialogOpen(true);
                        }}
                        sx={{
                          background: 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)',
                          boxShadow: '0 6px 20px rgba(30, 64, 175, 0.3)',
                          borderRadius: 2,
                          padding: '6px 16px',
                          fontSize: '12px',
                          fontWeight: 500,
                          textTransform: 'none',
                        }}
                      >
                        Yeni Paket
                      </Button>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Paket Adı</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Kredi</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Fiyat</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Bonus</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Durum</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>İşlemler</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {packages.map((pkg: any) => (
                            <TableRow key={pkg.id}>
                              <TableCell sx={{ fontSize: '12px' }}>{pkg.name}</TableCell>
                              <TableCell sx={{ fontSize: '12px' }}>{pkg.credits}</TableCell>
                              <TableCell sx={{ fontSize: '12px' }}>{pkg.price} {pkg.currency}</TableCell>
                              <TableCell sx={{ fontSize: '12px' }}>{pkg.bonus || 0}</TableCell>
                              <TableCell sx={{ fontSize: '12px' }}>
                                <Chip
                                  label={pkg.isActive !== false ? 'Aktif' : 'Pasif'}
                                  color={pkg.isActive !== false ? 'success' : 'default'}
                                  size="small"
                                  sx={{ fontSize: '0.65rem', height: 20 }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px' }}>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditingPackage(pkg);
                                    setPackageForm({ name: pkg.name, credits: pkg.credits, price: pkg.price, currency: pkg.currency, bonus: pkg.bonus || 0, isActive: pkg.isActive !== false });
                                    setPackageDialogOpen(true);
                                  }}
                                  sx={{ p: 0.5 }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={async () => {
                                    if (confirm('Bu paketi silmek istediğinizden emin misiniz?')) {
                                      try {
                                        await api.delete(`/admin/payment-packages/${pkg.id}`);
                                        loadPackages();
                                        setSuccess('Paket başarıyla silindi');
                                      } catch (err: any) {
                                        setError(err.response?.data?.message || 'Paket silinirken hata oluştu');
                                      }
                                    }
                                  }}
                                  sx={{ p: 0.5, ml: 1 }}
                                >
                                  <Delete fontSize="small" color="error" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>

                {/* Crypto Currencies Management */}
                <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 500 }}>
                        Kripto Para Birimleri
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => {
                          setEditingCrypto(null);
                          setCryptoForm({ symbol: '', name: '', decimals: 18, minAmount: 0, networkFee: 0, confirmations: 3, walletAddress: '', isActive: true });
                          setCryptoDialogOpen(true);
                        }}
                        sx={{
                          background: 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)',
                          boxShadow: '0 6px 20px rgba(30, 64, 175, 0.3)',
                          borderRadius: 2,
                          padding: '6px 16px',
                          fontSize: '12px',
                          fontWeight: 500,
                          textTransform: 'none',
                        }}
                      >
                        Yeni Kripto Para
                      </Button>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Sembol</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Ad</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Cüzdan Adresi</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Min Tutar</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Ağ Ücreti</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Durum</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>İşlemler</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {currencies.map((crypto: any) => (
                            <TableRow key={crypto.id || crypto.symbol}>
                              <TableCell sx={{ fontSize: '12px' }}>{crypto.symbol}</TableCell>
                              <TableCell sx={{ fontSize: '12px' }}>{crypto.name}</TableCell>
                              <TableCell sx={{ fontSize: '12px', fontFamily: 'monospace' }}>
                                {crypto.walletAddress ? `${crypto.walletAddress.substring(0, 20)}...` : '-'}
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px' }}>{crypto.minAmount}</TableCell>
                              <TableCell sx={{ fontSize: '12px' }}>{crypto.networkFee}</TableCell>
                              <TableCell sx={{ fontSize: '12px' }}>
                                <Chip
                                  label={crypto.isActive !== false ? 'Aktif' : 'Pasif'}
                                  color={crypto.isActive !== false ? 'success' : 'default'}
                                  size="small"
                                  sx={{ fontSize: '0.65rem', height: 20 }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px' }}>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditingCrypto(crypto);
                                    setCryptoForm({ 
                                      symbol: crypto.symbol, 
                                      name: crypto.name, 
                                      decimals: crypto.decimals || 18, 
                                      minAmount: crypto.minAmount || 0, 
                                      networkFee: crypto.networkFee || 0, 
                                      confirmations: crypto.confirmations || 3, 
                                      walletAddress: crypto.walletAddress || '', 
                                      isActive: crypto.isActive !== false 
                                    });
                                    setCryptoDialogOpen(true);
                                  }}
                                  sx={{ p: 0.5 }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={async () => {
                                    if (confirm('Bu kripto para birimini silmek istediğinizden emin misiniz?')) {
                                      try {
                                        await api.delete(`/admin/crypto-currencies/${crypto.id || crypto.symbol}`);
                                        loadCurrencies();
                                        setSuccess('Kripto para birimi başarıyla silindi');
                                      } catch (err: any) {
                                        setError(err.response?.data?.message || 'Kripto para birimi silinirken hata oluştu');
                                      }
                                    }
                                  }}
                                  sx={{ p: 0.5, ml: 1 }}
                                >
                                  <Delete fontSize="small" color="error" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Box>
            ) : null}

            {/* Package Dialog */}
            <Dialog open={packageDialogOpen} onClose={() => setPackageDialogOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle>{editingPackage ? 'Paket Düzenle' : 'Yeni Paket'}</DialogTitle>
              <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  <TextField
                    label="Paket Adı"
                    value={packageForm.name}
                    onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Kredi"
                    type="number"
                    value={packageForm.credits}
                    onChange={(e) => setPackageForm({ ...packageForm, credits: parseInt(e.target.value) || 0 })}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Fiyat"
                    type="number"
                    value={packageForm.price}
                    onChange={(e) => setPackageForm({ ...packageForm, price: parseFloat(e.target.value) || 0 })}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Para Birimi"
                    value={packageForm.currency}
                    onChange={(e) => setPackageForm({ ...packageForm, currency: e.target.value })}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Bonus"
                    type="number"
                    value={packageForm.bonus}
                    onChange={(e) => setPackageForm({ ...packageForm, bonus: parseInt(e.target.value) || 0 })}
                    fullWidth
                    size="small"
                  />
                  <FormControl fullWidth size="small">
                    <InputLabel>Durum</InputLabel>
                    <Select
                      value={packageForm.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setPackageForm({ ...packageForm, isActive: e.target.value === 'active' })}
                      label="Durum"
                    >
                      <MenuItem value="active">Aktif</MenuItem>
                      <MenuItem value="inactive">Pasif</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setPackageDialogOpen(false)}>İptal</Button>
                <Button onClick={handleSavePackage} variant="contained" disabled={loading}>
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Crypto Dialog */}
            <Dialog open={cryptoDialogOpen} onClose={() => setCryptoDialogOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle>{editingCrypto ? 'Kripto Para Düzenle' : 'Yeni Kripto Para'}</DialogTitle>
              <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  <TextField
                    label="Sembol"
                    value={cryptoForm.symbol}
                    onChange={(e) => setCryptoForm({ ...cryptoForm, symbol: e.target.value.toUpperCase() })}
                    fullWidth
                    size="small"
                    disabled={!!editingCrypto}
                  />
                  <TextField
                    label="Ad"
                    value={cryptoForm.name}
                    onChange={(e) => setCryptoForm({ ...cryptoForm, name: e.target.value })}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Cüzdan Adresi"
                    value={cryptoForm.walletAddress}
                    onChange={(e) => setCryptoForm({ ...cryptoForm, walletAddress: e.target.value })}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Min Tutar"
                    type="number"
                    value={cryptoForm.minAmount}
                    onChange={(e) => setCryptoForm({ ...cryptoForm, minAmount: parseFloat(e.target.value) || 0 })}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Ağ Ücreti"
                    type="number"
                    value={cryptoForm.networkFee}
                    onChange={(e) => setCryptoForm({ ...cryptoForm, networkFee: parseFloat(e.target.value) || 0 })}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Onay Sayısı"
                    type="number"
                    value={cryptoForm.confirmations}
                    onChange={(e) => setCryptoForm({ ...cryptoForm, confirmations: parseInt(e.target.value) || 3 })}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Decimals"
                    type="number"
                    value={cryptoForm.decimals}
                    onChange={(e) => setCryptoForm({ ...cryptoForm, decimals: parseInt(e.target.value) || 18 })}
                    fullWidth
                    size="small"
                  />
                  <FormControl fullWidth size="small">
                    <InputLabel>Durum</InputLabel>
                    <Select
                      value={cryptoForm.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setCryptoForm({ ...cryptoForm, isActive: e.target.value === 'active' })}
                      label="Durum"
                    >
                      <MenuItem value="active">Aktif</MenuItem>
                      <MenuItem value="inactive">Pasif</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setCryptoDialogOpen(false)}>İptal</Button>
                <Button onClick={handleSaveCrypto} variant="contained" disabled={loading}>
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle>Ödeme Talebini Onayla</DialogTitle>
              <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  {selectedRequest && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Kullanıcı: <strong>{selectedRequest.user?.username || '-'}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Tutar: <strong>{Number(selectedRequest.amount)} {selectedRequest.currency || 'TRY'}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Kredi: <strong>{selectedRequest.credits} SMS</strong>
                      </Typography>
                    </Box>
                  )}
                  <TextField
                    label="Admin Notu (Opsiyonel)"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                  />
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setApproveDialogOpen(false)}>İptal</Button>
                <Button onClick={handleApproveRequest} variant="contained" color="success" disabled={loading}>
                  {loading ? 'Onaylanıyor...' : 'Onayla'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle>Ödeme Talebini Reddet</DialogTitle>
              <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  {selectedRequest && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Kullanıcı: <strong>{selectedRequest.user?.username || '-'}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Tutar: <strong>{Number(selectedRequest.amount)} {selectedRequest.currency || 'TRY'}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Kredi: <strong>{selectedRequest.credits} SMS</strong>
                      </Typography>
                    </Box>
                  )}
                  <TextField
                    label="Red Sebebi *"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                    required
                    error={!rejectionReason}
                  />
                  <TextField
                    label="Admin Notu (Opsiyonel)"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                  />
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setRejectDialogOpen(false)}>İptal</Button>
                <Button onClick={handleRejectRequest} variant="contained" color="error" disabled={loading || !rejectionReason}>
                  {loading ? 'Reddediliyor...' : 'Reddet'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Payment Request Detail Dialog */}
            <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
              <DialogTitle>Ödeme Talebi Detayları</DialogTitle>
              <DialogContent>
                {selectedRequest && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 0.5 }}>
                          Kullanıcı Bilgileri
                        </Typography>
                        <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: alpha('#1e40af', 0.05) }}>
                          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                            <strong>Kullanıcı Adı:</strong> {selectedRequest.user?.username || '-'}
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                            <strong>Email:</strong> {selectedRequest.user?.email || '-'}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 0.5 }}>
                          Ödeme Bilgileri
                        </Typography>
                        <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: alpha('#4caf50', 0.05) }}>
                          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                            <strong>Tutar:</strong> {Number(selectedRequest.amount)} {selectedRequest.currency || 'TRY'}
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                            <strong>Kredi:</strong> {selectedRequest.credits} SMS
                          </Typography>
                          {selectedRequest.bonus > 0 && (
                            <Typography variant="body2" sx={{ fontSize: '12px', mb: 0.5 }}>
                              <strong>Bonus:</strong> {selectedRequest.bonus} SMS
                            </Typography>
                          )}
                          <Typography variant="body2" sx={{ fontSize: '12px' }}>
                            <strong>Ödeme Yöntemi:</strong> {selectedRequest.paymentMethod || '-'}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 0.5 }}>
                          Transaction ID
                        </Typography>
                        <TextField
                          fullWidth
                          value={selectedRequest.transactionId || '-'}
                          InputProps={{
                            readOnly: true,
                          }}
                          size="small"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontFamily: 'monospace',
                              fontSize: '12px',
                            },
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 0.5 }}>
                          Durum
                        </Typography>
                        <Chip
                          label={
                            selectedRequest.status === 'approved'
                              ? 'Onaylandı'
                              : selectedRequest.status === 'rejected'
                              ? 'Reddedildi'
                              : 'Beklemede'
                          }
                          color={
                            selectedRequest.status === 'approved'
                              ? 'success'
                              : selectedRequest.status === 'rejected'
                              ? 'error'
                              : 'warning'
                          }
                          size="small"
                          sx={{ fontSize: '12px', fontWeight: 500 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 0.5 }}>
                          Oluşturulma Tarihi
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '12px' }}>
                          <ClientDate date={selectedRequest.createdAt} />
                        </Typography>
                      </Grid>
                      {selectedRequest.approvedAt && (
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 0.5 }}>
                            Onaylanma Tarihi
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '12px' }}>
                            <ClientDate date={selectedRequest.approvedAt} />
                          </Typography>
                        </Grid>
                      )}
                      {selectedRequest.approver && (
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 0.5 }}>
                            Onaylayan
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '12px' }}>
                            {selectedRequest.approver?.username || '-'}
                          </Typography>
                        </Grid>
                      )}
                      {selectedRequest.rejectionReason && (
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 0.5 }}>
                            Red Sebebi
                          </Typography>
                          <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: alpha('#f44336', 0.05) }}>
                            <Typography variant="body2" sx={{ fontSize: '12px' }}>
                              {selectedRequest.rejectionReason}
                            </Typography>
                          </Paper>
                        </Grid>
                      )}
                      {selectedRequest.adminNotes && (
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, mb: 0.5 }}>
                            Admin Notu
                          </Typography>
                          <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: alpha('#ff9800', 0.05) }}>
                            <Typography variant="body2" sx={{ fontSize: '12px' }}>
                              {selectedRequest.adminNotes}
                            </Typography>
                          </Paper>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDetailDialogOpen(false)}>Kapat</Button>
              </DialogActions>
            </Dialog>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}

