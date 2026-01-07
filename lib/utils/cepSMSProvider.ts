import axios from 'axios';
import https from 'https';
import FormData from 'form-data';

interface CepSMSResponse {
  Status?: string;
  status?: string;
  statusCode?: number;
  MessageId?: string;
  messageId?: string;
  id?: string;
  Error?: string;
  error?: string;
  message?: string;
  [key: string]: any; // Farklı formatlar için
}

interface SendSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const CEPSMS_USERNAME = process.env.CEPSMS_USERNAME || 'Testfn';
const CEPSMS_PASSWORD = process.env.CEPSMS_PASSWORD || 'Qaswed';
const CEPSMS_FROM = process.env.CEPSMS_FROM || '';
// CepSMS API URL - farklı versiyonlar için environment variable ile değiştirilebilir
// Alternatif URL'ler: 
// - https://panel4.cepsms.com/smsapi
// - https://api.cepsms.com/sms/send
// - https://www.cepsms.com/api/sms/send
const CEPSMS_API_URL = process.env.CEPSMS_API_URL || 'https://panel4.cepsms.com/smsapi';

// HTTPS agent - SSL sertifika doğrulaması
// CepSMS API için SSL sertifika doğrulaması
// Bazı sunucularda (özellikle Docker/Vercel) SSL sertifika zinciri sorunu olabilir
// CEPSMS_REJECT_UNAUTHORIZED=false ile sertifika doğrulamasını devre dışı bırakabilirsiniz
const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.CEPSMS_REJECT_UNAUTHORIZED === 'true', // Varsayılan: false (sertifika doğrulaması yapılmaz)
  keepAlive: true,
  keepAliveMsecs: 1000,
});

/**
 * Telefon numarasını CepSMS formatına dönüştür (905xxxxxxxxx)
 * Türkiye mobil numaraları 5XX ile başlar (örn: 505, 532, 542, 543, 545, 551, 553, 554, 555, vb.)
 */
export function formatPhoneNumber(phone: string): string {
  // Sadece rakamları al
  let cleaned = phone.replace(/\D/g, '');
  
  // 12 haneli ve 905 ile başlıyorsa (905xxxxxxxxx) - bu geçerli bir format
  if (cleaned.length === 12 && cleaned.startsWith('905')) {
    return cleaned;
  }
  
  // 11 haneli ve 90 ile başlıyorsa (90xxxxxxxxx)
  // Ancak 3. hane 5 olmalı (mobil numara)
  if (cleaned.length === 11 && cleaned.startsWith('90')) {
    const thirdDigit = cleaned.charAt(2);
    if (thirdDigit === '5') {
      return cleaned;
    } else {
      throw new Error(`Geçersiz telefon numarası: ${phone}. Sadece mobil numaralar (5XX) kabul edilir. Sabit hat numaraları (${thirdDigit}XX) desteklenmez.`);
    }
  }
  
  // 0 ile başlıyorsa (0xxxxxxxxx) - 050******** formatı için
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1); // 0'ı kaldır
    if (cleaned.length === 10 && cleaned.startsWith('5')) {
      return '90' + cleaned;
    }
  }
  
  // 10 haneli ve 5 ile başlıyorsa (5xxxxxxxxx) - 50******** formatı için
  if (cleaned.length === 10 && cleaned.startsWith('5')) {
    return '90' + cleaned;
  }
  
  // 11 haneli ve 5 ile başlıyorsa (5xxxxxxxxxx) - fazla hane varsa ilk 10'unu al
  if (cleaned.length === 11 && cleaned.startsWith('5')) {
    return '90' + cleaned.substring(0, 10);
  }
  
  // 12 haneli ve 5 ile başlıyorsa (5xxxxxxxxxxx) - fazla hane varsa ilk 10'unu al
  if (cleaned.length === 12 && cleaned.startsWith('5')) {
    return '90' + cleaned.substring(0, 10);
  }
  
  throw new Error(`Geçersiz telefon numarası formatı: ${phone}. Sadece mobil numaralar kabul edilir (örn: 905551234567, 05551234567, 5551234567). Lütfen 5XX ile başlayan bir numara girin.`);
}

