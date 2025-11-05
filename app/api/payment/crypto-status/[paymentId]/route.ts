import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/payment/crypto-status/:paymentId - Ödeme durumu
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { paymentId } = await params;

    const { data: paymentData, error } = await supabaseServer
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', auth.user.userId)
      .single();

    if (error || !paymentData) {
      return NextResponse.json(
        { success: false, message: 'Ödeme bulunamadı' },
        { status: 404 }
      );
    }

    // Format payment data
    const payment = {
      id: paymentData.id,
      userId: paymentData.user_id,
      amount: paymentData.amount,
      currency: paymentData.currency || 'TRY',
      paymentMethod: paymentData.payment_method,
      status: paymentData.status || 'pending',
      transactionId: paymentData.transaction_id,
      createdAt: paymentData.created_at,
      updatedAt: paymentData.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: { payment },
    });
  } catch (error: any) {
    console.error('Payment status error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ödeme durumu hatası' },
      { status: 500 }
    );
  }
}

