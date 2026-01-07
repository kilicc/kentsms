import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware/auth';
import { getSystemCredit, updateSystemCredit, addSystemCredit } from '@/lib/utils/systemCredit';

// GET /api/admin/system-credit - Sistem kredisini al (admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Admin kontrolü
    const userRole = (auth.user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator';

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Admin only' },
        { status: 403 }
      );
    }

    const systemCredit = await getSystemCredit();

    return NextResponse.json({
      success: true,
      data: {
        systemCredit,
      },
    });
  } catch (error: any) {
    console.error('Admin system credit fetch error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Sistem kredisi alınamadı' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/system-credit - Sistem kredisini güncelle (admin only)
export async function PUT(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Admin kontrolü
    const userRole = (auth.user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator';

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Admin only' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, amount } = body; // action: 'set' | 'add', amount: number

    if (!action || !amount || typeof amount !== 'number' || amount < 0) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz parametreler. action: "set" veya "add", amount: pozitif sayı olmalı' },
        { status: 400 }
      );
    }

    let newCredit: number;
    if (action === 'set') {
      // Sistem kredisini belirli bir değere ayarla
      const success = await updateSystemCredit(amount);
      if (!success) {
        return NextResponse.json(
          { success: false, message: 'Sistem kredisi güncellenemedi' },
          { status: 500 }
        );
      }
      newCredit = amount;
    } else if (action === 'add') {
      // Sistem kredisini artır
      const success = await addSystemCredit(amount);
      if (!success) {
        return NextResponse.json(
          { success: false, message: 'Sistem kredisi artırılamadı' },
          { status: 500 }
        );
      }
      newCredit = await getSystemCredit();
    } else {
      return NextResponse.json(
        { success: false, message: 'Geçersiz action. "set" veya "add" olmalı' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Sistem kredisi ${action === 'set' ? 'güncellendi' : 'artırıldı'}`,
      data: {
        systemCredit: newCredit,
      },
    });
  } catch (error: any) {
    console.error('Admin system credit update error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Sistem kredisi güncellenemedi' },
      { status: 500 }
    );
  }
}

