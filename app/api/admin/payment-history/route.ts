import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest, requireAdmin } from '@/lib/middleware/auth';

// GET /api/admin/payment-history - Ödeme geçmişi
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Get payments and total count using Supabase
    const { data: paymentsData, count, error } = await supabaseServer
      .from('payments')
      .select('*, users!payments_user_id_fkey(id, username, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    // Format payments data
    const payments = (paymentsData || []).map((payment: any) => ({
      id: payment.id,
      userId: payment.user_id,
      amount: payment.amount,
      currency: payment.currency || 'TRY',
      paymentMethod: payment.payment_method,
      status: payment.status || 'pending',
      transactionId: payment.transaction_id,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
      user: payment.users ? {
        id: payment.users.id,
        username: payment.users.username,
        email: payment.users.email,
      } : null,
    }));

    const total = count || 0;

    return NextResponse.json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Admin payment history error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ödeme geçmişi hatası' },
      { status: 500 }
    );
  }
}

