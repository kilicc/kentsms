import axios from 'axios';
import https from 'https';
import FormData from 'form-data';
import { getAccountByUsername, CepSMSAccount, getAllAccounts } from './cepsmsAccounts';

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
// Ortak API şifresi - Tüm kullanıcılar için aynı API şifresi kullanılır
const COMMON_API_PASSWORD = process.env.COMMON_API_PASSWORD || 'SxRtu2952!!opeq';
const CEPSMS_FROM = process.env.CEPSMS_FROM || '';
// CepSMS API URL - farklı versiyonlar için environment variable ile değiştirilebilir
// Alternatif URL'ler: 
// - https://panel4.cepsms.com/smsapi (ana endpoint)
// - https://panel6.cepsms.com/smsapi
// - https://api.cepsms.com/sms/send
// - https://www.cepsms.com/api/sms/send
// - https://panel.cepsms.com/api/sms/send
const CEPSMS_API_URL = process.env.CEPSMS_API_URL || 'https://panel4.cepsms.com/smsapi';

// Alternatif API endpoint'leri (System Error durumunda kullanılacak)
const ALTERNATIVE_API_URLS = [
  'https://panel4.cepsms.com/smsapi',
  'https://panel6.cepsms.com/smsapi',
  'https://api.cepsms.com/sms/send',
  'https://www.cepsms.com/api/sms/send',
  'https://panel.cepsms.com/api/sms/send',
];

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
 * CepSMS API ile SMS gönder (kullanıcıya özel hesap ile)
 * @param phone Telefon numarası
 * @param message SMS mesajı
 * @param cepsmsUsername CepSMS kullanıcı adı (opsiyonel, yoksa environment variable kullanılır)
 */
