'use client';

import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Avatar, Chip, Typography, alpha, Divider, IconButton, Tooltip } from '@mui/material';
import { gradients } from '@/lib/theme';
import Image from 'next/image';
import { 
  Dashboard, 
  Sms, 
  RocketLaunch, 
  Person, 
  AccountBalanceWallet, 
  Settings, 
  Logout,
  Assessment,
  MoneyOff,
  AdminPanelSettings,
  DarkMode,
  LightMode,
  Link
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';

const drawerWidth = 240;

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  description?: string;
}

const menuItems: MenuItem[] = [
  { label: 'Ana Sayfa', icon: <Dashboard />, path: '/dashboard', description: 'Dashboard' },
  { label: 'SMS Gönder', icon: <Sms />, path: '/sms', description: 'Basit SMS' },
  // { label: 'Gelişmiş SMS', icon: <RocketLaunch />, path: '/advanced-sms', description: 'Toplu SMS' }, // Deaktif
  // { label: 'Rehberim', icon: <Person />, path: '/contacts', description: 'Kişiler' }, // Deaktif
  { label: 'Ödeme', icon: <AccountBalanceWallet />, path: '/payment', description: 'Kredi Yükle' },
  { label: 'Raporlar', icon: <Assessment />, path: '/reports', description: 'SMS Raporları' },
  { label: 'İadeler', icon: <MoneyOff />, path: '/refunds', description: 'İade Yönetimi' },
  { label: 'Kısa Linkler', icon: <Link />, path: '/short-links', description: 'Kısa Link İstatistikleri' },
  { label: 'Ayarlar', icon: <Settings />, path: '/profile', description: 'Profil' },
];

// Admin menu items (only shown to admin/moderator)
const adminMenuItems: MenuItem[] = [
  { label: 'Admin Panel', icon: <AdminPanelSettings />, path: '/admin', description: 'Admin Dashboard' },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useTheme();

  // Get user initials
  const initials = user?.username?.charAt(0).toUpperCase() || 'U';

  const isActive = (path: string) => pathname === path;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      {/* Logo Header - HTML_TEMPLATES.html'e göre */}
      <Box
        sx={{
          p: 1.5,
          background: 'linear-gradient(135deg, #1e40af 0%, #f97316 100%)',
          color: 'white',
          borderBottom: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Image
            src="/kentsms-logo-white.svg?v=1"
            alt="Kent SMS Logo"
            width={150}
            height={45}
            style={{
              objectFit: 'contain',
              borderRadius: 6,
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
            }}
          />
        </Box>
      </Box>

      {/* User Info - HTML_TEMPLATES.html'e göre */}
      <Box
        sx={{
          p: 1.5,
          background: alpha('#1e40af', 0.05),
          borderBottom: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: '14px' }}>
            {initials}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              {user?.username || 'Kullanıcı'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, alignItems: 'center' }}>
              {user?.role !== 'admin' && user?.role !== 'moderator' && (
                <Chip
                  label={`${user?.credit || 0} SMS`}
                  color="success"
                  size="small"
                  sx={{ 
                    height: 22, 
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    px: 0.75,
                  }}
                />
              )}
              <Chip
                label={user?.role === 'admin' ? 'Admin' : user?.role === 'moderator' ? 'Moderator' : 'Premium'}
                color={user?.role === 'admin' ? 'error' : user?.role === 'moderator' ? 'warning' : 'warning'}
                size="small"
                sx={{ 
                  height: 18, 
                  fontSize: '0.65rem',
                  fontWeight: 500,
                }}
              />
            </Box>
          </Box>
          <Tooltip title={mode === 'light' ? 'Karanlık Mod' : 'Aydınlık Mod'}>
            <IconButton
              onClick={toggleMode}
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: alpha('#1e40af', 0.1),
                },
              }}
            >
              {mode === 'light' ? <DarkMode sx={{ fontSize: 20 }} /> : <LightMode sx={{ fontSize: 20 }} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Menu Items */}
      <List sx={{ flex: 1, overflow: 'auto', p: 0.75 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={isActive(item.path)}
            onClick={() => router.push(item.path)}
            sx={{
              borderRadius: 1.5,
              mb: 0.25,
              py: 0.75,
              px: 1,
              bgcolor: isActive(item.path) ? alpha('#1e40af', 0.1) : 'transparent',
              '&:hover': {
                bgcolor: alpha('#1e40af', 0.05),
              },
              '&.Mui-selected': {
                bgcolor: alpha('#1e40af', 0.1),
                '&:hover': {
                  bgcolor: alpha('#1e40af', 0.15),
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: isActive(item.path) ? 'primary.main' : 'inherit',
                minWidth: 32,
                fontSize: '18px',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              secondary={item.description}
              primaryTypographyProps={{
                fontWeight: isActive(item.path) ? 600 : 400,
                fontSize: '13px',
                color: isActive(item.path) ? 'primary.main' : 'inherit',
              }}
              secondaryTypographyProps={{
                fontSize: '0.65rem',
              }}
            />
          </ListItemButton>
        ))}

        {/* Admin Menu Items */}
        {(user?.role === 'admin' || user?.role === 'moderator') && (
          <>
            <Divider sx={{ my: 0.75 }} />
            {adminMenuItems.map((item) => (
              <ListItemButton
                key={item.path}
                selected={isActive(item.path)}
                onClick={() => router.push(item.path)}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.25,
                  py: 0.75,
                  px: 1,
                  bgcolor: isActive(item.path) ? alpha('#f97316', 0.1) : 'transparent',
                  '&:hover': {
                    bgcolor: alpha('#f97316', 0.05),
                  },
                  '&.Mui-selected': {
                    bgcolor: alpha('#f97316', 0.1),
                    '&:hover': {
                      bgcolor: alpha('#f97316', 0.15),
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive(item.path) ? 'secondary.main' : 'inherit',
                    minWidth: 32,
                    fontSize: '18px',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  secondary={item.description}
                  primaryTypographyProps={{
                    fontWeight: isActive(item.path) ? 600 : 400,
                    fontSize: '13px',
                    color: isActive(item.path) ? 'secondary.main' : 'inherit',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.65rem',
                  }}
                />
              </ListItemButton>
            ))}
          </>
        )}
      </List>

      {/* Kalan SMS Gösterimi - Sadece normal kullanıcılar için */}
      {user?.role !== 'admin' && user?.role !== 'moderator' && (
        <Box 
          sx={{ 
            p: 1.5, 
            borderTop: mode === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
            background: alpha('#4caf50', 0.1),
            borderBottom: mode === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 1,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'text.secondary',
                mb: 0.5,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Kalan SMS
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontSize: '32px',
                fontWeight: 700,
                color: '#4caf50',
                lineHeight: 1,
              }}
            >
              {user?.credit || 0}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Logout */}
      <Box sx={{ p: 0.75, borderTop: mode === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)' }}>
        <ListItemButton
          onClick={() => {
            logout();
          }}
          sx={{
            borderRadius: 1.5,
            py: 0.75,
            px: 1,
            bgcolor: alpha('#f44336', 0.05),
            '&:hover': {
              bgcolor: alpha('#f44336', 0.1),
            },
          }}
        >
          <ListItemIcon sx={{ color: 'error.main', minWidth: 32, fontSize: '18px' }}>
            <Logout />
          </ListItemIcon>
          <ListItemText
            primary="Çıkış Yap"
            primaryTypographyProps={{
              color: 'error.main',
              fontWeight: 500,
              fontSize: '13px',
            }}
          />
        </ListItemButton>
      </Box>
    </Drawer>
  );
}

