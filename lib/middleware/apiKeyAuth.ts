import { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export interface ApiKeyAuthResult {
  authenticated: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    credit: number;
    role: string;
  };
  apiKey?: {
    id: string;
    name: string;
  };
  error?: string;
}

/**
 * API Key authentication middleware
 * CepSMS formatına benzer: User (API Key) ve Pass (API Secret) parametreleri ile
 */
export async function authenticateApiKey(request: NextRequest, body?: any): Promise<ApiKeyAuthResult> {
  try {
    // Request body'den User ve Pass parametrelerini al
    let requestBody: any = body || {};
    
    // Eğer body verilmediyse, request'ten oku
    if (!body) {
      try {
        const clonedRequest = request.clone();
        requestBody = await clonedRequest.json();
      } catch {
        // Body yoksa veya parse edilemiyorsa, query params veya headers'dan al
        const { searchParams } = new URL(request.url);
        requestBody = {
          User: searchParams.get('User') || request.headers.get('x-api-key'),
          Pass: searchParams.get('Pass') || request.headers.get('x-api-secret'),
        };
      }
    }

    const apiKey = requestBody.User || requestBody.user || requestBody.apiKey;
    const apiSecret = requestBody.Pass || requestBody.pass || requestBody.apiSecret;

    if (!apiKey || !apiSecret) {
      return {
        authenticated: false,
        error: 'API Key (User) ve API Secret (Pass) gerekli',
      };
    }

    const supabaseServer = getSupabaseServer();

    // API key'i veritabanından bul
    const { data: apiKeyData, error: apiKeyError } = await supabaseServer
      .from('api_keys')
      .select('id, user_id, name, is_active, users!api_keys_user_id_fkey(id, username, email, credit, role)')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      return {
        authenticated: false,
        error: 'Geçersiz API Key',
      };
    }

    // API Secret'ı kontrol et (basit string karşılaştırma - production'da hash kullanılmalı)
    // Şimdilik direkt karşılaştırma yapıyoruz, daha sonra bcrypt ile hash'lenebilir
    const { data: apiKeyFull, error: secretError } = await supabaseServer
      .from('api_keys')
      .select('api_secret')
      .eq('id', apiKeyData.id)
      .single();

    if (secretError || !apiKeyFull) {
      return {
        authenticated: false,
        error: 'API Secret kontrolü başarısız',
      };
    }

    // API Secret karşılaştırması
    if (apiKeyFull.api_secret !== apiSecret) {
      return {
        authenticated: false,
        error: 'Geçersiz API Secret',
      };
    }

    // Kullanıcı bilgilerini al
    const user = (apiKeyData as any).users;
    if (!user) {
      return {
        authenticated: false,
        error: 'Kullanıcı bulunamadı',
      };
    }

    // Last used at güncelle
    await supabaseServer
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    return {
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        credit: user.credit || 0,
        role: user.role || 'user',
      },
      apiKey: {
        id: apiKeyData.id,
        name: apiKeyData.name || 'Unnamed',
      },
    };
  } catch (error: any) {
    console.error('API Key authentication error:', error);
    return {
      authenticated: false,
      error: error.message || 'Authentication hatası',
    };
  }
}

