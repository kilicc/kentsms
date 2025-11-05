import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/bulk-sms/status/:messageId - SMS durumu
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { messageId } = await params;

    const { data: messageData, error } = await supabaseServer
      .from('sms_messages')
      .select('*, contacts(id, name, phone)')
      .eq('id', messageId)
      .eq('user_id', auth.user.userId)
      .single();

    if (error || !messageData) {
      return NextResponse.json(
        { success: false, message: 'SMS mesajı bulunamadı' },
        { status: 404 }
      );
    }

    // Format message data
    const message = {
      id: messageData.id,
      userId: messageData.user_id,
      contactId: messageData.contact_id,
      phoneNumber: messageData.phone_number,
      message: messageData.message,
      sender: messageData.sender,
      status: messageData.status,
      cost: messageData.cost,
      cepSmsMessageId: messageData.cep_sms_message_id,
      sentAt: messageData.sent_at,
      createdAt: messageData.created_at,
      updatedAt: messageData.updated_at,
      contact: messageData.contacts ? {
        id: messageData.contacts.id,
        name: messageData.contacts.name,
        phone: messageData.contacts.phone,
      } : null,
    };

    return NextResponse.json({
      success: true,
      data: { message },
    });
  } catch (error: any) {
    console.error('SMS status error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'SMS durumu hatası' },
      { status: 500 }
    );
  }
}

