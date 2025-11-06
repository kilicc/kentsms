import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/short-links - Kullanıcının kısa linklerini listele
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }


    const supabaseServer = getSupabaseServer();
    const { data: shortLinks, error } = await supabaseServer
      .from('short_links')
      .select('*')
      .eq('user_id', auth.user.userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message || 'Kısa linkler alınamadı' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { shortLinks: shortLinks || [] },
    });
  } catch (error: any) {
    console.error('Short links get error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Kısa linkler alınamadı' },
      { status: 500 }
    );
  }
}

// POST /api/short-links - Yeni kısa link oluştur
export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { originalUrl, title, description } = body;

    if (!originalUrl) {
      return NextResponse.json(
        { success: false, message: 'URL gerekli' },
        { status: 400 }
      );
    }

    // URL validasyonu
    try {
      new URL(originalUrl);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Geçersiz URL formatı' },
        { status: 400 }
      );
    }


    // Benzersiz kısa kod oluştur
    const generateShortCode = (): string => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let shortCode = generateShortCode();
    let attempts = 0;
    const maxAttempts = 10;

    const supabaseServer = getSupabaseServer();
    // Benzersiz kod bul
    while (attempts < maxAttempts) {
      const { data: existing } = await supabaseServer
        .from('short_links')
        .select('id')
        .eq('short_code', shortCode)
        .single();

      if (!existing) {
        break; // Benzersiz kod bulundu
      }

      shortCode = generateShortCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { success: false, message: 'Kısa kod oluşturulamadı, lütfen tekrar deneyin' },
        { status: 500 }
      );
    }

    // Kısa link oluştur
    const { data: shortLink, error } = await supabaseServer
      .from('short_links')
      .insert({
        user_id: auth.user.userId,
        original_url: originalUrl,
        short_code: shortCode,
        title: title || null,
        description: description || null,
        click_count: 0,
        unique_click_count: 0,
        is_active: true,
      })
      .select()
      .single();

    if (error || !shortLink) {
      return NextResponse.json(
        { success: false, message: error?.message || 'Kısa link oluşturulamadı' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kısa link başarıyla oluşturuldu',
      data: { shortLink },
    });
  } catch (error: any) {
    console.error('Short link create error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Kısa link oluşturulamadı' },
      { status: 500 }
    );
  }
}

