'use client';

import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Avatar, Chip, Typography, alpha, Divider } from '@mui/material';
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
  AdminPanelSettings
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const drawerWidth = 280;

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  description?: string;
}

const menuItems: MenuItem[] = [
  { label: 'Ana Sayfa', icon: <Dashboard />, path: '/dashboard', description: 'Dashboard' },
  { label: 'SMS Gönder', icon: <Sms />, path: '/sms', description: 'Basit SMS' },
  { label: 'Gelişmiş SMS', icon: <RocketLaunch />, path: '/advanced-sms', description: 'Toplu SMS' },
  { label: 'Rehberim', icon: <Person />, path: '/contacts', description: 'Kişiler' },
  { label: 'Ödeme', icon: <AccountBalanceWallet />, path: '/payment', description: 'Kredi Yükle' },
  { label: 'Raporlar', icon: <Assessment />, path: '/reports', description: 'SMS Raporları' },
  { label: 'İadeler', icon: <MoneyOff />, path: '/refunds', description: 'İade Yönetimi' },
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
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      {/* Logo Header - HTML_TEMPLATES.html'e göre */}
      <Box
        sx={{
          p: 2,
          background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
          color: 'white',
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
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
            src="/logo3.png"
            alt="Logo"
            width={150}
            height={50}
            style={{
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          />
        </Box>
      </Box>

      {/* User Info - HTML_TEMPLATES.html'e göre */}
      <Box
        sx={{
          p: 2,
          background: alpha('#1976d2', 0.05),
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
            {initials}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontWeight: 600,
                fontSize: '16px',
              }}
            >
              {user?.username || 'Kullanıcı'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
              <Chip
                label={`${user?.credit || 0} SMS`}
                color="success"
                size="medium"
                sx={{ 
                  height: 28, 
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  px: 1,
                }}
              />
              <Chip
                label={user?.role === 'admin' ? 'Admin' : 'Premium'}
                color={user?.role === 'admin' ? 'error' : 'warning'}
                size="small"
                sx={{ 
                  height: 20, 
                  fontSize: '0.7rem',
                  fontWeight: 500,
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Menu Items */}
      <List sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={isActive(item.path)}
            onClick={() => router.push(item.path)}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              bgcolor: isActive(item.path) ? alpha('#1976d2', 0.1) : 'transparent',
              '&:hover': {
                bgcolor: alpha('#1976d2', 0.05),
              },
              '&.Mui-selected': {
                bgcolor: alpha('#1976d2', 0.1),
                '&:hover': {
                  bgcolor: alpha('#1976d2', 0.15),
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: isActive(item.path) ? 'primary.main' : 'inherit',
                minWidth: 40,
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              secondary={item.description}
              primaryTypographyProps={{
                fontWeight: isActive(item.path) ? 600 : 400,
                color: isActive(item.path) ? 'primary.main' : 'inherit',
              }}
              secondaryTypographyProps={{
                fontSize: '0.7rem',
              }}
            />
          </ListItemButton>
        ))}

        {/* Admin Menu Items */}
        {(user?.role === 'admin' || user?.role === 'moderator') && (
          <>
            <Divider sx={{ my: 1 }} />
            {adminMenuItems.map((item) => (
              <ListItemButton
                key={item.path}
                selected={isActive(item.path)}
                onClick={() => router.push(item.path)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  bgcolor: isActive(item.path) ? alpha('#dc004e', 0.1) : 'transparent',
                  '&:hover': {
                    bgcolor: alpha('#dc004e', 0.05),
                  },
                  '&.Mui-selected': {
                    bgcolor: alpha('#dc004e', 0.1),
                    '&:hover': {
                      bgcolor: alpha('#dc004e', 0.15),
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive(item.path) ? 'secondary.main' : 'inherit',
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  secondary={item.description}
                  primaryTypographyProps={{
                    fontWeight: isActive(item.path) ? 600 : 400,
                    color: isActive(item.path) ? 'secondary.main' : 'inherit',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.7rem',
                  }}
                />
              </ListItemButton>
            ))}
          </>
        )}
      </List>

      {/* Logout */}
      <Box sx={{ p: 1, borderTop: '1px solid rgba(0,0,0,0.12)' }}>
        <ListItemButton
          onClick={() => {
            logout();
          }}
          sx={{
            borderRadius: 2,
            bgcolor: alpha('#f44336', 0.05),
            '&:hover': {
              bgcolor: alpha('#f44336', 0.1),
            },
          }}
        >
          <ListItemIcon sx={{ color: 'error.main', minWidth: 40 }}>
            <Logout />
          </ListItemIcon>
          <ListItemText
            primary="Çıkış Yap"
            primaryTypographyProps={{
              color: 'error.main',
              fontWeight: 500,
            }}
          />
        </ListItemButton>
      </Box>
    </Drawer>
  );
}

