import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest, requireAdmin } from '@/lib/middleware/auth';
import { hashPassword } from '@/lib/utils/password';

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
      .select('id, username, email, credit, role, is_verified, created_at, last_login, cepsms_username', { count: 'exact' });

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
      cepsmsUsername: user.cepsms_username || null,
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

// POST /api/admin/users - Yeni kullanıcı oluştur
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { username, password, role, credit } = body;

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı adı ve şifre gerekli' },
        { status: 400 }
      );
    }

    // Check if user exists (sadece username kontrolü - email kaldırıldı)
    const { data: existingUsers, error: checkError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('username', username)
      .limit(1);

    if (checkError) {
      throw new Error(checkError.message);
    }

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı adı zaten kullanılıyor' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user (email kaldırıldı, role varsayılan 'user')
    // Email kolonu NOT NULL ve UNIQUE olduğu için unique bir değer gönderiyoruz
    const uniqueEmail = `${username}@kentsms.local`;
    // Varsayılan başlangıç kredisi: 1,000,000 (1 milyon)
    const defaultCredit = 1000000;
    const { data: user, error: createError } = await supabaseServer
      .from('users')
      .insert({
        username,
        email: uniqueEmail, // Email kaldırıldı, unique bir değer gönderiyoruz
        password_hash: passwordHash,
        credit: credit !== undefined ? credit : defaultCredit,
        role: role || 'user',
      })
      .select('id, username, email, credit, role, created_at')
      .single();

    if (createError || !user) {
      return NextResponse.json(
        { success: false, message: createError?.message || 'Kullanıcı oluşturulamadı' },
        { status: 500 }
      );
    }

    // Format user data
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      credit: user.credit || 0,
      role: user.role || 'user',
      createdAt: user.created_at,
    };

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: { user: userData },
    });
  } catch (error: any) {
    console.error('Admin users POST error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Kullanıcı oluşturma hatası' },
      { status: 500 }
    );
  }
}