/**
 * CepSMS API ile SMS gönder
 */
export async function sendSMS(phone: string, message: string): Promise<SendSMSResult> {
    const formattedPhone = formatPhoneNumber(phone);
    
    console.log('[CepSMS] SMS gönderiliyor:', {
      phone: formattedPhone,
      messageLength: message.length,
      from: CEPSMS_FROM,
      username: CEPSMS_USERNAME,
      apiUrl: CEPSMS_API_URL,
      hasPassword: !!CEPSMS_PASSWORD,
    });

    const fromCandidate = (CEPSMS_FROM || '').trim();

    // CepSMS API isteği (test ile doğrulanan çalışan format)
    // - User/Pass (zorunlu)
    // - Message (zorunlu)
    // - Numbers (zorunlu, ARRAY formatında olmalı)
    // - From (opsiyonel, bazı hesaplarda geçersiz olabilir!)
    const baseRequestData: any = {
      User: CEPSMS_USERNAME,
      Pass: CEPSMS_PASSWORD,
      Message: message,
      Numbers: [formattedPhone],
    };

    // Güvenlik: loglarda şifreyi göstermeyelim
    const maskForLog = (payload: any) => {
      const clone = { ...(payload || {}) };
      if (typeof clone.Pass === 'string' && clone.Pass.length > 0) clone.Pass = '***';
      return clone;
    };

  try {
    // Strateji:
    // 1) Önce From OLMADAN dene (en uyumlu)
    // 2) "Geçersiz/Bad Request" alırsak ve CEPSMS_FROM özel bir değer ise From ile tekrar dene
    const postJson = async (payload: any) => {
      console.log('[CepSMS] Request Data:', JSON.stringify(maskForLog(payload), null, 2));
      const resp = await axios.post<CepSMSResponse>(CEPSMS_API_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        httpsAgent: httpsAgent,
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });
      console.log('[CepSMS] API Yanıtı:', JSON.stringify(resp.data, null, 2));
      return resp;
    };

    // 1) From olmadan
    let response = await postJson(baseRequestData);

    const status1 = response.data?.Status || response.data?.status || response.data?.statusCode;
    const error1 = response.data?.Error || response.data?.error || response.data?.message || '';
    const status1Str = String(status1 || '').toUpperCase();
    const error1Str = String(error1 || '').toLowerCase();

    // 2) Eğer geçersiz istek/bad request ise ve From adayımız varsa, From ile tekrar dene
    const shouldRetryWithFrom =
      !!fromCandidate &&
      fromCandidate.toLowerCase() !== 'cepsms' &&
      (status1Str.includes('BAD REQUEST') || status1Str === '400' || error1Str.includes('geçersiz') || error1Str.includes('invalid'));

    if (shouldRetryWithFrom) {
      console.warn('[CepSMS] İlk deneme geçersiz istek döndü; From ile tekrar deneniyor:', fromCandidate);
      response = await postJson({ ...baseRequestData, From: fromCandidate });
    }

    // API yanıtını kontrol et
    if (!response.data) {
      return {
        success: false,
        error: 'API yanıtı alınamadı',
      };
    }

    // Status kontrolü - farklı formatlar olabilir
    const status = response.data.Status || response.data.status || response.data.statusCode;
    const messageId = response.data.MessageId || response.data.messageId || response.data.id;
    const error = response.data.Error || response.data.error || response.data.message;

    // Başarılı yanıt kontrolü
    const statusStr = String(status || '').toUpperCase();
    const isSuccess = statusStr === 'OK' || status === 200;
    
    if (isSuccess && messageId) {
      console.log('[CepSMS] SMS başarıyla gönderildi:', messageId);
      return {
        success: true,
        messageId: String(messageId),
      };
    }

    // Hata mesajını oluştur - özel durumlar için anlaşılır mesajlar
    let errorMessage = error;
    
    // "User Error" veya benzeri hatalar için özel mesaj
    const errorStr = String(error || '').toLowerCase();
    const statusStrUpper = String(status || '').toUpperCase();
    
    if (errorStr.includes('user error') || errorStr.includes('user') || errorStr.includes('kullanıcı')) {
      errorMessage = 'CepSMS API kimlik doğrulama hatası. Kullanıcı adı veya şifre hatalı. Lütfen CEPSMS_USERNAME ve CEPSMS_PASSWORD environment variable\'larını kontrol edin.';
    } else if (!errorMessage) {
      // Özel hata durumları için anlaşılır mesajlar
      if (statusStrUpper.includes('PAYMENT') || statusStrUpper.includes('PAYMENT REQUIRED') || statusStrUpper === '402') {
        errorMessage = 'CepSMS hesabında yetersiz bakiye. Lütfen hesabınıza bakiye yükleyin.';
      } else if (statusStrUpper.includes('UNAUTHORIZED') || statusStrUpper === '401') {
        errorMessage = 'CepSMS API kimlik doğrulama hatası. Kullanıcı adı veya şifre hatalı.';
      } else if (statusStrUpper.includes('FORBIDDEN') || statusStrUpper === '403') {
        errorMessage = 'CepSMS API erişim hatası. Hesabınızın SMS gönderme yetkisi yok.';
      } else if (statusStrUpper.includes('INVALID') || statusStrUpper.includes('GEÇERSİZ')) {
        errorMessage = 'Geçersiz istek. Telefon numarası veya mesaj formatı hatalı.';
      } else {
        errorMessage = `CepSMS API hatası: ${error || status || 'Bilinmeyen durum'}`;
      }
    }
    
    console.error('[CepSMS] SMS gönderim hatası:', errorMessage);
    
    return {
      success: false,
      error: errorMessage || 'Bilinmeyen hata - API yanıtı beklenmedik formatta',
    };
  } catch (error: any) {
    console.error('[CepSMS] SMS gönderim hatası (catch):', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname,
      address: error.address,
      port: error.port,
      stack: error.stack,
    });

    // Axios hata yanıtı varsa
    if (error.response) {
      const errorData = error.response.data;
      const errorMessage = errorData?.Error || errorData?.error || errorData?.message || error.message;
      return {
        success: false,
        error: errorMessage || `HTTP ${error.response.status}: ${error.response.statusText}`,
      };
    }

    // Network hatası - daha detaylı hata mesajı
    if (error.request) {
      let detailedError = 'API\'ye bağlanılamadı.';
      
      if (error.code === 'ECONNREFUSED') {
        detailedError = 'CepSMS API sunucusuna bağlanılamadı. Sunucu çalışmıyor olabilir.';
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        detailedError = 'CepSMS API\'ye bağlantı zaman aşımına uğradı.';
      } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
        detailedError = 'CepSMS API sunucu adresi bulunamadı. DNS hatası olabilir.';
      } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
        detailedError = `CepSMS API SSL sertifika hatası: ${error.code}. SSL sertifika doğrulaması devre dışı bırakıldı.`;
        // SSL hatası varsa, rejectUnauthorized'ı false yap ve tekrar dene
        console.warn('[CepSMS] SSL sertifika hatası tespit edildi, sertifika doğrulaması devre dışı bırakılıyor...');
      } else if (error.code) {
        detailedError = `CepSMS API bağlantı hatası: ${error.code}. ${error.message || ''}`;
      } else {
        detailedError = `CepSMS API bağlantı hatası: ${error.message || 'Bilinmeyen hata'}`;
      }
      
      console.error('[CepSMS] Network hatası detayları:', {
        code: error.code,
        message: error.message,
        hostname: error.hostname || CEPSMS_API_URL,
        syscall: error.syscall,
        address: error.address,
      });
      
      // SSL hatası ise, tekrar dene (sertifika doğrulaması olmadan)
      if (error.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        console.log('[CepSMS] SSL hatası nedeniyle tekrar deneniyor (sertifika doğrulaması olmadan)...');
        try {
          const retryAgent = new https.Agent({
            rejectUnauthorized: false,
            keepAlive: true,
          });
          
          const retryResponse = await axios.post<CepSMSResponse>(
            CEPSMS_API_URL,
            baseRequestData,
            {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              httpsAgent: retryAgent,
              timeout: 30000,
              validateStatus: (status) => status < 500,
            }
          );
          
          console.log('[CepSMS] Retry başarılı:', JSON.stringify(retryResponse.data, null, 2));
          
          const status = retryResponse.data.Status || retryResponse.data.status || retryResponse.data.statusCode;
          const messageId = retryResponse.data.MessageId || retryResponse.data.messageId || retryResponse.data.id;
          const statusStr = String(status || '').toUpperCase();
          const isSuccess = statusStr === 'OK' || status === 200;
          
          if (isSuccess && messageId) {
            return {
              success: true,
              messageId: String(messageId),
            };
          }
        } catch (retryError: any) {
          console.error('[CepSMS] Retry da başarısız:', retryError.message);
        }
      }
      
      return {
        success: false,
        error: detailedError,
      };
    }

    // Diğer hatalar
    return {
      success: false,
      error: error.message || 'SMS gönderim hatası',
    };
  }
}

