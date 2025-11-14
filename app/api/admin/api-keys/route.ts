import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';
import crypto from 'crypto';

// GET /api/admin/api-keys - Tüm API key'leri listele
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = (auth.user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator';

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin yetkisi gerekli' },
        { status: 403 }
      );
    }

    const supabaseServer = getSupabaseServer();

    // API key'leri ve kullanıcı bilgilerini getir
    const { data: apiKeys, error } = await supabaseServer
      .from('api_keys')
      .select('id, user_id, api_key, name, description, is_active, last_used_at, created_at, users!api_keys_user_id_fkey(id, username, email, credit)')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message || 'API key\'ler alınamadı' },
        { status: 500 }
      );
    }

    // Her API key için istatistikleri getir
    const apiKeysWithStats = await Promise.all(
      (apiKeys || []).map(async (key: any) => {
        const userId = key.user_id;

        // Toplam SMS sayısı
        const { count: totalSms } = await supabaseServer
          .from('sms_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        // İade sayısı
        const { count: totalRefunds } = await supabaseServer
          .from('refunds')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('status', ['pending', 'approved', 'processed']);

        return {
          id: key.id,
          apiKey: key.api_key.substring(0, 8) + '...', // Sadece ilk 8 karakter göster
          name: key.name,
          description: key.description,
          isActive: key.is_active,
          lastUsedAt: key.last_used_at,
          createdAt: key.created_at,
          user: key.users ? {
            id: key.users.id,
            username: key.users.username,
            email: key.users.email,
            credit: key.users.credit || 0,
          } : null,
          stats: {
            totalSms: totalSms || 0,
            totalRefunds: totalRefunds || 0,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: { apiKeys: apiKeysWithStats },
    });
  } catch (error: any) {
    console.error('API keys get error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'API key\'ler alınamadı' },
      { status: 500 }
    );
  }
}

// POST /api/admin/api-keys - Yeni API key oluştur
export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = (auth.user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator';

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin yetkisi gerekli' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, name, description, credit } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId gerekli' },
        { status: 400 }
      );
    }

    const supabaseServer = getSupabaseServer();

    // Kullanıcıyı kontrol et
    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('id, username, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // API Key ve Secret oluştur
    const apiKey = crypto.randomBytes(32).toString('hex');
    const apiSecret = crypto.randomBytes(32).toString('hex');

    // API key oluştur
    const { data: apiKeyData, error: createError } = await supabaseServer
      .from('api_keys')
      .insert({
        user_id: userId,
        api_key: apiKey,
        api_secret: apiSecret,
        name: name || `${user.username} API Key`,
        description: description || null,
        is_active: true,
      })
      .select()
      .single();

    if (createError || !apiKeyData) {
      return NextResponse.json(
        { success: false, message: createError?.message || 'API key oluşturulamadı' },
        { status: 500 }
      );
    }

    // Kredi tanımla (varsa)
    if (credit !== undefined && credit !== null) {
      await supabaseServer
        .from('users')
        .update({ credit: credit })
        .eq('id', userId);
    }

    return NextResponse.json({
      success: true,
      message: 'API key başarıyla oluşturuldu',
      data: {
        id: apiKeyData.id,
        apiKey: apiKey,
        apiSecret: apiSecret,
        name: apiKeyData.name,
        userId: userId,
        username: user.username,
      },
    });
  } catch (error: any) {
    console.error('API key create error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'API key oluşturulamadı' },
      { status: 500 }
    );
  }
}

