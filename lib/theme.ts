import { createTheme, alpha } from '@mui/material/styles';

// MUI Theme - %20 küçültülmüş çözünürlük
export const theme = createTheme({
  palette: {
    mode: 'light',
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
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '1.6rem', // 32px × 0.8 = 25.6px
    },
    h2: {
      fontWeight: 600,
      fontSize: '1.4rem', // 28px × 0.8 = 22.4px
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.2rem', // 24px × 0.8 = 19.2px
    },
    h4: {
      fontWeight: 600,
      fontSize: '1rem', // 20px × 0.8 = 16px
    },
    h5: {
      fontWeight: 500,
      fontSize: '0.9rem', // 18px × 0.8 = 14.4px
    },
    h6: {
      fontWeight: 500,
      fontSize: '0.8rem', // 16px × 0.8 = 12.8px
    },
    body1: {
      fontSize: '0.7rem', // 14px × 0.8 = 11.2px
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.6rem', // 12px × 0.8 = 9.6px
      fontWeight: 400,
    },
    caption: {
      fontSize: '0.6rem', // 12px × 0.8 = 9.6px
      fontWeight: 400,
    },
    subtitle1: {
      fontSize: '0.7rem', // 14px × 0.8 = 11.2px
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '0.6rem', // 12px × 0.8 = 9.6px
      fontWeight: 500,
    },
    button: {
      fontSize: '0.7rem', // 14px × 0.8 = 11.2px
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 6.4, // 8px × 0.8
          padding: '6.4px 12.8px', // 8px 16px × 0.8
          fontWeight: 500,
          fontSize: '0.7rem', // 14px × 0.8
          minHeight: '28.8px', // 36px × 0.8
        },
        sizeSmall: {
          padding: '4.8px 9.6px', // 6px 12px × 0.8
          fontSize: '0.65rem', // 13px × 0.8 ≈ 10.4px
          minHeight: '25.6px', // 32px × 0.8
        },
        sizeMedium: {
          padding: '6.4px 12.8px', // 8px 16px × 0.8
          fontSize: '0.7rem', // 14px × 0.8
          minHeight: '28.8px', // 36px × 0.8
        },
        sizeLarge: {
          padding: '8px 16px', // 10px 20px × 0.8
          fontSize: '0.75rem', // 15px × 0.8 = 12px
          minHeight: '33.6px', // 42px × 0.8
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 9.6, // 12px × 0.8
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '12.8px', // 16px × 0.8
          '&:last-child': {
            paddingBottom: '12.8px',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6.4, // 8px × 0.8
            fontSize: '0.7rem', // 14px × 0.8
          },
          '& .MuiInputLabel-root': {
            fontSize: '0.7rem', // 14px × 0.8
          },
          '& .MuiInputBase-input': {
            fontSize: '0.7rem', // 14px × 0.8
            padding: '9.6px 11.2px', // 12px 14px × 0.8
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            fontSize: '0.7rem', // 14px × 0.8
            padding: '9.6px 12.8px', // 12px 16px × 0.8
          },
          '& .MuiTableCell-head': {
            fontWeight: 600,
            fontSize: '0.7rem', // 14px × 0.8
            padding: '11.2px 12.8px', // 14px 16px × 0.8
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.7rem', // 14px × 0.8
          padding: '9.6px 12.8px', // 12px 16px × 0.8
        },
        head: {
          fontWeight: 600,
          fontSize: '0.7rem', // 14px × 0.8
          padding: '11.2px 12.8px', // 14px 16px × 0.8
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: '0.65rem', // 13px × 0.8 ≈ 10.4px
          height: '22.4px', // 28px × 0.8
          fontWeight: 500,
        },
        sizeSmall: {
          fontSize: '0.6rem', // 12px × 0.8 = 9.6px
          height: '19.2px', // 24px × 0.8
        },
        sizeMedium: {
          fontSize: '0.65rem', // 13px × 0.8
          height: '22.4px', // 28px × 0.8
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 9.6, // 12px × 0.8
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1rem', // 20px × 0.8 = 16px
          fontWeight: 600,
          padding: '12.8px 19.2px', // 16px 24px × 0.8
          paddingBottom: '9.6px', // 12px × 0.8
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '12.8px 19.2px', // 16px 24px × 0.8
          fontSize: '0.7rem', // 14px × 0.8
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '9.6px 19.2px 12.8px', // 12px 24px 16px × 0.8
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 9.6, // 12px × 0.8
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 6.4, // 8px × 0.8
          padding: '6.4px 12.8px', // 8px 16px × 0.8
          minHeight: '38.4px', // 48px × 0.8
          '& .MuiListItemIcon-root': {
            minWidth: '32px', // 40px × 0.8
            fontSize: '19.2px', // 24px × 0.8
          },
          '& .MuiListItemText-primary': {
            fontSize: '0.7rem', // 14px × 0.8
          },
          '& .MuiListItemText-secondary': {
            fontSize: '0.6rem', // 12px × 0.8
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: '32px', // 40px × 0.8
          fontSize: '19.2px', // 24px × 0.8
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.7rem', // 14px × 0.8
        },
        secondary: {
          fontSize: '0.6rem', // 12px × 0.8
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          width: '32px', // 40px × 0.8
          height: '32px',
          fontSize: '0.8rem', // 16px × 0.8 = 12.8px
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.7rem', // 14px × 0.8
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          fontSize: '0.7rem', // 14px × 0.8
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.7rem', // 14px × 0.8
          padding: '6.4px 12.8px', // 8px 16px × 0.8
          minHeight: '32px', // 40px × 0.8
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          fontSize: '0.7rem', // 14px × 0.8
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: '38.4px', // 48px × 0.8
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontSize: '0.7rem', // 14px × 0.8
          fontWeight: 500,
          padding: '9.6px 12.8px', // 12px 16px × 0.8
          minHeight: '38.4px', // 48px × 0.8
          textTransform: 'none',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: '6.4px', // 8px × 0.8
          '& svg': {
            fontSize: '19.2px', // 24px × 0.8
          },
        },
        sizeSmall: {
          padding: '4.8px', // 6px × 0.8
          '& svg': {
            fontSize: '16px', // 20px × 0.8
          },
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          width: '32px', // 40px × 0.8
          height: '32px',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          margin: '12.8px 0', // 16px × 0.8
        },
      },
    },
    MuiGrid: {
      styleOverrides: {
        root: {
          '&.MuiGrid-container': {
            margin: '0 -9.6px', // -12px × 0.8
            '& > .MuiGrid-item': {
              padding: '0 9.6px', // 12px × 0.8
            },
          },
        },
      },
    },
  },
});

// Gradient renkleri (export için)
export const gradients = {
  login: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  navbar: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
  cardLight: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(220, 0, 78, 0.05) 100%)',
  cardMedium: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
  button: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
};
