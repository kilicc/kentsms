import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware/auth';
import { getSystemCredit } from '@/lib/utils/systemCredit';

// GET /api/system-credit - Sistem kredisini al
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const systemCredit = await getSystemCredit();

    return NextResponse.json({
      success: true,
      data: {
        systemCredit,
      },
    });
  } catch (error: any) {
    console.error('System credit fetch error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Sistem kredisi alınamadı' },
      { status: 500 }
    );
  }
}

