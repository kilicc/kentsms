'use client';

import { Box, Container, Typography, Paper, TextField, Button, Grid, Alert, Card, CardContent, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip, Divider } from '@mui/material';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { Send, Group, Person, Add, Delete, Edit, Description } from '@mui/icons-material';
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
              Gelişmiş SMS
            </Typography>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 3,
                fontSize: '14px',
              }}
            >
              CepSMS servisini kullanarak birden fazla kişiye toplu SMS gönderin. Grup seçerek veya manuel olarak kişileri seçebilirsiniz.
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

            <Grid container spacing={3}>
              {/* Sol Panel - Grup/Kişi Seçimi */}
              <Grid size={{ xs: 12, md: 4 }}>
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
                      Grup/Kişi Seçimi
                    </Typography>

                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Grup Seç</InputLabel>
                      <Select
                        value={selectedGroup}
                        onChange={(e) => handleGroupSelect(e.target.value)}
                        label="Grup Seç"
                        sx={{
                          borderRadius: 2,
                        }}
                      >
                        <MenuItem value="">Tüm Gruplar</MenuItem>
                        {groups.map((group) => (
                          <MenuItem key={group.id} value={group.id}>
                            {group.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                      {contacts.map((contact) => (
                        <FormControlLabel
                          key={contact.id}
                          control={
                            <Checkbox
                              checked={selectedContacts.includes(contact.id)}
                              onChange={() => handleContactToggle(contact.id)}
                            />
                          }
                          label={`${contact.name} - ${contact.phone}`}
                          sx={{ display: 'block', mb: 1 }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Sağ Panel - Mesaj Yazma */}
              <Grid size={{ xs: 12, md: 8 }}>
                <Card 
                  sx={{ 
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography 
                        variant="h6" 
                        sx={{
                          fontSize: '20px',
                          fontWeight: 500,
                        }}
                      >
                        Mesaj Yaz
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Add />}
                        onClick={handleCreateTemplate}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 500,
                        }}
                      >
                        Yeni Şablon
                      </Button>
                    </Box>

                    {/* SMS Şablonları */}
                    <Box sx={{ mb: 2 }}>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>SMS Şablonu Seç</InputLabel>
                        <Select
                          value={selectedTemplateId}
                          onChange={(e) => handleTemplateSelect(e.target.value)}
                          label="SMS Şablonu Seç"
                          sx={{
                            borderRadius: 2,
                          }}
                        >
                          <MenuItem value="">Şablon Seçin</MenuItem>
                          {templates.map((template) => (
                            <MenuItem 
                              key={template.id} 
                              value={template.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTemplateSelect(template.id);
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {template.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {template.category} • {template.usageCount} kullanım
                                  </Typography>
                                </Box>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                        
                        {/* Template Actions - Outside Select */}
                        {selectedTemplateId && (
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
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
                                fontSize: '0.75rem',
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
                                fontSize: '0.75rem',
                              }}
                            >
                              Sil
                            </Button>
                          </Box>
                        )}
                      </FormControl>
                      
                      {selectedTemplateId && templates.find((t) => t.id === selectedTemplateId)?.variables && templates.find((t) => t.id === selectedTemplateId)!.variables.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '12px' }}>
                            Şablon Değişkenleri:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {templates.find((t) => t.id === selectedTemplateId)!.variables.map((variable) => (
                              <Chip
                                key={variable}
                                label={`{{${variable}}}`}
                                size="small"
                                sx={{
                                  fontSize: '0.7rem',
                                  height: 24,
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>

                    <Box component="form" onSubmit={handleSubmit}>
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
                          mb: 2,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />

                      <Box sx={{ 
                        p: 2, 
                        bgcolor: 'rgba(25, 118, 210, 0.05)', 
                        borderRadius: 2,
                        mb: 2,
                      }}>
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            mb: 1,
                            fontSize: '14px',
                          }}
                        >
                          <strong>Seçilen kişi sayısı:</strong> {selectedContacts.length}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            fontSize: '14px',
                          }}
                        >
                          <strong>Servis:</strong> CepSMS
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            fontSize: '14px',
                          }}
                        >
                          <strong>Toplam maliyet:</strong> {selectedContacts.length} kredi ({selectedContacts.length} SMS)
                        </Typography>
                      </Box>

                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        startIcon={<Send />}
                        disabled={loading || selectedContacts.length === 0}
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
                        {loading ? 'Gönderiliyor...' : `${selectedContacts.length} Kişiye SMS Gönder`}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
      </Box>
      </Box>

      {/* Template Dialog */}
      <Dialog 
        open={templateDialogOpen} 
        onClose={() => setTemplateDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {editingTemplate ? 'Şablon Düzenle' : 'Yeni Şablon Oluştur'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Şablon Adı"
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              margin="normal"
              required
              placeholder="Örn: Hoş Geldin Mesajı"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
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
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
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
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '12px' }}>
                Örnek Şablon:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ fontSize: '12px', fontFamily: 'monospace' }}>
                  {`Merhaba {{name}}, hoş geldiniz! Doğrulama kodunuz: {{code}}`}
                </Typography>
              </Paper>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setTemplateDialogOpen(false)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
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
              fontWeight: 500,
              '&:hover': {
                boxShadow: '0 8px 25px rgba(25, 118, 210, 0.4)',
              },
            }}
          >
            {editingTemplate ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>
    </ProtectedRoute>
  );
}

