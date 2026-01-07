/**
 * API Test Script
 * Tüm API endpoint'lerini test eder ve demo veriler oluşturur
 */

import { getSupabaseServer } from '../lib/supabase-server';
import crypto from 'crypto';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  method: string;
  success: boolean;
  status: number;
  response?: any;
  error?: string;
}

const testResults: TestResult[] = [];

async function testEndpoint(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: any,
  headers?: Record<string, string>
): Promise<TestResult> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));

    const result: TestResult = {
      endpoint,
      method,
      success: response.ok,
      status: response.status,
      response: data,
    };

    if (!response.ok) {
      result.error = data.error || data.message || `HTTP ${response.status}`;
    }

    return result;
  } catch (error: any) {
    return {
      endpoint,
      method,
      success: false,
      status: 0,
      error: error.message || 'Network error',
    };
  }
}

async function createDemoUser() {
  console.log('📝 Demo kullanıcı oluşturuluyor...');
  const supabaseServer = getSupabaseServer();

  const demoUsername = 'demo_api_user';
  const demoEmail = 'demo_api@kentsms.com';
  const demoPassword = 'Demo123!@#';

  // Önce kullanıcıyı kontrol et
  const { data: existingUser } = await supabaseServer
    .from('users')
    .select('id, username')
    .eq('username', demoUsername)
    .single();

  let userId: string;

  if (existingUser) {
    console.log('✅ Demo kullanıcı zaten mevcut');
    userId = existingUser.id;
  } else {
    // Kullanıcı oluştur
    const { data: newUser, error: userError } = await supabaseServer
      .from('users')
      .insert({
        username: demoUsername,
        email: demoEmail,
        password: crypto.createHash('sha256').update(demoPassword).digest('hex'),
        role: 'user',
        credit: 1000, // 1000 SMS kredisi
      })
      .select('id')
      .single();

    if (userError || !newUser) {
      throw new Error(`Kullanıcı oluşturulamadı: ${userError?.message}`);
    }

    userId = newUser.id;
    console.log('✅ Demo kullanıcı oluşturuldu:', userId);
  }

  // API Key oluştur
  console.log('🔑 API Key oluşturuluyor...');
  const apiKey = crypto.randomBytes(32).toString('hex');
  const apiSecret = crypto.randomBytes(32).toString('hex');

  const { data: existingKey } = await supabaseServer
    .from('api_keys')
    .select('id, api_key, api_secret')
    .eq('user_id', userId)
    .single();

  let finalApiKey: string;
  let finalApiSecret: string;

  if (existingKey) {
    console.log('✅ API Key zaten mevcut');
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
      throw new Error(`API Key oluşturulamadı: ${keyError?.message}`);
    }

    finalApiKey = apiKeyData.api_key;
    finalApiSecret = apiKeyData.api_secret;
    console.log('✅ API Key oluşturuldu');
  }

  return {
    userId,
    username: demoUsername,
    email: demoEmail,
    password: demoPassword,
    apiKey: finalApiKey,
    apiSecret: finalApiSecret,
  };
}

