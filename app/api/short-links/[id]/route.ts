import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// DELETE /api/short-links/[id] - Kısa link sil
export async function DELETE(
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
    let supabaseServer;
    try {
      supabaseServer = getSupabaseServer();
    } catch (error: any) {
      console.error('Short link DELETE - Supabase server creation error:', error);
      return NextResponse.json(
        { success: false, message: 'Database connection error', error: error.message },
        { status: 500 }
      );
    }

    // Kısa linki bul
    const { data: shortLink, error: findError } = await supabaseServer
      .from('short_links')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();

    if (findError) {
      console.error('Short link find error:', findError);
      return NextResponse.json(
        { success: false, message: findError.message || 'Kısa link bulunamadı' },
        { status: 500 }
      );
    }

    if (!shortLink) {
      return NextResponse.json(
        { success: false, message: 'Kısa link bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcı sadece kendi linklerini silebilir (string karşılaştırması)
    if (String(shortLink.user_id) !== String(auth.user.userId)) {
      return NextResponse.json(
        { success: false, message: 'Bu kısa linki silme yetkiniz yok' },
        { status: 403 }
      );
    }

    // Kısa linki sil (soft delete - is_active = false)
    const { error: deleteError } = await supabaseServer
      .from('short_links')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', String(auth.user.userId));

    if (deleteError) {
      console.error('Short link delete error:', deleteError);
      return NextResponse.json(
        { success: false, message: deleteError.message || 'Kısa link silinemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kısa link başarıyla silindi',
    });
  } catch (error: any) {
    console.error('Short link delete error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Kısa link silinirken hata oluştu', error: error.toString() },
      { status: 500 }
    );
  }
}

