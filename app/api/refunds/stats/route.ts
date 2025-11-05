import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/refunds/stats - İade istatistikleri
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const [
      totalRefundsResult,
      pendingRefundsResult,
      approvedRefundsResult,
      processedRefundsResult,
    ] = await Promise.all([
      supabaseServer
        .from('refunds')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', auth.user.userId),
      supabaseServer
        .from('refunds')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', auth.user.userId)
        .eq('status', 'pending'),
      supabaseServer
        .from('refunds')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', auth.user.userId)
        .eq('status', 'approved'),
      supabaseServer
        .from('refunds')
        .select('refund_amount')
        .eq('user_id', auth.user.userId)
        .eq('status', 'processed'),
    ]);

    const totalRefunds = totalRefundsResult.count || 0;
    const pendingRefunds = pendingRefundsResult.count || 0;
    const approvedRefunds = approvedRefundsResult.count || 0;
    const processedRefunds = processedRefundsResult.data || [];
    const totalRefundAmount = processedRefunds.reduce((sum: number, refund: any) => sum + (Number(refund.refund_amount) || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        totalRefunds,
        pendingRefunds,
        approvedRefunds,
        totalRefundAmount,
      },
    });
  } catch (error: any) {
    console.error('Refund stats error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'İstatistik hatası' },
      { status: 500 }
    );
  }
}

