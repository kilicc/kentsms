import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { authenticateRequest, requireAdmin } from '@/lib/middleware/auth';

// DELETE /api/admin/short-links/[id] - Admin kısa link sil (tüm linkleri silebilir)
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

    const userRole = typeof auth.user.role === 'string' ? auth.user.role.toLowerCase() : '';
    if (userRole !== 'admin' && userRole !== 'moderator' && userRole !== 'administrator') {
      return NextResponse.json(
        { success: false, message: 'Admin yetkisi gerekli' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabaseServer = getSupabaseServer();

    // Kısa linki bul
    const { data: shortLink, error: findError } = await supabaseServer
      .from('short_links')
      .select('id')
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

    // Admin tüm linkleri silebilir (soft delete - is_active = false)
    const { error: deleteError } = await supabaseServer
      .from('short_links')
      .update({ is_active: false })
      .eq('id', id);

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

