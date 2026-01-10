/**
 * CepSMS Hesapları Veri Seti
 * 
 * Her hesap için:
 * - password: CepSMS şifresi
 * - username: CepSMS kullanıcı adı
 * - phone: Hesap sahibinin telefon numarası
 * - from: SMS gönderiminde kullanılacak gönderen adı (varsayılan: CepSMS)
 */

export interface CepSMSAccount {
  password: string;
  username: string;
  phone: string;
  from?: string;
}

/**
 * CepSMS hesapları listesi
 */
export const CEPSMS_ACCOUNTS: CepSMSAccount[] = [
  {
    password: '123456',
    username: 'bahi1',
    phone: '05483441264',
    from: 'CepSMS',
  },
  {
    password: 'aD4Q|LqhDC)lKJA8',
    username: 'dede1',
    phone: '05489564555',
    from: 'CepSMS',
  },
  {
    password: 'ipskIFOzGasvRu',
    username: 'grand1',
    phone: '05487574254',
    from: 'CepSMS',
  },
  {
    password: 'XwLevfrekrgFiY',
    username: 'venom1',
    phone: '05481108655',
    from: 'CepSMS',
  },
  {
    password: 'Cglw7lUmuUaDeX',
    username: 'asus1',
    phone: '05487781322',
    from: 'CepSMS',
  },
  {
    password: 'rrPgkAUKakCfsx',
    username: 'ramada1',
    phone: '05487212847',
    from: 'CepSMS',
  },
  {
    password: 'Du4eOyUInxlBtq',
    username: 'super1',
    phone: '05489235821',
    from: 'CepSMS',
  },
  {
    password: 'DqDG029BNZDuD6',
    username: 'maxwin1',
    phone: '05489924582',
    from: 'CepSMS',
  },
  {
    password: 'kCC3SiFweiNmdU',
    username: 'royal1',
    phone: '05486642012',
    from: 'CepSMS',
  },
  {
    password: '4hZELt3zfI22P7',
    username: 'pasha1',
    phone: '05482935712',
    from: 'CepSMS',
  },
  {
    password: 'JıX8492cmr',
    username: 'Smsexp',
    phone: '00000000000', // Admin hesabı için telefon gerekli değil
    from: 'CepSMS',
  },
];

/**
 * Kullanıcı adına göre hesap bul (case-insensitive)
 */
export function getAccountByUsername(username: string): CepSMSAccount | undefined {
  if (!username || username.trim() === '') {
    return undefined;
  }
  const normalizedUsername = username.trim().toLowerCase();
  return CEPSMS_ACCOUNTS.find(account => account.username.toLowerCase() === normalizedUsername);
}

/**
 * Telefon numarasına göre hesap bul
 */
export function getAccountByPhone(phone: string): CepSMSAccount | undefined {
  return CEPSMS_ACCOUNTS.find(account => account.phone === phone);
}

/**
 * Tüm hesapları döndür
 */
export function getAllAccounts(): CepSMSAccount[] {
  return CEPSMS_ACCOUNTS;
}

/**
 * Hesap sayısını döndür
 */
export function getAccountCount(): number {
  return CEPSMS_ACCOUNTS.length;
}
