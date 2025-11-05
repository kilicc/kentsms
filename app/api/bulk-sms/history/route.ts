import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/bulk-sms/history - SMS geçmişi
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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build Supabase query
    let query = supabaseServer
      .from('sms_messages')
      .select('*, contacts(id, name, phone)', { count: 'exact' })
      .eq('user_id', auth.user.userId);

    // Date filtering
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      query = query.gte('sent_at', start.toISOString());
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.lte('sent_at', end.toISOString());
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Get SMS messages and total count
    const { data: messagesData, count, error: messagesError } = await query
      .order('sent_at', { ascending: false })
      .range(from, to);

    if (messagesError) {
      throw new Error(messagesError.message);
    }

    // Format messages data
    const messages = (messagesData || []).map((msg: any) => ({
      id: msg.id,
      userId: msg.user_id,
      contactId: msg.contact_id,
      phoneNumber: msg.phone_number,
      message: msg.message,
      sender: msg.sender,
      status: msg.status,
      cost: msg.cost,
      cepSmsMessageId: msg.cep_sms_message_id,
      sentAt: msg.sent_at,
      createdAt: msg.created_at,
      updatedAt: msg.updated_at,
      contact: msg.contacts ? {
        id: msg.contacts.id,
        name: msg.contacts.name,
        phone: msg.contacts.phone,
      } : null,
    }));

    const total = count || 0;

    return NextResponse.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('SMS history error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'SMS geçmişi hatası' },
      { status: 500 }
    );
  }
}

