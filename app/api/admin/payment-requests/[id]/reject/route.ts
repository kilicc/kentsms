import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // Ödeme talebini bul
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id },
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

    // Ödeme talebini reddet
    const rejectedRequest = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason,
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