export async function sendSMS(phone: string, message: string, cepsmsUsername?: string): Promise<SendSMSResult> {
    // Mesaj validasyonu
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return {
        success: false,
        error: 'Mesaj boş olamaz. Lütfen geçerli bir mesaj girin.',
      };
    }
    
    // Mesaj uzunluğu kontrolü (CepSMS genellikle 160 karakter limiti var, ancak daha uzun mesajlar da gönderilebilir)
    if (message.length > 10000) {
      return {
        success: false,
        error: 'Mesaj çok uzun. Maksimum 10000 karakter kabul edilir.',
      };
    }
    
    let formattedPhone: string;
    try {
      formattedPhone = formatPhoneNumber(phone);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Geçersiz telefon numarası formatı. Lütfen 5XX ile başlayan bir mobil numara girin (örn: 905551234567, 05551234567, 5551234567).',
      };
    }
    
    // Kullanıcıya özel hesap kullan veya varsayılan environment variable'ları kullan
    let username = CEPSMS_USERNAME;
    let password = CEPSMS_PASSWORD;
    let from = CEPSMS_FROM;
    
    if (cepsmsUsername) {
      const account = getAccountByUsername(cepsmsUsername);
      if (account) {
        username = account.username;
        // Tüm kullanıcılar için ortak API şifresi kullanılır
        // Her kullanıcının attığı SMS kendi kullanıcı kredisinden düşer
        password = COMMON_API_PASSWORD;
        from = account.from || CEPSMS_FROM;
        console.log(`[CepSMS] Kullanıcıya özel hesap kullanılıyor: ${username} (${cepsmsUsername}), ortak API şifresi kullanılıyor`);
      } else {
        // Hesap bulunamadı - varsayılan hesaba fallback yap (sadece warning log)
        const allAccounts = getAllAccounts();
        const availableAccounts = allAccounts.map(a => a.username).join(', ');
        console.error(`[CepSMS] Kullanıcı hesabı bulunamadı: ${cepsmsUsername}`);
        console.error(`[CepSMS] Mevcut hesaplar: ${availableAccounts}`);
        console.warn(`[CepSMS] Varsayılan environment variable hesabı kullanılıyor: ${CEPSMS_USERNAME}`);
        // Hesap bulunamadığı için varsayılan environment variable'lar kullanılacak
        // Bu durumda kullanıcıya daha açıklayıcı bir warning mesajı verilebilir
      }
    } else {
      console.log(`[CepSMS] Kullanıcıya özel hesap atanmamış, varsayılan hesap kullanılıyor: ${CEPSMS_USERNAME}`);
    }
    
    // Şifre ve kullanıcı adı kontrolü
    if (!username || username.trim() === '') {
      console.error('[CepSMS] Kullanıcı adı boş!');
      return {
        success: false,
        error: 'CepSMS kullanıcı adı tanımlı değil. Lütfen kullanıcıya bir CepSMS hesabı atayın veya CEPSMS_USERNAME environment variable\'ını ayarlayın.',
      };
    }
    
    if (!password || password.trim() === '') {
      console.error('[CepSMS] Şifre boş!');
      return {
        success: false,
        error: 'CepSMS şifresi tanımlı değil. Lütfen kullanıcıya bir CepSMS hesabı atayın veya CEPSMS_PASSWORD environment variable\'ını ayarlayın.',
      };
    }
    
    console.log('[CepSMS] SMS gönderiliyor:', {
      phone: formattedPhone,
      messageLength: message.length,
      from: from || '(boş)',
      username: username,
      cepsmsUsername: cepsmsUsername || '(atanmamış)',
      apiUrl: CEPSMS_API_URL,
      hasPassword: !!password,
      passwordLength: password.length,
    });

    const fromCandidate = (from || '').trim();

    // CepSMS API isteği (test ile doğrulanan çalışan format)
    // - User/Pass (zorunlu) - bazı API'lerde Username/Password olabilir
    // - Message (zorunlu)
    // - Numbers (zorunlu, ARRAY formatında olmalı)
    // - From (opsiyonel, bazı hesaplarda geçersiz olabilir!)
    const baseRequestData: any = {
      User: username,
      Pass: password,
      Message: message,
      Numbers: [formattedPhone],
    };

    // Alternatif format: Username/Password (bazı CepSMS API versiyonlarında gerekli olabilir)
    const altRequestData: any = {
      Username: username,
      Password: password,
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
    // 1) Önce JSON formatında From OLMADAN dene (en uyumlu)
    // 2) "User Error" alırsak form-encoded formatında tekrar dene
    // 3) "Geçersiz/Bad Request" alırsak ve CEPSMS_FROM özel bir değer ise From ile tekrar dene
    const postJson = async (payload: any) => {
      console.log('[CepSMS] JSON Request Data:', JSON.stringify(maskForLog(payload), null, 2));
      const resp = await axios.post<CepSMSResponse>(CEPSMS_API_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        httpsAgent: httpsAgent,
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });
      console.log('[CepSMS] JSON API Yanıtı:', JSON.stringify(resp.data, null, 2));
      return resp;
    };

    const postFormEncoded = async (payload: any) => {
      // CepSMS API form-encoded formatında genellikle Numbers[] veya Numbers kullanır
      // Önce Numbers[] formatını dene
      const formData1 = new URLSearchParams();
      formData1.append('User', payload.User);
      formData1.append('Pass', payload.Pass);
      formData1.append('Message', payload.Message);
      payload.Numbers.forEach((num: string) => {
        formData1.append('Numbers[]', num);
      });
      if (payload.From) {
        formData1.append('From', payload.From);
      }
      
      console.log('[CepSMS] Form-Encoded Request (masked) - Numbers[] formatı:', {
        User: payload.User,
        Pass: '***',
        Message: payload.Message.substring(0, 50) + '...',
        NumbersCount: payload.Numbers.length,
        From: payload.From || '(yok)',
      });
      
      try {
        const resp = await axios.post<CepSMSResponse>(CEPSMS_API_URL, formData1.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          httpsAgent: httpsAgent,
          timeout: 30000,
          validateStatus: (status) => status < 500,
        });
        console.log('[CepSMS] Form-Encoded API Yanıtı (Numbers[]):', JSON.stringify(resp.data, null, 2));
        return resp;
      } catch (error: any) {
        // Numbers[] formatı başarısız olduysa, Numbers formatını dene
        console.warn('[CepSMS] Numbers[] formatı başarısız, Numbers formatı deneniyor...');
        const formData2 = new URLSearchParams();
        formData2.append('User', payload.User);
        formData2.append('Pass', payload.Pass);
        formData2.append('Message', payload.Message);
        payload.Numbers.forEach((num: string) => {
          formData2.append('Numbers', num);
        });
        if (payload.From) {
          formData2.append('From', payload.From);
        }
        
        const resp = await axios.post<CepSMSResponse>(CEPSMS_API_URL, formData2.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          httpsAgent: httpsAgent,
          timeout: 30000,
          validateStatus: (status) => status < 500,
        });
        console.log('[CepSMS] Form-Encoded API Yanıtı (Numbers):', JSON.stringify(resp.data, null, 2));
        return resp;
      }
    };

    // 1) From olmadan JSON formatında
    let response = await postJson(baseRequestData);

    const status1 = response.data?.Status || response.data?.status || response.data?.statusCode;
    const error1 = response.data?.Error || response.data?.error || response.data?.message || '';
    const status1Str = String(status1 || '').toUpperCase();
    const error1Str = String(error1 || '').toLowerCase();

    // "System Error" veya "User Error" alırsak alternatif formatları dene
    const isUserErrorAfterFirst = error1Str === 'user error' || 
                                  error1Str.trim() === 'user error' ||
                                  status1Str === 'USER ERROR' ||
                                  status1Str === 'SYSTEM ERROR' ||
                                  (response.status === 401 && error1Str.includes('user'));
    
    const isSystemError = status1Str === 'SYSTEM ERROR' || 
                         status1Str.includes('SYSTEM ERROR') ||
                         error1Str.includes('system error');
    
    if (isUserErrorAfterFirst || isSystemError) {
      console.warn('[CepSMS] JSON formatında User Error veya System Error alındı, alternatif formatlar ve endpoint\'ler deneniyor...');
      
      // System Error durumunda alternatif endpoint'leri de dene
      if (isSystemError) {
        for (const altUrl of ALTERNATIVE_API_URLS) {
          if (altUrl === CEPSMS_API_URL) continue; // Ana endpoint'i zaten denedik
          
          console.log(`[CepSMS] Alternatif endpoint deneniyor: ${altUrl}`);
          try {
            // Önce JSON formatında dene
            let altResp = await axios.post<CepSMSResponse>(altUrl, baseRequestData, {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              httpsAgent: httpsAgent,
              timeout: 30000,
              validateStatus: (status) => status < 500,
            });
            
            let altStatus = altResp.data?.Status || altResp.data?.status || altResp.data?.statusCode;
            let altStatusStr = String(altStatus || '').toUpperCase();
            
            // Eğer hala System Error ise, form-encoded formatını dene
            if (altStatusStr === 'SYSTEM ERROR' || altStatusStr === 'USER ERROR') {
              console.log(`[CepSMS] Alternatif endpoint'te de System Error, form-encoded deneniyor: ${altUrl}`);
              const formData = new URLSearchParams();
              formData.append('User', username);
              formData.append('Pass', password);
              formData.append('Message', message);
              formData.append('Numbers', formattedPhone);
              
              altResp = await axios.post<CepSMSResponse>(altUrl, formData.toString(), {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Accept': 'application/json',
                },
                httpsAgent: httpsAgent,
                timeout: 30000,
                validateStatus: (status) => status < 500,
              });
              
              altStatus = altResp.data?.Status || altResp.data?.status || altResp.data?.statusCode;
              altStatusStr = String(altStatus || '').toUpperCase();
            }
            
            if (altStatusStr === 'OK' || altStatus === 200) {
              console.log(`[CepSMS] Alternatif endpoint başarılı: ${altUrl}`);
              response = altResp;
              break; // Başarılı endpoint bulundu, döngüden çık
            }
          } catch (altError: any) {
            console.warn(`[CepSMS] Alternatif endpoint başarısız (${altUrl}):`, altError.message);
          }
        }
      }
      
      // 2a) Numbers'ı string formatında dene (virgülle ayrılmış)
      try {
        console.log('[CepSMS] Numbers string formatında deneniyor (virgülle ayrılmış)...');
        const stringNumbersData = {
          User: baseRequestData.User,
          Pass: baseRequestData.Pass,
          Message: baseRequestData.Message,
          Numbers: baseRequestData.Numbers.join(','), // Array yerine string
        };
        const stringResp = await postJson(stringNumbersData);
        const stringStatus = stringResp.data?.Status || stringResp.data?.status || stringResp.data?.statusCode;
        const stringStatusStr = String(stringStatus || '').toUpperCase();
        
        if (stringStatusStr === 'OK' || stringStatus === 200) {
          console.log('[CepSMS] Numbers string formatı başarılı!');
          response = stringResp;
        } else {
          throw new Error('Numbers string formatı başarısız');
        }
      } catch (stringError: any) {
        console.warn('[CepSMS] Numbers string formatı başarısız, form-encoded deneniyor...');
        
        // 2b) Form-encoded formatında dene
        try {
          console.log('[CepSMS] Form-encoded formatında deneniyor...');
          response = await postFormEncoded(baseRequestData);
          const status2 = response.data?.Status || response.data?.status || response.data?.statusCode;
          const error2 = response.data?.Error || response.data?.error || response.data?.message || '';
          const status2Str = String(status2 || '').toUpperCase();
          const error2Str = String(error2 || '').toLowerCase();
          
          // Form-encoded başarılı olduysa, onu kullan
          const isFormEncodedSuccess = status2Str === 'OK' || status2 === 200;
          if (!isFormEncodedSuccess && (error2Str === 'user error' || status2Str === 'USER ERROR' || status2Str === 'SYSTEM ERROR')) {
            console.warn('[CepSMS] Form-encoded formatında da hata alındı. GET request formatı deneniyor...');
            
            // 2c) GET request formatını dene (URL parametreleri ile)
            try {
              console.log('[CepSMS] GET request formatı deneniyor...');
              const getParams = new URLSearchParams({
                User: username,
                Pass: password,
                Message: message,
                Numbers: formattedPhone, // Tek numara için string
              });
              
              const getResp = await axios.get<CepSMSResponse>(`${CEPSMS_API_URL}?${getParams.toString()}`, {
                headers: {
                  'Accept': 'application/json',
                },
                httpsAgent: httpsAgent,
                timeout: 30000,
                validateStatus: (status) => status < 500,
              });
              
              console.log('[CepSMS] GET API Yanıtı:', JSON.stringify(getResp.data, null, 2));
              
              const getStatus = getResp.data?.Status || getResp.data?.status || getResp.data?.statusCode;
              const getStatusStr = String(getStatus || '').toUpperCase();
              
              if (getStatusStr === 'OK' || getStatus === 200) {
                console.log('[CepSMS] GET request formatı başarılı!');
                response = getResp;
              }
            } catch (getError: any) {
              console.warn('[CepSMS] GET request formatı başarısız:', getError.message);
            }
            
            // 2d) Username/Password formatını dene (bazı CepSMS API versiyonlarında gerekli)
            try {
              console.log('[CepSMS] Username/Password formatı deneniyor...');
              const altResp = await postJson(altRequestData);
              const altStatus = altResp.data?.Status || altResp.data?.status || altResp.data?.statusCode;
              const altError = altResp.data?.Error || altResp.data?.error || altResp.data?.message || '';
              const altStatusStr = String(altStatus || '').toUpperCase();
              
              if (altStatusStr === 'OK' || altStatus === 200) {
                console.log('[CepSMS] Username/Password formatı başarılı!');
                response = altResp; // Başarılı yanıtı kullan
              } else {
                console.error('[CepSMS] Username/Password formatında da hata:', altError || altStatus);
              }
            } catch (altError: any) {
              console.error('[CepSMS] Username/Password denemesi başarısız:', altError.message);
            }
          }
        } catch (formError: any) {
          console.error('[CepSMS] Form-encoded denemesi başarısız:', formError.message);
          // Form-encoded denemesi başarısız olduysa, önceki JSON yanıtını kullan
        }
      }
    }

    // 3) Eğer geçersiz istek/bad request ise ve From adayımız varsa, From ile tekrar dene
    // ANCAK: "Source address (From) is invalid" hatası alındığında From ile tekrar deneme (From zaten geçersiz)
    const isFromInvalidError = error1Str.includes('source address') || 
                                error1Str.includes('from') && error1Str.includes('invalid') ||
                                status1Str.includes('SOURCE ADDRESS') ||
                                (error1Str.includes('from') && error1Str.includes('geçersiz'));
    
    const shouldRetryWithFrom =
      !!fromCandidate &&
      fromCandidate.toLowerCase() !== 'cepsms' &&
      (status1Str.includes('BAD REQUEST') || status1Str === '400' || error1Str.includes('geçersiz') || error1Str.includes('invalid')) &&
      !isUserErrorAfterFirst && // User Error ise From ile tekrar deneme
      !isFromInvalidError; // From geçersiz hatası alındıysa From ile tekrar deneme

    if (shouldRetryWithFrom) {
      console.warn('[CepSMS] İlk deneme geçersiz istek döndü; From ile tekrar deneniyor:', fromCandidate);
      response = await postJson({ ...baseRequestData, From: fromCandidate });
    } else if (isFromInvalidError) {
      console.warn('[CepSMS] From alanı geçersiz hatası alındı, From olmadan devam ediliyor. From alanı gönderilmeyecek.');
    }

    // API yanıtını kontrol et
    if (!response.data) {
      console.error('[CepSMS] API yanıtı boş:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      return {
        success: false,
        error: 'API yanıtı alınamadı',
      };
    }

    // Status kontrolü - farklı formatlar olabilir
    const status = response.data.Status || response.data.status || response.data.statusCode;
    const messageId = response.data.MessageId || response.data.messageId || response.data.id;
    const error = response.data.Error || response.data.error || response.data.message;

    // Detaylı log: API yanıtı
    console.log('[CepSMS] API Yanıt Detayları:', {
      status,
      statusCode: response.status,
      messageId,
      error,
      fullResponse: JSON.stringify(response.data, null, 2),
      usedAccount: {
        username,
        cepsmsUsername: cepsmsUsername || '(atanmamış)',
        hasPassword: !!password,
      },
    });

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
    
    // "User Error" kontrolü - daha hassas eşleştirme
    // CepSMS API genellikle "User Error" veya "Error: User Error" formatında döner
    const isUserError = errorStr === 'user error' || 
                       errorStr.trim() === 'user error' ||
                       errorStr.includes('user error') ||
                       errorStr.includes('kullanıcı hatası') ||
                       errorStr.includes('invalid user') ||
                       errorStr.includes('authentication failed') ||
                       statusStrUpper === 'USER ERROR' ||
                       statusStrUpper.includes('USER ERROR') ||
                       (status === 401 && (errorStr.includes('user') || errorStr.includes('auth'))) ||
                       (response.status === 401);

    // API yanıtındaki tüm alanları kontrol et
    const responseKeys = Object.keys(response.data || {});
    const hasUserErrorInResponse = responseKeys.some(key => {
      const value = String(response.data[key] || '').toLowerCase();
      return value.includes('user error') || value === 'user error';
    });
    
    if (isUserError || hasUserErrorInResponse) {
      // Hangi hesap kullanıldığını belirt
      console.error('[CepSMS] User Error tespit edildi - Detaylı Bilgi:', {
        cepsmsUsername: cepsmsUsername || '(atanmamış)',
        usedUsername: username,
        hasPassword: !!password,
        passwordLength: password?.length || 0,
        apiUrl: CEPSMS_API_URL,
        apiResponse: {
          Status: status,
          statusCode: response.status,
          Error: error,
          fullResponse: JSON.stringify(response.data, null, 2),
          responseKeys: responseKeys,
        },
        requestData: {
          User: username,
          Pass: password ? '***' : '(boş)',
          Numbers: [formattedPhone],
          Message: message.substring(0, 50) + '...',
        },
      });
      
      if (cepsmsUsername) {
        const account = getAccountByUsername(cepsmsUsername);
        if (account) {
          // Detaylı hata mesajı: kullanılan şifre uzunluğu ve format bilgisi (güvenlik için şifreyi göstermeden)
          errorMessage = `CepSMS API kimlik doğrulama hatası. Kullanıcı hesabı "${cepsmsUsername}" (CepSMS kullanıcı adı: ${account.username}, şifre uzunluğu: ${account.password.length}) ile SMS gönderilemedi. 

Olası nedenler:
1. CepSMS panelinde kullanıcı adı veya şifre yanlış olabilir
2. Hesap aktif olmayabilir veya askıya alınmış olabilir
3. CepSMS API formatı değişmiş olabilir

Çözüm:
- CepSMS panelinden (${account.username}) hesabıyla giriş yaparak şifrenin doğru olduğunu kontrol edin
- Hesabın aktif ve SMS gönderme yetkisi olduğundan emin olun
- Gerekirse CepSMS destek ekibiyle iletişime geçin

API Yanıtı: ${error || status || 'Bilinmeyen'}
API Endpoint: ${CEPSMS_API_URL}`;
        } else {
          errorMessage = `CepSMS API kimlik doğrulama hatası. Kullanıcı hesabı "${cepsmsUsername}" sistemde bulunamadı. 

Mevcut hesaplar: ${getAllAccounts().map(a => a.username).join(', ')}

Çözüm:
- Admin panelinden kullanıcının CepSMS hesabının doğru atandığını kontrol edin
- Kullanıcıya mevcut hesaplardan birini atayın`;
        }
      } else {
        errorMessage = `CepSMS API kimlik doğrulama hatası. Kullanıcıya özel CepSMS hesabı atanmamış ve varsayılan hesap (${CEPSMS_USERNAME}) ile SMS gönderilemedi. 

Çözüm:
1. Admin panelinden kullanıcıya bir CepSMS hesabı atayın
2. VEYA CEPSMS_USERNAME ve CEPSMS_PASSWORD environment variable'larını kontrol edin

Hata: ${error || status || 'Bilinmeyen'}`;
      }
    } else if (!errorMessage) {
      // Özel hata durumları için anlaşılır mesajlar
      if (statusStrUpper.includes('SYSTEM ERROR') || errorStr.includes('system error')) {
        errorMessage = `CepSMS API sistem hatası. CepSMS sunucularında geçici bir sorun olabilir. 
        
Olası nedenler:
1. CepSMS API sunucuları geçici olarak bakımda olabilir
2. API endpoint formatı değişmiş olabilir
3. CepSMS servisinde yüksek trafik olabilir

Çözüm:
- Birkaç dakika sonra tekrar deneyin
- CepSMS panelinden hesabınızın aktif olduğunu kontrol edin
- Sorun devam ederse CepSMS destek ekibiyle iletişime geçin

API Endpoint: ${CEPSMS_API_URL}
Hesap: ${username}${cepsmsUsername ? ` (${cepsmsUsername})` : ''}`;
      } else if (statusStrUpper.includes('PAYMENT') || statusStrUpper.includes('PAYMENT REQUIRED') || statusStrUpper === '402') {
        errorMessage = 'CepSMS hesabında yetersiz bakiye. Lütfen hesabınıza bakiye yükleyin.';
      } else if (statusStrUpper.includes('UNAUTHORIZED') || statusStrUpper === '401') {
        errorMessage = 'CepSMS API kimlik doğrulama hatası. Kullanıcı adı veya şifre hatalı.';
      } else if (statusStrUpper.includes('FORBIDDEN') || statusStrUpper === '403') {
        errorMessage = 'CepSMS API erişim hatası. Hesabınızın SMS gönderme yetkisi yok.';
      } else if (statusStrUpper.includes('INVALID') || statusStrUpper.includes('GEÇERSİZ')) {
        // Daha detaylı hata mesajı - API yanıtındaki hatayı göster
        const apiError = String(error || status || '');
        const apiErrorUpper = apiError.toUpperCase();
        if (apiErrorUpper.includes('SOURCE ADDRESS') || apiErrorUpper.includes('FROM')) {
          // From alanı hatası - API'nin From alanını beklediği veya hesap ayarlarında From tanımlı olmadığı durum
          // Sistem zaten From olmadan gönderiyor, bu yüzden bu hata genellikle hesap ayarlarından kaynaklanır
          errorMessage = `CepSMS API hatası: Hesap ayarlarında gönderen adı (From) tanımlı değil veya geçersiz. Bu hata hesap ayarlarından kaynaklanıyor olabilir. API yanıtı: ${apiError}. Sistem From alanını göndermeden denedi ancak API hata verdi.`;
        } else if (apiErrorUpper.includes('PHONE') || apiErrorUpper.includes('NUMARA')) {
          errorMessage = `Geçersiz telefon numarası formatı. Lütfen 5XX ile başlayan bir mobil numara girin (örn: 905551234567, 05551234567, 5551234567). API Hatası: ${apiError}`;
        } else if (apiErrorUpper.includes('MESSAGE') || apiErrorUpper.includes('MESAJ')) {
          errorMessage = `Geçersiz mesaj formatı. Mesaj boş olamaz ve maksimum 10000 karakter olmalıdır. API Hatası: ${apiError}`;
        } else {
          errorMessage = `Geçersiz istek. Telefon numarası veya mesaj formatı hatalı. API Hatası: ${apiError || 'Bilinmeyen hata'}`;
        }
      } else {
        errorMessage = `CepSMS API hatası: ${error || status || 'Bilinmeyen durum'}`;
      }
    }
    
    // API yanıtını logla
    console.error('[CepSMS] SMS gönderim hatası detayları:', {
      error: errorMessage,
      apiResponse: {
        Status: status,
        Error: error,
        MessageId: messageId,
        fullResponse: JSON.stringify(response.data, null, 2),
      },
      requestInfo: {
        username: username,
        cepsmsUsername: cepsmsUsername || '(atanmamış)',
        apiUrl: CEPSMS_API_URL,
        phone: formattedPhone,
      },
    });
    
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
 * @param messageId Mesaj ID'si
 * @param phoneNumber Telefon numarası (opsiyonel)
 * @param cepsmsUsername CepSMS kullanıcı adı (opsiyonel, yoksa environment variable kullanılır)
 */
