import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: user, error } = await supabaseServer
      .from('users')
      .select('id, username, email, credit, role, is_verified, two_factor_enabled, created_at, updated_at')
      .eq('id', auth.user.userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // Format user data (snake_case to camelCase)
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      credit: user.credit || 0,
      role: user.role || 'user',
      isVerified: user.is_verified || false,
      twoFactorEnabled: user.two_factor_enabled || false,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: { user: userData },
    });
  } catch (error: any) {
    console.error('Profile error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Profil hatası' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, username } = body;

    const updateData: any = {};
    if (email) updateData.email = email;
    if (username) updateData.username = username;

    const { data: user, error } = await supabaseServer
      .from('users')
      .update(updateData)
      .eq('id', auth.user.userId)
      .select('id, username, email, credit, role, updated_at')
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, message: error?.message || 'Profil güncellenemedi' },
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
      updatedAt: user.updated_at,
    };

    return NextResponse.json({
      success: true,
      message: 'Profil güncellendi',
      data: { user: userData },
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Profil güncelleme hatası' },
      { status: 500 }
    );
  }
}

