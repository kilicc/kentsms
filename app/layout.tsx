import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import MUIThemeProviderWrapper from '@/components/ThemeProvider';
import { AuthProvider } from '@/hooks/useAuth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'KENTSMS - Gelişmiş SMS Doğrulama Sistemi',
  description: 'KENTSMS - Gelişmiş SMS Doğrulama Sistemi',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <MUIThemeProviderWrapper>
          <AuthProvider>
            {children}
          </AuthProvider>
        </MUIThemeProviderWrapper>
      </body>
    </html>
  );
}

