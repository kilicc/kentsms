'use client';

import { Box, Container, Typography, Paper, Grid, Avatar, Card, CardContent, alpha, CircularProgress, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem, Pagination } from '@mui/material';
import { useEffect, useState } from 'react';
import ClientDate from '@/components/ClientDate';
import { gradients } from '@/lib/theme';
import { AttachMoney, Send, Person, Warning, Visibility, Search, FilterList } from '@mui/icons-material';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  systemCredit: number; // Sistem kredisi (tüm kullanıcılar için ortak)
  sentThisMonth: number;
  totalContacts: number;
  failedSMS: number;
  sentToday: number; // Bugün gönderilen SMS sayısı
  // Admin stats
  totalUsers?: number;
  pendingPaymentRequests?: number;
  smsThisMonth?: number;
}

interface RecentActivity {
  id: string;
  phoneNumber: string;
  message: string;
  status: string;
  sentAt: string;
}

interface BulkSmsReport {
  message: string;
  recipients: number;
  status: string;
  sentAt: string;
  successCount: number;
  failedCount: number;
  messageKey: string;
  messages: Array<{
    id: string;
    phoneNumber: string;
    contactName?: string;
    status: string;
    sentAt: string;
  }>;
}

export default function DashboardPage() {
  const { user, api } = useAuth();
  const { mode } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    systemCredit: 0,
    sentThisMonth: 0,
    totalContacts: 0,
    failedSMS: 0,
    sentToday: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [bulkSmsReports, setBulkSmsReports] = useState<BulkSmsReport[]>([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<BulkSmsReport | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      if (isAdmin) {
        // Admin dashboard - load admin stats
        const [adminStats, smsHistory] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/sms-history?limit=5'),
        ]);

        if (adminStats.data.success) {
          const statsData = adminStats.data.data;
          // Sistem kredisini al
          const systemCreditRes = await api.get('/system-credit');
          const systemCredit = systemCreditRes.data.success ? systemCreditRes.data.data.systemCredit : 0;
          
          setStats({
            systemCredit,
            sentThisMonth: statsData.smsThisMonth || 0,
            totalContacts: 0,
            failedSMS: 0,
            totalUsers: statsData.totalUsers || 0,
            pendingPaymentRequests: statsData.pendingPaymentRequests || 0,
            smsThisMonth: statsData.smsThisMonth || 0,
          } as DashboardStats);
        }

        if (smsHistory.data.success) {
          const messages = smsHistory.data.data.messages || [];
          setRecentActivities(messages.slice(0, 5).map((msg: any) => ({
            id: msg.id,
            phoneNumber: msg.phoneNumber,
            message: msg.message,
            status: msg.status,
            sentAt: msg.sentAt,
          })));
          // Admin için boş rapor listesi
          setBulkSmsReports([]);
        }
      } else {
        // User dashboard - load user stats
        const [contactsStats, smsHistory, systemCreditRes] = await Promise.all([
          api.get('/contacts/stats'),
          api.get('/bulk-sms/history?limit=100'),
          api.get('/system-credit'),
        ]);

        // Sistem kredisini al
        const systemCredit = systemCreditRes.data.success ? systemCreditRes.data.data.systemCredit : 0;

        if (contactsStats.data.success) {
          const statsData = contactsStats.data.data;
          setStats((prev) => ({
            ...prev,
            totalContacts: statsData.totalContacts || 0,
            failedSMS: statsData.failedSMS || 0,
          }));
        }

        if (smsHistory.data.success) {
          const messages = smsHistory.data.data.messages || [];
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          startOfToday.setHours(0, 0, 0, 0);
          const endOfToday = new Date(startOfToday);
          endOfToday.setHours(23, 59, 59, 999);

          const sentThisMonth = messages.filter((msg: RecentActivity) => {
            const sentDate = new Date(msg.sentAt);
            return sentDate >= startOfMonth && msg.status === 'sent';
          }).length;

          const sentToday = messages.filter((msg: RecentActivity) => {
            const sentDate = new Date(msg.sentAt);
            return sentDate >= startOfToday && sentDate <= endOfToday && (msg.status === 'sent' || msg.status === 'delivered');
          }).length;

          setStats((prev) => ({
            ...prev,
            systemCredit,
            sentThisMonth,
            sentToday,
          }));

          setRecentActivities(messages.slice(0, 5));

          // Toplu SMS raporları için mesajları grupla
          const groupedMessages = new Map<string, {
            message: string;
            recipients: number;
            successCount: number;
            failedCount: number;
            sentAt: string;
            status: string;
            messages: Array<{
              id: string;
              phoneNumber: string;
              contactName?: string;
              status: string;
              sentAt: string;
            }>;
          }>();

          // Bugünün tarihini al
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);

          // Bugün gönderilen mesajları filtrele
          const todayMessages = messages.filter((msg: any) => {
            const sentDate = new Date(msg.sentAt);
            return sentDate >= today && sentDate <= todayEnd;
          });

          // Bugünkü mesajları veya son 20 mesajı al ve grupla (aynı mesaj içeriğine sahip olanları)
          (todayMessages.length > 0 ? todayMessages : messages.slice(0, 20)).forEach((msg: any) => {
            const messageText = msg.message || '';
            const messageKey = messageText.substring(0, 50); // İlk 50 karakteri key olarak kullan
            
            if (!groupedMessages.has(messageKey)) {
              groupedMessages.set(messageKey, {
                message: messageText,
                recipients: 0,
                successCount: 0,
                failedCount: 0,
                sentAt: msg.sentAt,
                status: 'sent',
                messages: [],
              });
            }

            const group = groupedMessages.get(messageKey)!;
            group.recipients++;
            group.messages.push({
              id: msg.id,
              phoneNumber: msg.phoneNumber,
              contactName: msg.contact?.name,
              status: msg.status,
              sentAt: msg.sentAt,
            });
            if (msg.status === 'sent' || msg.status === 'delivered') {
              group.successCount++;
            } else if (msg.status === 'failed') {
              group.failedCount++;
            }
            // En son gönderim tarihini kullan
            if (new Date(msg.sentAt) > new Date(group.sentAt)) {
              group.sentAt = msg.sentAt;
            }
            // Durumu belirle
            if (group.failedCount > 0 && group.successCount > 0) {
              group.status = 'partial';
            } else if (group.failedCount > 0) {
              group.status = 'failed';
            } else {
              group.status = 'sent';
            }
          });

          // Grupları BulkSmsReport formatına dönüştür
          const reports: BulkSmsReport[] = Array.from(groupedMessages.values())
            .map((group) => ({
              message: group.message.length > 50 ? group.message.substring(0, 50) + '...' : group.message,
              recipients: group.recipients,
              status: group.status,
              sentAt: group.sentAt,
              successCount: group.successCount,
              failedCount: group.failedCount,
              messageKey: group.message.substring(0, 50),
              messages: group.messages,
            }))
            .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
            .slice(0, 10); // Son 10 rapor

          setBulkSmsReports(reports);
        }
      }
    } catch (error) {
      console.error('Dashboard data load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const statCards = isAdmin
    ? [
        {
          title: 'Bekleyen Ödeme Talepleri',
          value: (stats.pendingPaymentRequests || 0).toString(),
          subtitle: 'Onay Bekliyor',
          icon: <AttachMoney />,
          color: '#ff9800',
          path: '/admin',
          tab: 3, // Ödeme Talepleri tab'ı
        },
        {
          title: 'Bu Ay Gönderilen SMS',
          value: (stats.smsThisMonth || 0).toString(),
          subtitle: 'Toplam SMS',
          icon: <Send />,
          color: '#2196f3',
          path: '/reports',
        },
        {
          title: 'Toplam Kullanıcı',
          value: (stats.totalUsers || 0).toString(),
          subtitle: 'Aktif Kullanıcı',
          icon: <Person />,
          color: '#4caf50',
          path: '/admin',
          tab: 0, // Kullanıcılar tab'ı
        },
        {
          title: 'Toplam SMS',
          value: (stats.smsThisMonth || stats.sentThisMonth || 0).toString(),
          subtitle: 'Tüm Zamanlar',
          icon: <Warning />,
          color: '#9c27b0',
          path: '/reports',
        },
      ]
    : [
        {
          title: 'Sistem Kredisi',
          value: stats.systemCredit.toString(),
          subtitle: 'SMS',
          icon: <AttachMoney />,
          color: '#4caf50',
          path: '/payment',
        },
        {
          title: 'Bu Ay Gönderilen',
          value: stats.sentThisMonth.toString(),
          subtitle: 'SMS',
          icon: <Send />,
          color: '#2196f3',
          path: '/reports',
        },
        {
          title: 'Bugün Gönderilen SMS',
          value: stats.sentToday.toString(),
          subtitle: 'Bugün',
          icon: <Send />,
          color: '#2196f3',
          path: '/reports',
          query: 'today=true',
        },
        {
          title: 'Toplam Hata',
          value: stats.failedSMS.toString(),
          subtitle: 'Başarısız SMS',
          icon: <Warning />,
          color: '#f44336',
          path: '/refunds',
        },
      ];

  return (
    <ProtectedRoute>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: mode === 'dark' ? '#121212' : '#f5f5f5',
        }}
      >
        {/* Navbar */}
        <Navbar />

        {/* Main Content */}
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
          maxWidth: { xs: '100%', md: '1400px' },
          marginX: { xs: 0, md: 'auto' },
          boxSizing: 'border-box',
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
            Dashboard
          </Typography>

          {/* Stat Cards Grid - Modern Design */}
          <Grid container spacing={0} sx={{ mb: 2, width: '100%', margin: 0, display: 'flex' }}>
            {statCards.map((card, index) => {
              const isCreditCard = card.title === 'Sistem Kredisi';
              const isFirst = index === 0;
              const isLast = index === statCards.length - 1;
              return (
                <Grid 
                  size={{ xs: 12, sm: 6, md: 3 }} 
                  key={index}
                  sx={{ 
                    display: 'flex', 
                    minWidth: 0,
                    padding: '0 !important',
                    '&:not(:last-child)': {
                      borderRight: `1px solid ${alpha('#e0e0e0', 0.3)}`,
                    },
                  }}
                >
                  <Card
                    onClick={() => {
                      if ((card as any).tab !== undefined) {
                        // Admin sayfasına tab ile yönlendir
                        router.push(`${card.path}?tab=${(card as any).tab}`);
                      } else if ((card as any).query) {
                        // Query parametresi ile yönlendir
                        router.push(`${card.path}?${(card as any).query}`);
                      } else {
                        router.push(card.path);
                      }
                    }}
                    sx={{
                      height: '100%',
                      width: '100%',
                      background: isCreditCard
                        ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
                        : mode === 'dark' 
                          ? 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)'
                          : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                      border: 'none',
                      borderRadius: 0,
                      borderLeft: isFirst ? 'none' : `1px solid ${alpha('#e0e0e0', 0.3)}`,
                      borderRight: isLast ? 'none' : `1px solid ${alpha('#e0e0e0', 0.3)}`,
                      ...(isFirst && {
                        borderTopLeftRadius: 8,
                        borderBottomLeftRadius: 8,
                      }),
                      ...(isLast && {
                        borderTopRightRadius: 8,
                        borderBottomRightRadius: 8,
                      }),
                      p: 1.5,
                      boxShadow: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': isCreditCard ? {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%)',
                        pointerEvents: 'none',
                      } : {},
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: isCreditCard
                          ? '0 8px 20px rgba(76, 175, 80, 0.3)'
                          : '0 4px 12px rgba(0, 0, 0, 0.1)',
                        zIndex: 1,
                      },
                    }}
                  >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          flexDirection: 'column',
                          height: '100%',
                          minHeight: '80px',
                        }}
                      >
                        <Box sx={{ width: '100%', mb: 1.5 }}>
                          <Typography 
                            variant="body2" 
                            sx={{
                              fontSize: '10px',
                              mb: 1,
                              fontWeight: 500,
                              color: isCreditCard ? 'rgba(255,255,255,0.9)' : 'text.secondary',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {card.title}
                          </Typography>
                          <Typography
                            variant="h3"
                            sx={{ 
                              fontWeight: 700, 
                              fontSize: '22px',
                              lineHeight: 1.1,
                              color: isCreditCard ? '#ffffff' : 'primary.main',
                              mb: 0.5,
                            }}
                          >
                            {card.value}
                          </Typography>
                          <Typography 
                            variant="body2"
                            sx={{
                              fontSize: '10px',
                              fontWeight: 500,
                              color: isCreditCard ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                              mt: 0.5,
                            }}
                          >
                            {card.subtitle}
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          alignSelf: 'flex-end',
                          mt: 'auto',
                        }}>
                          <Avatar
                            sx={{
                              bgcolor: isCreditCard ? 'rgba(255,255,255,0.2)' : alpha(card.color, 0.1),
                              width: 40,
                              height: 40,
                              fontSize: '20px',
                              color: isCreditCard ? '#ffffff' : card.color,
                              border: isCreditCard ? '2px solid rgba(255,255,255,0.3)' : 'none',
                            }}
                          >
                            {card.icon}
                          </Avatar>
                        </Box>
                      </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Bulk SMS Reports Card - Modern Design */}
          {!isAdmin && (
            <Card 
              sx={{ 
                borderRadius: 2, 
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: `1px solid ${alpha('#e0e0e0', 0.5)}`,
                p: 1.5,
                background: mode === 'dark' 
                  ? 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)'
                  : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'primary.main',
                  }}
                >
                  Toplu SMS Raporları
                </Typography>
                <Chip
                  label={`${bulkSmsReports.length} rapor`}
                  size="small"
                  sx={{
                    bgcolor: alpha('#1976d2', 0.1),
                    color: 'primary.main',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                  }}
                />
              </Box>
              
              {/* Search and Filter */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  placeholder="Mesaj içeriğinde ara..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
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
                    value={statusFilter}
                    label="Durum Filtresi"
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <MenuItem value="all">Tümü</MenuItem>
                    <MenuItem value="sent">Başarılı</MenuItem>
                    <MenuItem value="failed">Başarısız</MenuItem>
                    <MenuItem value="partial">Kısmen Başarılı</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {(() => {
                // Filter reports
                let filteredReports = bulkSmsReports.filter((report) => {
                  const matchesSearch = searchQuery === '' || 
                    report.message.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
                  return matchesSearch && matchesStatus;
                });

                // Pagination
                const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const paginatedReports = filteredReports.slice(startIndex, startIndex + itemsPerPage);

                return filteredReports.length > 0 ? (
                  <>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Mesaj</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Alıcılar</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Durum</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tarih</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>İşlem</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedReports.map((report, index) => {
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
                                sx={{
                                  '&:hover': {
                                    backgroundColor: alpha('#1976d2', 0.05),
                                  },
                                }}
                              >
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  {report.message}
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  {report.recipients} kişi
                                  {report.successCount > 0 && report.failedCount > 0 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', display: 'block' }}>
                                      {report.successCount} başarılı, {report.failedCount} başarısız
                                    </Typography>
                                  )}
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
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<Visibility />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedReport(report);
                                      setDetailDialogOpen(true);
                                    }}
                                    sx={{
                                      background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                                      borderRadius: 1.5,
                                      padding: '4px 12px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      textTransform: 'none',
                                      minWidth: 'auto',
                                      '&:hover': {
                                        boxShadow: '0 4px 16px rgba(25, 118, 210, 0.4)',
                                        transform: 'translateY(-1px)',
                                      },
                                      transition: 'all 0.3s',
                                    }}
                                  >
                                    Detay
                                  </Button>
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
                          page={currentPage}
                          onChange={(e, page) => setCurrentPage(page)}
                          color="primary"
                          size="small"
                        />
                      </Box>
                    )}
                  </>
                ) : (
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      textAlign: 'center', 
                      py: 1.5,
                      fontSize: '13px',
                    }}
                  >
                    {bulkSmsReports.length === 0
                      ? 'Henüz toplu SMS raporu bulunmuyor'
                      : 'Arama kriterlerinize uygun rapor bulunamadı'}
                  </Typography>
                );
              })()}
            </Card>
          )}

          {/* Recent Activity Card - Modern Design */}
          <Card 
            sx={{ 
              borderRadius: 2, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: `1px solid ${alpha('#e0e0e0', 0.5)}`,
              p: 1.5,
              background: mode === 'dark' 
                ? 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'primary.main',
                }}
              >
                Son Aktiviteler
              </Typography>
              <Chip
                label={`${recentActivities.length} aktivite`}
                size="small"
                sx={{
                  bgcolor: alpha('#1976d2', 0.1),
                  color: 'primary.main',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                }}
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => {
                  const isSuccess = activity.status === 'sent' || activity.status === 'delivered';
                  const isFailed = activity.status === 'failed';

                  return (
                    <Box
                      key={activity.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        padding: 1,
                        background: isSuccess
                          ? alpha('#4caf50', 0.08)
                          : isFailed
                          ? alpha('#f44336', 0.08)
                          : alpha('#1976d2', 0.08),
                        borderRadius: 1.5,
                        border: `1px solid ${isSuccess
                          ? alpha('#4caf50', 0.2)
                          : isFailed
                          ? alpha('#f44336', 0.2)
                          : alpha('#1976d2', 0.2)}`,
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateX(2px)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                        },
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: isSuccess ? '#4caf50' : isFailed ? '#f44336' : 'primary.main',
                          width: 32,
                          height: 32,
                          fontSize: '14px',
                          fontWeight: 600,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                        }}
                      >
                        {activity.status === 'sent' || activity.status === 'delivered'
                          ? '✓'
                          : activity.status === 'failed'
                          ? '✗'
                          : 'S'}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontWeight: 500,
                            fontSize: '12px',
                          }}
                        >
                          SMS Gönderildi
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{
                            fontSize: '10px',
                          }}
                        >
                          {activity.phoneNumber} - <ClientDate date={activity.sentAt} format="relative" />
                        </Typography>
                      </Box>
                      <Chip
                        label={activity.status === 'sent' || activity.status === 'delivered'
                          ? 'Başarılı'
                          : activity.status === 'failed'
                          ? 'Başarısız'
                          : activity.status}
                        color={isSuccess ? 'success' : isFailed ? 'error' : 'info'}
                        size="small"
                        sx={{
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          height: 22,
                        }}
                      />
                    </Box>
                  );
                })
              ) : (
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    textAlign: 'center', 
                    py: 1.5,
                    fontSize: '13px',
                  }}
                >
                  Henüz aktivite yok
                </Typography>
              )}
            </Box>
          </Card>

          {/* Detail Dialog */}
          <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontSize: '16px', fontWeight: 600 }}>
              Toplu SMS Detayları
            </DialogTitle>
            <DialogContent>
              {selectedReport && (
                <Box sx={{ mt: 1 }}>
                  <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: alpha('#1976d2', 0.05) }}>
                    <Typography variant="subtitle2" sx={{ fontSize: '14px', fontWeight: 600, mb: 1 }}>
                      Mesaj İçeriği
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                      {selectedReport.message}
                    </Typography>
                  </Paper>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Paper sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#4caf50', 0.05) }}>
                        <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          Toplam Alıcı
                        </Typography>
                        <Typography variant="h6" sx={{ fontSize: '20px', fontWeight: 700, color: '#4caf50' }}>
                          {selectedReport.recipients} kişi
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Paper sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#2196f3', 0.05) }}>
                        <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          Başarılı
                        </Typography>
                        <Typography variant="h6" sx={{ fontSize: '20px', fontWeight: 700, color: '#2196f3' }}>
                          {selectedReport.successCount} kişi
                        </Typography>
                      </Paper>
                    </Grid>
                    {selectedReport.failedCount > 0 && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#f44336', 0.05) }}>
                          <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                            Başarısız
                          </Typography>
                          <Typography variant="h6" sx={{ fontSize: '20px', fontWeight: 700, color: '#f44336' }}>
                            {selectedReport.failedCount} kişi
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Paper sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#ff9800', 0.05) }}>
                        <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          Gönderim Tarihi
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500 }}>
                          <ClientDate date={selectedReport.sentAt} />
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Typography variant="subtitle2" sx={{ fontSize: '14px', fontWeight: 600, mb: 1 }}>
                    Alıcı Listesi ({selectedReport.messages.length})
                  </Typography>
                  <TableContainer component={Paper} sx={{ maxHeight: 300, borderRadius: 2 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kişi</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Telefon</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Durum</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tarih</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedReport.messages.map((msg) => (
                          <TableRow key={msg.id}>
                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                              {msg.contactName || '-'}
                            </TableCell>
                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                              {msg.phoneNumber}
                            </TableCell>
                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                              <Chip
                                label={
                                  msg.status === 'sent' || msg.status === 'delivered'
                                    ? 'Başarılı'
                                    : msg.status === 'failed'
                                    ? 'Başarısız'
                                    : msg.status
                                }
                                color={
                                  msg.status === 'sent' || msg.status === 'delivered'
                                    ? 'success'
                                    : msg.status === 'failed'
                                    ? 'error'
                                    : 'default'
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
                              <ClientDate date={msg.sentAt} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
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

