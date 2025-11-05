'use client';

import { Box, Container, Typography, Paper, Grid, Avatar, Card, CardContent, alpha, CircularProgress, Chip } from '@mui/material';
import { useEffect, useState } from 'react';
import ClientDate from '@/components/ClientDate';
import { gradients } from '@/lib/theme';
import { AttachMoney, Send, Person, Warning } from '@mui/icons-material';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  credit: number;
  sentThisMonth: number;
  totalContacts: number;
  failedSMS: number;
}

interface RecentActivity {
  id: string;
  phoneNumber: string;
  message: string;
  status: string;
  sentAt: string;
}

export default function DashboardPage() {
  const { user, api } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    credit: 0,
    sentThisMonth: 0,
    totalContacts: 0,
    failedSMS: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load stats
      const [contactsStats, smsHistory] = await Promise.all([
        api.get('/contacts/stats'),
        api.get('/bulk-sms/history?limit=5'),
      ]);

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

        const sentThisMonth = messages.filter((msg: RecentActivity) => {
          const sentDate = new Date(msg.sentAt);
          return sentDate >= startOfMonth && msg.status === 'sent';
        }).length;

        setStats((prev) => ({
          ...prev,
          credit: user?.credit || 0,
          sentThisMonth,
        }));

        setRecentActivities(messages.slice(0, 5));
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

  const statCards = [
    {
      title: 'Mevcut Kredi',
      value: stats.credit.toString(),
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
      title: 'Kayıtlı Kişi',
      value: stats.totalContacts.toString(),
      subtitle: 'Rehber',
      icon: <Person />,
      color: '#ff9800',
      path: '/contacts',
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
          backgroundColor: '#f5f5f5',
        }}
      >
        {/* Navbar */}
        <Navbar />

        {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          padding: { xs: 2, sm: 3, md: 3 },
          paddingLeft: { xs: 2, sm: 3, md: 3 },
          paddingRight: { xs: 2, sm: 3, md: 3 },
          marginLeft: { xs: 0, md: '280px' },
          width: { xs: '100%', md: 'calc(100% - 280px)' },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '1400px',
          mx: 'auto',
          boxSizing: 'border-box',
        }}
      >
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            sx={{ 
              color: 'primary.main', 
              mb: 3,
              fontSize: '34px',
              fontWeight: 600,
            }}
          >
            Dashboard
          </Typography>

          {/* Stat Cards Grid - Modern Design */}
          <Grid container spacing={3} sx={{ mb: 4, width: '100%' }}>
            {statCards.map((card, index) => {
              const isCreditCard = card.title === 'Mevcut Kredi';
              return (
                <Grid 
                  item
                  xs={12}
                  sm={6}
                  md={3}
                  key={index}
                  sx={{ display: 'flex' }}
                >
                  <Card
                    onClick={() => router.push(card.path)}
                    sx={{
                      height: '100%',
                      background: isCreditCard
                        ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                      border: isCreditCard 
                        ? 'none'
                        : `1px solid ${alpha('#e0e0e0', 0.5)}`,
                      borderRadius: 3,
                      p: 3,
                      boxShadow: isCreditCard
                        ? '0 8px 24px rgba(76, 175, 80, 0.25)'
                        : '0 4px 12px rgba(0, 0, 0, 0.08)',
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
                        transform: 'translateY(-8px) scale(1.02)',
                        boxShadow: isCreditCard
                          ? '0 12px 32px rgba(76, 175, 80, 0.35)'
                          : '0 8px 20px rgba(0, 0, 0, 0.12)',
                        border: isCreditCard 
                          ? 'none'
                          : `1px solid ${alpha('#1976d2', 0.3)}`,
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
                        minHeight: '140px',
                      }}
                    >
                      <Box sx={{ width: '100%', mb: 2 }}>
                        <Typography 
                          variant="body2" 
                          sx={{
                            fontSize: '13px',
                            mb: 1.5,
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
                            fontSize: '42px',
                            lineHeight: 1,
                            color: isCreditCard ? '#ffffff' : 'primary.main',
                            mb: 0.5,
                          }}
                        >
                          {card.value}
                        </Typography>
                        <Typography 
                          variant="body2"
                          sx={{
                            fontSize: '13px',
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
                            width: 64,
                            height: 64,
                            fontSize: '32px',
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

          {/* Recent Activity Card - Modern Design */}
          <Card 
            sx={{ 
              borderRadius: 3, 
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              border: `1px solid ${alpha('#e0e0e0', 0.5)}`,
              p: 3,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontSize: '22px',
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
                gap: 2,
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
                        gap: 2,
                        padding: 2,
                        background: isSuccess
                          ? alpha('#4caf50', 0.08)
                          : isFailed
                          ? alpha('#f44336', 0.08)
                          : alpha('#1976d2', 0.08),
                        borderRadius: 2,
                        border: `1px solid ${isSuccess
                          ? alpha('#4caf50', 0.2)
                          : isFailed
                          ? alpha('#f44336', 0.2)
                          : alpha('#1976d2', 0.2)}`,
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateX(4px)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        },
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: isSuccess ? '#4caf50' : isFailed ? '#f44336' : 'primary.main',
                          width: 40,
                          height: 40,
                          fontSize: '18px',
                          fontWeight: 600,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
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
                            fontSize: '16px',
                          }}
                        >
                          SMS Gönderildi
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{
                            fontSize: '12px',
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
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          height: 24,
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
                    py: 2,
                    fontSize: '14px',
                  }}
                >
                  Henüz aktivite yok
                </Typography>
              )}
            </Box>
          </Card>
      </Box>
    </Box>
    </ProtectedRoute>
  );
}

