import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/short-links/stats/[id] - Kısa link istatistiklerini getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const shortLinkId = id;
    let supabaseServer;
    try {
      supabaseServer = getSupabaseServer();
    } catch (error: any) {
      console.error('Short link stats GET - Supabase server creation error:', error);
      return NextResponse.json(
        { success: false, message: 'Database connection error', error: error.message },
        { status: 500 }
      );
    }

    // Kısa linkin kullanıcıya ait olduğunu kontrol et
    const { data: shortLink, error: linkError } = await supabaseServer
      .from('short_links')
      .select('*')
      .eq('id', shortLinkId)
      .eq('user_id', String(auth.user.userId))
      .maybeSingle();

    if (linkError || !shortLink) {
      console.error('Short link stats find Supabase error:', linkError);
      return NextResponse.json(
        { success: false, message: linkError?.message || 'Kısa link bulunamadı', error: linkError },
        { status: 404 }
      );
    }

    // Tıklama istatistiklerini getir
    const { data: clicks, error: clicksError } = await supabaseServer
      .from('short_link_clicks')
      .select('*')
      .eq('short_link_id', shortLinkId)
      .order('clicked_at', { ascending: false });

    if (clicksError) {
      console.error('Short link stats clicks Supabase error:', clicksError);
      return NextResponse.json(
        { success: false, message: clicksError.message || 'İstatistikler alınamadı', error: clicksError },
        { status: 500 }
      );
    }

    // IP bazlı benzersiz tıklamalar
    const uniqueIPs = new Set(clicks?.map((c: any) => c.ip_address) || []);
    const uniqueClickCount = uniqueIPs.size;

    return NextResponse.json({
      success: true,
      data: {
        shortLink,
        stats: {
          totalClicks: clicks?.length || 0,
          uniqueClicks: uniqueClickCount,
          clicks: clicks || [],
        },
      },
    });
  } catch (error: any) {
    console.error('Short link stats error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'İstatistikler alınamadı', error: error.toString() },
      { status: 500 }
    );
  }
}

