import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      userId: auth.user.userId,
    };

    // Date filtering
    if (startDate || endDate) {
      where.sentAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.sentAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.sentAt.lte = end;
      }
    }

    if (status) {
      where.status = status;
    }

    // Get SMS messages and total count
    const [messages, total] = await Promise.all([
      prisma.smsMessage.findMany({
        where,
        skip,
        take: limit,
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: {
          sentAt: 'desc',
        },
      }),
      prisma.smsMessage.count({ where }),
    ]);

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

