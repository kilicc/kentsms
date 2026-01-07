'use client';

import { Box, Container, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, TextField, Button, Alert, CircularProgress, Select, MenuItem, FormControl, InputLabel, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Collapse, Pagination, Stack } from '@mui/material';
import { Close, ExpandMore, ExpandLess, FileDownload, PictureAsPdf, TableChart } from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Assessment, FilterList, BarChart, People, Payment, MoneyOff, Send, AccountBalanceWallet, Link, Visibility, Language, Public, LocationOn } from '@mui/icons-material';
import { gradients } from '@/lib/theme';
import ClientDate from '@/components/ClientDate';

interface SmsMessage {
  id: string;
  phoneNumber: string;
  message: string;
  status: string;
  cost: number;
  sentAt: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  contact?: {
    name: string;
    phone: string;
  };
}

export default function SMSReportsPage() {
  const { api, user, loading: authLoading } = useAuth();
  const { mode } = useTheme();
  type ReportsTab = 'sms' | 'bulk' | 'stats' | 'payments';
  const [tabValue, setTabValue] = useState<ReportsTab>('sms');
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; username: string; email: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  // SMS Reports filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    userId: '',
    phoneNumber: '',
    messageSearch: '',
  });
  
  // Bulk SMS Reports filters
  const [bulkFilters, setBulkFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    userId: '',
    messageSearch: '',
  });
  
  // Statistics filters
  const [statsFilters, setStatsFilters] = useState({
    startDate: '',
    endDate: '',
  });
  
  // Payment Reports filters
  const [paymentFilters, setPaymentFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    userId: '',
    paymentMethod: '',
    minAmount: '',
    maxAmount: '',
    transactionId: '',
  });
  
  // Statistics states
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState('');
  // Short Links Statistics states
  const [shortLinksStats, setShortLinksStats] = useState<any>(null);
  const [loadingShortLinksStats, setLoadingShortLinksStats] = useState(false);
  const [shortLinksStatsError, setShortLinksStatsError] = useState('');
  const [expandedShortLinkId, setExpandedShortLinkId] = useState<string | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(false);
  const [paymentRequestsError, setPaymentRequestsError] = useState('');
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState<any | null>(null);
  const [paymentDetailDialogOpen, setPaymentDetailDialogOpen] = useState(false);
  
  // Bulk SMS Reports states
  const [bulkSmsReports, setBulkSmsReports] = useState<any[]>([]);
  const [loadingBulkReports, setLoadingBulkReports] = useState(false);
  const [selectedBulkReport, setSelectedBulkReport] = useState<any | null>(null);
  const [bulkReportDetails, setBulkReportDetails] = useState<any[]>([]);
  const [loadingBulkDetails, setLoadingBulkDetails] = useState(false);
  const [bulkDetailDialogOpen, setBulkDetailDialogOpen] = useState(false);
  
  // Pagination states
  const [smsPage, setSmsPage] = useState(1);
  const [smsPageSize, setSmsPageSize] = useState(20);
  const [smsTotal, setSmsTotal] = useState(0);
  const [bulkPage, setBulkPage] = useState(1);
  const [bulkPageSize, setBulkPageSize] = useState(20);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentPageSize, setPaymentPageSize] = useState(20);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [shortLinksPage, setShortLinksPage] = useState(1);
  const [shortLinksPageSize, setShortLinksPageSize] = useState(20);
  const [bulkDetailsPage, setBulkDetailsPage] = useState(1);
  const [bulkDetailsPageSize, setBulkDetailsPageSize] = useState(20);

  const userRole = typeof user?.role === 'string' ? user.role.toLowerCase() : '';
  const isAdmin = !authLoading && (userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator');

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    // URL'den today parametresini oku ve bugünkü tarihi filtrele
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const today = params.get('today');
      if (today === 'true' && tabValue === 'sms') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        setFilters((prev) => ({
          ...prev,
          startDate: todayStr,
          endDate: todayStr,
        }));
      }
    }
  }, []);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get('/admin/users');
      if (response.data.success) {
        setUsers(response.data.data.users || []);
      }
    } catch (error) {
      console.error('Users load error:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {
        page: smsPage,
        limit: smsPageSize,
      };
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.status = filters.status;
      if (isAdmin && filters.userId) params.userId = filters.userId;
      if (filters.phoneNumber) params.phoneNumber = filters.phoneNumber;
      if (filters.messageSearch) params.messageSearch = filters.messageSearch;

      // Admin ise admin endpoint, değilse kullanıcı endpoint
      const endpoint = isAdmin ? '/admin/sms-history' : '/bulk-sms/history';
      const response = await api.get(endpoint, { params });
      if (response.data.success) {
        let messages = response.data.data.messages || [];
        
        // Pagination bilgisi
        if (response.data.data.pagination) {
          setSmsTotal(response.data.data.pagination.total || messages.length);
        } else {
          setSmsTotal(messages.length);
        }
        
        // Client-side filtering for phone and message if API doesn't support it
        if (filters.phoneNumber && !params.phoneNumber) {
          messages = messages.filter((msg: SmsMessage) => 
            msg.phoneNumber.includes(filters.phoneNumber)
          );
        }
        if (filters.messageSearch && !params.messageSearch) {
          messages = messages.filter((msg: SmsMessage) => 
            msg.message.toLowerCase().includes(filters.messageSearch.toLowerCase())
          );
        }
        
        setMessages(messages);
      } else {
        setError(response.data.message || 'Veri yüklenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('History load error:', error);
      setError(error.response?.data?.message || 'SMS geçmişi yüklenirken bir hata oluştu');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBulkReports = async () => {
    try {
      setLoadingBulkReports(true);
      const params: any = { 
        page: bulkPage,
        limit: bulkPageSize,
      };
      if (bulkFilters.startDate) params.startDate = bulkFilters.startDate;
      if (bulkFilters.endDate) params.endDate = bulkFilters.endDate;
      if (bulkFilters.status) params.status = bulkFilters.status;
      if (isAdmin && bulkFilters.userId) params.userId = bulkFilters.userId;
      if (bulkFilters.messageSearch) params.messageSearch = bulkFilters.messageSearch;

      const endpoint = isAdmin ? '/admin/sms-history' : '/bulk-sms/history';
      const response = await api.get(endpoint, { params });
      
      if (response.data.success) {
        let messages = response.data.data.messages || [];
        
        // Client-side filtering
        if (bulkFilters.messageSearch && !params.messageSearch) {
          messages = messages.filter((msg: any) => 
            (msg.message || '').toLowerCase().includes(bulkFilters.messageSearch.toLowerCase())
          );
        }
        if (bulkFilters.userId && !params.userId && isAdmin) {
          messages = messages.filter((msg: any) => 
            msg.user?.id === bulkFilters.userId
          );
        }
        if (bulkFilters.startDate) {
          messages = messages.filter((msg: any) => 
            new Date(msg.sentAt) >= new Date(bulkFilters.startDate)
          );
        }
        if (bulkFilters.endDate) {
          const endDate = new Date(bulkFilters.endDate);
          endDate.setHours(23, 59, 59, 999);
          messages = messages.filter((msg: any) => 
            new Date(msg.sentAt) <= endDate
          );
        }
        
        // Mesajları grupla (aynı mesaj içeriğine sahip olanları)
        const groupedMessages = new Map<string, {
          message: string;
          recipients: number;
          successCount: number;
          failedCount: number;
          sentAt: string;
          status: string;
          messageIds: string[];
        }>();

        messages.forEach((msg: any) => {
          const messageText = msg.message || '';
          const messageKey = messageText.substring(0, 50);
          
          if (!groupedMessages.has(messageKey)) {
            groupedMessages.set(messageKey, {
              message: messageText,
              recipients: 0,
              successCount: 0,
              failedCount: 0,
              sentAt: msg.sentAt,
              status: 'sent',
              messageIds: [] as string[],
            });
          }

          const group = groupedMessages.get(messageKey)!;
          group.recipients++;
          if (!group.messageIds) {
            group.messageIds = [];
          }
          group.messageIds.push(msg.id);
          if (msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'iletildi' || msg.status === 'gönderildi') {
            group.successCount++;
          } else if (msg.status === 'failed' || msg.status === 'iletilmedi' || msg.status === 'zaman_aşımı') {
            group.failedCount++;
          }
          if (new Date(msg.sentAt) > new Date(group.sentAt)) {
            group.sentAt = msg.sentAt;
          }
          if (group.failedCount > 0 && group.successCount > 0) {
            group.status = 'partial';
          } else if (group.failedCount > 0) {
            group.status = 'failed';
          } else {
            group.status = 'sent';
          }
        });

        let reports = Array.from(groupedMessages.values())
          .map((group) => ({
            message: group.message.length > 50 ? group.message.substring(0, 50) + '...' : group.message,
            fullMessage: group.message,
            recipients: group.recipients,
            status: group.status,
            sentAt: group.sentAt,
            successCount: group.successCount,
            failedCount: group.failedCount,
            messageIds: group.messageIds || [],
          }))
          .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

        // Status filter
        if (bulkFilters.status) {
          reports = reports.filter((report) => report.status === bulkFilters.status);
        }

        // Pagination bilgisi
        if (response.data.data.pagination) {
          setBulkTotal(response.data.data.pagination.total || reports.length);
        } else {
          setBulkTotal(reports.length);
        }

        setBulkSmsReports(reports);
      }
    } catch (error) {
      console.error('Bulk reports load error:', error);
    } finally {
      setLoadingBulkReports(false);
    }
  };

  const handleViewBulkReportDetails = async (report: any) => {
    setSelectedBulkReport(report);
    setBulkDetailDialogOpen(true);
    setLoadingBulkDetails(true);
    
    try {
      // Mesaj içeriğine göre filtrele
      const params: any = {};
      if (bulkFilters.startDate) params.startDate = bulkFilters.startDate;
      if (bulkFilters.endDate) params.endDate = bulkFilters.endDate;
      if (bulkFilters.userId) params.userId = bulkFilters.userId;
      
      const endpoint = isAdmin ? '/admin/sms-history' : '/bulk-sms/history';
      const response = await api.get(endpoint, { params });
      if (response.data.success) {
        const filtered = (response.data.data.messages || []).filter((msg: any) => {
          const msgText = msg.message || '';
          const reportText = report.fullMessage || report.message || '';
          return msgText === reportText;
        }).map((msg: any) => ({
          ...msg,
          phoneNumber: msg.phoneNumber || msg.phone_number,
          sentAt: msg.sentAt || msg.sent_at,
          network: msg.network || null,
        }));
        setBulkReportDetails(filtered);
      }
    } catch (error: any) {
      console.error('Bulk report details load error:', error);
      // Hata durumunda boş liste göster
      setBulkReportDetails([]);
    } finally {
      setLoadingBulkDetails(false);
    }
  };

  const loadStats = async () => {
    if (!isAdmin) return;
    
    try {
      setLoadingStats(true);
      setStatsError('');
      const params: any = {};
      if (statsFilters.startDate) params.startDate = statsFilters.startDate;
      if (statsFilters.endDate) params.endDate = statsFilters.endDate;
      
      const response = await api.get('/admin/stats', { params });
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setStatsError(response.data.message || 'İstatistikler yüklenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('Stats load error:', error);
      setStatsError(error.response?.data?.message || 'İstatistikler yüklenirken bir hata oluştu');
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadShortLinksStats = async () => {
    try {
      setLoadingShortLinksStats(true);
      setShortLinksStatsError('');
      const params: any = {};
      if (statsFilters.startDate) params.startDate = statsFilters.startDate;
      if (statsFilters.endDate) params.endDate = statsFilters.endDate;
      const response = await api.get('/short-links/report', { params });
      if (response.data.success) {
        setShortLinksStats(response.data.data);
        if (response.data.data?.shortLinks) {
          // Short links total count
          // Already set in state
        }
      } else {
        setShortLinksStatsError(response.data.message || 'Kısa link istatistikleri yüklenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('Short links stats load error:', error);
      setShortLinksStatsError(error.response?.data?.message || 'Kısa link istatistikleri yüklenirken bir hata oluştu');
      setShortLinksStats(null);
    } finally {
      setLoadingShortLinksStats(false);
    }
  };

  const loadPaymentRequests = async () => {
    if (!isAdmin) return;
    
    try {
      setLoadingPaymentRequests(true);
      setPaymentRequestsError('');
      const params: any = {};
      if (paymentFilters.startDate) params.startDate = paymentFilters.startDate;
      if (paymentFilters.endDate) params.endDate = paymentFilters.endDate;
      if (paymentFilters.status) params.status = paymentFilters.status;
      if (paymentFilters.userId) params.userId = paymentFilters.userId;
      if (paymentFilters.paymentMethod) params.paymentMethod = paymentFilters.paymentMethod;
      if (paymentFilters.minAmount) params.minAmount = paymentFilters.minAmount;
      if (paymentFilters.maxAmount) params.maxAmount = paymentFilters.maxAmount;
      if (paymentFilters.transactionId) params.transactionId = paymentFilters.transactionId;
      
      const response = await api.get('/admin/payment-requests', { params });
      if (response.data.success) {
        let requests = response.data.data.requests || [];
        
        // Client-side filtering if API doesn't support all filters
        if (paymentFilters.transactionId && !params.transactionId) {
          requests = requests.filter((req: any) => 
            req.transactionId?.toLowerCase().includes(paymentFilters.transactionId.toLowerCase())
          );
        }
        if (paymentFilters.minAmount && !params.minAmount) {
          requests = requests.filter((req: any) => 
            Number(req.amount) >= Number(paymentFilters.minAmount)
          );
        }
        if (paymentFilters.maxAmount && !params.maxAmount) {
          requests = requests.filter((req: any) => 
            Number(req.amount) <= Number(paymentFilters.maxAmount)
          );
        }
        if (paymentFilters.paymentMethod && !params.paymentMethod) {
          requests = requests.filter((req: any) => 
            req.paymentMethod?.toLowerCase().includes(paymentFilters.paymentMethod.toLowerCase())
          );
        }
        if (paymentFilters.userId && !params.userId) {
          requests = requests.filter((req: any) => 
            req.user?.id === paymentFilters.userId
          );
        }
        if (paymentFilters.startDate) {
          requests = requests.filter((req: any) => 
            new Date(req.createdAt) >= new Date(paymentFilters.startDate)
          );
        }
        if (paymentFilters.endDate) {
          const endDate = new Date(paymentFilters.endDate);
          endDate.setHours(23, 59, 59, 999);
          requests = requests.filter((req: any) => 
            new Date(req.createdAt) <= endDate
          );
        }
        if (paymentFilters.status && !params.status) {
          requests = requests.filter((req: any) => 
            req.status === paymentFilters.status
          );
        }
        
        setPaymentRequests(requests);
        setPaymentTotal(requests.length);
      } else {
        setPaymentRequestsError(response.data.message || 'Ödeme raporları yüklenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('Payment requests load error:', error);
      setPaymentRequestsError(error.response?.data?.message || 'Ödeme raporları yüklenirken bir hata oluştu');
      setPaymentRequests([]);
      setPaymentTotal(0);
    } finally {
      setLoadingPaymentRequests(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'success';
      case 'delivered':
        return 'info';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  // Main tab change effect - loads data when tab changes
  useEffect(() => {
    if (tabValue === 'sms') {
      loadHistory();
    } else if (tabValue === 'bulk') {
      loadBulkReports();
    } else if (tabValue === 'stats') {
      if (isAdmin) {
        loadStats();
      }
      loadShortLinksStats();
    } else if (tabValue === 'payments' && isAdmin) {
      loadPaymentRequests();
    }
  }, [tabValue, isAdmin]);

  // Export functions
  const handleExportSMS = async (format: 'excel' | 'pdf') => {
    try {
      const params: any = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.status = filters.status;
      if (filters.phoneNumber) params.phoneNumber = filters.phoneNumber;
      if (filters.messageSearch) params.messageSearch = filters.messageSearch;
      params.format = format;

      const response = await api.get('/reports/sms/export', { 
        params,
        responseType: 'blob',
      });

      if (response.data) {
        const blob = new Blob([response.data], { 
          type: format === 'excel' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/html'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sms-raporlari-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'html'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error: any) {
      console.error('Export error:', error);
      setError('Export işlemi sırasında bir hata oluştu');
    }
  };

  const handleExportBulkSMS = async (format: 'excel' | 'pdf') => {
    try {
      const params: any = {};
      if (bulkFilters.startDate) params.startDate = bulkFilters.startDate;
      if (bulkFilters.endDate) params.endDate = bulkFilters.endDate;
      if (bulkFilters.status) params.status = bulkFilters.status;
      if (bulkFilters.messageSearch) params.messageSearch = bulkFilters.messageSearch;
      params.format = format;

      const response = await api.get('/reports/bulk-sms/export', { 
        params,
        responseType: 'blob',
      });

      if (response.data) {
        const blob = new Blob([response.data], { 
          type: format === 'excel' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/html'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `toplu-sms-raporlari-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'html'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error: any) {
      console.error('Export error:', error);
      setError('Export işlemi sırasında bir hata oluştu');
    }
  };

  const handleExportSingleBulkReport = async (report: any, format: 'excel' | 'pdf') => {
    try {
      // Bu raporun messageIds'lerini kullanarak sadece bu raporun detaylarını export et
      if (!report.messageIds || report.messageIds.length === 0) {
        setError('Bu rapor için export yapılamıyor: Mesaj ID\'leri bulunamadı');
        return;
      }

      // API'den bu messageIds'lere ait SMS detaylarını al
      const params: any = {
        messageIds: report.messageIds.join(','),
        format: format,
      };

      const response = await api.get('/reports/bulk-sms/export', { 
        params,
        responseType: 'blob',
      });

      if (response.data) {
        const blob = new Blob([response.data], { 
          type: format === 'excel' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/html'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = report.sentAt ? new Date(report.sentAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const messagePreview = (report.fullMessage || report.message || '').substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
        a.href = url;
        a.download = `toplu-sms-raporu-${dateStr}-${messagePreview}.${format === 'excel' ? 'xlsx' : 'html'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error: any) {
      console.error('Export error:', error);
      setError('Export işlemi sırasında bir hata oluştu');
    }
  };

  // Filter change effects
  useEffect(() => {
    if (tabValue === 'sms') {
      loadHistory();
    }
  }, [filters.userId, filters.startDate, filters.endDate, filters.status, filters.phoneNumber, filters.messageSearch, tabValue, smsPage, smsPageSize]);

  useEffect(() => {
    if (tabValue === 'bulk') {
      loadBulkReports();
    }
  }, [bulkFilters.startDate, bulkFilters.endDate, bulkFilters.status, bulkFilters.userId, bulkFilters.messageSearch, tabValue, bulkPage, bulkPageSize]);

  useEffect(() => {
    if (tabValue === 'stats' && isAdmin) {
      loadStats();
    }
  }, [statsFilters.startDate, statsFilters.endDate, tabValue, isAdmin]);

  useEffect(() => {
    if (tabValue === 'payments' && isAdmin) {
      loadPaymentRequests();
    }
  }, [paymentFilters.startDate, paymentFilters.endDate, paymentFilters.status, paymentFilters.userId, paymentFilters.paymentMethod, paymentFilters.minAmount, paymentFilters.maxAmount, paymentFilters.transactionId, tabValue, isAdmin]);

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
              Raporlar
            </Typography>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2,
                fontSize: '14px',
              }}
            >
              Sistem raporlarını ve istatistiklerini görüntüleyin.
            </Typography>

            {/* Navigation Buttons */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant={tabValue === 'sms' ? 'contained' : 'outlined'}
                startIcon={<Assessment />}
                onClick={() => setTabValue('sms')}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  px: 2,
                  py: 1,
                }}
              >
                SMS Raporları
              </Button>
              <Button
                variant={tabValue === 'bulk' ? 'contained' : 'outlined'}
                startIcon={<Send />}
                onClick={() => setTabValue('bulk')}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  px: 2,
                  py: 1,
                }}
              >
                Toplu SMS
              </Button>
              {isAdmin && (
                <>
                  <Button
                    variant={tabValue === 'stats' ? 'contained' : 'outlined'}
                    startIcon={<BarChart />}
                    onClick={() => {
                      console.log('İstatistikler butonu tıklandı');
                      setTabValue('stats');
                    }}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '13px',
                      fontWeight: 500,
                      px: 2,
                      py: 1,
                    }}
                  >
                    İstatistikler
                  </Button>
                  <Button
                    variant={tabValue === 'payments' ? 'contained' : 'outlined'}
                    startIcon={<Payment />}
                    onClick={() => {
                      console.log('Ödeme Raporları butonu tıklandı');
                      setTabValue('payments');
                    }}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '13px',
                      fontWeight: 500,
                      px: 2,
                      py: 1,
                    }}
                  >
                    Ödeme Raporları
                  </Button>
                </>
              )}
            </Box>

            {/* SMS Reports Tab */}
            {tabValue === 'sms' && (
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2,
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  SMS Raporları
                </Typography>

            {/* Filters */}
            <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontSize: '13px', fontWeight: 600, color: 'text.secondary' }}>
                Filtreleme Seçenekleri
              </Typography>
              <Grid container spacing={1.5} alignItems="center">
                {isAdmin && (
                  <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ fontSize: '12px' }}>Kullanıcı</InputLabel>
                      <Select
                        value={filters.userId}
                        onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                        label="Kullanıcı"
                        title="Kullanıcı filtresi"
                        sx={{
                          fontSize: '12px',
                          borderRadius: 1.5,
                        }}
                      >
                        <MenuItem value="" sx={{ fontSize: '12px' }}>Tüm Kullanıcılar</MenuItem>
                        {users.map((u) => (
                          <MenuItem key={u.id} value={u.id} sx={{ fontSize: '12px' }}>
                            {u.username} ({u.email})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 2.4 : 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Başlangıç Tarihi"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        fontSize: '12px',
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 2.4 : 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Bitiş Tarihi"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        fontSize: '12px',
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 2.4 : 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: '12px' }}>Durum</InputLabel>
                    <Select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      label="Durum"
                    sx={{
                        fontSize: '12px',
                        borderRadius: 1.5,
                    }}
                  >
                      <MenuItem value="">Tümü</MenuItem>
                      <MenuItem value="sent">Gönderildi</MenuItem>
                      <MenuItem value="delivered">İletildi</MenuItem>
                      <MenuItem value="failed">Başarısız</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 2.4 : 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Telefon Numarası"
                    value={filters.phoneNumber}
                    onChange={(e) => setFilters({ ...filters, phoneNumber: e.target.value })}
                    placeholder="Ara..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        fontSize: '12px',
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 2.4 : 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Mesaj İçeriği"
                    value={filters.messageSearch}
                    onChange={(e) => setFilters({ ...filters, messageSearch: e.target.value })}
                    placeholder="Ara..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        fontSize: '12px',
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: isAdmin ? 2.4 : 3 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<FilterList />}
                    onClick={loadHistory}
                    disabled={loading}
                    sx={{
                      background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                      boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
                      borderRadius: 2,
                      padding: '6px 16px',
                      fontSize: '12px',
                      fontWeight: 500,
                      textTransform: 'none',
                      '&:hover': {
                        boxShadow: '0 6px 16px rgba(25, 118, 210, 0.35)',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.3s',
                    }}
                  >
                    Filtrele
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* Error Message */}
            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {/* Export Buttons */}
            {messages.length > 0 && (
              <Box sx={{ mb: 1.5, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<TableChart />}
                  onClick={() => handleExportSMS('excel')}
                  sx={{
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontSize: '12px',
                    borderColor: '#4caf50',
                    color: '#4caf50',
                    '&:hover': {
                      borderColor: '#4caf50',
                      backgroundColor: 'rgba(76, 175, 80, 0.08)',
                    },
                  }}
                >
                  Excel İndir
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PictureAsPdf />}
                  onClick={() => handleExportSMS('pdf')}
                  sx={{
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontSize: '12px',
                    borderColor: '#f44336',
                    color: '#f44336',
                    '&:hover': {
                      borderColor: '#f44336',
                      backgroundColor: 'rgba(244, 67, 54, 0.08)',
                    },
                  }}
                >
                  PDF İndir
                </Button>
              </Box>
            )}

            {/* Messages Table */}
            <Paper sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 1.5 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : messages.length === 0 ? (
                <Box sx={{ p: 1.5, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                    {filters.startDate || filters.endDate || filters.status || filters.userId
                      ? 'Filtre kriterlerine uygun SMS bulunamadı'
                      : 'Henüz SMS gönderilmemiş'}
                  </Typography>
                </Box>
              ) : (
                <>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {isAdmin && (
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kullanıcı</TableCell>
                        )}
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kişi</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Telefon</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Mesaj</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Durum</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Maliyet</TableCell>
                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tarih</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {messages.map((message) => (
                        <TableRow key={message.id}>
                          {isAdmin && (
                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                              {message.user?.username || '-'}
                              <br />
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                {message.user?.email || '-'}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{message.contact?.name || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{message.phoneNumber}</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{message.message.substring(0, 50)}...</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                            <Chip
                              label={message.status}
                              color={getStatusColor(message.status)}
                              size="small"
                              sx={{
                                fontSize: '0.65rem',
                                fontWeight: 500,
                                height: 20,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>{Number(message.cost)} kredi</TableCell>
                          <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                            <ClientDate date={message.sentAt} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                  
                  {/* Pagination */}
                  {smsTotal > smsPageSize && (
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.12)' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                        Toplam {smsTotal} kayıt, Sayfa {smsPage} / {Math.ceil(smsTotal / smsPageSize)}
                      </Typography>
                      <Stack spacing={2}>
                        <Pagination
                          count={Math.ceil(smsTotal / smsPageSize)}
                          page={smsPage}
                          onChange={(e, page) => {
                            setSmsPage(page);
                          }}
                          size="small"
                          color="primary"
                          sx={{
                            '& .MuiPaginationItem-root': {
                              fontSize: '12px',
                            },
                          }}
                        />
                      </Stack>
                      <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel sx={{ fontSize: '12px' }}>Sayfa Boyutu</InputLabel>
                        <Select
                          value={smsPageSize}
                          onChange={(e) => {
                            setSmsPageSize(Number(e.target.value));
                            setSmsPage(1);
                          }}
                          label="Sayfa Boyutu"
                          sx={{ fontSize: '12px' }}
                        >
                          <MenuItem value={10}>10 / sayfa</MenuItem>
                          <MenuItem value={20}>20 / sayfa</MenuItem>
                          <MenuItem value={50}>50 / sayfa</MenuItem>
                          <MenuItem value={100}>100 / sayfa</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  )}
                </>
              )}
            </Paper>
              </Box>
            )}

            {/* Bulk SMS Tab */}
            {tabValue === 'bulk' && (
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2,
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  Toplu SMS Raporları
                </Typography>

                {/* Bulk SMS Filters */}
                {isAdmin && (
                  <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontSize: '13px', fontWeight: 600, color: 'text.secondary' }}>
                      Filtreleme Seçenekleri
                    </Typography>
                    <Grid container spacing={1.5} alignItems="center">
                      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel sx={{ fontSize: '12px' }}>Kullanıcı</InputLabel>
                          <Select
                            value={bulkFilters.userId}
                            onChange={(e) => setBulkFilters({ ...bulkFilters, userId: e.target.value })}
                            label="Kullanıcı"
                            title="Toplu SMS kullanıcı filtresi"
                            sx={{
                              fontSize: '12px',
                              borderRadius: 1.5,
                            }}
                          >
                            <MenuItem value="" sx={{ fontSize: '12px' }}>Tüm Kullanıcılar</MenuItem>
                            {users.map((u) => (
                              <MenuItem key={u.id} value={u.id} sx={{ fontSize: '12px' }}>
                                {u.username} ({u.email})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Başlangıç Tarihi"
                          type="date"
                          value={bulkFilters.startDate}
                          onChange={(e) => setBulkFilters({ ...bulkFilters, startDate: e.target.value })}
                          InputLabelProps={{ shrink: true }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1.5,
                              fontSize: '12px',
                            },
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Bitiş Tarihi"
                          type="date"
                          value={bulkFilters.endDate}
                          onChange={(e) => setBulkFilters({ ...bulkFilters, endDate: e.target.value })}
                          InputLabelProps={{ shrink: true }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1.5,
                              fontSize: '12px',
                            },
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel sx={{ fontSize: '12px' }}>Durum</InputLabel>
                          <Select
                          value={bulkFilters.status}
                          onChange={(e) => setBulkFilters({ ...bulkFilters, status: e.target.value })}
                            label="Durum"
                          sx={{
                              fontSize: '12px',
                              borderRadius: 1.5,
                          }}
                        >
                            <MenuItem value="">Tümü</MenuItem>
                            <MenuItem value="sent">Başarılı</MenuItem>
                            <MenuItem value="failed">Başarısız</MenuItem>
                            <MenuItem value="partial">Kısmen Başarılı</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Mesaj İçeriği"
                          value={bulkFilters.messageSearch}
                          onChange={(e) => setBulkFilters({ ...bulkFilters, messageSearch: e.target.value })}
                          placeholder="Ara..."
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1.5,
                              fontSize: '12px',
                            },
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                )}

                {loadingBulkReports ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : bulkSmsReports.length === 0 ? (
                  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Henüz toplu SMS raporu bulunmuyor
                    </Typography>
                  </Paper>
                ) : (
                  <>
                  <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Mesaj Şablonu</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Alıcılar</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Başarılı</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Başarısız</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Durum</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tarih</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }} align="center">İşlemler</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                          {bulkSmsReports
                            .slice((bulkPage - 1) * bulkPageSize, bulkPage * bulkPageSize)
                            .map((report, index) => {
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
                              onClick={() => handleViewBulkReportDetails(report)}
                              sx={{
                                cursor: 'pointer',
                                '&:hover': {
                                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                                },
                              }}
                            >
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                <Typography variant="body2" sx={{ fontSize: '12px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {report.fullMessage || report.message}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                {report.recipients} kişi
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75, color: '#4caf50', fontWeight: 600 }}>
                                {report.successCount}
                              </TableCell>
                              <TableCell sx={{ fontSize: '12px', py: 0.75, color: '#f44336', fontWeight: 600 }}>
                                {report.failedCount}
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
                              <TableCell sx={{ fontSize: '12px', py: 0.75 }} align="center">
                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportSingleBulkReport(report, 'excel');
                                    }}
                                    sx={{
                                      color: '#4caf50',
                                      '&:hover': {
                                        backgroundColor: 'rgba(76, 175, 80, 0.08)',
                                      },
                                      p: 0.5,
                                    }}
                                    title="Excel İndir"
                                  >
                                    <TableChart sx={{ fontSize: '18px' }} />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportSingleBulkReport(report, 'pdf');
                                    }}
                                    sx={{
                                      color: '#f44336',
                                      '&:hover': {
                                        backgroundColor: 'rgba(244, 67, 54, 0.08)',
                                      },
                                      p: 0.5,
                                    }}
                                    title="PDF İndir"
                                  >
                                    <PictureAsPdf sx={{ fontSize: '18px' }} />
                                  </IconButton>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                    
                    {/* Pagination */}
                    {bulkTotal > bulkPageSize && (
                      <Box sx={{ mt: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.12)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                          Toplam {bulkTotal} kayıt, Sayfa {bulkPage} / {Math.ceil(bulkTotal / bulkPageSize)}
                        </Typography>
                        <Stack spacing={2}>
                          <Pagination
                            count={Math.ceil(bulkTotal / bulkPageSize)}
                            page={bulkPage}
                            onChange={(e, page) => {
                              setBulkPage(page);
                            }}
                            size="small"
                            color="primary"
                            sx={{
                              '& .MuiPaginationItem-root': {
                                fontSize: '12px',
                              },
                            }}
                          />
                        </Stack>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <InputLabel sx={{ fontSize: '12px' }}>Sayfa Boyutu</InputLabel>
                          <Select
                            value={bulkPageSize}
                            onChange={(e) => {
                              setBulkPageSize(Number(e.target.value));
                              setBulkPage(1);
                            }}
                            label="Sayfa Boyutu"
                            sx={{ fontSize: '12px' }}
                          >
                            <MenuItem value={10}>10 / sayfa</MenuItem>
                            <MenuItem value={20}>20 / sayfa</MenuItem>
                            <MenuItem value={50}>50 / sayfa</MenuItem>
                            <MenuItem value={100}>100 / sayfa</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )}

            {/* Bulk SMS Details Dialog */}
            <Dialog
              open={bulkDetailDialogOpen}
              onClose={() => setBulkDetailDialogOpen(false)}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: 2,
                  backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
                },
              }}
            >
              <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600 }}>
                  Toplu SMS Detayları
                </Typography>
                <IconButton
                  onClick={() => setBulkDetailDialogOpen(false)}
                  size="small"
                  sx={{ color: 'text.secondary' }}
                >
                  <Close />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers>
                {selectedBulkReport && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontSize: '13px', fontWeight: 600, color: 'text.secondary' }}>
                      Mesaj İçeriği
                    </Typography>
                    <Paper sx={{ p: 1.5, mb: 2, borderRadius: 1.5, backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
                      <Typography variant="body2" sx={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                        {selectedBulkReport.fullMessage || selectedBulkReport.message}
                      </Typography>
                    </Paper>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          Toplam Alıcı
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 600 }}>
                          {selectedBulkReport.recipients} kişi
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          Başarılı
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 600, color: '#4caf50' }}>
                          {selectedBulkReport.successCount}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          Başarısız
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 600, color: '#f44336' }}>
                          {selectedBulkReport.failedCount}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          Tarih
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 600 }}>
                          <ClientDate date={selectedBulkReport.sentAt} />
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}
                
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontSize: '13px', fontWeight: 600, color: 'text.secondary' }}>
                  Alıcı Detayları
                </Typography>
                
                {loadingBulkDetails ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : bulkReportDetails.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    Detay bulunamadı
                  </Typography>
                ) : (
                  <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Telefon</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Durum</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Operatör</TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tarih</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                          {bulkReportDetails
                            .slice((bulkDetailsPage - 1) * bulkDetailsPageSize, bulkDetailsPage * bulkDetailsPageSize)
                            .map((detail: any) => (
                          <TableRow key={detail.id}>
                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                              {detail.phoneNumber || detail.phone_number}
                            </TableCell>
                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                              <Chip
                                label={detail.status === 'iletildi' ? 'İletildi' : 
                                       detail.status === 'iletilmedi' ? 'İletilmedi' : 
                                       detail.status === 'zaman_aşımı' ? 'Zaman Aşımı' : 
                                       detail.status === 'rapor_bekliyor' ? 'Rapor Bekliyor' : 
                                       detail.status === 'gönderildi' ? 'Gönderildi' : 
                                       detail.status || '-'}
                                color={
                                  detail.status === 'iletildi' ? 'success' : 
                                  detail.status === 'iletilmedi' || detail.status === 'zaman_aşımı' ? 'error' : 
                                  detail.status === 'rapor_bekliyor' ? 'warning' : 
                                  'default'
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
                              {detail.network || '-'}
                            </TableCell>
                            <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                              <ClientDate date={detail.sentAt || detail.sent_at} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                    
                    {/* Pagination */}
                    {bulkReportDetails.length > bulkDetailsPageSize && (
                      <Box sx={{ mt: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.12)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                          Toplam {bulkReportDetails.length} kayıt, Sayfa {bulkDetailsPage} / {Math.ceil(bulkReportDetails.length / bulkDetailsPageSize)}
                        </Typography>
                        <Stack spacing={2}>
                          <Pagination
                            count={Math.ceil(bulkReportDetails.length / bulkDetailsPageSize)}
                            page={bulkDetailsPage}
                            onChange={(e, page) => {
                              setBulkDetailsPage(page);
                            }}
                            size="small"
                            color="primary"
                            sx={{
                              '& .MuiPaginationItem-root': {
                                fontSize: '12px',
                              },
                            }}
                          />
                        </Stack>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <InputLabel sx={{ fontSize: '12px' }}>Sayfa Boyutu</InputLabel>
                          <Select
                            value={bulkDetailsPageSize}
                            onChange={(e) => {
                              setBulkDetailsPageSize(Number(e.target.value));
                              setBulkDetailsPage(1);
                            }}
                            label="Sayfa Boyutu"
                            sx={{ fontSize: '12px' }}
                          >
                            <MenuItem value={10}>10 / sayfa</MenuItem>
                            <MenuItem value={20}>20 / sayfa</MenuItem>
                            <MenuItem value={50}>50 / sayfa</MenuItem>
                            <MenuItem value={100}>100 / sayfa</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    )}
                  </>
                )}
              </DialogContent>
              <DialogActions sx={{ p: 1.5 }}>
                <Button
                  onClick={() => setBulkDetailDialogOpen(false)}
                  variant="outlined"
                  size="small"
                  sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '12px' }}
                >
                  Kapat
                </Button>
              </DialogActions>
            </Dialog>

            {/* Statistics Tab - Admin Only */}
            {tabValue === 'stats' && isAdmin && (
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2,
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  Sistem İstatistikleri
                </Typography>

                {/* Statistics Filters */}
                <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontSize: '13px', fontWeight: 600, color: 'text.secondary' }}>
                    Tarih Aralığı Filtreleme
                  </Typography>
                  <Grid container spacing={1.5} alignItems="center">
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Başlangıç Tarihi"
                        type="date"
                        value={statsFilters.startDate}
                        onChange={(e) => setStatsFilters({ ...statsFilters, startDate: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Bitiş Tarihi"
                        type="date"
                        value={statsFilters.endDate}
                        onChange={(e) => setStatsFilters({ ...statsFilters, endDate: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<FilterList />}
                        onClick={loadStats}
                        disabled={loadingStats}
                        sx={{
                          background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                          boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
                          borderRadius: 2,
                          padding: '6px 16px',
                          fontSize: '12px',
                          fontWeight: 500,
                          textTransform: 'none',
                          '&:hover': {
                            boxShadow: '0 6px 16px rgba(25, 118, 210, 0.35)',
                            transform: 'translateY(-1px)',
                          },
                          transition: 'all 0.3s',
                        }}
                      >
                        Filtrele
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>

                {statsError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setStatsError('')}>
                    {statsError}
                  </Alert>
                )}

                {loadingStats ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : stats ? (
                  <Box>
                    {/* İstatistik Özeti */}
                    <Paper sx={{ 
                      p: 2, 
                      mb: 2, 
                      borderRadius: 2, 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      background: mode === 'dark' 
                        ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(220, 0, 78, 0.1) 100%)'
                        : 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)',
                      border: '1px solid rgba(25, 118, 210, 0.2)',
                    }}>
                      <Typography variant="h6" sx={{ fontSize: '15px', fontWeight: 600, mb: 1 }}>
                        📊 Sistem Özeti
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                            Toplam Kullanıcı
                          </Typography>
                          <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700 }}>
                            {stats.totalUsers || 0}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                            Toplam SMS
                          </Typography>
                          <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700 }}>
                            {stats.totalSMS || 0}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                            Toplam Gelir
                          </Typography>
                          <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#4caf50' }}>
                            {Number(stats.totalRevenue || 0).toLocaleString('tr-TR')} TRY
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                            Bekleyen Ödemeler
                          </Typography>
                          <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#f44336' }}>
                            {stats.pendingPaymentRequests || 0}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Detaylı İstatistik Kartları */}
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ 
                          borderRadius: 2, 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          background: mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.15) 0%, rgba(220, 0, 78, 0.15) 100%)'
                            : 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(220, 0, 78, 0.1) 100%)',
                          border: '1px solid rgba(25, 118, 210, 0.2)',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 20px rgba(25, 118, 210, 0.25)',
                          },
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <People sx={{ color: 'primary.main', fontSize: 28 }} />
                              <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', bgcolor: 'rgba(25, 118, 210, 0.1)', px: 1, py: 0.5, borderRadius: 1 }}>
                                Kullanıcılar
                              </Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
                              {stats.totalUsers || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                              Sistemdeki toplam kullanıcı sayısı
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ 
                          borderRadius: 2, 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          background: mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(25, 118, 210, 0.15) 100%)'
                            : 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(25, 118, 210, 0.1) 100%)',
                          border: '1px solid rgba(33, 150, 243, 0.2)',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 20px rgba(33, 150, 243, 0.25)',
                          },
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <People sx={{ color: '#2196f3', fontSize: 28 }} />
                              <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', bgcolor: 'rgba(33, 150, 243, 0.1)', px: 1, py: 0.5, borderRadius: 1 }}>
                                Rehber
                              </Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 700, color: '#2196f3', mb: 0.5 }}>
                              {stats.totalContacts || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                              Tüm kullanıcıların toplam rehber sayısı
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ 
                          borderRadius: 2, 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          background: mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(56, 142, 60, 0.15) 100%)'
                            : 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(56, 142, 60, 0.1) 100%)',
                          border: '1px solid rgba(76, 175, 80, 0.2)',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 20px rgba(76, 175, 80, 0.25)',
                          },
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <Assessment sx={{ color: '#4caf50', fontSize: 28 }} />
                              <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', bgcolor: 'rgba(76, 175, 80, 0.1)', px: 1, py: 0.5, borderRadius: 1 }}>
                                SMS
                              </Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 700, color: '#4caf50', mb: 0.5 }}>
                              {stats.totalSMS || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                              Sistemde gönderilen toplam SMS sayısı
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ 
                          borderRadius: 2, 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          background: mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 193, 7, 0.15) 100%)'
                            : 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 193, 7, 0.1) 100%)',
                          border: '1px solid rgba(255, 152, 0, 0.2)',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 20px rgba(255, 152, 0, 0.25)',
                          },
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <BarChart sx={{ color: '#ff9800', fontSize: 28 }} />
                              <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', bgcolor: 'rgba(255, 152, 0, 0.1)', px: 1, py: 0.5, borderRadius: 1 }}>
                                Bu Ay
                              </Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 700, color: '#ff9800', mb: 0.5 }}>
                              {stats.smsThisMonth || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                              Bu ay gönderilen SMS sayısı
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ 
                          borderRadius: 2, 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          background: mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(156, 39, 176, 0.15) 0%, rgba(123, 31, 162, 0.15) 100%)'
                            : 'linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(123, 31, 162, 0.1) 100%)',
                          border: '1px solid rgba(156, 39, 176, 0.2)',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 20px rgba(156, 39, 176, 0.25)',
                          },
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <Payment sx={{ color: '#9c27b0', fontSize: 28 }} />
                              <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', bgcolor: 'rgba(156, 39, 176, 0.1)', px: 1, py: 0.5, borderRadius: 1 }}>
                                Ödemeler
                              </Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 700, color: '#9c27b0', mb: 0.5 }}>
                              {stats.totalPayments || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                              Tamamlanan toplam ödeme sayısı
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ 
                          borderRadius: 2, 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          background: mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(56, 142, 60, 0.15) 100%)'
                            : 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(56, 142, 60, 0.1) 100%)',
                          border: '1px solid rgba(76, 175, 80, 0.2)',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 20px rgba(76, 175, 80, 0.25)',
                          },
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <AccountBalanceWallet sx={{ color: '#4caf50', fontSize: 28 }} />
                              <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', bgcolor: 'rgba(76, 175, 80, 0.1)', px: 1, py: 0.5, borderRadius: 1 }}>
                                Gelir
                              </Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontSize: '24px', fontWeight: 700, color: '#4caf50', mb: 0.5 }}>
                              {Number(stats.totalRevenue || 0).toLocaleString('tr-TR')} TRY
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                              Toplam gelir miktarı
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ 
                          borderRadius: 2, 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          background: mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(244, 67, 54, 0.15) 0%, rgba(211, 47, 47, 0.15) 100%)'
                            : 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(211, 47, 47, 0.1) 100%)',
                          border: '1px solid rgba(244, 67, 54, 0.2)',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 20px rgba(244, 67, 54, 0.25)',
                          },
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <MoneyOff sx={{ color: '#f44336', fontSize: 28 }} />
                              <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', bgcolor: 'rgba(244, 67, 54, 0.1)', px: 1, py: 0.5, borderRadius: 1 }}>
                                Beklemede
                              </Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontSize: '28px', fontWeight: 700, color: '#f44336', mb: 0.5 }}>
                              {stats.pendingPaymentRequests || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                              Onay bekleyen ödeme talepleri
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                ) : (
                  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      İstatistikler yüklenemedi
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {/* Short Links Statistics Section - All Users */}
            {tabValue === 'stats' && (
              <Box sx={{ mt: 4 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2,
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  Kısa Link İstatistikleri
                </Typography>

                {shortLinksStatsError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setShortLinksStatsError('')}>
                    {shortLinksStatsError}
                  </Alert>
                )}

                {loadingShortLinksStats ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : shortLinksStats ? (
                  <Box>
                    {/* Toplam İstatistikler */}
                    {shortLinksStats.totalStats && (
                      <Paper sx={{ 
                        p: 2, 
                        mb: 2, 
                        borderRadius: 2, 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        background: mode === 'dark' 
                          ? 'linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(123, 31, 162, 0.1) 100%)'
                          : 'linear-gradient(135deg, rgba(156, 39, 176, 0.05) 0%, rgba(123, 31, 162, 0.05) 100%)',
                        border: '1px solid rgba(156, 39, 176, 0.2)',
                      }}>
                        <Typography variant="h6" sx={{ fontSize: '15px', fontWeight: 600, mb: 1 }}>
                          📊 Kısa Link Özeti
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                              Toplam Link
                            </Typography>
                            <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700 }}>
                              {shortLinksStats.totalStats.totalLinks || 0}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                              Toplam Tıklama
                            </Typography>
                            <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#4caf50' }}>
                              {shortLinksStats.totalStats.totalClicks || 0}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                              Benzersiz Tıklama
                            </Typography>
                            <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#2196f3' }}>
                              {shortLinksStats.totalStats.totalUniqueClicks || 0}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                              Benzersiz IP
                            </Typography>
                            <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#ff9800' }}>
                              {shortLinksStats.totalStats.totalIPAddresses || 0}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    )}

                    {/* Kısa Linkler Listesi */}
                    <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Kısa Link</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>Orijinal URL</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }} align="center">Toplam Tıklama</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }} align="center">Benzersiz Tıklama</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }} align="center">Benzersiz IP</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }} align="center">Oluşturulma</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }} align="center">İşlem</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {shortLinksStats.shortLinks && shortLinksStats.shortLinks.length > 0 ? (
                            shortLinksStats.shortLinks
                              .slice((shortLinksPage - 1) * shortLinksPageSize, shortLinksPage * shortLinksPageSize)
                              .map((link: any) => {
                              const shortLinkDomain = process.env.NEXT_PUBLIC_SHORT_LINK_DOMAIN || 'go.kentsms.com';
                              const shortLink = `https://${shortLinkDomain}/${link.short_code}`;
                              const isExpanded = expandedShortLinkId === link.id;
                              return (
                                <>
                                  <TableRow 
                                    key={link.id}
                                    sx={{ 
                                      '&:hover': { 
                                        bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                        cursor: 'pointer',
                                      } 
                                    }}
                                    onClick={() => {
                                      setExpandedShortLinkId(isExpanded ? null : link.id);
                                    }}
                                  >
                                    <TableCell sx={{ fontSize: '12px' }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedShortLinkId(isExpanded ? null : link.id);
                                          }}
                                          sx={{ p: 0.5 }}
                                        >
                                          {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                        </IconButton>
                                        <Link sx={{ fontSize: 16, color: 'primary.main' }} />
                                        <Typography variant="body2" sx={{ fontSize: '12px', fontFamily: 'monospace' }}>
                                          {shortLink}
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '12px' }}>
                                      <Typography 
                                        variant="body2" 
                                        sx={{ 
                                          fontSize: '11px', 
                                          maxWidth: 200, 
                                          overflow: 'hidden', 
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                        title={link.original_url}
                                      >
                                        {link.original_url}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 600 }}>
                                      {link.stats?.totalClicks || 0}
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 600, color: '#2196f3' }}>
                                      {link.stats?.uniqueClicks || 0}
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 600, color: '#ff9800' }}>
                                      {link.stats?.ipAddresses?.length || 0}
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontSize: '11px' }}>
                                      <ClientDate date={link.created_at} />
                                    </TableCell>
                                    <TableCell align="center">
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedShortLinkId(isExpanded ? null : link.id);
                                        }}
                                        sx={{
                                          fontSize: '11px',
                                          textTransform: 'none',
                                          borderRadius: 1.5,
                                        }}
                                      >
                                        {isExpanded ? 'Gizle' : 'Detay'}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell colSpan={7} sx={{ py: 0, border: 0 }}>
                                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                        <Box sx={{ p: 2, bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)' }}>
                                          {/* Link Bilgileri */}
                                          <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
                                            <Grid container spacing={2}>
                                              <Grid size={{ xs: 12, md: 6 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px', display: 'block', mb: 0.5 }}>
                                                  Kısa Link
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 600 }}>
                                                  {shortLink}
                                                </Typography>
                                              </Grid>
                                              <Grid size={{ xs: 12, md: 6 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px', display: 'block', mb: 0.5 }}>
                                                  Orijinal URL
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontSize: '12px', wordBreak: 'break-all' }}>
                                                  {link.original_url}
                                                </Typography>
                                              </Grid>
                                              <Grid size={{ xs: 12, md: 4 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px', display: 'block', mb: 0.5 }}>
                                                  Toplam Tıklama
                                                </Typography>
                                                <Typography variant="h6" sx={{ fontSize: '20px', fontWeight: 700, color: '#4caf50' }}>
                                                  {link.stats?.totalClicks || 0}
                                                </Typography>
                                              </Grid>
                                              <Grid size={{ xs: 12, md: 4 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px', display: 'block', mb: 0.5 }}>
                                                  Benzersiz Tıklama
                                                </Typography>
                                                <Typography variant="h6" sx={{ fontSize: '20px', fontWeight: 700, color: '#2196f3' }}>
                                                  {link.stats?.uniqueClicks || 0}
                                                </Typography>
                                              </Grid>
                                              <Grid size={{ xs: 12, md: 4 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px', display: 'block', mb: 0.5 }}>
                                                  Benzersiz IP
                                                </Typography>
                                                <Typography variant="h6" sx={{ fontSize: '20px', fontWeight: 700, color: '#ff9800' }}>
                                                  {link.stats?.ipAddresses?.length || 0}
                                                </Typography>
                                              </Grid>
                                            </Grid>
                                          </Paper>

                                          {/* IP Adresleri */}
                                          {link.stats?.ipAddresses && link.stats.ipAddresses.length > 0 && (
                                            <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                                              <Typography variant="subtitle2" sx={{ fontSize: '13px', fontWeight: 600, mb: 1.5 }}>
                                                <Public sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                                IP Adresleri ({link.stats.ipAddresses.length})
                                              </Typography>
                                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                {link.stats.ipAddresses.map((ip: string, index: number) => (
                                                  <Chip
                                                    key={index}
                                                    label={`${ip} (${link.stats?.ipClickCounts?.[ip] || 0} tıklama)`}
                                                    size="small"
                                                    sx={{ fontSize: '11px' }}
                                                  />
                                                ))}
                                              </Box>
                                            </Paper>
                                          )}

                                          {/* Ülkeler ve Şehirler */}
                                          {(link.stats?.countries?.length > 0 || link.stats?.cities?.length > 0) && (
                                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                              {link.stats?.countries && link.stats.countries.length > 0 && (
                                                <Grid size={{ xs: 12, md: 6 }}>
                                                  <Paper sx={{ p: 2, borderRadius: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ fontSize: '13px', fontWeight: 600, mb: 1.5 }}>
                                                      <LocationOn sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                                      Ülkeler ({link.stats.countries.length})
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                      {link.stats.countries.map((country: string, index: number) => (
                                                        <Chip
                                                          key={index}
                                                          label={country}
                                                          size="small"
                                                          sx={{ fontSize: '11px' }}
                                                        />
                                                      ))}
                                                    </Box>
                                                  </Paper>
                                                </Grid>
                                              )}
                                              {link.stats?.cities && link.stats.cities.length > 0 && (
                                                <Grid size={{ xs: 12, md: 6 }}>
                                                  <Paper sx={{ p: 2, borderRadius: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ fontSize: '13px', fontWeight: 600, mb: 1.5 }}>
                                                      <LocationOn sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                                      Şehirler ({link.stats.cities.length})
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                      {link.stats.cities.map((city: string, index: number) => (
                                                        <Chip
                                                          key={index}
                                                          label={city}
                                                          size="small"
                                                          sx={{ fontSize: '11px' }}
                                                        />
                                                      ))}
                                                    </Box>
                                                  </Paper>
                                                </Grid>
                                              )}
                                            </Grid>
                                          )}

                                          {/* User Agent ve Referer İstatistikleri */}
                                          {(link.stats?.userAgents?.length > 0 || link.stats?.referers?.length > 0) && (
                                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                              {link.stats?.userAgents && link.stats.userAgents.length > 0 && (
                                                <Grid size={{ xs: 12, md: 6 }}>
                                                  <Paper sx={{ p: 2, borderRadius: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ fontSize: '13px', fontWeight: 600, mb: 1.5 }}>
                                                      <Language sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                                      User Agent'lar ({link.stats.userAgents.length})
                                                    </Typography>
                                                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                                                      {link.stats.userAgents.slice(0, 10).map((ua: string, index: number) => (
                                                        <Chip
                                                          key={index}
                                                          label={ua.length > 50 ? ua.substring(0, 50) + '...' : ua}
                                                          size="small"
                                                          sx={{ fontSize: '10px', mb: 0.5, mr: 0.5, display: 'inline-block' }}
                                                          title={ua}
                                                        />
                                                      ))}
                                                      {link.stats.userAgents.length > 10 && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', display: 'block', mt: 1 }}>
                                                          +{link.stats.userAgents.length - 10} daha fazla
                                                        </Typography>
                                                      )}
                                                    </Box>
                                                  </Paper>
                                                </Grid>
                                              )}
                                              {link.stats?.referers && link.stats.referers.length > 0 && (
                                                <Grid size={{ xs: 12, md: 6 }}>
                                                  <Paper sx={{ p: 2, borderRadius: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ fontSize: '13px', fontWeight: 600, mb: 1.5 }}>
                                                      <Link sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                                      Referer'lar ({link.stats.referers.length})
                                                    </Typography>
                                                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                                                      {link.stats.referers.slice(0, 10).map((ref: string, index: number) => (
                                                        <Chip
                                                          key={index}
                                                          label={ref.length > 50 ? ref.substring(0, 50) + '...' : ref}
                                                          size="small"
                                                          sx={{ fontSize: '10px', mb: 0.5, mr: 0.5, display: 'inline-block' }}
                                                          title={ref}
                                                        />
                                                      ))}
                                                      {link.stats.referers.length > 10 && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', display: 'block', mt: 1 }}>
                                                          +{link.stats.referers.length - 10} daha fazla
                                                        </Typography>
                                                      )}
                                                    </Box>
                                                  </Paper>
                                                </Grid>
                                              )}
                                            </Grid>
                                          )}

                                          {/* Tıklama Detayları */}
                                          {link.stats?.clicks && link.stats.clicks.length > 0 && (
                                            <Paper sx={{ borderRadius: 2 }}>
                                              <Typography variant="subtitle2" sx={{ fontSize: '13px', fontWeight: 600, mb: 1.5, p: 2, pb: 1 }}>
                                                Tıklama Detayları ({link.stats.clicks.length})
                                              </Typography>
                                              <TableContainer>
                                                <Table size="small">
                                                  <TableHead>
                                                    <TableRow>
                                                      <TableCell sx={{ fontSize: '11px', fontWeight: 600 }}>IP Adresi</TableCell>
                                                      <TableCell sx={{ fontSize: '11px', fontWeight: 600 }}>Ülke</TableCell>
                                                      <TableCell sx={{ fontSize: '11px', fontWeight: 600 }}>Şehir</TableCell>
                                                      <TableCell sx={{ fontSize: '11px', fontWeight: 600 }}>User Agent</TableCell>
                                                      <TableCell sx={{ fontSize: '11px', fontWeight: 600 }}>Referer</TableCell>
                                                      <TableCell sx={{ fontSize: '11px', fontWeight: 600 }}>Tarih</TableCell>
                                                    </TableRow>
                                                  </TableHead>
                                                  <TableBody>
                                                    {link.stats.clicks.slice(0, 100).map((click: any) => (
                                                      <TableRow key={click.id}>
                                                        <TableCell sx={{ fontSize: '11px', fontFamily: 'monospace' }}>
                                                          {click.ip_address}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '11px' }}>
                                                          {click.country ? (
                                                            <Chip
                                                              label={click.country}
                                                              size="small"
                                                              sx={{ fontSize: '10px', height: 20 }}
                                                            />
                                                          ) : (
                                                            '-'
                                                          )}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '11px' }}>
                                                          {click.city ? (
                                                            <Chip
                                                              label={click.city}
                                                              size="small"
                                                              sx={{ fontSize: '10px', height: 20 }}
                                                            />
                                                          ) : (
                                                            '-'
                                                          )}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '11px', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }} title={click.user_agent || ''}>
                                                          {click.user_agent ? (
                                                            <Typography variant="caption" sx={{ fontSize: '10px' }}>
                                                              {click.user_agent.length > 40 ? click.user_agent.substring(0, 40) + '...' : click.user_agent}
                                                            </Typography>
                                                          ) : (
                                                            '-'
                                                          )}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '11px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }} title={click.referer || ''}>
                                                          {click.referer ? (
                                                            <Typography variant="caption" sx={{ fontSize: '10px', color: 'primary.main' }}>
                                                              {click.referer.length > 30 ? click.referer.substring(0, 30) + '...' : click.referer}
                                                            </Typography>
                                                          ) : (
                                                            '-'
                                                          )}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '11px' }}>
                                                          <ClientDate date={click.clicked_at} />
                                                        </TableCell>
                                                      </TableRow>
                                                    ))}
                                                  </TableBody>
                                                </Table>
                                              </TableContainer>
                                              {link.stats.clicks.length > 100 && (
                                                <Box sx={{ p: 2, textAlign: 'center' }}>
                                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                                    Toplam {link.stats.clicks.length} tıklama var. İlk 100 tanesi gösteriliyor.
                                                  </Typography>
                                                </Box>
                                              )}
                                            </Paper>
                                          )}
                                        </Box>
                                      </Collapse>
                                    </TableCell>
                                  </TableRow>
                                </>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                                  Kısa link bulunamadı
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    {/* Pagination */}
                    {shortLinksStats.shortLinks && shortLinksStats.shortLinks.length > shortLinksPageSize && (
                      <Box sx={{ mt: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.12)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                          Toplam {shortLinksStats.shortLinks.length} kayıt, Sayfa {shortLinksPage} / {Math.ceil(shortLinksStats.shortLinks.length / shortLinksPageSize)}
                        </Typography>
                        <Stack spacing={2}>
                          <Pagination
                            count={Math.ceil(shortLinksStats.shortLinks.length / shortLinksPageSize)}
                            page={shortLinksPage}
                            onChange={(e, page) => {
                              setShortLinksPage(page);
                            }}
                            size="small"
                            color="primary"
                            sx={{
                              '& .MuiPaginationItem-root': {
                                fontSize: '12px',
                              },
                            }}
                          />
                        </Stack>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <InputLabel sx={{ fontSize: '12px' }}>Sayfa Boyutu</InputLabel>
                          <Select
                            value={shortLinksPageSize}
                            onChange={(e) => {
                              setShortLinksPageSize(Number(e.target.value));
                              setShortLinksPage(1);
                            }}
                            label="Sayfa Boyutu"
                            sx={{ fontSize: '12px' }}
                          >
                            <MenuItem value={10}>10 / sayfa</MenuItem>
                            <MenuItem value={20}>20 / sayfa</MenuItem>
                            <MenuItem value={50}>50 / sayfa</MenuItem>
                            <MenuItem value={100}>100 / sayfa</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                      Kısa link istatistikleri yüklenemedi
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {/* Payment Reports Tab - Admin Only */}
            {tabValue === 'payments' && isAdmin && (
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2,
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  Ödeme Raporları
                </Typography>

                {/* Payment Reports Filters */}
                <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontSize: '13px', fontWeight: 600, color: 'text.secondary' }}>
                    Filtreleme Seçenekleri
                  </Typography>
                  <Grid container spacing={1.5} alignItems="center">
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel sx={{ fontSize: '12px' }}>Kullanıcı</InputLabel>
                        <Select
                          value={paymentFilters.userId}
                          onChange={(e) => setPaymentFilters({ ...paymentFilters, userId: e.target.value })}
                          label="Kullanıcı"
                          title="Ödeme raporları kullanıcı filtresi"
                          sx={{
                            fontSize: '12px',
                            borderRadius: 1.5,
                          }}
                        >
                          <MenuItem value="" sx={{ fontSize: '12px' }}>Tüm Kullanıcılar</MenuItem>
                          {users.map((u) => (
                            <MenuItem key={u.id} value={u.id} sx={{ fontSize: '12px' }}>
                              {u.username} ({u.email})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Başlangıç Tarihi"
                        type="date"
                        value={paymentFilters.startDate}
                        onChange={(e) => setPaymentFilters({ ...paymentFilters, startDate: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Bitiş Tarihi"
                        type="date"
                        value={paymentFilters.endDate}
                        onChange={(e) => setPaymentFilters({ ...paymentFilters, endDate: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ fontSize: '12px' }}>Durum</InputLabel>
                      <Select
                        value={paymentFilters.status}
                        onChange={(e) => setPaymentFilters({ ...paymentFilters, status: e.target.value })}
                        label="Durum"
                        sx={{
                            fontSize: '12px',
                          borderRadius: 1.5,
                        }}
                      >
                        <MenuItem value="">Tümü</MenuItem>
                        <MenuItem value="pending">Beklemede</MenuItem>
                        <MenuItem value="approved">Onaylandı</MenuItem>
                        <MenuItem value="rejected">Reddedildi</MenuItem>
                      </Select>
                    </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Ödeme Yöntemi"
                        value={paymentFilters.paymentMethod}
                        onChange={(e) => setPaymentFilters({ ...paymentFilters, paymentMethod: e.target.value })}
                        placeholder="Ara..."
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Min Tutar"
                        type="number"
                        value={paymentFilters.minAmount}
                        onChange={(e) => setPaymentFilters({ ...paymentFilters, minAmount: e.target.value })}
                        placeholder="0"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Max Tutar"
                        type="number"
                        value={paymentFilters.maxAmount}
                        onChange={(e) => setPaymentFilters({ ...paymentFilters, maxAmount: e.target.value })}
                        placeholder="0"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Transaction ID"
                        value={paymentFilters.transactionId}
                        onChange={(e) => setPaymentFilters({ ...paymentFilters, transactionId: e.target.value })}
                        placeholder="Ara..."
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '12px',
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<FilterList />}
                        onClick={loadPaymentRequests}
                        disabled={loadingPaymentRequests}
                        sx={{
                          background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                          boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
                          borderRadius: 2,
                          padding: '6px 16px',
                          fontSize: '12px',
                          fontWeight: 500,
                          textTransform: 'none',
                          '&:hover': {
                            boxShadow: '0 6px 16px rgba(25, 118, 210, 0.35)',
                            transform: 'translateY(-1px)',
                          },
                          transition: 'all 0.3s',
                        }}
                      >
                        Filtrele
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>

                {paymentRequestsError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setPaymentRequestsError('')}>
                    {paymentRequestsError}
                  </Alert>
                )}

                {loadingPaymentRequests ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : paymentRequests.length === 0 ? (
                  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Henüz ödeme talebi bulunmuyor
                    </Typography>
                  </Paper>
                ) : (
                  <Box>
                    {/* Ödeme Özeti */}
                    {(() => {
                      const totalAmount = paymentRequests.reduce((sum, req) => sum + Number(req.amount || 0), 0);
                      const approvedAmount = paymentRequests.filter(r => r.status === 'approved').reduce((sum, req) => sum + Number(req.amount || 0), 0);
                      const pendingCount = paymentRequests.filter(r => r.status === 'pending').length;
                      const approvedCount = paymentRequests.filter(r => r.status === 'approved').length;
                      const rejectedCount = paymentRequests.filter(r => r.status === 'rejected').length;
                      
                      return (
                        <Paper sx={{ 
                          p: 2, 
                          mb: 2, 
                          borderRadius: 2, 
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          background: mode === 'dark' 
                            ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(220, 0, 78, 0.1) 100%)'
                            : 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)',
                          border: '1px solid rgba(25, 118, 210, 0.2)',
                        }}>
                          <Typography variant="h6" sx={{ fontSize: '15px', fontWeight: 600, mb: 1.5 }}>
                            💰 Ödeme Özeti
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                Toplam Tutar
                              </Typography>
                              <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700 }}>
                                {Number(totalAmount).toLocaleString('tr-TR')} TRY
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                Onaylanan Tutar
                              </Typography>
                              <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#4caf50' }}>
                                {Number(approvedAmount).toLocaleString('tr-TR')} TRY
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                Beklemede
                              </Typography>
                              <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#ff9800' }}>
                                {pendingCount}
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                Onaylandı
                              </Typography>
                              <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#4caf50' }}>
                                {approvedCount}
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                Reddedildi
                              </Typography>
                              <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, color: '#f44336' }}>
                                {rejectedCount}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      );
                    })()}

                    {/* Ödeme Tablosu */}
                    <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kullanıcı</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tutar</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Kredi</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Ödeme Yöntemi</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Transaction ID</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Durum</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>Tarih</TableCell>
                            <TableCell sx={{ fontSize: '12px', fontWeight: 600, py: 1 }}>İşlem</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paymentRequests
                            .slice((paymentPage - 1) * paymentPageSize, paymentPage * paymentPageSize)
                            .map((request) => {
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
                              <TableRow 
                                key={request.id} 
                                sx={{ 
                                  '&:hover': { bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
                                  cursor: 'pointer',
                                }}
                                onClick={() => {
                                  setSelectedPaymentRequest(request);
                                  setPaymentDetailDialogOpen(true);
                                }}
                              >
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontSize: '12px', fontWeight: 500 }}>
                                      {request.user?.username || '-'}
                                    </Typography>
                                    {request.user?.email && (
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                        {request.user.email}
                                      </Typography>
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  <Typography variant="body2" sx={{ fontSize: '12px', fontWeight: 500 }}>
                                    {Number(request.amount).toLocaleString('tr-TR')} {request.currency || 'TRY'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  {request.credits} SMS {request.bonus > 0 ? `+ ${request.bonus} bonus` : ''}
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  {request.paymentMethod || '-'}
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px', py: 0.75 }}>
                                  {request.transactionId ? (
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.65rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {request.transactionId}
                                    </Typography>
                                  ) : '-'}
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
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPaymentRequest(request);
                                      setPaymentDetailDialogOpen(true);
                                    }}
                                    sx={{
                                      fontSize: '0.65rem',
                                      textTransform: 'none',
                                      py: 0.25,
                                      px: 1,
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
                    
                    {/* Pagination */}
                    {paymentTotal > paymentPageSize && (
                      <Box sx={{ mt: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.12)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                          Toplam {paymentTotal} kayıt, Sayfa {paymentPage} / {Math.ceil(paymentTotal / paymentPageSize)}
                        </Typography>
                        <Stack spacing={2}>
                          <Pagination
                            count={Math.ceil(paymentTotal / paymentPageSize)}
                            page={paymentPage}
                            onChange={(e, page) => {
                              setPaymentPage(page);
                            }}
                            size="small"
                            color="primary"
                            sx={{
                              '& .MuiPaginationItem-root': {
                                fontSize: '12px',
                              },
                            }}
                          />
                        </Stack>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <InputLabel sx={{ fontSize: '12px' }}>Sayfa Boyutu</InputLabel>
                          <Select
                            value={paymentPageSize}
                            onChange={(e) => {
                              setPaymentPageSize(Number(e.target.value));
                              setPaymentPage(1);
                            }}
                            label="Sayfa Boyutu"
                            sx={{ fontSize: '12px' }}
                          >
                            <MenuItem value={10}>10 / sayfa</MenuItem>
                            <MenuItem value={20}>20 / sayfa</MenuItem>
                            <MenuItem value={50}>50 / sayfa</MenuItem>
                            <MenuItem value={100}>100 / sayfa</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    )}

                    {/* Ödeme Detayları Dialog */}
                    <Dialog
                      open={paymentDetailDialogOpen}
                      onClose={() => {
                        setPaymentDetailDialogOpen(false);
                        setSelectedPaymentRequest(null);
                      }}
                      maxWidth="md"
                      fullWidth
                    >
                      <DialogTitle sx={{ pb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600 }}>
                            💳 Ödeme Detayları
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setPaymentDetailDialogOpen(false);
                              setSelectedPaymentRequest(null);
                            }}
                          >
                            <Close />
                          </IconButton>
                        </Box>
                      </DialogTitle>
                      <DialogContent>
                        {selectedPaymentRequest && (
                          <Box>
                            <Grid container spacing={2}>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    Kullanıcı
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500, mt: 0.5 }}>
                                    {selectedPaymentRequest.user?.username || '-'}
                                  </Typography>
                                  {selectedPaymentRequest.user?.email && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                      {selectedPaymentRequest.user.email}
                                    </Typography>
                                  )}
                                </Paper>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    Durum
                                  </Typography>
                                  <Box sx={{ mt: 0.5 }}>
                                    <Chip
                                      label={selectedPaymentRequest.status === 'approved' ? 'Onaylandı' : selectedPaymentRequest.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                                      color={selectedPaymentRequest.status === 'approved' ? 'success' : selectedPaymentRequest.status === 'rejected' ? 'error' : 'warning'}
                                      size="small"
                                      sx={{ fontSize: '0.7rem', height: 22 }}
                                    />
                                  </Box>
                                </Paper>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    Tutar
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 700, mt: 0.5, color: '#4caf50' }}>
                                    {Number(selectedPaymentRequest.amount).toLocaleString('tr-TR')} {selectedPaymentRequest.currency || 'TRY'}
                                  </Typography>
                                </Paper>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    Kredi
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500, mt: 0.5 }}>
                                    {selectedPaymentRequest.credits} SMS {selectedPaymentRequest.bonus > 0 ? `+ ${selectedPaymentRequest.bonus} bonus` : ''}
                                  </Typography>
                                </Paper>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    Ödeme Yöntemi
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500, mt: 0.5 }}>
                                    {selectedPaymentRequest.paymentMethod || '-'}
                                  </Typography>
                                </Paper>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    Transaction ID
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontSize: '13px', fontFamily: 'monospace', mt: 0.5, wordBreak: 'break-all' }}>
                                    {selectedPaymentRequest.transactionId || '-'}
                                  </Typography>
                                </Paper>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    Oluşturulma Tarihi
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500, mt: 0.5 }}>
                                    <ClientDate date={selectedPaymentRequest.createdAt} />
                                  </Typography>
                                </Paper>
                              </Grid>
                              {selectedPaymentRequest.approvedAt && (
                                <Grid size={{ xs: 12, sm: 6 }}>
                                  <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                      Onaylanma Tarihi
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500, mt: 0.5 }}>
                                      <ClientDate date={selectedPaymentRequest.approvedAt} />
                                    </Typography>
                                  </Paper>
                                </Grid>
                              )}
                              {selectedPaymentRequest.rejectedAt && (
                                <Grid size={{ xs: 12, sm: 6 }}>
                                  <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                      Reddedilme Tarihi
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500, mt: 0.5 }}>
                                      <ClientDate date={selectedPaymentRequest.rejectedAt} />
                                    </Typography>
                                  </Paper>
                                </Grid>
                              )}
                              {selectedPaymentRequest.description && (
                                <Grid size={{ xs: 12 }}>
                                  <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                      Açıklama
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '13px', mt: 0.5 }}>
                                      {selectedPaymentRequest.description}
                                    </Typography>
                                  </Paper>
                                </Grid>
                              )}
                              {selectedPaymentRequest.adminNotes && (
                                <Grid size={{ xs: 12 }}>
                                  <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.05)' }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                      Admin Notları
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '13px', mt: 0.5 }}>
                                      {selectedPaymentRequest.adminNotes}
                                    </Typography>
                                  </Paper>
                                </Grid>
                              )}
                              {selectedPaymentRequest.rejectionReason && (
                                <Grid size={{ xs: 12 }}>
                                  <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: mode === 'dark' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.05)' }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                      Red Nedeni
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '13px', mt: 0.5, color: '#f44336' }}>
                                      {selectedPaymentRequest.rejectionReason}
                                    </Typography>
                                  </Paper>
                                </Grid>
                              )}
                            </Grid>
                          </Box>
                        )}
                      </DialogContent>
                      <DialogActions sx={{ p: 1.5 }}>
                        <Button
                          onClick={() => {
                            setPaymentDetailDialogOpen(false);
                            setSelectedPaymentRequest(null);
                          }}
                          variant="outlined"
                          size="small"
                          sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '12px' }}
                        >
                          Kapat
                        </Button>
                      </DialogActions>
                    </Dialog>

                  </Box>
                )}
              </Box>
            )}
      </Box>
      </Box>
    </ProtectedRoute>
  );
}

