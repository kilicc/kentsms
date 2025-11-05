import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { hashPassword } from '@/lib/utils/password';
import { generateToken } from '@/lib/utils/jwt';

export async function POST(request: NextRequest) {
  // Kayıt özelliği devre dışı bırakıldı
  return NextResponse.json(
    { success: false, message: 'Kayıt özelliği devre dışı bırakılmıştır. Lütfen yöneticinizle iletişime geçin.' },
    { status: 403 }
  );

  // Eski kod (devre dışı):
  /*
  try {
    const body = await request.json();
    const { username, email, password } = body;

    // Validation
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı adı, email ve şifre gerekli' },
        { status: 400 }
      );
    }

    // Check if user exists using Supabase
    const { data: existingUsers, error: checkError } = await supabaseServer
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .limit(1);

    if (checkError || (existingUsers && existingUsers.length > 0)) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı adı veya email zaten kullanılıyor' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user using Supabase
    const { data: user, error: createError } = await supabaseServer
      .from('users')
      .insert({
        username,
        email,
        password_hash: passwordHash,
        credit: 0,
        role: 'user',
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

    // Generate tokens
    const accessToken = generateToken({
      userId: userData.id,
      username: userData.username,
      role: userData.role || 'user',
    });

    const refreshToken = generateToken({
      userId: userData.id,
      username: userData.username,
      role: userData.role || 'user',
    });

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: {
        user: userData,
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Kayıt hatası' },
      { status: 500 }
    );
  }
  */
}

