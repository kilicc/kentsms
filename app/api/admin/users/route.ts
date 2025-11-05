import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest, requireAdmin } from '@/lib/middleware/auth';

// GET /api/admin/users - Tüm kullanıcılar
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search');
    const role = searchParams.get('role');

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build Supabase query
    let query = supabaseServer
      .from('users')
      .select('id, username, email, credit, role, is_verified, created_at, last_login', { count: 'exact' });

    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq('role', role);
    }

    const { data: usersData, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    // Format users data
    const users = (usersData || []).map((user: any) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      credit: user.credit || 0,
      role: user.role || 'user',
      isVerified: user.is_verified || false,
      createdAt: user.created_at,
      lastLogin: user.last_login,
    }));

    const total = count || 0;

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Admin users GET error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Kullanıcı listesi hatası' },
      { status: 500 }
    );
  }
}

