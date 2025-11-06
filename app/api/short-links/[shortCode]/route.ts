import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

// GET /api/short-links/[shortCode] - Kısa linke tıklama ve yönlendirme
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;
    const supabaseServer = getSupabaseServer();

    // Kısa linki bul
    const { data: shortLink, error } = await supabaseServer
      .from('short_links')
      .select('*')
      .eq('short_code', shortCode)
      .eq('is_active', true)
      .single();

    if (error || !shortLink) {
      return NextResponse.json(
        { success: false, message: 'Kısa link bulunamadı' },
        { status: 404 }
      );
    }

    // Süre dolmuş mu kontrol et
    if (shortLink.expires_at) {
      const expiresAt = new Date(shortLink.expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { success: false, message: 'Kısa link süresi dolmuş' },
          { status: 410 }
        );
      }
    }

    // IP adresini al
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    // User agent ve referer bilgilerini al
    const userAgent = request.headers.get('user-agent') || null;
    const referer = request.headers.get('referer') || null;

    // Tıklama istatistiği kaydet
    const { error: clickError } = await supabaseServer
      .from('short_link_clicks')
      .insert({
        short_link_id: shortLink.id,
        ip_address: ipAddress || 'unknown',
        user_agent: userAgent,
        referer: referer,
      });

    if (!clickError) {
      // Tıklama sayısını güncelle
      const { data: uniqueClicks } = await supabaseServer
        .from('short_link_clicks')
        .select('ip_address')
        .eq('short_link_id', shortLink.id);

      const uniqueIPs = new Set(uniqueClicks?.map(c => c.ip_address) || []);
      
      await supabaseServer
        .from('short_links')
        .update({
          click_count: (shortLink.click_count || 0) + 1,
          unique_click_count: uniqueIPs.size,
        })
        .eq('id', shortLink.id);
    }

    // Orijinal URL'e yönlendir
    return NextResponse.redirect(shortLink.original_url, { status: 302 });
  } catch (error: any) {
    console.error('Short link redirect error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Yönlendirme hatası' },
      { status: 500 }
    );
  }
}

