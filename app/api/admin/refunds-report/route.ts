import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest, requireAdmin } from '@/lib/middleware/auth';

// GET /api/admin/refunds-report - İade raporu (kullanıcı bazlı günlük SMS ve iadeler)
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
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatı

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Tüm kullanıcıları al using Supabase
    const { data: usersData, error: usersError } = await supabaseServer
      .from('users')
      .select('id, username, email');

    if (usersError) {
      throw new Error(usersError.message);
    }

    const users = usersData || [];

    // Her kullanıcı için günlük SMS sayısı ve iade bilgilerini al using Supabase
    const userReports = await Promise.all(
      users.map(async (user: any) => {
        // Bugünkü SMS sayısı
        const { count: todaySMSCount } = await supabaseServer
          .from('sms_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('sent_at', startDate.toISOString())
          .lte('sent_at', endDate.toISOString());

        // Bugünkü başarısız SMS sayısı
        const { count: todayFailedSMSCount } = await supabaseServer
          .from('sms_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'failed')
          .gte('sent_at', startDate.toISOString())
          .lte('sent_at', endDate.toISOString());

        // Bugünkü iadeler
        const { data: todayRefundsData } = await supabaseServer
          .from('refunds')
          .select('*, sms_messages(id, phone_number, message, sent_at, status)')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false });

        const todayRefunds = todayRefundsData || [];

        // Toplam iade tutarı
        const totalRefundAmount = todayRefunds.reduce(
          (sum: number, refund: any) => sum + (Number(refund.refund_amount) || 0),
          0
        );

        return {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          todaySMS: todaySMSCount || 0,
          todayFailedSMS: todayFailedSMSCount || 0,
          todayRefunds: todayRefunds.length,
          totalRefundAmount,
          refunds: todayRefunds.map((refund: any) => {
            const createdAt = new Date(refund.created_at);
            const now = new Date();
            const hoursPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
            const remainingHours = Math.max(0, 48 - hoursPassed);
            const isExpired = hoursPassed >= 48;

            return {
              id: refund.id,
              sms: {
                id: refund.sms_messages?.id || '',
                phoneNumber: refund.sms_messages?.phone_number || '',
                message: refund.sms_messages?.message || '',
                sentAt: refund.sms_messages?.sent_at || null,
                status: refund.sms_messages?.status || '',
              },
              originalCost: Number(refund.original_cost),
              refundAmount: Number(refund.refund_amount),
              reason: refund.reason,
              status: refund.status,
              createdAt: refund.created_at,
              remainingHours: remainingHours,
              isExpired: isExpired,
            };
          }),
        };
      })
    );

    // Sadece SMS gönderen veya iadesi olan kullanıcıları filtrele
    const filteredReports = userReports.filter(
      (report) => report.todaySMS > 0 || report.todayRefunds > 0
    );

    return NextResponse.json({
      success: true,
      data: {
        date,
        reports: filteredReports,
        summary: {
          totalUsers: filteredReports.length,
          totalSMS: filteredReports.reduce((sum, r) => sum + r.todaySMS, 0),
          totalFailedSMS: filteredReports.reduce((sum, r) => sum + r.todayFailedSMS, 0),
          totalRefunds: filteredReports.reduce((sum, r) => sum + r.todayRefunds, 0),
          totalRefundAmount: filteredReports.reduce((sum, r) => sum + r.totalRefundAmount, 0),
        },
      },
    });
  } catch (error: any) {
    console.error('Admin refunds report error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'İade raporu hatası' },
      { status: 500 }
    );
  }
}

