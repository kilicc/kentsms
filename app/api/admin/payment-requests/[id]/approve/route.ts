import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest, requireAdmin } from '@/lib/middleware/auth';

// POST /api/admin/payment-requests/[id]/approve - Ödeme talebini onayla
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
    const { adminNotes } = body;

    // Ödeme talebini bul using Supabase
    const { data: paymentRequestData, error: findError } = await supabaseServer
      .from('payment_requests')
      .select('*, users!payment_requests_user_id_fkey(id, username, email, credit)')
      .eq('id', id)
      .single();

    if (findError || !paymentRequestData) {
      return NextResponse.json(
        { success: false, message: 'Ödeme talebi bulunamadı' },
        { status: 404 }
      );
    }

    if (paymentRequestData.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Bu ödeme talebi zaten işlenmiş' },
        { status: 400 }
      );
    }

    // Supabase'de transaction yok, manuel olarak yapılmalı
    // Önce kullanıcı kredisini artır
    const userData = Array.isArray(paymentRequestData.users) ? paymentRequestData.users[0] : paymentRequestData.users;
    const currentCredit = userData?.credit || 0;
    const creditToAdd = paymentRequestData.credits + (paymentRequestData.bonus || 0);

    const { data: updatedUser, error: userUpdateError } = await supabaseServer
      .from('users')
      .update({ credit: currentCredit + creditToAdd })
      .eq('id', paymentRequestData.user_id)
      .select('id, username, email, credit')
      .single();

    if (userUpdateError || !updatedUser) {
      return NextResponse.json(
        { success: false, message: userUpdateError?.message || 'Kullanıcı kredisi güncellenemedi' },
        { status: 500 }
      );
    }

    // Ödeme talebini onayla
    const { data: approvedRequestData, error: approveError } = await supabaseServer
      .from('payment_requests')
      .update({
        status: 'approved',
        approved_by: auth.user?.userId || null,
        approved_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
      })
      .eq('id', id)
      .select('*, users!payment_requests_user_id_fkey(id, username, email), users!payment_requests_approved_by_fkey(id, username, email)')
      .single();

    if (approveError || !approvedRequestData) {
      // Rollback: Kredi artırımını geri al
      await supabaseServer
        .from('users')
        .update({ credit: currentCredit })
        .eq('id', paymentRequestData.user_id);

      return NextResponse.json(
        { success: false, message: approveError?.message || 'Ödeme talebi onaylanamadı' },
        { status: 500 }
      );
    }

    // Format data
    const user = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      credit: updatedUser.credit,
    };

    const approvedRequest = {
      id: approvedRequestData.id,
      userId: approvedRequestData.user_id,
      amount: approvedRequestData.amount,
      currency: approvedRequestData.currency || 'TRY',
      paymentMethod: approvedRequestData.payment_method,
      credits: approvedRequestData.credits,
      bonus: approvedRequestData.bonus || 0,
      description: approvedRequestData.description,
      transactionId: approvedRequestData.transaction_id,
      status: approvedRequestData.status || 'approved',
      adminNotes: approvedRequestData.admin_notes,
      approvedBy: approvedRequestData.approved_by,
      approvedAt: approvedRequestData.approved_at,
      rejectedAt: approvedRequestData.rejected_at,
      rejectionReason: approvedRequestData.rejection_reason,
      createdAt: approvedRequestData.created_at,
      updatedAt: approvedRequestData.updated_at,
      user: Array.isArray(approvedRequestData.users) ? approvedRequestData.users.find((u: any) => u.id === approvedRequestData.user_id) : approvedRequestData.users,
      approver: Array.isArray(approvedRequestData.users) ? approvedRequestData.users.find((u: any) => u.id === approvedRequestData.approved_by) : null,
    };

    const result = { user, request: approvedRequest };

    return NextResponse.json({
      success: true,
      data: {
        request: result.request,
        user: result.user,
      },
      message: 'Ödeme talebi başarıyla onaylandı',
    });
  } catch (error: any) {
    console.error('Payment request approve error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ödeme talebi onaylanırken hata oluştu' },
      { status: 500 }
    );
  }
}

