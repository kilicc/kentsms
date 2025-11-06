import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // 48 saat önce oluşturulan ve hala beklemede olan iadeleri bul
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const pendingRefunds = await prisma.refund.findMany({
      where: {
        status: 'pending',
        createdAt: {
          lte: fortyEightHoursAgo,
        },
      },
      include: {
        sms: {
          select: {
            id: true,
            status: true,
            cost: true,
            userId: true,
          },
        },
        user: {
          select: {
            id: true,
            credit: true,
          },
        },
      },
    });

    console.log(`📊 ${pendingRefunds.length} iade işlenecek`);

    let processedCount = 0;
    let errorCount = 0;

    for (const refund of pendingRefunds) {
      try {
        // SMS'in hala başarısız olduğunu kontrol et
        if (refund.sms && refund.sms.status === 'failed') {
          // Kullanıcıya kredi iade et
          const refundAmount = Number(refund.refundAmount);
          const currentCredit = refund.user?.credit || 0;
          const newCredit = currentCredit + refundAmount;

          // Kullanıcı kredisini güncelle
          await prisma.user.update({
            where: { id: refund.userId! },
            data: { credit: Math.floor(newCredit) },
          });

          // İade durumunu güncelle
          await prisma.refund.update({
            where: { id: refund.id },
            data: {
              status: 'processed',
              processedAt: new Date(),
            },
          });

          // SMS'i iade işlendi olarak işaretle
          await prisma.smsMessage.update({
            where: { id: refund.smsId! },
            data: { refundProcessed: true },
          });

          processedCount++;
          console.log(`✅ İade işlendi: ${refund.id} - ${refundAmount} kredi iade edildi`);
        } else {
          // SMS başarılı olmuş, iadeyi iptal et
          await prisma.refund.update({
            where: { id: refund.id },
            data: {
              status: 'cancelled',
            },
          });
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
        total: pendingRefunds.length,
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

