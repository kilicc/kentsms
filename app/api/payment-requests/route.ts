import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    const where: any = {
      userId: auth.user.userId,
    };

    if (status) {
      where.status = status;
    }

    const requests = await prisma.paymentRequest.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        approver: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

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
    
    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        userId: auth.user.userId,
        amount: amountDecimal,
        currency: currency || 'TRY',
        paymentMethod: paymentMethod || 'manual',
        credits: parseInt(credits.toString()),
        bonus: bonus ? parseInt(bonus.toString()) : 0,
        description: description || null,
        transactionId: transactionId || null,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

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
    
    // Prisma hatası kontrolü
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'Bu ödeme talebi zaten mevcut' },
        { status: 400 }
      );
    }
    
    if (error.message?.includes('paymentRequest') || error.message?.includes('create') || error.message?.includes('undefined')) {
      console.error('Prisma Client hatası tespit edildi. Prisma Client yeniden generate edilmeli.');
      return NextResponse.json(
        { success: false, message: 'Veritabanı bağlantı hatası. Lütfen sayfayı yenileyin veya server\'ı yeniden başlatın.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: error.message || 'Ödeme talebi oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}

