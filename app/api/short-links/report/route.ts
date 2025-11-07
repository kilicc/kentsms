import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/short-links/report - Kısa link raporları (admin için tüm linkler, kullanıcı için kendi linkleri)
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = (auth.user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator';

    let supabaseServer;
    try {
      supabaseServer = getSupabaseServer();
    } catch (error: any) {
      console.error('Short links report GET - Supabase server creation error:', error);
      return NextResponse.json(
        { success: false, message: 'Database connection error', error: error.message },
        { status: 500 }
      );
    }

    // Tarih filtreleri
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Kısa linkleri getir
    let shortLinksQuery = supabaseServer
      .from('short_links')
      .select('*')
      .eq('is_active', true);

    // Admin değilse sadece kendi linklerini getir
    if (!isAdmin) {
      shortLinksQuery = shortLinksQuery.eq('user_id', String(auth.user.userId));
    }

    // Tarih filtresi
    if (startDate) {
      shortLinksQuery = shortLinksQuery.gte('created_at', startDate);
    }
    if (endDate) {
      shortLinksQuery = shortLinksQuery.lte('created_at', endDate);
    }

    const { data: shortLinks, error: linksError } = await shortLinksQuery
      .order('created_at', { ascending: false });

    if (linksError) {
      console.error('Short links report links Supabase error:', linksError);
      return NextResponse.json(
        { success: false, message: linksError.message || 'Kısa linkler alınamadı', error: linksError },
        { status: 500 }
      );
    }

    // Her kısa link için detaylı istatistikleri getir
    const shortLinksWithStats = await Promise.all(
      (shortLinks || []).map(async (link: any) => {
        // Tıklama istatistiklerini getir
        let clicksQuery = supabaseServer
          .from('short_link_clicks')
          .select('*')
          .eq('short_link_id', link.id);

        // Tarih filtresi
        if (startDate) {
          clicksQuery = clicksQuery.gte('clicked_at', startDate);
        }
        if (endDate) {
          clicksQuery = clicksQuery.lte('clicked_at', endDate);
        }

        const { data: clicks, error: clicksError } = await clicksQuery
          .order('clicked_at', { ascending: false });

        if (clicksError) {
          console.error(`Short link ${link.id} clicks error:`, clicksError);
          return {
            ...link,
            stats: {
              totalClicks: 0,
              uniqueClicks: 0,
              clicks: [],
              ipAddresses: [],
              userAgents: [],
              referers: [],
              countries: [],
              cities: [],
            },
          };
        }

        // IP adresleri
        const ipAddresses = Array.from(new Set(clicks?.map((c: any) => c.ip_address) || []));
        
        // User agent'lar
        const userAgents = Array.from(new Set(clicks?.filter((c: any) => c.user_agent).map((c: any) => c.user_agent) || []));
        
        // Referer'lar
        const referers = Array.from(new Set(clicks?.filter((c: any) => c.referer).map((c: any) => c.referer) || []));
        
        // Ülkeler
        const countries = Array.from(new Set(clicks?.filter((c: any) => c.country).map((c: any) => c.country) || []));
        
        // Şehirler
        const cities = Array.from(new Set(clicks?.filter((c: any) => c.city).map((c: any) => c.city) || []));

        // IP bazlı benzersiz tıklamalar
        const uniqueIPs = new Set(clicks?.map((c: any) => c.ip_address) || []);
        const uniqueClickCount = uniqueIPs.size;

        // IP bazlı tıklama sayıları
        const ipClickCounts: Record<string, number> = {};
        clicks?.forEach((c: any) => {
          ipClickCounts[c.ip_address] = (ipClickCounts[c.ip_address] || 0) + 1;
        });

        return {
          ...link,
          stats: {
            totalClicks: clicks?.length || 0,
            uniqueClicks: uniqueClickCount,
            clicks: clicks || [],
            ipAddresses,
            userAgents,
            referers,
            countries,
            cities,
            ipClickCounts,
          },
        };
      })
    );

    // Toplam istatistikler
    const totalStats = {
      totalLinks: shortLinksWithStats.length,
      totalClicks: shortLinksWithStats.reduce((sum, link) => sum + (link.stats?.totalClicks || 0), 0),
      totalUniqueClicks: shortLinksWithStats.reduce((sum, link) => sum + (link.stats?.uniqueClicks || 0), 0),
      totalIPAddresses: new Set(shortLinksWithStats.flatMap(link => link.stats?.ipAddresses || [])).size,
      totalCountries: new Set(shortLinksWithStats.flatMap(link => link.stats?.countries || [])).size,
      totalCities: new Set(shortLinksWithStats.flatMap(link => link.stats?.cities || [])).size,
    };

    return NextResponse.json({
      success: true,
      data: {
        shortLinks: shortLinksWithStats,
        totalStats,
      },
    });
  } catch (error: any) {
    console.error('Short links report error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Rapor alınamadı', error: error.toString() },
      { status: 500 }
    );
  }
}

