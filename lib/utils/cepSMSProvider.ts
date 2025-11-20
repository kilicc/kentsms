import axios from 'axios';
import https from 'https';

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
const CEPSMS_FROM = process.env.CEPSMS_FROM || 'CepSMS';
const CEPSMS_API_URL = 'https://panel4.cepsms.com/smsapi';

// HTTPS agent - SSL sertifika doğrulamasını atla (development için)
const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false,
});

/**
 * Telefon numarasını CepSMS formatına dönüştür (905xxxxxxxxx)
 */
export function formatPhoneNumber(phone: string): string {
  // Sadece rakamları al
  let cleaned = phone.replace(/\D/g, '');
  
  // 12 haneli ve 90 ile başlıyorsa (905xxxxxxxxx) - bu geçerli bir format
  if (cleaned.length === 12 && cleaned.startsWith('90') && cleaned.startsWith('905')) {
    return cleaned;
  }
  
  // 11 haneli ve 90 ile başlıyorsa (90xxxxxxxxx) - bu da geçerli
  if (cleaned.length === 11 && cleaned.startsWith('90')) {
    return cleaned;
  }
  
  // 0 ile başlıyorsa (0xxxxxxxxx)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1); // 0'ı kaldır
    if (cleaned.length === 10 && cleaned.startsWith('5')) {
      return '90' + cleaned;
    }
  }
  
  // 10 haneli ve 5 ile başlıyorsa (5xxxxxxxxx)
  if (cleaned.length === 10 && cleaned.startsWith('5')) {
    return '90' + cleaned;
  }
  
  // 11 haneli ve 5 ile başlıyorsa (5xxxxxxxxxx) - 0 eksik, 90 ekle
  if (cleaned.length === 11 && cleaned.startsWith('5')) {
    return '90' + cleaned.substring(0, 10);
  }
  
  // 12 haneli ve 5 ile başlıyorsa (5xxxxxxxxxxx) - başındaki 5'i kaldır ve 90 ekle
  if (cleaned.length === 12 && cleaned.startsWith('5')) {
    return '90' + cleaned.substring(0, 10);
  }
  
  throw new Error(`Geçersiz telefon numarası formatı: ${phone}. Lütfen geçerli bir Türkiye telefon numarası girin (örn: 905551234567, 05551234567, 551234567)`);
}

/**
 * CepSMS API ile SMS gönder
 */
export async function sendSMS(phone: string, message: string): Promise<SendSMSResult> {
  try {
    const formattedPhone = formatPhoneNumber(phone);
    
    console.log('[CepSMS] SMS gönderiliyor:', {
      phone: formattedPhone,
      messageLength: message.length,
      from: CEPSMS_FROM,
      username: CEPSMS_USERNAME,
    });

    // CepSMS API isteği - From parametresi opsiyonel ve bazı hesaplarda geçersiz olabilir
    const requestData: any = {
      User: CEPSMS_USERNAME,
      Pass: CEPSMS_PASSWORD,
      Message: message,
      Numbers: [formattedPhone],
    };

    // From parametresi sadece geçerli bir değer varsa ekle
    // CepSMS hesabında kayıtlı gönderen adı yoksa From parametresini kaldır
    if (CEPSMS_FROM && CEPSMS_FROM.trim() !== '' && CEPSMS_FROM !== 'CepSMS') {
      requestData.From = CEPSMS_FROM;
    }

    const response = await axios.post<CepSMSResponse>(
      CEPSMS_API_URL,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        httpsAgent: httpsAgent,
        timeout: 30000, // 30 saniye timeout
      }
    );

    console.log('[CepSMS] API Yanıtı:', JSON.stringify(response.data, null, 2));

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

    // Hata varsa göster
    const errorMessage = error || `Status: ${status}, MessageId: ${messageId || 'yok'}`;
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

    // Network hatası
    if (error.request) {
      return {
        success: false,
        error: 'API\'ye bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.',
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

