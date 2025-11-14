import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';
import { hashPassword } from '@/lib/utils/password';
import crypto from 'crypto';

// Helper function to create NextRequest from URL and body
function createNextRequest(url: string, method: string, body?: any): NextRequest {
  const request = new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return request;
}

/**
 * POST /api/admin/test-api
 * API testleri için demo kullanıcı oluşturur ve testleri çalıştırır
 */
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

    const supabaseServer = getSupabaseServer();

    // Demo kullanıcı oluştur
    const demoUsername = 'demo_api_user';
    const demoEmail = 'demo_api@finsms.io';
    const demoPassword = 'Demo123!@#';

    // Önce kullanıcıyı kontrol et
    let { data: existingUser } = await supabaseServer
      .from('users')
      .select('id, username, credit')
      .eq('username', demoUsername)
      .single();

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Şifreyi hash'le
      const passwordHash = await hashPassword(demoPassword);

      // Kullanıcı oluştur
      const { data: newUser, error: userError } = await supabaseServer
        .from('users')
        .insert({
          username: demoUsername,
          email: demoEmail,
          password_hash: passwordHash,
          role: 'user',
          credit: 1000, // 1000 SMS kredisi
        })
        .select('id, credit')
        .single();

      if (userError || !newUser) {
        return NextResponse.json(
          { success: false, message: `Kullanıcı oluşturulamadı: ${userError?.message}` },
          { status: 500 }
        );
      }

      userId = newUser.id;
      isNewUser = true;
    }

    // API Key oluştur veya mevcut olanı al
    const apiKey = crypto.randomBytes(32).toString('hex');
    const apiSecret = crypto.randomBytes(32).toString('hex');

    let { data: existingKey } = await supabaseServer
      .from('api_keys')
      .select('id, api_key, api_secret, name')
      .eq('user_id', userId)
      .eq('name', 'Demo API Key - Test')
      .single();

    let finalApiKey: string;
    let finalApiSecret: string;
    let isNewKey = false;

    if (existingKey) {
      finalApiKey = existingKey.api_key;
      finalApiSecret = existingKey.api_secret;
    } else {
      const { data: apiKeyData, error: keyError } = await supabaseServer
        .from('api_keys')
        .insert({
          user_id: userId,
          api_key: apiKey,
          api_secret: apiSecret,
          name: 'Demo API Key - Test',
          description: 'API testleri için oluşturulan demo API key',
          is_active: true,
        })
        .select('api_key, api_secret')
        .single();

      if (keyError || !apiKeyData) {
        return NextResponse.json(
          { success: false, message: `API Key oluşturulamadı: ${keyError?.message}` },
          { status: 500 }
        );
      }

      finalApiKey = apiKeyData.api_key;
      finalApiSecret = apiKeyData.api_secret;
      isNewKey = true;
    }

    // Test sonuçları
    const testResults: any[] = [];
    
    // Test için doğrudan API endpoint'lerini import edip çağıracağız
    // Ancak server-side'da fetch kullanmak daha güvenli
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                    'http://localhost:3000';

    // Test 1: Send SMS Simple
    try {
      const test1Request = createNextRequest(
        `${baseUrl}/api/v1/sms/send`,
        'POST',
        {
          User: finalApiKey,
          Pass: finalApiSecret,
          Message: 'Test mesajı - API Test 1 (Simple)',
          Numbers: ['905321234567'],
        }
      );
      
      // Doğrudan handler'ı çağır
      const { POST: sendHandler } = await import('@/app/api/v1/sms/send/route');
      const test1Response = await sendHandler(test1Request);
      const test1Data = await test1Response.json();
      
      testResults.push({
        name: 'Send SMS Simple',
        endpoint: '/api/v1/sms/send',
        success: test1Response.ok && test1Data.Status === 'OK',
        status: test1Response.status,
        response: test1Data,
        messageId: test1Data.MessageId,
      });
    } catch (error: any) {
      testResults.push({
        name: 'Send SMS Simple',
        endpoint: '/api/v1/sms/send',
        success: false,
        error: error.message,
      });
    }

    // Test 2: Send SMS Advanced
    try {
      const test2Request = createNextRequest(
        `${baseUrl}/api/v1/sms/send-advanced`,
        'POST',
        {
          From: 'FinSMS',
          User: finalApiKey,
          Pass: finalApiSecret,
          Message: 'Test mesajı - API Test 2 (Advanced)',
          Coding: 'turkish',
          Numbers: ['905321234567'],
        }
      );
      const { POST: sendAdvancedHandler } = await import('@/app/api/v1/sms/send-advanced/route');
      const test2Response = await sendAdvancedHandler(test2Request);
      const test2Data = await test2Response.json();
      testResults.push({
        name: 'Send SMS Advanced',
        endpoint: '/api/v1/sms/send-advanced',
        success: test2Response.ok && test2Data.Status === 'OK',
        status: test2Response.status,
        response: test2Data,
        messageId: test2Data.MessageId,
      });
    } catch (error: any) {
      testResults.push({
        name: 'Send SMS Advanced',
        endpoint: '/api/v1/sms/send-advanced',
        success: false,
        error: error.message,
      });
    }

    // Test 3: Send SMS Multi
    try {
      const test3Request = createNextRequest(
        `${baseUrl}/api/v1/sms/send-multi`,
        'POST',
        {
          From: 'FinSMS',
          User: finalApiKey,
          Pass: finalApiSecret,
          Coding: 'default',
          Messages: [
            { Message: 'Test mesajı 1 - Multi', GSM: '905321234567' },
            { Message: 'Test mesajı 2 - Multi', GSM: '905321234568' },
          ],
        }
      );
      const { POST: sendMultiHandler } = await import('@/app/api/v1/sms/send-multi/route');
      const test3Response = await sendMultiHandler(test3Request);
      const test3Data = await test3Response.json();
      testResults.push({
        name: 'Send SMS Multi',
        endpoint: '/api/v1/sms/send-multi',
        success: test3Response.ok && (test3Data.Status === 'OK' || test3Data.MessageIds),
        status: test3Response.status,
        response: test3Data,
        messageIds: test3Data.MessageIds || (test3Data.MessageId ? [test3Data.MessageId] : []),
      });
    } catch (error: any) {
      testResults.push({
        name: 'Send SMS Multi',
        endpoint: '/api/v1/sms/send-multi',
        success: false,
        error: error.message,
      });
    }

    // Test 4: SMS Report (İlk başarılı testin MessageId'sini kullan)
    const firstSuccessMessageId = testResults.find((t) => t.messageId)?.messageId;
    if (firstSuccessMessageId) {
      try {
        const test4Request = createNextRequest(
          `${baseUrl}/api/v1/sms/report`,
          'POST',
          {
            User: finalApiKey,
            Pass: finalApiSecret,
            MessageId: firstSuccessMessageId,
          }
        );
        const { POST: reportHandler } = await import('@/app/api/v1/sms/report/route');
        const test4Response = await reportHandler(test4Request);
        const test4Data = await test4Response.json();
        testResults.push({
          name: 'SMS Report',
          endpoint: '/api/v1/sms/report',
          success: test4Response.ok && test4Data.Status === 'OK',
          status: test4Response.status,
          response: test4Data,
          report: test4Data.Report || [],
        });
      } catch (error: any) {
        testResults.push({
          name: 'SMS Report',
          endpoint: '/api/v1/sms/report',
          success: false,
          error: error.message,
        });
      }
    }

    // Test 5: Invalid API Key
    try {
      const test5Request = createNextRequest(
        `${baseUrl}/api/v1/sms/send`,
        'POST',
        {
          User: 'invalid_key',
          Pass: 'invalid_secret',
          Message: 'Test',
          Numbers: ['905321234567'],
        }
      );
      const { POST: sendHandler } = await import('@/app/api/v1/sms/send/route');
      const test5Response = await sendHandler(test5Request);
      const test5Data = await test5Response.json();
      testResults.push({
        name: 'Invalid API Key Test',
        endpoint: '/api/v1/sms/send',
        success: test5Response.status === 401,
        status: test5Response.status,
        response: test5Data,
        expectedStatus: 401,
      });
    } catch (error: any) {
      testResults.push({
        name: 'Invalid API Key Test',
        endpoint: '/api/v1/sms/send',
        success: false,
        error: error.message,
      });
    }

    // Test 6: Missing Parameters
    try {
      const test6Request = createNextRequest(
        `${baseUrl}/api/v1/sms/send`,
        'POST',
        {
          User: finalApiKey,
          Pass: finalApiSecret,
          // Message ve Numbers eksik
        }
      );
      const { POST: sendHandler } = await import('@/app/api/v1/sms/send/route');
      const test6Response = await sendHandler(test6Request);
      const test6Data = await test6Response.json();
      testResults.push({
        name: 'Missing Parameters Test',
        endpoint: '/api/v1/sms/send',
        success: test6Response.status === 400,
        status: test6Response.status,
        response: test6Data,
        expectedStatus: 400,
      });
    } catch (error: any) {
      testResults.push({
        name: 'Missing Parameters Test',
        endpoint: '/api/v1/sms/send',
        success: false,
        error: error.message,
      });
    }

    // Kullanıcı bilgilerini güncelle (kredi durumu)
    const { data: userData } = await supabaseServer
      .from('users')
      .select('credit')
      .eq('id', userId)
      .single();

    // Özet
    const successCount = testResults.filter((t) => t.success).length;
    const totalCount = testResults.length;

    return NextResponse.json({
      success: true,
      message: 'API testleri tamamlandı',
      data: {
        demo: {
          userId,
          username: demoUsername,
          email: demoEmail,
          credit: userData?.credit || 0,
          apiKey: finalApiKey.substring(0, 16) + '...',
          apiSecret: finalApiSecret.substring(0, 16) + '...',
          isNewUser,
          isNewKey,
        },
        tests: testResults,
        summary: {
          total: totalCount,
          success: successCount,
          failed: totalCount - successCount,
          successRate: totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : 0,
        },
      },
    });
  } catch (error: any) {
    console.error('API test error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'API testleri çalıştırılırken hata oluştu' },
      { status: 500 }
    );
  }
}

