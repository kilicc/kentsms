import { getSupabaseServer } from '@/lib/supabase-server';

const SYSTEM_CREDIT_KEY = 'system_credit';

/**
 * Sistem kredisini al
 */
export async function getSystemCredit(): Promise<number> {
  const supabase = getSupabaseServer();
  
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', SYSTEM_CREDIT_KEY)
    .single();

  if (error || !data) {
    console.error('[SystemCredit] Sistem kredisi alınamadı:', error?.message);
    return 0;
  }

  return parseInt(data.value, 10) || 0;
}

/**
 * Sistem kredisini güncelle
 */
export async function updateSystemCredit(newCredit: number): Promise<boolean> {
  const supabase = getSupabaseServer();
  
  const { error } = await supabase
    .from('system_settings')
    .upsert({
      key: SYSTEM_CREDIT_KEY,
      value: String(Math.max(0, newCredit)),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'key',
    });

  if (error) {
    console.error('[SystemCredit] Sistem kredisi güncellenemedi:', error.message);
    return false;
  }

  return true;
}

/**
 * Sistem kredisinden düş (atomic operation)
 */
export async function deductSystemCredit(amount: number): Promise<{ success: boolean; remainingCredit: number; error?: string }> {
  const supabase = getSupabaseServer();
  
  // Önce mevcut krediyi al
  const currentCredit = await getSystemCredit();
  
  if (currentCredit < amount) {
    return {
      success: false,
      remainingCredit: currentCredit,
      error: `Yetersiz sistem kredisi. Gerekli: ${amount}, Mevcut: ${currentCredit}`,
    };
  }

  // Krediyi düş
  const newCredit = currentCredit - amount;
  const success = await updateSystemCredit(newCredit);

  if (!success) {
    return {
      success: false,
      remainingCredit: currentCredit,
      error: 'Sistem kredisi güncellenemedi',
    };
  }

  return {
    success: true,
    remainingCredit: newCredit,
  };
}

/**
 * Sistem kredisini artır
 */
export async function addSystemCredit(amount: number): Promise<boolean> {
  const currentCredit = await getSystemCredit();
  const newCredit = currentCredit + amount;
  return await updateSystemCredit(newCredit);
}