/**
 * CepSMS API'den mesaj durumunu kontrol et
 * CepSMS API dokümantasyonuna göre SMS Report endpoint'i kullanılır
 */
export async function checkSMSStatus(messageId: string, phoneNumber?: string): Promise<{
  success: boolean;
  status?: 'gönderildi' | 'iletildi' | 'iletilmedi' | 'rapor_bekliyor' | 'zaman_aşımı';
  network?: string;
  error?: string;
}> {
  try {
    console.log('[CepSMS] Mesaj durumu kontrol ediliyor:', { messageId, phoneNumber });

    // CepSMS API SMS Report endpoint'i - resmi dokümana göre JSON POST
    const normalizedBaseUrl = CEPSMS_API_URL.replace(/\/$/, '');
    const candidateEndpoints = Array.from(
      new Set(
        [
          normalizedBaseUrl,
          `${normalizedBaseUrl}/report`,
          normalizedBaseUrl.endsWith('/smsapi')
            ? `${normalizedBaseUrl.replace('/smsapi', '')}/report`
            : `${normalizedBaseUrl}/report`,
          'https://panel4.cepsms.com/smsapi',
          'https://panel4.cepsms.com/smsapi/report',
          'https://panel4.cepsms.com/report',
        ].filter(Boolean)
      )
    );

    const requestPayload = {
      User: CEPSMS_USERNAME,
      Pass: CEPSMS_PASSWORD,
      MessageId: messageId,
    };

    let response: any = null;
    let lastError: any = null;

    for (const endpoint of candidateEndpoints) {
      try {
        console.log('[CepSMS] Rapor API isteği:', { endpoint, messageId });

        // İlk denemede JSON formatı kullan, HTML dönerse form-encoded ile tekrar dene
        response = await axios.post<any>(endpoint, requestPayload, {
          headers: {
            'Content-Type': 'application/json',
          },
          httpsAgent,
          timeout: 30000,
        });

        if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
          console.warn('[CepSMS] HTML yanıt alındı, form-encoded denenecek');

          response = await axios.post<any>(endpoint, new URLSearchParams(requestPayload as any).toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            httpsAgent,
            timeout: 30000,
          });

          if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
            console.warn('[CepSMS] HTML yanıt devam ediyor, bir sonraki endpoint denenecek');
            lastError = new Error('HTML response received');
            continue;
          }
        }

        break; // Başarılı yanıt
      } catch (error: any) {
        lastError = error;
        console.warn('[CepSMS] Rapor endpoint denemesi başarısız:', {
          endpoint,
          message: error.message,
          status: error.response?.status,
          data: typeof error.response?.data === 'string' ? error.response.data.substring(0, 200) : error.response?.data,
        });
      }
    }

    if (!response) {
      console.error('[CepSMS] Rapor endpoint\'lerine ulaşılamadı');
      return {
        success: false,
        status: 'rapor_bekliyor',
        error: lastError?.message || 'CepSMS rapor endpoint\'i bulunamadı',
      };
    }

    console.log('[CepSMS] Rapor API Yanıtı:', JSON.stringify(response.data, null, 2));

    if (!response.data) {
      return {
        success: false,
        status: 'rapor_bekliyor',
        error: 'API yanıtı alınamadı',
      };
    }

    // Status kontrolü
    const apiStatus = response.data.Status || response.data.status;
    const statusStr = String(apiStatus || '').toUpperCase();

    // API hatası varsa
    if (statusStr === 'ERROR' || statusStr === 'HATA') {
      return {
        success: false,
        status: 'rapor_bekliyor',
        error: 'API hatası',
      };
    }

    // Report array'i kontrol et
    const report = response.data.Report || response.data.report || [];
    
    if (!Array.isArray(report) || report.length === 0) {
      return {
        success: true,
        status: 'rapor_bekliyor',
      };
    }

    // Telefon numarası belirtilmişse, o numaraya ait raporu bul
    if (phoneNumber) {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const phoneReport = report.find((r: any) => {
        const reportPhone = r.GSM || r.gsm || r.phone;
        return reportPhone === formattedPhone || reportPhone === phoneNumber;
      });

      if (phoneReport) {
        const state = phoneReport.State || phoneReport.state || phoneReport.status || '';
        const network = phoneReport.Network || phoneReport.network || '';
        
        // Durum eşleştirmesi (Türkçe)
        let status: 'gönderildi' | 'iletildi' | 'iletilmedi' | 'rapor_bekliyor' | 'zaman_aşımı' = 'rapor_bekliyor';
        
        if (state === 'İletildi' || state === 'iletildi' || state.toLowerCase().includes('iletildi')) {
          status = 'iletildi';
        } else if (state === 'İletilmedi' || state === 'iletilmedi' || state.toLowerCase().includes('iletilmedi')) {
          status = 'iletilmedi';
        } else if (state === 'Zaman Aşımı' || state === 'zaman aşımı' || state.toLowerCase().includes('zaman aşımı') || state.toLowerCase().includes('timeout')) {
          status = 'zaman_aşımı';
        } else if (state === 'Rapor Bekliyor' || state === 'rapor bekliyor' || state.toLowerCase().includes('rapor bekliyor') || state.toLowerCase().includes('pending')) {
          status = 'rapor_bekliyor';
        }

        return {
          success: true,
          status,
          network,
        };
      }
    }

    // Telefon numarası belirtilmemişse, ilk raporu kullan
    const firstReport = report[0];
    if (firstReport) {
      const state = firstReport.State || firstReport.state || firstReport.status || '';
      const network = firstReport.Network || firstReport.network || '';
      
      // Durum eşleştirmesi (Türkçe)
      let status: 'gönderildi' | 'iletildi' | 'iletilmedi' | 'rapor_bekliyor' | 'zaman_aşımı' = 'rapor_bekliyor';
      
      if (state === 'İletildi' || state === 'iletildi' || state.toLowerCase().includes('iletildi')) {
        status = 'iletildi';
      } else if (state === 'İletilmedi' || state === 'iletilmedi' || state.toLowerCase().includes('iletilmedi')) {
        status = 'iletilmedi';
      } else if (state === 'Zaman Aşımı' || state === 'zaman aşımı' || state.toLowerCase().includes('zaman aşımı') || state.toLowerCase().includes('timeout')) {
        status = 'zaman_aşımı';
      } else if (state === 'Rapor Bekliyor' || state === 'rapor bekliyor' || state.toLowerCase().includes('rapor bekliyor') || state.toLowerCase().includes('pending')) {
        status = 'rapor_bekliyor';
      }

      return {
        success: true,
        status,
        network,
      };
    }

    // Rapor bulunamadı
    return {
      success: true,
      status: 'rapor_bekliyor',
    };
  } catch (error: any) {
    console.error('[CepSMS] Durum kontrolü hatası:', {
      message: error.message,
      stack: error.stack,
    });

    // API endpoint bulunamadıysa veya hata varsa, rapor bekliyor döndür
    return {
      success: false,
      status: 'rapor_bekliyor',
      error: error.message || 'Durum kontrolü yapılamadı',
    };
  }
}

/**
 * Toplu SMS gönder
 */
export async function sendBulkSMS(phones: string[], message: string): Promise<SendSMSResult[]> {
  const results: SendSMSResult[] = [];
  
  for (const phone of phones) {
    const result = await sendSMS(phone, message);
    results.push(result);
  }
  
  return results;
}

