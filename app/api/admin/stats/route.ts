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

    // Get system statistics using Supabase
    const [
      totalUsersResult,
      totalContactsResult,
      totalSMSResult,
      completedPaymentsResult,
      allPaymentsResult,
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
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabaseServer
        .from('payments')
        .select('amount')
        .eq('status', 'completed'),
    ]);

    const totalUsers = totalUsersResult.count || 0;
    const totalContacts = totalContactsResult.count || 0;
    const totalSMS = totalSMSResult.count || 0;
    const totalPayments = completedPaymentsResult.count || 0;
    const payments = allPaymentsResult.data || [];
    const totalRevenue = payments.reduce((sum: number, payment: any) => sum + (Number(payment.amount) || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalContacts,
        totalSMS,
        totalPayments,
        totalRevenue,
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

