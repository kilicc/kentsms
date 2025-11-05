import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest, requireAdmin } from '@/lib/middleware/auth';

// POST /api/admin/payment-requests/[id]/reject - Ödeme talebini reddet
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const body = await request.json();
    const { rejectionReason, adminNotes } = body;

    if (!rejectionReason) {
      return NextResponse.json(
        { success: false, message: 'Red sebebi gerekli' },
        { status: 400 }
      );
    }

    // Ödeme talebini bul using Supabase
    const { data: paymentRequest, error: findError } = await supabaseServer
      .from('payment_requests')
      .select('id, status')
      .eq('id', id)
      .single();

    if (findError || !paymentRequest) {
      return NextResponse.json(
        { success: false, message: 'Ödeme talebi bulunamadı' },
        { status: 404 }
      );
    }

    if (paymentRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Bu ödeme talebi zaten işlenmiş' },
        { status: 400 }
      );
    }

    // Ödeme talebini reddet using Supabase
    const { data: rejectedRequestData, error: rejectError } = await supabaseServer
      .from('payment_requests')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
        admin_notes: adminNotes || null,
      })
      .eq('id', id)
      .select('*, users!payment_requests_user_id_fkey(id, username, email), users!payment_requests_approved_by_fkey(id, username, email)')
      .single();

    if (rejectError || !rejectedRequestData) {
      return NextResponse.json(
        { success: false, message: rejectError?.message || 'Ödeme talebi reddedilemedi' },
        { status: 500 }
      );
    }

    // Format data
    const rejectedRequest = {
      id: rejectedRequestData.id,
      userId: rejectedRequestData.user_id,
      amount: rejectedRequestData.amount,
      currency: rejectedRequestData.currency || 'TRY',
      paymentMethod: rejectedRequestData.payment_method,
      credits: rejectedRequestData.credits,
      bonus: rejectedRequestData.bonus || 0,
      description: rejectedRequestData.description,
      transactionId: rejectedRequestData.transaction_id,
      status: rejectedRequestData.status || 'rejected',
      adminNotes: rejectedRequestData.admin_notes,
      approvedBy: rejectedRequestData.approved_by,
      approvedAt: rejectedRequestData.approved_at,
      rejectedAt: rejectedRequestData.rejected_at,
      rejectionReason: rejectedRequestData.rejection_reason,
      createdAt: rejectedRequestData.created_at,
      updatedAt: rejectedRequestData.updated_at,
      user: Array.isArray(rejectedRequestData.users) ? rejectedRequestData.users.find((u: any) => u.id === rejectedRequestData.user_id) : rejectedRequestData.users,
      approver: Array.isArray(rejectedRequestData.users) ? rejectedRequestData.users.find((u: any) => u.id === rejectedRequestData.approved_by) : null,
    };

    return NextResponse.json({
      success: true,
      data: {
        request: rejectedRequest,
      },
      message: 'Ödeme talebi reddedildi',
    });
  } catch (error: any) {
    console.error('Payment request reject error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ödeme talebi reddedilirken hata oluştu' },
      { status: 500 }
    );
  }
}