async function runTests() {
  console.log('🚀 API Testleri başlatılıyor...\n');

  // Demo kullanıcı ve API key oluştur
  const demo = await createDemoUser();

  console.log('\n📋 Test Bilgileri:');
  console.log(`Kullanıcı: ${demo.username}`);
  console.log(`Email: ${demo.email}`);
  console.log(`API Key: ${demo.apiKey.substring(0, 16)}...`);
  console.log(`API Secret: ${demo.apiSecret.substring(0, 16)}...\n`);

  // Test 1: Send SMS Simple
  console.log('🧪 Test 1: POST /api/v1/sms/send (Simple)');
  const test1 = await testEndpoint('/api/v1/sms/send', 'POST', {
    User: demo.apiKey,
    Pass: demo.apiSecret,
    Message: 'Test mesajı - API Test 1',
    Numbers: ['905321234567'],
  });
  testResults.push(test1);
  console.log(test1.success ? '✅ Başarılı' : `❌ Başarısız: ${test1.error}`);
  if (test1.success && test1.response?.MessageId) {
    console.log(`   MessageId: ${test1.response.MessageId}`);
  }
  console.log('');

  // Test 2: Send SMS Advanced
  console.log('🧪 Test 2: POST /api/v1/sms/send-advanced');
  const test2 = await testEndpoint('/api/v1/sms/send-advanced', 'POST', {
    From: 'FinSMS',
    User: demo.apiKey,
    Pass: demo.apiSecret,
    Message: 'Test mesajı - API Test 2 (Advanced)',
    Coding: 'turkish',
    Numbers: ['905321234567'],
  });
  testResults.push(test2);
  console.log(test2.success ? '✅ Başarılı' : `❌ Başarısız: ${test2.error}`);
  if (test2.success && test2.response?.MessageId) {
    console.log(`   MessageId: ${test2.response.MessageId}`);
  }
  console.log('');

  // Test 3: Send SMS Multi
  console.log('🧪 Test 3: POST /api/v1/sms/send-multi');
  const test3 = await testEndpoint('/api/v1/sms/send-multi', 'POST', {
    From: 'FinSMS',
    User: demo.apiKey,
    Pass: demo.apiSecret,
    Coding: 'default',
    Messages: [
      { Message: 'Test mesajı 1 - Multi', GSM: '905321234567' },
      { Message: 'Test mesajı 2 - Multi', GSM: '905321234568' },
    ],
  });
  testResults.push(test3);
  console.log(test3.success ? '✅ Başarılı' : `❌ Başarısız: ${test3.error}`);
  if (test3.success) {
    if (test3.response?.MessageId) {
      console.log(`   MessageId: ${test3.response.MessageId}`);
    } else if (test3.response?.MessageIds) {
      console.log(`   MessageIds: ${test3.response.MessageIds.length} mesaj`);
    }
  }
  console.log('');

  // Test 4: SMS Report (Test 1'in MessageId'sini kullan)
  if (test1.success && test1.response?.MessageId) {
    console.log('🧪 Test 4: POST /api/v1/sms/report');
    const test4 = await testEndpoint('/api/v1/sms/report', 'POST', {
      User: demo.apiKey,
      Pass: demo.apiSecret,
      MessageId: test1.response.MessageId,
    });
    testResults.push(test4);
    console.log(test4.success ? '✅ Başarılı' : `❌ Başarısız: ${test4.error}`);
    if (test4.success && test4.response?.Report) {
      console.log(`   Report: ${test4.response.Report.length} kayıt`);
      test4.response.Report.forEach((r: any, i: number) => {
        console.log(`   ${i + 1}. ${r.GSM} - ${r.State} (${r.Network})`);
      });
    }
    console.log('');
  }

  // Test 5: Invalid API Key
  console.log('🧪 Test 5: POST /api/v1/sms/send (Invalid API Key)');
  const test5 = await testEndpoint('/api/v1/sms/send', 'POST', {
    User: 'invalid_key',
    Pass: 'invalid_secret',
    Message: 'Test',
    Numbers: ['905321234567'],
  });
  testResults.push(test5);
  console.log(test5.status === 401 ? '✅ Doğru hata döndü (401)' : `❌ Beklenmeyen sonuç: ${test5.status}`);
  console.log('');

  // Test 6: Missing Parameters
  console.log('🧪 Test 6: POST /api/v1/sms/send (Missing Parameters)');
  const test6 = await testEndpoint('/api/v1/sms/send', 'POST', {
    User: demo.apiKey,
    Pass: demo.apiSecret,
    // Message ve Numbers eksik
  });
  testResults.push(test6);
  console.log(test6.status === 400 ? '✅ Doğru hata döndü (400)' : `❌ Beklenmeyen sonuç: ${test6.status}`);
  console.log('');

  // Özet
  console.log('\n📊 Test Özeti:');
  const successCount = testResults.filter((t) => t.success || t.status === 401 || t.status === 400).length;
  const totalCount = testResults.length;
  console.log(`Toplam: ${totalCount} test`);
  console.log(`Başarılı: ${successCount} test`);
  console.log(`Başarısız: ${totalCount - successCount} test\n`);

  // Başarısız testleri listele
  const failedTests = testResults.filter(
    (t) => !t.success && t.status !== 401 && t.status !== 400
  );
  if (failedTests.length > 0) {
    console.log('❌ Başarısız Testler:');
    failedTests.forEach((test) => {
      console.log(`   - ${test.method} ${test.endpoint}: ${test.error || test.status}`);
    });
    console.log('');
  }

  return {
    demo,
    testResults,
    summary: {
      total: totalCount,
      success: successCount,
      failed: totalCount - successCount,
    },
  };
}

// Script çalıştır
if (require.main === module) {
  runTests()
    .then((result) => {
      console.log('✅ Testler tamamlandı!');
      process.exit(result.summary.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('❌ Test hatası:', error);
      process.exit(1);
    });
}

export { runTests, createDemoUser };

