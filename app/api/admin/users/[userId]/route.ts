import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/utils/jwt';

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

    // Admin'ı silmeyi engelle
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    if (!user) {
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
    await prisma.user.delete({
      where: { id: userId },
    });

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

