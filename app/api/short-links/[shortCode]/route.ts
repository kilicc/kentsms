import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

// GET /api/short-links/[shortCode] - Kısa linke tıklama ve yönlendirme
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;
    console.log('🔗 Kısa link yönlendirme isteği:', shortCode);
    let supabaseServer;
    try {
      supabaseServer = getSupabaseServer();
    } catch (error: any) {
      console.error('Short link redirect - Supabase server creation error:', error);
      return NextResponse.json(
        { success: false, message: 'Database connection error', error: error.message },
        { status: 500 }
      );
    }

    // Kısa linki bul - RLS bypass için service key kullanılıyor
    const { data: shortLink, error } = await supabaseServer
      .from('short_links')
      .select('*')
      .eq('short_code', shortCode)
      .eq('is_active', true)
      .maybeSingle();
    
    console.log('🔗 Kısa link sorgusu sonucu:', { 
      found: !!shortLink, 
      error: error ? JSON.stringify(error, null, 2) : null,
      shortCode 
    });

    if (error) {
      console.error('Short link find Supabase error:', JSON.stringify(error, null, 2));
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      return NextResponse.json(
        { success: false, message: error.message || 'Kısa link bulunamadı', error: error },
        { status: 404 }
      );
    }

    if (!shortLink) {
      console.error('Short link not found for code:', shortCode);
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
      { success: false, message: error.message || 'Yönlendirme hatası', error: error.toString() },
      { status: 500 }
    );
  }
}

