/**
 * Tüm CepSMS hesaplarını test et
 * Her hesaptan birer test SMS göndererek bağlantıları kontrol eder
 * 
 * GET /api/test-cepsms-accounts?phone=905551234567
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllAccounts } from '@/lib/utils/cepsmsAccounts';
import { sendSMS } from '@/lib/utils/cepSMSProvider';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testPhone = searchParams.get('phone') || '905551234567';

    console.log('=== CepSMS Hesapları Test Başlatılıyor ===');
    console.log(`Test telefon numarası: ${testPhone}\n`);

    const accounts = getAllAccounts();
    console.log(`Toplam ${accounts.length} hesap bulundu.\n`);

    const results: Array<{
      account: string;
      phone: string;
      success: boolean;
      error?: string;
      messageId?: string;
    }> = [];

    console.log('Her hesaptan test SMS gönderiliyor...\n');

    // Her hesap için test SMS gönder
    for (const account of accounts) {
      console.log(`[Test] Hesap: ${account.username} (${account.phone})`);
      console.log(`  Şifre uzunluğu: ${account.password.length} karakter`);

      try {
        const result = await sendSMS(
          testPhone,
          `Test SMS - ${account.username} hesabından gönderildi.`,
          account.username
        );

        if (result.success && result.messageId) {
          console.log(`  ✅ BAŞARILI - MessageId: ${result.messageId}`);
          results.push({
            account: account.username,
            phone: account.phone,
            success: true,
            messageId: result.messageId,
          });
        } else {
          console.log(`  ❌ BAŞARISIZ - Hata: ${result.error || 'Bilinmeyen hata'}`);
          results.push({
            account: account.username,
            phone: account.phone,
            success: false,
            error: result.error || 'Bilinmeyen hata',
          });
        }
      } catch (error: any) {
        console.log(`  ❌ HATA - ${error.message || error}`);
        results.push({
          account: account.username,
          phone: account.phone,
          success: false,
          error: error.message || String(error),
        });
      }

      // Her SMS arasında kısa bir bekleme (rate limiting)
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 saniye bekle
    }

    // Özet rapor
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    const summary = {
      total: results.length,
      success: successCount,
      failed: failedCount,
      testPhone,
      results: results.map(r => ({
        account: r.account,
        phone: r.phone,
        success: r.success,
        messageId: r.messageId,
        error: r.error,
      })),
    };

    console.log('\n=== TEST SONUÇLARI ===');
    console.log(`Toplam: ${summary.total} hesap`);
    console.log(`✅ Başarılı: ${summary.success}`);
    console.log(`❌ Başarısız: ${summary.failed}\n`);

    if (summary.success > 0) {
      console.log('✅ Başarılı Hesaplar:');
      results
        .filter(r => r.success)
        .forEach(r => {
          console.log(`  - ${r.account} (${r.phone}) - MessageId: ${r.messageId}`);
        });
    }

    if (summary.failed > 0) {
      console.log('❌ Başarısız Hesaplar:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.account} (${r.phone}) - Hata: ${r.error}`);
        });
    }

    return NextResponse.json(summary, { status: 200 });
  } catch (error: any) {
    console.error('Test hatası:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
