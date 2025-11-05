'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  email: string;
  credit: number;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
  api: typeof api;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API URL'ini dinamik olarak belirle (subdomain'e göre)
// Axios instance - baseURL runtime'da belirlenir
const api = axios.create({
  baseURL: '/api', // Relative path kullan (subdomain'e göre otomatik çalışır)
  headers: {
    'Content-Type': 'application/json',
  },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Request interceptor - Token ekle
  api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  // Response interceptor - 401 hatasını yakala ama logout yapma
  // Logout işlemi sadece checkAuth içinde yapılmalı
  // Bu sayede her API çağrısında logout yapılmaz
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      // 401 hatası alındığında sadece error'u döndür
      // Logout işlemi checkAuth içinde yapılacak
      // Bu sayede her sayfa geçişinde logout yapılmaz
      if (error.response?.status === 401) {
        // Sadece /auth/profile endpoint'inde user'ı temizle
        // Diğer endpoint'lerde sadece error'u döndür
        if (error.config?.url?.includes('/auth/profile')) {
          // Token geçersiz, user'ı temizle ama logout() çağırma
          setUser(null);
        }
        // Diğer endpoint'lerde sadece error'u döndür
        // Sayfa içindeki error handling bu hatayı yakalayacak
      }
      return Promise.reject(error);
    }
  );

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) {
          try {
            const response = await api.get('/auth/profile');
            if (response.data.success) {
              setUser(response.data.data.user);
            } else {
              // Token geçersiz, logout yap
              logout();
            }
          } catch (profileError: any) {
            // /auth/profile endpoint'inden 401 hatası geldi
            if (profileError.response?.status === 401) {
              // Token geçersiz, logout yap
              logout();
            } else {
              // Network hatası veya başka bir hata, token'ı koru
              setUser(null);
            }
          }
        } else {
          // Token yok, user null
          setUser(null);
        }
      }
    } catch (error: any) {
      console.error('Auth check error:', error);
      // Sadece 401 (Unauthorized) hatası için logout yap
      // Diğer hatalar (network, timeout) için token'ı koru
      if (error.response?.status === 401) {
        // Token geçersiz, logout yap
        logout();
      } else {
        // Network hatası veya başka bir hata, token'ı koru
        // Sadece loading'i false yap
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function login(login: string, password: string) {
    try {
      const response = await api.post('/auth/login', { login, password });
      
      if (response.data.success) {
        const { user, tokens } = response.data.data;
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
        }
        
        setUser(user);
        
        // Subdomain'e göre yönlendirme
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        const subdomain = hostname.split('.')[0];
        
        // Admin subdomain (panel.finsms.io) -> /admin
        if (subdomain === 'panel') {
          router.push('/admin');
        } 
        // Platform subdomain (platform.finsms.io) veya localhost -> /dashboard
        else {
          router.push('/dashboard');
        }
      } else {
        throw new Error(response.data.message || 'Giriş başarısız');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Giriş başarısız');
    }
  }


  function logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    setUser(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

