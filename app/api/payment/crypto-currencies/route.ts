import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { CRYPTO_CURRENCIES } from '@/lib/utils/cryptoPayment';

// GET /api/payment/crypto-currencies - Desteklenen kripto paralar
export async function GET() {
  try {
    // Önce veritabanından aktif kripto paraları dene
    const { data: dbCurrencies, error } = await supabaseServer
      .from('crypto_currencies')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('DB currencies error, falling back to static:', error);
      // Hata durumunda statik verilere geri dön
      const currencies = Object.values(CRYPTO_CURRENCIES);
      return NextResponse.json({
        success: true,
        data: { currencies },
      });
    }

    // Eğer veritabanında kripto para yoksa statik verileri kullan
    if (!dbCurrencies || dbCurrencies.length === 0) {
      const currencies = Object.values(CRYPTO_CURRENCIES);
      return NextResponse.json({
        success: true,
        data: { currencies },
      });
    }

    // Veritabanı kripto paralarını formatla
    const formattedCurrencies = dbCurrencies.map((curr: any) => ({
      id: curr.id,
      symbol: curr.symbol,
      name: curr.name,
      decimals: curr.decimals,
      minAmount: Number(curr.min_amount),
      networkFee: Number(curr.network_fee),
      confirmations: curr.confirmations,
      walletAddress: curr.wallet_address,
      isActive: curr.is_active ?? true,
      displayOrder: curr.display_order || 0,
    }));

    return NextResponse.json({
      success: true,
      data: { currencies: formattedCurrencies },
    });
  } catch (error: any) {
    console.error('Crypto currencies error:', error);
    // Hata durumunda statik verileri kullan
    const currencies = Object.values(CRYPTO_CURRENCIES);
    return NextResponse.json({
      success: true,
      data: { currencies },
    });
  }
}
