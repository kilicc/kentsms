'use client';

import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress, alpha, TextField, Grid } from '@mui/material';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Link, BarChart, ContentCopy, Visibility, Add, OpenInNew, Delete } from '@mui/icons-material';
import ClientDate from '@/components/ClientDate';

interface ShortLink {
  id: string;
  original_url: string;
  short_code: string;
  title: string | null;
  description: string | null;
  click_count: number;
  unique_click_count: number;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

interface ShortLinkClick {
  id: string;
  ip_address: string;
  user_agent: string | null;
  referer: string | null;
  country: string | null;
  city: string | null;
  clicked_at: string;
}

export default function ShortLinksPage() {
  const { api } = useAuth();
  const { mode } = useTheme();
  const [shortLinks, setShortLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<ShortLink | null>(null);
  const [linkStats, setLinkStats] = useState<{ clicks: ShortLinkClick[]; totalClicks: number; uniqueClicks: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadShortLinks();
  }, []);

  const loadShortLinks = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/short-links');
      if (response.data.success) {
        setShortLinks(response.data.data.shortLinks || []);
      } else {
        setError(response.data.message || 'Kısa linkler yüklenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('Short links load error:', error);
      setError(error.response?.data?.message || 'Kısa linkler yüklenirken bir hata oluştu');
      setShortLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStats = async (link: ShortLink) => {
    setSelectedLink(link);
    setStatsDialogOpen(true);
    setLoadingStats(true);
    setError('');

    try {
      const response = await api.get(`/short-links/stats/${link.id}`);
      if (response.data.success) {
        setLinkStats(response.data.data.stats);
      } else {
        setError(response.data.message || 'İstatistikler yüklenirken bir hata oluştu');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'İstatistikler yüklenirken bir hata oluştu');
    } finally {
      setLoadingStats(false);
    }
  };

  const copyShortLink = (shortCode: string) => {
    const shortLinkDomain = process.env.NEXT_PUBLIC_SHORT_LINK_DOMAIN || 'go.finsms.io';
    const shortLink = `https://${shortLinkDomain}/${shortCode}`;
    navigator.clipboard.writeText(shortLink);
    setSuccess('Kısa link kopyalandı!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCreateShortLink = async () => {
    if (!newLinkUrl) {
      setError('URL gerekli');
      return;
    }

    try {
      setCreating(true);
      setError('');
      const response = await api.post('/short-links', {
        originalUrl: newLinkUrl,
        title: newLinkTitle || null,
      });
      if (response.data.success) {
        setSuccess('Kısa link başarıyla oluşturuldu!');
        setNewLinkUrl('');
        setNewLinkTitle('');
        setCreateDialogOpen(false);
        loadShortLinks();
      } else {
        setError(response.data.message || 'Kısa link oluşturulamadı');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kısa link oluşturulamadı');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteShortLink = async (linkId: string, shortCode: string) => {
    if (!confirm(`Bu kısa linki (${shortCode}) silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const response = await api.delete(`/short-links/${linkId}`);
      if (response.data.success) {
        setSuccess('Kısa link başarıyla silindi!');
        loadShortLinks();
      } else {
        setError(response.data.message || 'Kısa link silinemedi');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kısa link silinirken bir hata oluştu');
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, mt: 1 }}>
            <Box>
              <Typography 
                variant="h4" 
                component="h1" 
                gutterBottom 
                sx={{ 
                  color: 'primary.main', 
                  mb: 0.5,
                  fontSize: '18px',
                  fontWeight: 600,
                }}
              >
                Kısa Linklerim
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  fontSize: '12px',
                }}
              >
                Oluşturduğunuz kısa linkleri görüntüleyin ve IP tabanlı istatistiklerini kontrol edin.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)',
                borderRadius: 1.5,
                padding: '8px 20px',
                fontWeight: 500,
                fontSize: '13px',
                textTransform: 'none',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(25, 118, 210, 0.35)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.3s',
              }}
            >
              Yeni Kısa Link
            </Button>
          </Box>

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

          <Paper sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
                <CircularProgress />
              </Box>
            ) : shortLinks.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Henüz kısa link oluşturulmamış. SMS gönder sayfasından kısa link oluşturabilirsiniz.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kısa Link</TableCell>
                      <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Orijinal URL</TableCell>
                      <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Toplam Tıklama</TableCell>
                      <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Benzersiz Tıklama</TableCell>
                      <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Oluşturulma</TableCell>
                      <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>İşlemler</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shortLinks.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontSize: '12px', fontFamily: 'monospace', color: 'primary.main' }}>
                              {process.env.NEXT_PUBLIC_SHORT_LINK_DOMAIN || 'go.finsms.io'}/{link.short_code}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => copyShortLink(link.short_code)}
                              sx={{ p: 0.5 }}
                            >
                              <ContentCopy sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', py: 0.75, maxWidth: 200 }}>
                          <Typography variant="body2" sx={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {link.original_url}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                          <Chip
                            label={link.click_count}
                            size="small"
                            color="primary"
                            sx={{
                              fontSize: '0.65rem',
                              fontWeight: 500,
                              height: 20,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                          <Chip
                            label={link.unique_click_count}
                            size="small"
                            color="success"
                            sx={{
                              fontSize: '0.65rem',
                              fontWeight: 500,
                              height: 20,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                          <ClientDate date={link.created_at} />
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <IconButton
                              size="small"
                              onClick={() => handleViewStats(link)}
                              sx={{ p: 0.5 }}
                              title="İstatistikler"
                            >
                              <BarChart sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteShortLink(link.id, link.short_code)}
                              sx={{ p: 0.5, color: 'error.main' }}
                              title="Sil"
                            >
                              <Delete sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* İstatistik Dialog */}
          <Dialog 
            open={statsDialogOpen} 
            onClose={() => {
              setStatsDialogOpen(false);
              setSelectedLink(null);
              setLinkStats(null);
            }} 
            maxWidth="md" 
            fullWidth
          >
            <DialogTitle sx={{ fontSize: '16px', fontWeight: 600, pb: 1 }}>
              Kısa Link İstatistikleri
            </DialogTitle>
            <DialogContent sx={{ pt: 1.5 }}>
              {selectedLink && (
                <Box sx={{ mb: 3 }}>
                  <Paper
                    sx={{
                      p: 2,
                      mb: 2,
                      bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                      borderRadius: 1.5,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px', mb: 1 }}>
                      <strong>Kısa Link:</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '13px', fontFamily: 'monospace', color: 'primary.main', mb: 1.5 }}>
                      {process.env.NEXT_PUBLIC_SHORT_LINK_DOMAIN || 'go.finsms.io'}/{selectedLink.short_code}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px', mb: 1 }}>
                      <strong>Orijinal URL:</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all', mb: 1.5 }}>
                      {selectedLink.original_url}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1.5 }}>
                      <Chip
                        label={`Toplam Tıklama: ${linkStats?.totalClicks || 0}`}
                        color="primary"
                        size="small"
                        sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                      />
                      <Chip
                        label={`Benzersiz IP: ${linkStats?.uniqueClicks || 0}`}
                        color="success"
                        size="small"
                        sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                      />
                    </Box>
                  </Paper>
                </Box>
              )}

              {loadingStats ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress />
                </Box>
              ) : linkStats && linkStats.clicks.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>#</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>IP Adresi</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Tarih</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Referer</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>User Agent</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {linkStats.clicks.map((click, index) => (
                        <TableRow key={click.id}>
                          <TableCell sx={{ fontSize: '12px' }}>{index + 1}</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontFamily: 'monospace' }}>
                            <Chip
                              label={click.ip_address}
                              size="small"
                              color="primary"
                              sx={{
                                fontSize: '0.7rem',
                                fontFamily: 'monospace',
                                height: 22,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>
                            <ClientDate date={click.clicked_at} />
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px', maxWidth: 200 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: '11px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {click.referer || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px', maxWidth: 200 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: '11px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {click.user_agent || '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  Henüz tıklama kaydı yok.
                </Typography>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 1.5 }}>
              <Button size="small" onClick={() => {
                setStatsDialogOpen(false);
                setSelectedLink(null);
                setLinkStats(null);
              }} sx={{ fontSize: '12px' }}>
                Kapat
              </Button>
            </DialogActions>
          </Dialog>

          {/* Kısa Link Oluştur Dialog */}
          <Dialog
            open={createDialogOpen}
            onClose={() => {
              setCreateDialogOpen(false);
              setNewLinkUrl('');
              setNewLinkTitle('');
            }}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Link sx={{ color: 'primary.main' }} />
                <Typography variant="h6">Yeni Kısa Link Oluştur</Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 1 }}>
                <TextField
                  fullWidth
                  label="Orijinal URL"
                  variant="outlined"
                  size="small"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  sx={{ mb: 2 }}
                  required
                />
                <TextField
                  fullWidth
                  label="Başlık (Opsiyonel)"
                  variant="outlined"
                  size="small"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  placeholder="Kısa link başlığı"
                  sx={{ mb: 2 }}
                />
                <Alert severity="info" sx={{ fontSize: '12px', mb: 1 }}>
                  Kısa linkiniz <strong>go.finsms.io</strong> adresi üzerinden oluşturulacak ve IP tabanlı istatistikler takip edilecektir.
                </Alert>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 1.5 }}>
              <Button
                size="small"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setNewLinkUrl('');
                  setNewLinkTitle('');
                }}
                sx={{ fontSize: '12px' }}
              >
                İptal
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleCreateShortLink}
                disabled={creating || !newLinkUrl}
                sx={{ fontSize: '12px' }}
              >
                {creating ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}