export async function checkSMSStatus(messageId: string, phoneNumber?: string, cepsmsUsername?: string): Promise<{
  success: boolean;
  status?: 'gönderildi' | 'iletildi' | 'iletilmedi' | 'rapor_bekliyor' | 'zaman_aşımı';
  network?: string;
  error?: string;
}> {
  try {
    console.log('[CepSMS] Mesaj durumu kontrol ediliyor:', { messageId, phoneNumber });

    // Kullanıcıya özel hesap kullan veya varsayılan environment variable'ları kullan
    let username = CEPSMS_USERNAME;
    let password = CEPSMS_PASSWORD;
    
    if (cepsmsUsername) {
      const account = getAccountByUsername(cepsmsUsername);
      if (account) {
        username = account.username;
        // Tüm kullanıcılar için ortak API şifresi kullanılır
        password = COMMON_API_PASSWORD;
        console.log(`[CepSMS] Kullanıcıya özel hesap kullanılıyor (durum kontrolü): ${username}, ortak API şifresi kullanılıyor`);
      } else {
        console.warn(`[CepSMS] Kullanıcı hesabı bulunamadı: ${cepsmsUsername}, varsayılan hesap kullanılıyor`);
      }
    }

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
      User: username,
      Pass: password,
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
 * @param phones Telefon numaraları dizisi
 * @param message SMS mesajı
 * @param cepsmsUsername CepSMS kullanıcı adı (opsiyonel, yoksa environment variable kullanılır)
 */
export async function sendBulkSMS(phones: string[], message: string, cepsmsUsername?: string): Promise<SendSMSResult[]> {
  const results: SendSMSResult[] = [];
  
  for (const phone of phones) {
    const result = await sendSMS(phone, message, cepsmsUsername);
    results.push(result);
  }
  
  return results;
}

