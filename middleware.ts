import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  
  // Subdomain'i al (panel.finsms.io -> panel, platform.finsms.io -> platform)
  const subdomain = hostname.split('.')[0];
  
  // Admin subdomain (panel.finsms.io)
  if (subdomain === 'panel') {
    // Eğer root path'e gidiyorsa admin'e yönlendir
    if (url.pathname === '/') {
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
    
    // Admin sayfalarına erişim kontrolü
    // Eğer admin olmayan bir sayfaya gidiyorsa admin'e yönlendir
    const adminPaths = ['/admin', '/login', '/register'];
    const isAdminPath = adminPaths.some(path => url.pathname.startsWith(path));
    
    if (!isAdminPath && url.pathname !== '/api') {
      // API route'ları hariç tut
      if (!url.pathname.startsWith('/api')) {
        url.pathname = '/admin';
        return NextResponse.redirect(url);
      }
    }
  }
  
  // Platform subdomain (platform.finsms.io)
  if (subdomain === 'platform') {
    // Eğer root path'e gidiyorsa dashboard'a yönlendir
    if (url.pathname === '/') {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    
    // Admin sayfalarına erişimi engelle
    if (url.pathname.startsWith('/admin')) {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
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

