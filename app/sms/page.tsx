'use client';

import { Box, Container, Typography, Paper, TextField, Button, Grid, Alert, FormControl, InputLabel, Select, MenuItem, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress, CircularProgress } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Send, Description, Close, Link, ContentCopy, BarChart, OpenInNew, Add, CheckCircle, Cancel } from '@mui/icons-material';

interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
}

export default function SMSInterfacePage() {
  const { api } = useAuth();
  const { mode } = useTheme();
  const [formData, setFormData] = useState({
    phone: '',
    message: '',
  });
  const MAX_CHARACTERS = 180;
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sendResults, setSendResults] = useState<Array<{
    phone: string;
    original: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const isProcessingRef = useRef(false);
  const [shortLinkEnabled, setShortLinkEnabled] = useState(false);
  const [shortLinkUrl, setShortLinkUrl] = useState('');
  const [shortLinkDialogOpen, setShortLinkDialogOpen] = useState(false);
  const [shortLinkStats, setShortLinkStats] = useState<any>(null);
  const [createdShortLink, setCreatedShortLink] = useState<{ shortCode: string; originalUrl: string; shortLink: string } | null>(null);
  const [shortLinks, setShortLinks] = useState<any[]>([]);
  const [loadingShortLinks, setLoadingShortLinks] = useState(false);
  const [selectedShortLinkId, setSelectedShortLinkId] = useState<string>('');
  const [shortLinkSelectDialogOpen, setShortLinkSelectDialogOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadShortLinks();
  }, []);

  // Sayfa ayrılmayı engelle (işlem devam ederken)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessingRef.current) {
        e.preventDefault();
        e.returnValue = 'SMS gönderimi devam ediyor. Sayfadan ayrılmak istediğinize emin misiniz?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await api.get('/sms-templates');
      if (response.data.success) {
        setTemplates(response.data.data.templates || []);
      }
    } catch (error) {
      console.error('Templates load error:', error);
    }
  };

  const loadShortLinks = async () => {
    try {
      setLoadingShortLinks(true);
      const response = await api.get('/short-links');
      if (response.data.success) {
        setShortLinks(response.data.data.shortLinks || []);
      }
    } catch (error) {
      console.error('Short links load error:', error);
    } finally {
      setLoadingShortLinks(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setFormData({ ...formData, message: template.content });
      }
    } else {
      setFormData({ ...formData, message: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSendResults([]);
    setLoading(true);
    isProcessingRef.current = true;

    // Telefon numaralarını say
    const phoneNumbers = formData.phone.split(/[,\n]/).map((p: string) => p.trim()).filter((p: string) => p);
    const totalPhones = phoneNumbers.length;
    setProgress({ current: 0, total: totalPhones, percentage: 0 });

    try {
      const response = await api.post('/sms/send', {
        phone: formData.phone,
        message: formData.message,
        serviceName: 'CepSMS',
      });

      if (response.data.data?.results) {
        // Sonuçları göster
        setSendResults(response.data.data.results);
        setProgress({ current: totalPhones, total: totalPhones, percentage: 100 });
        
        const totalSent = response.data.data.totalSent || 0;
        const totalFailed = response.data.data.totalFailed || 0;
        
        if (totalSent > 0) {
          setSuccess(`${totalSent} SMS başarıyla gönderildi${totalFailed > 0 ? `, ${totalFailed} SMS gönderilemedi` : ''}`);
        } else {
          setError(`${totalFailed} SMS gönderilemedi`);
        }
        
        // Mesajları 5 saniye sonra otomatik kapat
        setTimeout(() => {
          setSuccess('');
          setError('');
        }, 5000);
      } else if (response.data.success) {
        setProgress({ current: totalPhones, total: totalPhones, percentage: 100 });
        setSuccess('SMS başarıyla gönderildi');
        setFormData({ phone: '', message: '' });
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        setError(response.data.message || 'SMS gönderim hatası');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'SMS gönderim hatası');
      if (err.response?.data?.data?.results) {
        setSendResults(err.response.data.data.results);
        const results = err.response.data.data.results;
        setProgress({ current: results.length, total: totalPhones, percentage: (results.length / totalPhones) * 100 });
      }
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
      // Progress'i biraz sonra sıfırla
      setTimeout(() => {
        setProgress({ current: 0, total: 0, percentage: 0 });
      }, 3000);
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
              SMS Gönder
            </Typography>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2,
                fontSize: '12px',
              }}
            >
              KentSMS servisini kullanarak tek bir telefon numarasına SMS gönderin.
            </Typography>

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2, 
                  borderRadius: 2,
                  bgcolor: mode === 'dark' ? '#c62828' : '#b71c1c',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '15px',
                  py: 2,
                  px: 2,
                  boxShadow: '0 4px 12px rgba(183, 28, 28, 0.5)',
                  border: '2px solid #ffffff',
                  '& .MuiAlert-icon': {
                    color: '#ffffff',
                    fontSize: '24px',
                  },
                  '& .MuiAlert-message': {
                    fontWeight: 700,
                    fontSize: '15px',
                  },
                }}
              >
                {error}
              </Alert>
            )}

            {success && (
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 2, 
                  borderRadius: 2,
                  bgcolor: mode === 'dark' ? '#1b5e20' : '#1b5e20',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '15px',
                  py: 2,
                  px: 2,
                  boxShadow: '0 4px 12px rgba(27, 94, 32, 0.5)',
                  border: '2px solid #ffffff',
                  '& .MuiAlert-icon': {
                    color: '#ffffff',
                    fontSize: '24px',
                  },
                  '& .MuiAlert-message': {
                    fontWeight: 700,
                    fontSize: '15px',
                  },
                }}
              >
                {success}
              </Alert>
            )}

            {/* Progress Indicator */}
            {loading && progress.total > 0 && (
              <Paper sx={{ p: 2, mb: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 600 }}>
                    SMS gönderiliyor... Lütfen sayfadan ayrılmayın!
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={progress.percentage} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                    },
                  }} 
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontSize: '12px' }}>
                  {progress.current} / {progress.total} numara işlendi ({Math.round(progress.percentage)}%)
                </Typography>
              </Paper>
            )}

            <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Telefon Numarası"
                      variant="outlined"
                      size="small"
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Birden fazla numara girişi için (virgül veya yeni satır ile ayrılmış)
                        // 905**, 05**, 5**, +905** formatlarını kabul et
                        // Maksimum 1,000,000 numara (yaklaşık 20,000,000 karakter)
                        const phoneRegex = /^[\d\s,\n+]*$/;
                        if ((phoneRegex.test(value) || value === '') && value.length <= 20000000) {
                          setFormData({ ...formData, phone: value });
                        }
                      }}
                      placeholder="905xxxxxxxxx, 05xxxxxxxxx, 5xxxxxxxxx veya +905xxxxxxxxx"
                      required
                      multiline
                      rows={8}
                      helperText={`Format: 905**, 05**, 5**, +905** (Birden fazla numara için virgül veya yeni satır kullanın. Maksimum 1,000,000 numara)`}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          fontSize: '14px',
                        },
                      }}
                    />
                  </Grid>

                  {templates.length > 0 && (
                    <Grid size={{ xs: 12 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Şablon Seç</InputLabel>
                        <Select
                          value={selectedTemplateId}
                          label="Şablon Seç"
                          onChange={(e) => handleTemplateSelect(e.target.value)}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1.5,
                              fontSize: '14px',
                            },
                          }}
                          endAdornment={
                            selectedTemplateId ? (
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTemplateSelect('');
                                }}
                                sx={{ mr: 1 }}
                              >
                                <Close fontSize="small" />
                              </IconButton>
                            ) : null
                          }
                        >
                          <MenuItem value="">Şablon Seçme</MenuItem>
                          {templates.map((template) => (
                            <MenuItem key={template.id} value={template.id}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                <Description sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontSize: '13px' }}>
                                    {template.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    {template.category}
                                  </Typography>
                                </Box>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Mesaj İçeriği"
                      variant="outlined"
                      size="small"
                      multiline
                      rows={6}
                      value={formData.message}
                      onChange={(e) => {
                        const value = e.target.value;
                        // 180 karakter limiti
                        if (value.length <= MAX_CHARACTERS) {
                          setFormData({ ...formData, message: value });
                          if (selectedTemplateId) {
                            setSelectedTemplateId('');
                          }
                        }
                      }}
                      required
                      inputProps={{
                        maxLength: MAX_CHARACTERS,
                      }}
                      helperText={`${MAX_CHARACTERS - formData.message.length} karakter kaldı (180 karakter = 1 kredi)`}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          fontSize: '14px',
                        },
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ 
                      p: 1.5, 
                      bgcolor: 'rgba(30, 64, 175, 0.05)', 
                      borderRadius: 1.5,
                      mb: 1.5,
                    }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                        <strong>Maliyet:</strong> 180 karakter = 1 Kredi
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px', mt: 0.5 }}>
                        <strong>Mesaj Uzunluğu:</strong> {formData.message.length} / {MAX_CHARACTERS} karakter
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px', mt: 0.5 }}>
                        <strong>Tahmini Kredi:</strong> {Math.ceil(formData.message.length / MAX_CHARACTERS) || 0} kredi
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="small"
                      startIcon={<Send />}
                      disabled={loading}
                      fullWidth
                      sx={{
                        background: 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)',
                        boxShadow: '0 4px 12px rgba(30, 64, 175, 0.25)',
                        borderRadius: 1.5,
                        padding: '8px 20px',
                        fontWeight: 500,
                        fontSize: '14px',
                        textTransform: 'none',
                        '&:hover': {
                          boxShadow: '0 6px 16px rgba(30, 64, 175, 0.35)',
                          transform: 'translateY(-1px)',
                        },
                        transition: 'all 0.3s',
                      }}
                    >
                      {loading ? 'Gönderiliyor...' : 'SMS Gönder'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Paper>

            {/* SMS Gönderim Sonuçları */}
            {sendResults.length > 0 && (
              <Paper sx={{ p: 2, mt: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <Typography variant="h6" sx={{ mb: 2, fontSize: '16px', fontWeight: 600 }}>
                  Gönderim Sonuçları
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: '13px', fontWeight: 600 }}>Durum</TableCell>
                        <TableCell sx={{ fontSize: '13px', fontWeight: 600 }}>Telefon Numarası</TableCell>
                        <TableCell sx={{ fontSize: '13px', fontWeight: 600 }}>Mesaj</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sendResults.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {result.success ? (
                              <CheckCircle sx={{ color: '#4caf50', fontSize: 24 }} />
                            ) : (
                              <Cancel sx={{ color: '#f44336', fontSize: 24 }} />
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: '13px', fontFamily: 'monospace' }}>
                            {result.original}
                          </TableCell>
                          <TableCell sx={{ fontSize: '13px' }}>
                            {result.success ? (
                              <Chip 
                                label="Başarılı" 
                                size="small" 
                                sx={{ 
                                  bgcolor: '#4caf50', 
                                  color: '#ffffff',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }} 
                              />
                            ) : (
                              <Chip 
                                label={result.error || 'Hata'} 
                                size="small" 
                                sx={{ 
                                  bgcolor: '#f44336', 
                                  color: '#ffffff',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }} 
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}
        </Box>

        {/* Kısa Link Oluşturuldu Dialog */}
        <Dialog
          open={shortLinkDialogOpen}
          onClose={() => {
            setShortLinkDialogOpen(false);
            setCreatedShortLink(null);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Link sx={{ color: 'primary.main' }} />
              <Typography variant="h6">Short link successfully created</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {createdShortLink && (
              <Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '13px', fontWeight: 600 }}>
                    Long URL:
                  </Typography>
                  <Paper
                    sx={{
                      p: 1.5,
                      bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                      borderRadius: 1,
                      wordBreak: 'break-all',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontSize: '13px', fontFamily: 'monospace' }}>
                      {createdShortLink.originalUrl}
                    </Typography>
                  </Paper>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '13px', fontWeight: 600 }}>
                    Generated Link:
                  </Typography>
                  <Paper
                    sx={{
                      p: 1.5,
                      bgcolor: mode === 'dark' ? 'rgba(30, 64, 175, 0.1)' : 'rgba(30, 64, 175, 0.05)',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'primary.main',
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: '18px',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: 'primary.main',
                        wordBreak: 'break-all',
                      }}
                    >
                      {createdShortLink.shortLink}
                    </Typography>
                  </Paper>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<ContentCopy />}
                    onClick={() => {
                      navigator.clipboard.writeText(createdShortLink.shortLink);
                      setSuccess('Kısa link kopyalandı!');
                      setTimeout(() => setSuccess(''), 3000);
                    }}
                    sx={{ flex: 1, minWidth: '120px' }}
                  >
                    Copy
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<OpenInNew />}
                    onClick={() => {
                      window.open(createdShortLink.originalUrl, '_blank');
                    }}
                    sx={{ flex: 1, minWidth: '120px' }}
                  >
                    Go
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<BarChart />}
                    onClick={() => {
                      window.open(`/short-links`, '_blank');
                    }}
                    sx={{ flex: 1, minWidth: '120px' }}
                  >
                    Statistics
                  </Button>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => {
                      const newMessage = formData.message + ' ' + createdShortLink.shortLink;
                      // 180 karakter limiti kontrolü
                      if (newMessage.length <= MAX_CHARACTERS) {
                        setFormData({ ...formData, message: newMessage });
                        setSuccess('Kısa link mesaja eklendi!');
                        setShortLinkDialogOpen(false);
                        setCreatedShortLink(null);
                      } else {
                        setError('Kısa link eklendiğinde mesaj 180 karakteri aşıyor!');
                      }
                    }}
                  >
                    Mesaja Ekle
                  </Button>
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', fontSize: '11px', fontStyle: 'italic', textAlign: 'center' }}>
                  Your links will be shortened via <strong>go.kentsms.com</strong> address.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setShortLinkDialogOpen(false);
              setCreatedShortLink(null);
            }}>
              Kapat
            </Button>
          </DialogActions>
        </Dialog>

        {/* Kısa Link Seçimi ve Oluşturma Dialog */}
        <Dialog
          open={shortLinkSelectDialogOpen}
          onClose={() => {
            setShortLinkSelectDialogOpen(false);
            setShortLinkUrl('');
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Link sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600 }}>
                  Kısa Link Oluştur
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => {
                  setShortLinkSelectDialogOpen(false);
                  setShortLinkUrl('');
                }}
              >
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box>
              <TextField
                fullWidth
                size="small"
                label="URL"
                value={shortLinkUrl}
                onChange={(e) => setShortLinkUrl(e.target.value)}
                placeholder="https://example.com"
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    fontSize: '14px',
                  },
                }}
              />
              <Alert 
                severity="info" 
                sx={{ 
                  fontSize: '14px', 
                  mb: 2,
                  bgcolor: mode === 'dark' ? '#1565c0' : '#0d47a1',
                  color: '#ffffff',
                  fontWeight: 600,
                  py: 1.5,
                  px: 2,
                  boxShadow: '0 2px 8px rgba(13, 71, 161, 0.4)',
                  border: '2px solid #ffffff',
                  '& .MuiAlert-icon': {
                    color: '#ffffff',
                  },
                }}
              >
                Kısa linkiniz <strong>go.kentsms.com</strong> adresi üzerinden oluşturulacak ve IP tabanlı istatistikler takip edilecektir.
              </Alert>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 2, pb: 1.5 }}>
            <Button
              onClick={() => {
                setShortLinkSelectDialogOpen(false);
                setShortLinkUrl('');
              }}
              variant="outlined"
              size="small"
              sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '12px' }}
            >
              İptal
            </Button>
            <Button
              onClick={async () => {
                if (!shortLinkUrl) {
                  setError('URL gerekli');
                  return;
                }
                try {
                  const response = await api.post('/short-links', {
                    originalUrl: shortLinkUrl,
                    title: 'SMS Kısa Link',
                  });
                  if (response.data.success) {
                    const shortCode = response.data.data.shortLink.short_code;
                    const shortLinkDomain = process.env.NEXT_PUBLIC_SHORT_LINK_DOMAIN || 'go.kentsms.com';
                    const normalizedDomain = shortLinkDomain.startsWith('http')
                      ? shortLinkDomain
                      : `https://${shortLinkDomain}`;
                    const normalizedBase = normalizedDomain.endsWith('/')
                      ? normalizedDomain.slice(0, -1)
                      : normalizedDomain;
                    const shortLink = `${normalizedBase}/${shortCode}`;
                    
                    // Dialog'u aç ve oluşturulan linki göster
                    setCreatedShortLink({
                      shortCode,
                      originalUrl: shortLinkUrl,
                      shortLink,
                    });
                    setShortLinkSelectDialogOpen(false);
                    setShortLinkDialogOpen(true);
                    setShortLinkUrl('');
                    loadShortLinks(); // Listeyi yenile
                  }
                } catch (err: any) {
                  setError(err.response?.data?.message || 'Kısa link oluşturulamadı');
                }
              }}
              variant="contained"
              size="small"
              disabled={!shortLinkUrl}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '12px' }}
            >
              Oluştur
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ProtectedRoute>
  );
}

