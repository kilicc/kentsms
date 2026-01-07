import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest, requireAdmin } from '@/lib/middleware/auth';
import { deductSystemCredit, getSystemCredit } from '@/lib/utils/systemCredit';

// POST /api/admin/users/:userId/credit - Kredi yükleme
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!requireAdmin(auth.user)) {
      return NextResponse.json(
        { success: false, message: 'Admin yetkisi gerekli' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const body = await request.json();
    const { amount, reason } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Geçerli bir kredi miktarı gerekli' },
        { status: 400 }
      );
    }

    // Check if user exists using Supabase
    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('id, credit')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // Sistem kredisinden düş (ana kredi havuzundan)
    const creditToAdd = Math.round(amount);
    const systemCreditCheck = await deductSystemCredit(creditToAdd);

    if (!systemCreditCheck.success) {
      return NextResponse.json(
        {
          success: false,
          message: systemCreditCheck.error || 'Yetersiz sistem kredisi. Ana krediden yeterli kredi yok.',
        },
        { status: 400 }
      );
    }

    // Update user credit using Supabase (sistem kredisinden düşülmüş kredi kullanıcıya ekleniyor)
    const currentCredit = user.credit || 0;
    const { data: updatedUser, error: updateError } = await supabaseServer
      .from('users')
      .update({ credit: currentCredit + creditToAdd })
      .eq('id', userId)
      .select('id, username, email, credit')
      .single();

    if (updateError || !updatedUser) {
      // Kullanıcı kredisi güncellenemedi, sistem kredisini geri ver
      const { addSystemCredit } = await import('@/lib/utils/systemCredit');
      await addSystemCredit(creditToAdd);

      return NextResponse.json(
        { success: false, message: updateError?.message || 'Kredi yüklenemedi' },
        { status: 500 }
      );
    }

    // Sistem kredisini al (güncel değer için)
    const remainingSystemCredit = await getSystemCredit();

    return NextResponse.json({
      success: true,
      message: 'Kredi yüklendi (ana krediden düşüldü)',
      data: {
        user: updatedUser,
        creditAdded: creditToAdd,
        remainingSystemCredit: remainingSystemCredit,
        reason: reason || 'Admin kredi yükleme - Ana krediden paylaştırıldı',
      },
    });
  } catch (error: any) {
    console.error('Admin credit POST error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Kredi yükleme hatası' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/:userId/credit - Kullanıcı kredisini sıfırla
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!requireAdmin(auth.user)) {
      return NextResponse.json(
        { success: false, message: 'Admin yetkisi gerekli' },
        { status: 403 }
      );
    }

    const { userId } = await params;

    // Check if user exists using Supabase
    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('id, credit')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcı kredisini 0'a ayarla
    const { data: updatedUser, error: updateError } = await supabaseServer
      .from('users')
      .update({ credit: 0 })
      .eq('id', userId)
      .select('id, username, email, credit')
      .single();

    if (updateError || !updatedUser) {
      return NextResponse.json(
        { success: false, message: updateError?.message || 'Kredi sıfırlanamadı' },
        { status: 500 }
      );
    }

    // Sistem kredisini al (güncel değer için)
    const remainingSystemCredit = await getSystemCredit();

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı kredisi sıfırlandı',
      data: {
        user: updatedUser,
        previousCredit: user.credit || 0,
        remainingSystemCredit: remainingSystemCredit,
      },
    });
  } catch (error: any) {
    console.error('Admin credit reset error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Kredi sıfırlama hatası' },
      { status: 500 }
    );
  }
}

