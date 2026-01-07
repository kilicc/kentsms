import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/utils/jwt';
import { hashPassword } from '@/lib/utils/password';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Admin kontrolü
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'moderator')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const supabaseServer = getSupabaseServer();

    // Admin'ı silmeyi engelle
    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('username')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    if (user.username === 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin kullanıcısı silinemez' },
        { status: 400 }
      );
    }

    // Kullanıcıyı sil (cascade ile tüm ilişkili veriler otomatik silinecek)
    const { error: deleteError } = await supabaseServer
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('❌ Kullanıcı silme hatası:', deleteError);
      return NextResponse.json(
        {
          success: false,
          error: deleteError.message || 'Kullanıcı silinirken hata oluştu',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi',
    });
  } catch (error: any) {
    console.error('❌ Kullanıcı silme hatası:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Kullanıcı silinirken hata oluştu',
      },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[userId] - Kullanıcı şifresini değiştir
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Admin kontrolü
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'moderator')) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Şifre gerekli' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Şifre en az 6 karakter olmalıdır' },
        { status: 400 }
      );
    }

    const supabaseServer = getSupabaseServer();

    // Kullanıcının var olup olmadığını kontrol et
    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('id, username')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // Şifreyi hash'le
    const passwordHash = await hashPassword(password);

    // Şifreyi güncelle
    const { error: updateError } = await supabaseServer
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Şifre güncelleme hatası:', updateError);
      return NextResponse.json(
        {
          success: false,
          message: updateError.message || 'Şifre güncellenirken hata oluştu',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Şifre başarıyla güncellendi',
    });
  } catch (error: any) {
    console.error('❌ Şifre güncelleme hatası:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Şifre güncellenirken hata oluştu',
      },
      { status: 500 }
    );
  }
}

