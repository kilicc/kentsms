'use client';

import { Box, Container, Typography, Paper, TextField, Button, Grid, Alert, FormControl, InputLabel, Select, MenuItem, Chip, IconButton } from '@mui/material';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { Send, Description, Close } from '@mui/icons-material';

interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
}

export default function SMSInterfacePage() {
  const { api } = useAuth();
  const [formData, setFormData] = useState({
    phone: '',
    message: '',
  });
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTemplates();
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
    setLoading(true);

    try {
      const response = await api.post('/sms/send', {
        phone: formData.phone,
        message: formData.message,
        serviceName: 'CepSMS',
      });

      if (response.data.success) {
        setSuccess('SMS başarıyla gönderildi');
        setFormData({ phone: '', message: '' });
        // Success mesajını 3 saniye sonra otomatik kapat
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'SMS gönderim hatası');
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
              CepSMS servisini kullanarak tek bir telefon numarasına SMS gönderin.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                {success}
              </Alert>
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
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="905xxxxxxxxx"
                      required
                      helperText="Telefon numarasını 90 veya 5 ile başlayarak girin (örn: 905551234567)"
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
                        setFormData({ ...formData, message: e.target.value });
                        if (selectedTemplateId) {
                          setSelectedTemplateId('');
                        }
                      }}
                      required
                      helperText={`Mesaj karakter sayısı: ${formData.message.length}`}
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
                      bgcolor: 'rgba(25, 118, 210, 0.05)', 
                      borderRadius: 1.5,
                      mb: 1.5,
                    }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px', mb: 0.5 }}>
                        <strong>Servis:</strong> CepSMS
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                        <strong>Maliyet:</strong> 1 SMS = 1 Kredi
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
                        background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)',
                        borderRadius: 1.5,
                        padding: '8px 20px',
                        fontWeight: 500,
                        fontSize: '14px',
                        textTransform: 'none',
                        '&:hover': {
                          boxShadow: '0 6px 16px rgba(25, 118, 210, 0.35)',
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
        </Box>
      </Box>
    </ProtectedRoute>
  );
}

