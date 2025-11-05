import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  
  // Subdomain'i al (panel.finsms.io -> panel, platform.finsms.io -> platform)
  const subdomain = hostname.split('.')[0];
  
  // Admin subdomain (panel.finsms.io)
  if (subdomain === 'panel') {
    // API route'ları ve Next.js internal route'ları hariç tut
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/_next')) {
      return NextResponse.next();
    }
    
    // Login sayfasına erişim serbest
    if (url.pathname === '/login' || url.pathname.startsWith('/login')) {
      return NextResponse.next();
    }
    
    // Register sayfasına erişimi engelle
    if (url.pathname.startsWith('/register')) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    
    // Eğer root path'e gidiyorsa login'e yönlendir
    if (url.pathname === '/') {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    
    // Admin subdomain için tüm protected path'lere izin ver
    // Client-side'da ProtectedRoute kontrolü yapılacak
    // Middleware sadece public path'leri kontrol eder
    // Protected path'ler: /admin, /sms, /dashboard, /contacts, /reports, /payment, /profile, vb.
    // Bu path'ler client-side'da ProtectedRoute ile korunuyor
    return NextResponse.next();
  }
  
  // Platform subdomain (platform.finsms.io)
  if (subdomain === 'platform') {
    // API route'ları ve Next.js internal route'ları hariç tut
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/_next')) {
      return NextResponse.next();
    }
    
    // Login sayfasına erişim serbest
    if (url.pathname === '/login' || url.pathname.startsWith('/login')) {
      return NextResponse.next();
    }
    
    // Register sayfasına erişimi engelle
    if (url.pathname.startsWith('/register')) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    
    // Admin sayfalarına erişimi engelle
    if (url.pathname.startsWith('/admin')) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    
    // Eğer root path'e gidiyorsa login'e yönlendir
    if (url.pathname === '/') {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    
    // Platform subdomain için tüm protected path'lere izin ver
    // Client-side'da ProtectedRoute kontrolü yapılacak
    // Protected path'ler: /dashboard, /sms, /contacts, /reports, /payment, /profile, vb.
    // Bu path'ler client-side'da ProtectedRoute ile korunuyor
    return NextResponse.next();
  }
  
  // Localhost geliştirme için (subdomain yoksa)
  if (subdomain === 'localhost' || subdomain === '127.0.0.1') {
    // Geliştirme ortamında normal çalış
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

