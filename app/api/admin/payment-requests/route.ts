import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest, requireAdmin } from '@/lib/middleware/auth';

// GET /api/admin/payment-requests - Tüm ödeme taleplerini listele (Admin)
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
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build Supabase query
    let query = supabaseServer
      .from('payment_requests')
      .select('*, users!payment_requests_user_id_fkey(id, username, email), users!payment_requests_approved_by_fkey(id, username, email)', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: requestsData, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    // Format requests data (Supabase returns nested relations differently)
    const requests = (requestsData || []).map((req: any) => ({
      id: req.id,
      userId: req.user_id,
      amount: req.amount,
      currency: req.currency || 'TRY',
      paymentMethod: req.payment_method,
      credits: req.credits,
      bonus: req.bonus || 0,
      description: req.description,
      transactionId: req.transaction_id,
      status: req.status || 'pending',
      adminNotes: req.admin_notes,
      approvedBy: req.approved_by,
      approvedAt: req.approved_at,
      rejectedAt: req.rejected_at,
      rejectionReason: req.rejection_reason,
      createdAt: req.created_at,
      updatedAt: req.updated_at,
      user: req.users ? (Array.isArray(req.users) ? req.users[0] : req.users) : null,
      approver: req.users ? (Array.isArray(req.users) ? req.users.find((u: any) => u.id === req.approved_by) : (req.users.id === req.approved_by ? req.users : null)) : null,
    }));

    const total = count || 0;

    return NextResponse.json({
      success: true,
      data: {
        requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Admin payment requests load error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ödeme talepleri yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

