import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/payment-requests - Kullanıcının ödeme taleplerini listele
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build Supabase query
    let query = supabaseServer
      .from('payment_requests')
      .select('*, users!payment_requests_approved_by_fkey(id, username, email)')
      .eq('user_id', auth.user.userId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: requestsData, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Format requests data
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
      approver: req.users ? {
        id: req.users.id,
        username: req.users.username,
        email: req.users.email,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        requests,
      },
    });
  } catch (error: any) {
    console.error('Payment requests load error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ödeme talepleri yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST /api/payment-requests - Yeni ödeme talebi oluştur
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
    const { amount, currency, paymentMethod, credits, bonus, description, transactionId } = body;

    if (!amount || !credits) {
      return NextResponse.json(
        { success: false, message: 'Tutar ve kredi miktarı gerekli' },
        { status: 400 }
      );
    }

    // Decimal değerleri doğru formata çevir
    const amountDecimal = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Create payment request using Supabase
    const { data: paymentRequestData, error: createError } = await supabaseServer
      .from('payment_requests')
      .insert({
        user_id: auth.user.userId,
        amount: amountDecimal,
        currency: currency || 'TRY',
        payment_method: paymentMethod || 'manual',
        credits: parseInt(credits.toString()),
        bonus: bonus ? parseInt(bonus.toString()) : 0,
        description: description || null,
        transaction_id: transactionId || null,
        status: 'pending',
      })
      .select('*, users!payment_requests_user_id_fkey(id, username, email)')
      .single();

    if (createError || !paymentRequestData) {
      return NextResponse.json(
        { success: false, message: createError?.message || 'Ödeme talebi oluşturulamadı' },
        { status: 500 }
      );
    }

    // Format payment request data
    const paymentRequest = {
      id: paymentRequestData.id,
      userId: paymentRequestData.user_id,
      amount: paymentRequestData.amount,
      currency: paymentRequestData.currency || 'TRY',
      paymentMethod: paymentRequestData.payment_method,
      credits: paymentRequestData.credits,
      bonus: paymentRequestData.bonus || 0,
      description: paymentRequestData.description,
      transactionId: paymentRequestData.transaction_id,
      status: paymentRequestData.status || 'pending',
      adminNotes: paymentRequestData.admin_notes,
      approvedBy: paymentRequestData.approved_by,
      approvedAt: paymentRequestData.approved_at,
      rejectedAt: paymentRequestData.rejected_at,
      rejectionReason: paymentRequestData.rejection_reason,
      createdAt: paymentRequestData.created_at,
      updatedAt: paymentRequestData.updated_at,
      user: paymentRequestData.users ? {
        id: paymentRequestData.users.id,
        username: paymentRequestData.users.username,
        email: paymentRequestData.users.email,
      } : null,
    };

    return NextResponse.json({
      success: true,
      data: {
        request: paymentRequest,
      },
      message: 'Ödeme talebi başarıyla oluşturuldu',
    });
  } catch (error: any) {
    console.error('Payment request create error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack?.substring(0, 500),
    });
    
    
    return NextResponse.json(
      { success: false, message: error.message || 'Ödeme talebi oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}

