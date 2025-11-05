import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/refunds - İade geçmişi
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: refundsData, error } = await supabaseServer
      .from('refunds')
      .select('*, sms_messages(id, phone_number, message, sent_at)')
      .eq('user_id', auth.user.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Format refunds data
    const refunds = (refundsData || []).map((refund: any) => ({
      id: refund.id,
      userId: refund.user_id,
      smsId: refund.sms_id,
      originalCost: refund.original_cost,
      refundAmount: refund.refund_amount,
      reason: refund.reason,
      status: refund.status || 'pending',
      processedAt: refund.processed_at,
      createdAt: refund.created_at,
      updatedAt: refund.updated_at,
      sms: refund.sms_messages ? {
        id: refund.sms_messages.id,
        phoneNumber: refund.sms_messages.phone_number,
        message: refund.sms_messages.message,
        sentAt: refund.sms_messages.sent_at,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      data: { refunds },
    });
  } catch (error: any) {
    console.error('Refunds GET error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'İade geçmişi hatası' },
      { status: 500 }
    );
  }
}

// POST /api/refunds/process - İade işleme
export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { smsId, reason } = body;

    if (!smsId || !reason) {
      return NextResponse.json(
        { success: false, message: 'SMS ID ve sebep gerekli' },
        { status: 400 }
      );
    }

    // Check if SMS exists and belongs to user using Supabase
    const { data: smsData, error: smsError } = await supabaseServer
      .from('sms_messages')
      .select('id, cost, refund_processed')
      .eq('id', smsId)
      .eq('user_id', auth.user.userId)
      .eq('status', 'failed')
      .eq('refund_processed', false)
      .single();

    if (smsError || !smsData) {
      return NextResponse.json(
        { success: false, message: 'İade için uygun SMS bulunamadı' },
        { status: 404 }
      );
    }

    // Calculate refund amount (full cost)
    const refundAmount = Number(smsData.cost);

    // Create refund request using Supabase
    const { data: refundData, error: createError } = await supabaseServer
      .from('refunds')
      .insert({
        user_id: auth.user.userId,
        sms_id: smsId,
        original_cost: refundAmount,
        refund_amount: refundAmount,
        reason,
        status: 'pending',
      })
      .select()
      .single();

    if (createError || !refundData) {
      return NextResponse.json(
        { success: false, message: createError?.message || 'İade talebi oluşturulamadı' },
        { status: 500 }
      );
    }

    // Mark SMS as refund processed using Supabase
    await supabaseServer
      .from('sms_messages')
      .update({ refund_processed: true })
      .eq('id', smsId);

    // Format refund data
    const refund = {
      id: refundData.id,
      userId: refundData.user_id,
      smsId: refundData.sms_id,
      originalCost: refundData.original_cost,
      refundAmount: refundData.refund_amount,
      reason: refundData.reason,
      status: refundData.status || 'pending',
      processedAt: refundData.processed_at,
      createdAt: refundData.created_at,
      updatedAt: refundData.updated_at,
    };

    return NextResponse.json({
      success: true,
      message: 'İade talebi oluşturuldu',
      data: { refund },
    });
  } catch (error: any) {
    console.error('Refund POST error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'İade işleme hatası' },
      { status: 500 }
    );
  }
}

