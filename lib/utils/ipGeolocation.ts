/**
 * IP adresinden coğrafi bilgi almak için utility fonksiyonları
 */

interface IPGeolocationData {
  country: string | null;
  city: string | null;
  region: string | null;
  timezone: string | null;
  isp: string | null;
  org: string | null;
  as: string | null;
  lat: number | null;
  lon: number | null;
}

/**
 * IP adresinden coğrafi bilgi al (ip-api.com - ücretsiz, rate limit: 45 req/min)
 */
export async function getIPGeolocation(ip: string): Promise<IPGeolocationData> {
  // Localhost veya geçersiz IP'ler için null döndür
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return {
      country: null,
      city: null,
      region: null,
      timezone: null,
      isp: null,
      org: null,
      as: null,
      lat: null,
      lon: null,
    };
  }

  try {
    // ip-api.com - ücretsiz, JSON formatında
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,timezone,isp,org,as,lat,lon`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`IP geolocation API error for ${ip}:`, response.status);
      return {
        country: null,
        city: null,
        region: null,
        timezone: null,
        isp: null,
        org: null,
        as: null,
        lat: null,
        lon: null,
      };
    }

    const data = await response.json();

    if (data.status === 'fail') {
      console.warn(`IP geolocation failed for ${ip}:`, data.message);
      return {
        country: null,
        city: null,
        region: null,
        timezone: null,
        isp: null,
        org: null,
        as: null,
        lat: null,
        lon: null,
      };
    }

    return {
      country: data.country || null,
      city: data.city || null,
      region: data.regionName || null,
      timezone: data.timezone || null,
      isp: data.isp || null,
      org: data.org || null,
      as: data.as || null,
      lat: data.lat || null,
      lon: data.lon || null,
    };
  } catch (error: any) {
    console.error(`IP geolocation error for ${ip}:`, error);
    return {
      country: null,
      city: null,
      region: null,
      timezone: null,
      isp: null,
      org: null,
      as: null,
      lat: null,
      lon: null,
    };
  }
}

