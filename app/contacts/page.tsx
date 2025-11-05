'use client';

import { Box, Container, Typography, Paper, Button, Grid, Tabs, Tab, Card, CardContent, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Chip, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { Add, Edit, Delete, Group, Person } from '@mui/icons-material';
import { gradients } from '@/lib/theme';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  tags: string[];
  group?: {
    id: string;
    name: string;
    color: string;
  };
}

interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  contactCount: number;
}

export default function ContactsPage() {
  const { api } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Contact dialog
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    groupId: '',
  });

  // Group dialog
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    color: '#1976d2',
    icon: 'group',
  });

  useEffect(() => {
    loadContacts();
    loadGroups();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/contacts');
      if (response.data.success) {
        setContacts(response.data.data.contacts || []);
      } else {
        setError(response.data.message || 'Kişiler yüklenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('Contacts load error:', error);
      setError(error.response?.data?.message || 'Kişiler yüklenirken bir hata oluştu');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await api.get('/contact-groups');
      if (response.data.success) {
        setGroups(response.data.data.groups || []);
      }
    } catch (error: any) {
      console.error('Groups load error:', error);
      setGroups([]);
    }
  };

  const handleContactSubmit = async () => {
    try {
      if (editingContact) {
        await api.put(`/contacts/${editingContact.id}`, contactForm);
        setSuccess('Kişi güncellendi');
      } else {
        await api.post('/contacts', contactForm);
        setSuccess('Kişi eklendi');
      }
      setContactDialogOpen(false);
      setContactForm({ name: '', phone: '', email: '', notes: '', groupId: '' });
      setEditingContact(null);
      loadContacts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'İşlem hatası');
    }
  };

  const handleGroupSubmit = async () => {
    try {
      if (editingGroup) {
        await api.put(`/contact-groups/${editingGroup.id}`, groupForm);
        setSuccess('Grup güncellendi');
      } else {
        await api.post('/contact-groups', groupForm);
        setSuccess('Grup oluşturuldu');
      }
      setGroupDialogOpen(false);
      setGroupForm({ name: '', description: '', color: '#1976d2', icon: 'group' });
      setEditingGroup(null);
      loadGroups();
    } catch (err: any) {
      setError(err.response?.data?.message || 'İşlem hatası');
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Bu kişiyi silmek istediğinize emin misiniz?')) return;
    
    try {
      await api.delete(`/contacts/${id}`);
      setSuccess('Kişi silindi');
      loadContacts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Silme hatası');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Bu grubu silmek istediğinize emin misiniz?')) return;
    
    try {
      await api.delete(`/contact-groups/${id}`);
      setSuccess('Grup silindi');
      loadGroups();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Silme hatası');
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography 
                  variant="h4" 
                  component="h1" 
                  sx={{ 
                    color: 'primary.main',
                    fontSize: '34px',
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  Rehberim
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    fontSize: '14px',
                  }}
                >
                  Kişilerinizi ve gruplarınızı yönetin. SMS göndermek için kişileri gruplara ekleyebilirsiniz.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={tabValue === 0 ? <Person /> : <Group />}
                onClick={() => {
                  if (tabValue === 0) {
                    setEditingContact(null);
                    setContactForm({ name: '', phone: '', email: '', notes: '', groupId: '' });
                    setContactDialogOpen(true);
                  } else {
                    setEditingGroup(null);
                    setGroupForm({ name: '', description: '', color: '#1976d2', icon: 'group' });
                    setGroupDialogOpen(true);
                  }
                }}
                sx={{
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
                {tabValue === 0 ? 'Kişi Ekle' : 'Grup Oluştur'}
              </Button>
            </Box>

            {loading && tabValue === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {!loading && contacts.length === 0 && tabValue === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px', mb: 2 }}>
                  Henüz kişi eklenmemiş. Yeni kişi eklemek için "Kişi Ekle" butonuna tıklayın.
                </Typography>
              </Box>
            )}

            {!loading && groups.length === 0 && tabValue === 1 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px', mb: 2 }}>
                  Henüz grup oluşturulmamış. Yeni grup oluşturmak için "Grup Oluştur" butonuna tıklayın.
                </Typography>
              </Box>
            )}

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
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab icon={<Person />} label="Kişiler" />
                <Tab icon={<Group />} label="Gruplar" />
              </Tabs>

              {/* Kişiler Tab */}
              {tabValue === 0 && (
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={2}>
                    {contacts.map((contact) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={contact.id}>
                        <Card 
                          sx={{ 
                            borderRadius: 2,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            mb: 2,
                          }}
                        >
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                              <Box>
                                <Typography 
                                  variant="h6"
                                  sx={{
                                    fontSize: '20px',
                                    fontWeight: 500,
                                  }}
                                >
                                  {contact.name}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{
                                    fontSize: '14px',
                                  }}
                                >
                                  {contact.phone}
                                </Typography>
                                {contact.email && (
                                  <Typography 
                                    variant="body2" 
                                    color="text.secondary"
                                    sx={{
                                      fontSize: '14px',
                                    }}
                                  >
                                    {contact.email}
                                  </Typography>
                                )}
                                {contact.group && (
                                  <Chip
                                    label={contact.group.name}
                                    size="small"
                                    sx={{ 
                                      mt: 1, 
                                      bgcolor: contact.group.color, 
                                      color: 'white',
                                      fontSize: '0.75rem',
                                      fontWeight: 500,
                                      height: 24,
                                    }}
                                  />
                                )}
                              </Box>
                              <Box>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    setEditingContact(contact);
                                    setContactForm({
                                      name: contact.name,
                                      phone: contact.phone,
                                      email: contact.email || '',
                                      notes: contact.notes || '',
                                      groupId: contact.group?.id || '',
                                    });
                                    setContactDialogOpen(true);
                                  }}
                                >
                                  <Edit />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteContact(contact.id)}
                                >
                                  <Delete />
                                </IconButton>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Gruplar Tab */}
              {tabValue === 1 && (
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={2}>
                    {groups.map((group) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={group.id}>
                        <Card 
                          sx={{ 
                            borderRadius: 2, 
                            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)',
                            border: '1px solid rgba(25, 118, 210, 0.1)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            mb: 2,
                          }}
                        >
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <Box>
                                <Typography 
                                  variant="h6"
                                  sx={{
                                    fontSize: '20px',
                                    fontWeight: 500,
                                  }}
                                >
                                  {group.name}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{
                                    fontSize: '14px',
                                  }}
                                >
                                  {group.contactCount} kişi
                                </Typography>
                                {group.description && (
                                  <Typography 
                                    variant="body2" 
                                    color="text.secondary" 
                                    sx={{ 
                                      mt: 1,
                                      fontSize: '14px',
                                    }}
                                  >
                                    {group.description}
                                  </Typography>
                                )}
                              </Box>
                              <Box>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    setEditingGroup(group);
                                    setGroupForm({
                                      name: group.name,
                                      description: group.description || '',
                                      color: group.color,
                                      icon: group.icon,
                                    });
                                    setGroupDialogOpen(true);
                                  }}
                                >
                                  <Edit />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteGroup(group.id)}
                                >
                                  <Delete />
                                </IconButton>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Paper>

          {/* Contact Dialog */}
          <Dialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{editingContact ? 'Kişi Düzenle' : 'Kişi Ekle'}</DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                label="İsim"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Telefon"
                value={contactForm.phone}
                onChange={(e) => {
                  // Sadece rakamları kabul et
                  const value = e.target.value.replace(/\D/g, '');
                  setContactForm({ ...contactForm, phone: value });
                }}
                margin="normal"
                required
                placeholder="905551234567"
                helperText="Telefon numarasını girin (örn: 905551234567 veya 05551234567)"
                inputProps={{
                  maxLength: 13,
                }}
              />
              <TextField
                fullWidth
                label="E-posta"
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                margin="normal"
              />
                    <TextField
                      fullWidth
                      label="Notlar"
                      multiline
                      rows={3}
                      value={contactForm.notes}
                      onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                      margin="normal"
                    />
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Grup</InputLabel>
                      <Select
                        value={contactForm.groupId}
                        onChange={(e) => setContactForm({ ...contactForm, groupId: e.target.value })}
                        label="Grup"
                      >
                        <MenuItem value="">Grup Yok</MenuItem>
                        {groups.map((group) => (
                          <MenuItem key={group.id} value={group.id}>
                            {group.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setContactDialogOpen(false)}>İptal</Button>
              <Button onClick={handleContactSubmit} variant="contained">
                {editingContact ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Group Dialog */}
          <Dialog open={groupDialogOpen} onClose={() => setGroupDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{editingGroup ? 'Grup Düzenle' : 'Grup Oluştur'}</DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                label="Grup Adı"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Açıklama"
                multiline
                rows={3}
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Renk"
                type="color"
                value={groupForm.color}
                onChange={(e) => setGroupForm({ ...groupForm, color: e.target.value })}
                margin="normal"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setGroupDialogOpen(false)}>İptal</Button>
              <Button onClick={handleGroupSubmit} variant="contained">
                {editingGroup ? 'Güncelle' : 'Oluştur'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}

