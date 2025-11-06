'use client';

import { Box, Container, Typography, Paper, TextField, Button, Grid, Alert, Card, CardContent, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip, Divider, alpha, InputAdornment } from '@mui/material';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Send, Group, Person, Add, Delete, Edit, Description, Message, People, CheckCircle, Info, Warning, Star, AutoAwesome, ContentCopy, Search, FilterList } from '@mui/icons-material';
import { gradients } from '@/lib/theme';

interface Contact {
  id: string;
  name: string;
  phone: string;
  groupId?: string;
}

interface ContactGroup {
  id: string;
  name: string;
  color: string;
}

interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
  usageCount: number;
  isActive: boolean;
}

export default function AdvancedSMSPage() {
  const { api } = useAuth();
  const { mode } = useTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [templateId, setTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Template Dialog States
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    content: '',
    category: 'Genel',
    variables: [] as string[],
  });
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);

  useEffect(() => {
    loadContacts();
    loadGroups();
    loadTemplates();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await api.get('/contacts');
      if (response.data.success) {
        setContacts(response.data.data.contacts);
      }
    } catch (error) {
      console.error('Contacts load error:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await api.get('/contact-groups');
      if (response.data.success) {
        setGroups(response.data.data.groups);
      }
    } catch (error) {
      console.error('Groups load error:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await api.get('/sms-templates');
      if (response.data.success) {
        setTemplates(response.data.data.templates);
      }
    } catch (error) {
      console.error('Templates load error:', error);
    }
  };

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroup(groupId);
    if (groupId) {
      // Load contacts in group
      api.get(`/contact-groups/${groupId}/contacts`)
        .then((response) => {
          if (response.data.success) {
            const groupContacts = response.data.data.contacts;
            setSelectedContacts(groupContacts.map((c: Contact) => c.id));
          }
        })
        .catch((error) => {
          console.error('Group contacts error:', error);
        });
    } else {
      setSelectedContacts([]);
    }
  };

  const handleContactToggle = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setMessage(template.content);
        setTemplateId(templateId);
      }
    } else {
      setMessage('');
      setTemplateId('');
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      content: '',
      category: 'Genel',
      variables: [],
    });
    setTemplateDialogOpen(true);
  };

  const handleEditTemplate = (template: SMSTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      content: template.content,
      category: template.category,
      variables: template.variables || [],
    });
    setTemplateDialogOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Bu şablonu silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      const response = await api.delete(`/sms-templates/${templateId}`);
      if (response.data.success) {
        setSuccess('Şablon başarıyla silindi');
        loadTemplates();
        if (selectedTemplateId === templateId) {
          setSelectedTemplateId('');
          setMessage('');
          setTemplateId('');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Şablon silme hatası');
    }
  };

  // Extract variables from template content
  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  };

  const handleTemplateSubmit = async () => {
    if (!templateForm.name || !templateForm.content) {
      setError('Şablon adı ve içeriği gerekli');
      return;
    }

    // Extract variables from content
    const variables = extractVariables(templateForm.content);
    const templateData = {
      ...templateForm,
      variables,
    };

    try {
      if (editingTemplate) {
        // Update template
        const response = await api.put(`/sms-templates/${editingTemplate.id}`, templateData);
        if (response.data.success) {
          setSuccess('Şablon başarıyla güncellendi');
          loadTemplates();
          setTemplateDialogOpen(false);
          setTemplateForm({
            name: '',
            content: '',
            category: 'Genel',
            variables: [],
          });
        }
      } else {
        // Create template
        const response = await api.post('/sms-templates', templateData);
        if (response.data.success) {
          setSuccess('Şablon başarıyla oluşturuldu');
          loadTemplates();
          setTemplateDialogOpen(false);
          setTemplateForm({
            name: '',
            content: '',
            category: 'Genel',
            variables: [],
          });
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Şablon kaydetme hatası');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (selectedContacts.length === 0) {
      setError('En az bir kişi seçmelisiniz');
      return;
    }

    if (!message.trim()) {
      setError('Mesaj içeriği gerekli');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/bulk-sms/send-bulk', {
        contactIds: selectedContacts,
        message,
        templateId: templateId || undefined,
      });

      if (response.data.success) {
        setSuccess(`${response.data.data.sent} SMS başarıyla gönderildi`);
        setMessage('');
        setSelectedContacts([]);
        setSelectedGroup('');
        loadContacts();
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
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Message sx={{ color: 'white', fontSize: 32 }} />
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
                    Gelişmiş SMS
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      fontSize: '14px',
                    }}
                  >
                    Toplu SMS gönderimi, şablon yönetimi ve gelişmiş özellikler
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
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                {success}
              </Alert>
            )}

            <Grid container spacing={3}>
              {/* Sol Panel - Grup/Kişi Seçimi - Modern Tasarım */}
              <Grid size={{ xs: 12, md: 4 }}>
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
                          background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(220, 0, 78, 0.1) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <People sx={{ color: 'primary.main', fontSize: 24 }} />
                      </Box>
                      <Typography 
                        variant="h6" 
                        sx={{
                          fontSize: '18px',
                          fontWeight: 600,
                          color: 'text.primary',
                        }}
                      >
                        Alıcı Seçimi
                      </Typography>
                    </Box>

                    <FormControl fullWidth sx={{ mb: 2.5 }}>
                      <InputLabel sx={{ fontSize: '14px' }}>Grup Seç</InputLabel>
                      <Select
                        value={selectedGroup}
                        onChange={(e) => handleGroupSelect(e.target.value)}
                        label="Grup Seç"
                        startAdornment={
                          <InputAdornment position="start">
                            <Group sx={{ color: 'text.secondary', fontSize: 18, mr: 1 }} />
                          </InputAdornment>
                        }
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
                        <MenuItem value="" sx={{ fontSize: '14px' }}>Tüm Gruplar</MenuItem>
                        {groups.map((group) => (
                          <MenuItem key={group.id} value={group.id} sx={{ fontSize: '14px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: group.color || 'primary.main',
                                }}
                              />
                              {group.name}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Box sx={{ 
                      mb: 2, 
                      p: 1.5, 
                      borderRadius: 2, 
                      background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)',
                      border: '1px solid rgba(25, 118, 210, 0.1)',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
                        <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500 }}>
                          {selectedContacts.length} kişi seçildi
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ 
                      maxHeight: 450, 
                      overflow: 'auto',
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f1f1',
                        borderRadius: '10px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#888',
                        borderRadius: '10px',
                        '&:hover': {
                          background: '#555',
                        },
                      },
                    }}>
                      {contacts.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                          <Person sx={{ color: 'text.secondary', fontSize: 48, mb: 1 }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
                            Henüz kişi eklenmemiş
                          </Typography>
                        </Box>
                      ) : (
                        contacts.map((contact) => (
                          <Card
                            key={contact.id}
                            sx={{
                              mb: 1.5,
                              borderRadius: 2,
                              border: selectedContacts.includes(contact.id)
                                ? '2px solid #1976d2'
                                : '1px solid rgba(0,0,0,0.1)',
                              background: selectedContacts.includes(contact.id)
                                ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.08) 0%, rgba(220, 0, 78, 0.08) 100%)'
                                : 'white',
                              boxShadow: selectedContacts.includes(contact.id)
                                ? '0 4px 12px rgba(25, 118, 210, 0.2)'
                                : '0 1px 4px rgba(0,0,0,0.08)',
                              transition: 'all 0.2s',
                              '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                              },
                            }}
                          >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={selectedContacts.includes(contact.id)}
                                    onChange={() => handleContactToggle(contact.id)}
                                    sx={{
                                      color: 'primary.main',
                                      '&.Mui-checked': {
                                        color: 'primary.main',
                                      },
                                    }}
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 500 }}>
                                      {contact.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
                                      {contact.phone}
                                    </Typography>
                                  </Box>
                                }
                                sx={{ m: 0, width: '100%' }}
                              />
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Sağ Panel - Mesaj Yazma - Modern Tasarım */}
              <Grid size={{ xs: 12, md: 8 }}>
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(220, 0, 78, 0.1) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Edit sx={{ color: 'primary.main', fontSize: 24 }} />
                        </Box>
                        <Typography 
                          variant="h6" 
                          sx={{
                            fontSize: '18px',
                            fontWeight: 600,
                            color: 'text.primary',
                          }}
                        >
                          Mesaj Yaz
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Add />}
                        onClick={handleCreateTemplate}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                          boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                          '&:hover': {
                            boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                            transform: 'translateY(-1px)',
                          },
                          transition: 'all 0.3s',
                        }}
                      >
                        Yeni Şablon
                      </Button>
                    </Box>

                    {/* SMS Şablonları - Modern Tasarım */}
                    <Card
                      sx={{
                        mb: 3,
                        borderRadius: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        background: mode === 'dark' 
                      ? 'linear-gradient(135deg, rgba(30,30,30,0.9) 0%, rgba(42,42,42,0.9) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(250,250,250,0.9) 100%)',
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Description sx={{ color: 'primary.main', fontSize: 20 }} />
                          <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 600 }}>
                            SMS Şablonu
                          </Typography>
                        </Box>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel sx={{ fontSize: '14px' }}>Şablon Seçin</InputLabel>
                          <Select
                            value={selectedTemplateId}
                            onChange={(e) => handleTemplateSelect(e.target.value)}
                            label="Şablon Seçin"
                            startAdornment={
                              <InputAdornment position="start">
                                <Description sx={{ color: 'text.secondary', fontSize: 18, mr: 1 }} />
                              </InputAdornment>
                            }
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
                            <MenuItem value="" sx={{ fontSize: '14px' }}>Şablon Seçin</MenuItem>
                            {templates.map((template) => (
                              <MenuItem 
                                key={template.id} 
                                value={template.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTemplateSelect(template.id);
                                }}
                                sx={{ fontSize: '14px' }}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                  <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                      <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '14px' }}>
                                        {template.name}
                                      </Typography>
                                      {template.usageCount > 0 && (
                                        <Chip
                                          icon={<Star sx={{ fontSize: 12 }} />}
                                          label={template.usageCount}
                                          size="small"
                                          sx={{
                                            height: 20,
                                            fontSize: '0.65rem',
                                            bgcolor: alpha('#ff9800', 0.1),
                                            color: '#ff9800',
                                          }}
                                        />
                                      )}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
                                      {template.category} • {template.usageCount} kullanım
                                    </Typography>
                                  </Box>
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        
                        {/* Template Actions */}
                        {selectedTemplateId && (
                          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Edit />}
                              onClick={() => {
                                const template = templates.find((t) => t.id === selectedTemplateId);
                                if (template) handleEditTemplate(template);
                              }}
                              sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontSize: '13px',
                                fontWeight: 500,
                                flex: 1,
                              }}
                            >
                              Düzenle
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<Delete />}
                              onClick={() => {
                                if (selectedTemplateId) handleDeleteTemplate(selectedTemplateId);
                              }}
                              sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontSize: '13px',
                                fontWeight: 500,
                                flex: 1,
                              }}
                            >
                              Sil
                            </Button>
                          </Box>
                        )}
                        
                        {selectedTemplateId && templates.find((t) => t.id === selectedTemplateId)?.variables && templates.find((t) => t.id === selectedTemplateId)!.variables.length > 0 && (
                          <Box sx={{ 
                            p: 1.5, 
                            borderRadius: 2, 
                            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)',
                            border: '1px solid rgba(25, 118, 210, 0.1)',
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Info sx={{ color: 'primary.main', fontSize: 16 }} />
                              <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500 }}>
                                Şablon Değişkenleri:
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {templates.find((t) => t.id === selectedTemplateId)!.variables.map((variable) => (
                                <Chip
                                  key={variable}
                                  label={`{{${variable}}}`}
                                  size="small"
                                  icon={<ContentCopy sx={{ fontSize: 12 }} />}
                                  onClick={() => {
                                    navigator.clipboard.writeText(`{{${variable}}}`);
                                    setSuccess(`{{${variable}}} kopyalandı!`);
                                  }}
                                  sx={{
                                    fontSize: '0.7rem',
                                    height: 26,
                                    cursor: 'pointer',
                                    '&:hover': {
                                      bgcolor: alpha('#1976d2', 0.1),
                                    },
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </CardContent>
                    </Card>

                    <Box component="form" onSubmit={handleSubmit}>
                      <Card
                        sx={{
                          mb: 3,
                          borderRadius: 2,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          border: '1px solid rgba(0,0,0,0.08)',
                          background: 'background.paper',
                        }}
                      >
                        <CardContent sx={{ p: 2.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Message sx={{ color: 'primary.main', fontSize: 20 }} />
                            <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 600 }}>
                              Mesaj İçeriği
                            </Typography>
                          </Box>
                          <TextField
                            fullWidth
                            label="Mesaj"
                            variant="outlined"
                            multiline
                            rows={10}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                            placeholder="Mesajınızı buraya yazın veya yukarıdan bir şablon seçin..."
                            sx={{ 
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                fontSize: '14px',
                                '&:hover': {
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                  },
                                },
                              },
                            }}
                            InputProps={{
                              sx: {
                                fontFamily: message.includes('{{') ? 'monospace' : 'inherit',
                              },
                            }}
                          />
                          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
                              {message.length} karakter
                            </Typography>
                            {message.length > 160 && (
                              <Chip
                                label={`${Math.ceil(message.length / 160)} SMS`}
                                size="small"
                                color="info"
                                sx={{ fontSize: '0.7rem', height: 22 }}
                              />
                            )}
                          </Box>
                        </CardContent>
                      </Card>

                      <Card
                        sx={{
                          mb: 3,
                          borderRadius: 2,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          border: '1px solid rgba(0,0,0,0.08)',
                          background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)',
                        }}
                      >
                        <CardContent sx={{ p: 2.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Info sx={{ color: 'primary.main', fontSize: 20 }} />
                            <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 600 }}>
                              Özet Bilgiler
                            </Typography>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'background.paper', borderRadius: 2 }}>
                                <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
                                  {selectedContacts.length}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
                                  Seçilen Kişi
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'background.paper', borderRadius: 2 }}>
                                <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 700, color: 'success.main', mb: 0.5 }}>
                                  {selectedContacts.length}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
                                  Toplam SMS
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'background.paper', borderRadius: 2 }}>
                                <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 700, color: 'warning.main', mb: 0.5 }}>
                                  {selectedContacts.length}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
                                  Gerekli Kredi
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                          <Divider sx={{ my: 2 }} />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
                              Servis: <strong>CepSMS</strong>
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>

                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        startIcon={<Send />}
                        disabled={loading || selectedContacts.length === 0}
                        sx={{
                          py: 1.75,
                          background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                          boxShadow: '0 8px 24px rgba(25, 118, 210, 0.3)',
                          borderRadius: 2,
                          fontWeight: 600,
                          textTransform: 'none',
                          fontSize: '16px',
                          '&:hover': {
                            boxShadow: '0 12px 32px rgba(25, 118, 210, 0.4)',
                            transform: 'translateY(-2px)',
                          },
                          '&:disabled': {
                            background: 'rgba(0,0,0,0.12)',
                            color: 'rgba(0,0,0,0.26)',
                          },
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        {loading ? 'Gönderiliyor...' : `${selectedContacts.length} Kişiye SMS Gönder`}
                      </Button>

                      {selectedContacts.length === 0 && (
                        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Warning sx={{ color: 'warning.main', fontSize: 18 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
                            Lütfen en az bir kişi seçin
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
      </Box>
      </Box>

      {/* Template Dialog - Modern Tasarım */}
      <Dialog 
        open={templateDialogOpen} 
        onClose={() => setTemplateDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(220, 0, 78, 0.1) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Description sx={{ color: 'primary.main', fontSize: 24 }} />
            </Box>
            <Typography variant="h6" sx={{ fontSize: '20px', fontWeight: 600 }}>
              {editingTemplate ? 'Şablon Düzenle' : 'Yeni Şablon Oluştur'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Box>
            <TextField
              fullWidth
              label="Şablon Adı"
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              margin="normal"
              required
              placeholder="Örn: Hoş Geldin Mesajı"
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontSize: '14px',
                },
              }}
            />
            
            <TextField
              fullWidth
              label="Kategori"
              value={templateForm.category}
              onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
              margin="normal"
              placeholder="Örn: Genel, Doğrulama, Bildirim"
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontSize: '14px',
                },
              }}
            />

            <TextField
              fullWidth
              label="Mesaj İçeriği"
              multiline
              rows={8}
              value={templateForm.content}
              onChange={(e) => {
                const content = e.target.value;
                const variables = extractVariables(content);
                setTemplateForm({ ...templateForm, content, variables });
              }}
              margin="normal"
              required
              placeholder="Mesaj içeriğinizi buraya yazın. Değişkenler için {{degisken}} formatını kullanın."
              helperText={`Değişkenler için {{degisken}} formatını kullanın (örn: {{name}}, {{code}}). ${templateForm.variables.length > 0 ? `Bulunan değişkenler: ${templateForm.variables.join(', ')}` : ''}`}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontSize: '14px',
                  fontFamily: templateForm.content.includes('{{') ? 'monospace' : 'inherit',
                },
              }}
            />

            {templateForm.variables.length > 0 && (
              <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)', border: '1px solid rgba(25, 118, 210, 0.1)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Info sx={{ color: 'primary.main', fontSize: 16 }} />
                  <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500 }}>
                    Bulunan Değişkenler:
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {templateForm.variables.map((variable) => (
                    <Chip
                      key={variable}
                      label={`{{${variable}}}`}
                      size="small"
                      icon={<ContentCopy sx={{ fontSize: 12 }} />}
                      onClick={() => {
                        navigator.clipboard.writeText(`{{${variable}}}`);
                        setSuccess(`{{${variable}}} kopyalandı!`);
                      }}
                      sx={{
                        fontSize: '0.7rem',
                        height: 26,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: alpha('#1976d2', 0.1),
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Card
              sx={{
                mt: 2,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.08)',
                background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)',
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <AutoAwesome sx={{ color: 'primary.main', fontSize: 18 }} />
                  <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 600 }}>
                    Örnek Şablon:
                  </Typography>
                </Box>
                <Paper sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid rgba(0,0,0,0.1)' }}>
                  <Typography variant="body2" sx={{ fontSize: '13px', fontFamily: 'monospace', color: 'text.primary' }}>
                    {`Merhaba {{name}}, hoş geldiniz! Doğrulama kodunuz: {{code}}`}
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 2 }}>
          <Button 
            onClick={() => setTemplateDialogOpen(false)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '14px',
            }}
          >
            İptal
          </Button>
          <Button
            onClick={handleTemplateSubmit}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
              boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '14px',
              px: 3,
              '&:hover': {
                boxShadow: '0 8px 25px rgba(25, 118, 210, 0.4)',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.3s',
            }}
          >
            {editingTemplate ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>
    </ProtectedRoute>
  );
}

