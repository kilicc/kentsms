'use client';

import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getTheme } from '@/lib/theme';
import { ThemeProvider as CustomThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { ReactNode, useEffect, useState } from 'react';

function MUIThemeProviderInner({ children }: { children: ReactNode }) {
  const { mode } = useTheme();
  const theme = getTheme(mode);

  return (
    <MUIThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
}

export default function MUIThemeProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <CustomThemeProvider>
      <MUIThemeProviderInner>
        {children}
      </MUIThemeProviderInner>
    </CustomThemeProvider>
  );
}

