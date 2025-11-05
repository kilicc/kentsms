'use client';

import { Box, Container, Typography, Paper, Grid, Card, CardContent, Button, TextField, Select, MenuItem, FormControl, InputLabel, Alert, Chip, Divider, alpha, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import React from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { AccountBalanceWallet, QrCode, Info, CheckCircle, Warning } from '@mui/icons-material';
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
  symbol: string;
  name: string;
  decimals: number;
  minAmount: number;
  networkFee: number;
  confirmations: number;
}

export default function CryptoPaymentPage() {
  const { api } = useAuth();
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

  useEffect(() => {
    loadPackages();
    loadCurrencies();
    loadPaymentRequests();
  }, []);

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
    try {
      setLoadingRequests(true);
      const response = await api.get('/payment-requests');
      if (response.data.success) {
        setPaymentRequests(response.data.data.requests || []);
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
              Kripto Ödeme
            </Typography>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 3,
                fontSize: '14px',
              }}
            >
              Kripto para ile SMS kredisi satın alın. Kredi paketlerinden birini seçin ve ödeme yapın.
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

            {/* Paket Seçimi - Tam Genişlik */}
            <Card 
              sx={{ 
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                mb: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{
                    fontSize: '20px',
                    fontWeight: 500,
                    mb: 3,
                  }}
                >
                  Kredi Paketi Seç
                </Typography>
                <Grid container spacing={2}>
                  {packages.map((pkg) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3, lg: 2.4 }} key={pkg.id}>
                          <Card
                            sx={{
                              border: selectedPackage === pkg.id ? '2px solid #1976d2' : '1px solid rgba(0,0,0,0.12)',
                              cursor: 'pointer',
                              background: selectedPackage === pkg.id 
                                ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)'
                                : 'white',
                              borderRadius: 2,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              transition: 'all 0.2s',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              },
                            }}
                            onClick={() => handlePackageSelect(pkg.id)}
                          >
                            <CardContent sx={{ p: 2 }}>
                              <Typography 
                                variant="h6"
                                sx={{
                                  fontSize: '16px',
                                  fontWeight: 500,
                                  mb: 1,
                                }}
                              >
                                {pkg.name}
                              </Typography>
                              <Typography 
                                variant="h5" 
                                color="primary"
                                sx={{
                                  fontSize: '24px',
                                  fontWeight: 600,
                                  mb: 0.5,
                                }}
                              >
                                {pkg.credits} SMS
                              </Typography>
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{
                                  fontSize: '13px',
                                  mb: 1,
                                }}
                              >
                                {pkg.price} {pkg.currency}
                              </Typography>
                              {pkg.bonus > 0 && (
                                <Chip
                                  label={`+${pkg.bonus} Bonus`}
                                  color="success"
                                  size="small"
                                  sx={{ 
                                    fontSize: '0.7rem',
                                    fontWeight: 500,
                                    height: 20,
                                  }}
                                />
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                </Grid>
              </CardContent>
            </Card>

            {/* Kripto Para Seçimi ve Ödeme Oluştur */}
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card 
                  sx={{ 
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Typography 
                      variant="h6" 
                      gutterBottom
                      sx={{
                        fontSize: '20px',
                        fontWeight: 500,
                      }}
                    >
                      Kripto Para Seç
                    </Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Kripto Para</InputLabel>
                      <Select
                        value={selectedCurrency}
                        onChange={(e) => handleCurrencySelect(e.target.value)}
                        label="Kripto Para"
                        sx={{
                          borderRadius: 2,
                        }}
                      >
                        {currencies.map((currency) => (
                          <MenuItem key={currency.symbol} value={currency.symbol}>
                            {currency.name} ({currency.symbol})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {cryptoPrice > 0 && selectedPackage && (
                      <Box sx={{ mt: 2 }}>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{
                            fontSize: '14px',
                          }}
                        >
                          Fiyat: {cryptoPrice.toLocaleString('tr-TR')} TRY
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
                        mt: 2,
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
                      Ödeme Oluştur
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Ödeme Detayları - Sayfada gösterilecek */}
            {paymentData && (
              <Grid container spacing={3} sx={{ mt: 3 }} ref={paymentInfoRef}>
                <Grid size={{ xs: 12 }}>
                  <Card
                    sx={{
                      borderRadius: 2,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <CheckCircle sx={{ color: 'success.main', fontSize: 28 }} />
                        <Typography
                          variant="h5"
                          sx={{
                            fontSize: '24px',
                            fontWeight: 600,
                            color: 'primary.main',
                          }}
                        >
                          Ödeme Bilgileri
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      {/* Ödeme Otomatik Doğrulama Bilgilendirmesi */}
                      <Alert
                        severity="info"
                        icon={<Info />}
                        sx={{
                          mb: 3,
                          borderRadius: 2,
                          bgcolor: alpha('#1976d2', 0.1),
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
                          <Box sx={{ mb: 3 }}>
                            <Typography
                              variant="h6"
                              gutterBottom
                              sx={{
                                fontSize: '18px',
                                fontWeight: 500,
                                mb: 2,
                              }}
                            >
                              {paymentData.currency} Cüzdan Adresi
                            </Typography>
                            <TextField
                              fullWidth
                              label="Cüzdan Adresi"
                              value={paymentData.walletAddress}
                              InputProps={{
                                readOnly: true,
                              }}
                              sx={{
                                mb: 2,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  bgcolor: 'white',
                                },
                              }}
                            />
                            <Button
                              fullWidth
                              variant="outlined"
                              onClick={() => {
                                navigator.clipboard.writeText(paymentData.walletAddress);
                                setSuccess('Cüzdan adresi kopyalandı!');
                              }}
                              sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 500,
                              }}
                            >
                              Adresi Kopyala
                            </Button>
                          </Box>

                          <Box>
                            <Typography
                              variant="h6"
                              gutterBottom
                              sx={{
                                fontSize: '18px',
                                fontWeight: 500,
                                mb: 2,
                              }}
                            >
                              QR Kod
                            </Typography>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                p: 2,
                                bgcolor: 'white',
                                borderRadius: 2,
                                border: '1px solid rgba(0,0,0,0.12)',
                              }}
                            >
                              <Image
                                src={paymentData.qrCodeData}
                                alt="QR Code"
                                width={250}
                                height={250}
                                style={{
                                  maxWidth: '100%',
                                  height: 'auto',
                                  borderRadius: 8,
                                }}
                              />
                            </Box>
                          </Box>
                        </Grid>

                        {/* Sağ Panel - Ödeme Bilgileri ve Form */}
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box sx={{ mb: 3 }}>
                            <Typography
                              variant="h6"
                              gutterBottom
                              sx={{
                                fontSize: '18px',
                                fontWeight: 500,
                                mb: 2,
                              }}
                            >
                              Ödeme Miktarı
                            </Typography>
                            <Card
                              sx={{
                                p: 2,
                                bgcolor: 'white',
                                borderRadius: 2,
                                border: '1px solid rgba(0,0,0,0.12)',
                              }}
                            >
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Göndermeniz Gereken Tutar:
                              </Typography>
                              <Typography
                                variant="h5"
                                color="primary"
                                sx={{
                                  fontSize: '28px',
                                  fontWeight: 600,
                                  mb: 1,
                                }}
                              >
                                {paymentData.cryptoAmount} {paymentData.currency}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                ≈ {paymentData.fiatAmount} TRY
                              </Typography>
                            </Card>
                          </Box>

                          <Divider sx={{ my: 3 }} />

                          {/* Transfer Hash/TXID ve Tutar Girişi */}
                          <Typography
                            variant="h6"
                            gutterBottom
                            sx={{
                              fontSize: '18px',
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
                              mb: 3,
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
                              mb: 3,
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
                              background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                              boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
                              borderRadius: 2,
                              padding: '12px 24px',
                              fontWeight: 500,
                              textTransform: 'none',
                              fontSize: '16px',
                              '&:hover': {
                                boxShadow: '0 8px 25px rgba(25, 118, 210, 0.4)',
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
                              fontSize: '18px',
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

            {/* Ödeme Talepleri - En Alta Taşındı */}
            <Card 
              sx={{ 
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                mt: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{
                    fontSize: '20px',
                    fontWeight: 500,
                    mb: 3,
                  }}
                >
                  Ödeme Taleplerim
                </Typography>
                {loadingRequests ? (
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
                          <TableCell>Tutar</TableCell>
                          <TableCell>Kredi</TableCell>
                          <TableCell>Ödeme Yöntemi</TableCell>
                          <TableCell>Durum</TableCell>
                          <TableCell>Oluşturulma</TableCell>
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
                              <TableCell>{Number(request.amount)} {request.currency || 'TRY'}</TableCell>
                              <TableCell>{request.credits} SMS {request.bonus > 0 ? `+ ${request.bonus} bonus` : ''}</TableCell>
                              <TableCell>{request.paymentMethod || '-'}</TableCell>
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
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}

