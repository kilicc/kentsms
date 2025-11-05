import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest, requireAdmin } from '@/lib/middleware/auth';

// GET /api/admin/stats - Sistem istatistikleri
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

    // Get current month start date
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get system statistics using Supabase
    const [
      totalUsersResult,
      totalContactsResult,
      totalSMSResult,
      smsThisMonthResult,
      completedPaymentsResult,
      allPaymentsResult,
      pendingPaymentRequestsResult,
    ] = await Promise.all([
      supabaseServer
        .from('users')
        .select('*', { count: 'exact', head: true }),
      supabaseServer
        .from('contacts')
        .select('*', { count: 'exact', head: true }),
      supabaseServer
        .from('sms_messages')
        .select('*', { count: 'exact', head: true }),
      supabaseServer
        .from('sms_messages')
        .select('*', { count: 'exact', head: true })
        .gte('sent_at', startOfMonth.toISOString()),
      supabaseServer
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabaseServer
        .from('payments')
        .select('amount')
        .eq('status', 'completed'),
      supabaseServer
        .from('payment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ]);

    const totalUsers = totalUsersResult.count || 0;
    const totalContacts = totalContactsResult.count || 0;
    const totalSMS = totalSMSResult.count || 0;
    const smsThisMonth = smsThisMonthResult.count || 0;
    const totalPayments = completedPaymentsResult.count || 0;
    const payments = allPaymentsResult.data || [];
    const totalRevenue = payments.reduce((sum: number, payment: any) => sum + (Number(payment.amount) || 0), 0);
    const pendingPaymentRequests = pendingPaymentRequestsResult.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalContacts,
        totalSMS,
        smsThisMonth,
        totalPayments,
        totalRevenue,
        pendingPaymentRequests,
      },
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'İstatistik hatası' },
      { status: 500 }
    );
  }
}

