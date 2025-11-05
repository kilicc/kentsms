import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // Ödeme talebini bul
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!paymentRequest) {
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

    // Transaction içinde kullanıcı kredisini artır ve talebi onayla
    const result = await prisma.$transaction(async (tx) => {
      // Kullanıcı kredisini artır
      const user = await tx.user.update({
        where: { id: paymentRequest.userId! },
        data: {
          credit: {
            increment: paymentRequest.credits + (paymentRequest.bonus || 0),
          },
        },
      });

      // Ödeme talebini onayla
      const approvedRequest = await tx.paymentRequest.update({
        where: { id },
        data: {
          status: 'approved',
          approvedBy: auth.user.userId,
          approvedAt: new Date(),
          adminNotes,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      return { user, request: approvedRequest };
    });

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

