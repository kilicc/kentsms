import { createTheme, alpha } from '@mui/material/styles';

// MUI Theme - %15 büyütülmüş çözünürlük
export const getTheme = (mode: 'light' | 'dark') => createTheme({
  palette: {
    mode,
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#fff',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
      contrastText: '#fff',
    },
    success: {
      main: '#4caf50',
      light: alpha('#4caf50', 0.2),
    },
    error: {
      main: '#f44336',
      light: alpha('#f44336', 0.1),
    },
    warning: {
      main: '#ff9800',
      light: alpha('#ff9800', 0.2),
    },
    info: {
      main: '#2196f3',
      light: alpha('#2196f3', 0.2),
    },
    background: {
      default: mode === 'dark' ? '#121212' : '#f5f5f5',
      paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
    },
    text: {
      primary: mode === 'dark' ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)',
      secondary: mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
      disabled: mode === 'dark' ? 'rgba(255, 255, 255, 0.38)' : 'rgba(0, 0, 0, 0.38)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '1.84rem', // 1.6rem × 1.15 = 1.84rem (≈29.44px)
    },
    h2: {
      fontWeight: 600,
      fontSize: '1.61rem', // 1.4rem × 1.15 = 1.61rem (≈25.76px)
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.38rem', // 1.2rem × 1.15 = 1.38rem (≈22.08px)
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.15rem', // 1rem × 1.15 = 1.15rem (≈18.4px)
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.035rem', // 0.9rem × 1.15 = 1.035rem (≈16.56px)
    },
    h6: {
      fontWeight: 500,
      fontSize: '0.92rem', // 0.8rem × 1.15 = 0.92rem (≈14.72px)
    },
    body1: {
      fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem (≈12.88px)
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.69rem', // 0.6rem × 1.15 = 0.69rem (≈11.04px)
      fontWeight: 400,
    },
    caption: {
      fontSize: '0.69rem', // 0.6rem × 1.15 = 0.69rem (≈11.04px)
      fontWeight: 400,
    },
    subtitle1: {
      fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '0.69rem', // 0.6rem × 1.15 = 0.69rem
      fontWeight: 500,
    },
    button: {
      fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 5.888, // 5.12px × 1.15 = 5.888px
          padding: '5.888px 11.776px', // 5.12px 10.24px × 1.15
          fontWeight: 500,
          fontSize: '0.71875rem', // 0.625rem × 1.15 = 0.71875rem (≈11.5px)
          minHeight: '25.3px', // 22px × 1.15 = 25.3px
        },
        sizeSmall: {
          padding: '4.416px 8.832px', // 3.84px 7.68px × 1.15
          fontSize: '0.66125rem', // 0.575rem × 1.15 = 0.66125rem (≈10.58px)
          minHeight: '23px', // 20px × 1.15 = 23px
        },
        sizeMedium: {
          padding: '5.888px 11.776px', // 5.12px 10.24px × 1.15
          fontSize: '0.71875rem', // 0.625rem × 1.15 = 0.71875rem
          minHeight: '25.3px', // 22px × 1.15 = 25.3px
        },
        sizeLarge: {
          padding: '7.36px 14.72px', // 6.4px 12.8px × 1.15
          fontSize: '0.7475rem', // 0.65rem × 1.15 = 0.7475rem (≈11.96px)
          minHeight: '29.9px', // 26px × 1.15 = 29.9px
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 11.04, // 9.6px × 1.15 = 11.04px
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '14.72px', // 12.8px × 1.15 = 14.72px
          '&:last-child': {
            paddingBottom: '14.72px',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 7.36, // 6.4px × 1.15 = 7.36px
            fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
          },
          '& .MuiInputLabel-root': {
            fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
          },
          '& .MuiInputBase-input': {
            fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
            padding: '11.04px 12.88px', // 9.6px 11.2px × 1.15
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
            padding: '11.04px 14.72px', // 9.6px 12.8px × 1.15
          },
          '& .MuiTableCell-head': {
            fontWeight: 600,
            fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
            padding: '12.88px 14.72px', // 11.2px 12.8px × 1.15
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
          padding: '11.04px 14.72px', // 9.6px 12.8px × 1.15
        },
        head: {
          fontWeight: 600,
          fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
          padding: '12.88px 14.72px', // 11.2px 12.8px × 1.15
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: '0.7475rem', // 0.65rem × 1.15 = 0.7475rem (≈11.96px)
          height: '25.76px', // 22.4px × 1.15 = 25.76px
          fontWeight: 500,
        },
        sizeSmall: {
          fontSize: '0.69rem', // 0.6rem × 1.15 = 0.69rem (≈11.04px)
          height: '22.08px', // 19.2px × 1.15 = 22.08px
        },
        sizeMedium: {
          fontSize: '0.7475rem', // 0.65rem × 1.15 = 0.7475rem
          height: '25.76px', // 22.4px × 1.15 = 25.76px
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 11.04, // 9.6px × 1.15 = 11.04px
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.15rem', // 1rem × 1.15 = 1.15rem (≈18.4px)
          fontWeight: 600,
          padding: '14.72px 22.08px', // 12.8px 19.2px × 1.15
          paddingBottom: '11.04px', // 9.6px × 1.15 = 11.04px
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '14.72px 22.08px', // 12.8px 19.2px × 1.15
          fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '11.04px 22.08px 14.72px', // 9.6px 19.2px 12.8px × 1.15
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 11.04, // 9.6px × 1.15 = 11.04px
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 7.36, // 6.4px × 1.15 = 7.36px
          padding: '7.36px 14.72px', // 6.4px 12.8px × 1.15
          minHeight: '44.16px', // 38.4px × 1.15 = 44.16px
          '& .MuiListItemIcon-root': {
            minWidth: '36.8px', // 32px × 1.15 = 36.8px
            fontSize: '22.08px', // 19.2px × 1.15 = 22.08px
          },
          '& .MuiListItemText-primary': {
            fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
          },
          '& .MuiListItemText-secondary': {
            fontSize: '0.69rem', // 0.6rem × 1.15 = 0.69rem
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: '36.8px', // 32px × 1.15 = 36.8px
          fontSize: '22.08px', // 19.2px × 1.15 = 22.08px
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
        },
        secondary: {
          fontSize: '0.69rem', // 0.6rem × 1.15 = 0.69rem
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          width: '36.8px', // 32px × 1.15 = 36.8px
          height: '36.8px',
          fontSize: '0.92rem', // 0.8rem × 1.15 = 0.92rem (≈14.72px)
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
          padding: '7.36px 14.72px', // 6.4px 12.8px × 1.15
          minHeight: '36.8px', // 32px × 1.15 = 36.8px
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: '44.16px', // 38.4px × 1.15 = 44.16px
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontSize: '0.805rem', // 0.7rem × 1.15 = 0.805rem
          fontWeight: 500,
          padding: '11.04px 14.72px', // 9.6px 12.8px × 1.15
          minHeight: '44.16px', // 38.4px × 1.15 = 44.16px
          textTransform: 'none',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: '7.36px', // 6.4px × 1.15 = 7.36px
          '& svg': {
            fontSize: '22.08px', // 19.2px × 1.15 = 22.08px
          },
        },
        sizeSmall: {
          padding: '5.52px', // 4.8px × 1.15 = 5.52px
          '& svg': {
            fontSize: '18.4px', // 16px × 1.15 = 18.4px
          },
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          width: '36.8px', // 32px × 1.15 = 36.8px
          height: '36.8px',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          margin: '14.72px 0', // 12.8px × 1.15 = 14.72px
        },
      },
    },
    MuiGrid: {
      styleOverrides: {
        root: {
          '&.MuiGrid-container': {
            margin: '0 -11.04px', // -9.6px × 1.15 = -11.04px
            '& > .MuiGrid-item': {
              padding: '0 11.04px', // 9.6px × 1.15 = 11.04px
            },
          },
        },
      },
    },
  },
});

// Light theme (default) - backward compatibility
export const theme = getTheme('light');

// Gradient renkleri (export için)
export const gradients = {
  login: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  navbar: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
  cardLight: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)',
  cardMedium: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
  button: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
};
