import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyPassword } from '@/lib/utils/password';
import { generateToken } from '@/lib/utils/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { login, password, twoFactorCode } = body;

    // Validation
    if (!login || !password) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı adı/email ve şifre gerekli' },
        { status: 400 }
      );
    }

    // Find user by username or email using Supabase
    const { data: users, error: findError } = await supabaseServer
      .from('users')
      .select('*')
      .or(`username.eq.${login},email.eq.${login}`)
      .limit(1);

    if (findError || !users || users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı adı veya şifre hatalı' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı adı veya şifre hatalı' },
        { status: 401 }
      );
    }

    // 2FA check (TODO: Implement 2FA verification)
    if (user.two_factor_enabled && !twoFactorCode) {
      return NextResponse.json(
        { success: false, message: '2FA kodu gerekli', requires2FA: true },
        { status: 200 }
      );
    }

    // Update last login
    await supabaseServer
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Generate tokens
    const accessToken = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role || 'user',
    });

    const refreshToken = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role || 'user',
    });

    return NextResponse.json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          credit: user.credit || 0,
          role: user.role || 'user',
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Giriş hatası' },
      { status: 500 }
    );
  }
}

