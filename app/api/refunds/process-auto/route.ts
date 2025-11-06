import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

// POST /api/refunds/process-auto - Otomatik iade işleme (48 saat sonra)
// Bu endpoint cron job veya scheduled task tarafından çağrılacak
export async function POST(request: NextRequest) {
  try {
    // Admin kontrolü (opsiyonel - cron job için secret key kontrolü)
    const authHeader = request.headers.get('authorization');
    const secretKey = request.headers.get('x-secret-key');
    
    // Secret key kontrolü (cron job için) - opsiyonel, yoksa atla
    if (process.env.CRON_SECRET_KEY && secretKey !== process.env.CRON_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Otomatik iade işleme başlatılıyor...');

    const supabaseServer = getSupabaseServer();

    // 48 saat önce oluşturulan ve hala beklemede olan iadeleri bul
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const { data: pendingRefunds, error: refundsError } = await supabaseServer
      .from('refunds')
      .select(`
        id,
        user_id,
        sms_id,
        refund_amount,
        status,
        created_at,
        sms_messages (
          id,
          status,
          cost,
          user_id
        ),
        users (
          id,
          credit
        )
      `)
      .eq('status', 'pending')
      .lte('created_at', fortyEightHoursAgo.toISOString());

    if (refundsError) {
      console.error('❌ İadeleri getirme hatası:', refundsError);
      return NextResponse.json(
        {
          success: false,
          error: refundsError.message || 'İadeleri getirme hatası',
        },
        { status: 500 }
      );
    }

    console.log(`📊 ${pendingRefunds?.length || 0} iade işlenecek`);

    let processedCount = 0;
    let errorCount = 0;

    for (const refund of pendingRefunds || []) {
      try {
        const sms = refund.sms_messages as any;
        const user = refund.users as any;

        // SMS'in hala başarısız olduğunu kontrol et
        if (sms && sms.status === 'failed') {
          // Kullanıcıya kredi iade et
          const refundAmount = Number(refund.refund_amount);
          const currentCredit = user?.credit || 0;
          const newCredit = currentCredit + refundAmount;

          // Kullanıcı kredisini güncelle
          const { error: updateUserError } = await supabaseServer
            .from('users')
            .update({ credit: Math.floor(newCredit) })
            .eq('id', refund.user_id);

          if (updateUserError) {
            throw updateUserError;
          }

          // İade durumunu güncelle
          const { error: updateRefundError } = await supabaseServer
            .from('refunds')
            .update({
              status: 'processed',
              processed_at: new Date().toISOString(),
            })
            .eq('id', refund.id);

          if (updateRefundError) {
            throw updateRefundError;
          }

          // SMS'i iade işlendi olarak işaretle
          const { error: updateSmsError } = await supabaseServer
            .from('sms_messages')
            .update({ refund_processed: true })
            .eq('id', refund.sms_id);

          if (updateSmsError) {
            console.warn(`⚠️ SMS güncelleme hatası (${refund.sms_id}):`, updateSmsError);
          }

          processedCount++;
          console.log(`✅ İade işlendi: ${refund.id} - ${refundAmount} kredi iade edildi`);
        } else {
          // SMS başarılı olmuş, iadeyi iptal et
          const { error: updateRefundError } = await supabaseServer
            .from('refunds')
            .update({
              status: 'cancelled',
            })
            .eq('id', refund.id);

          if (updateRefundError) {
            throw updateRefundError;
          }

          console.log(`❌ İade iptal edildi: ${refund.id} - SMS başarılı`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`❌ İade işleme hatası (${refund.id}):`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Otomatik iade işlemi tamamlandı`,
      data: {
        processed: processedCount,
        errors: errorCount,
        total: pendingRefunds?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('❌ Otomatik iade işleme hatası:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Otomatik iade işleme hatası',
      },
      { status: 500 }
    );
  }
}

