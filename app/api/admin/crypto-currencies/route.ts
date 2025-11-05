import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest, requireAdmin } from '@/lib/middleware/auth';

// GET /api/admin/crypto-currencies - Tüm kripto paralar
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!requireAdmin(auth.user)) {
      return NextResponse.json(
        { success: false, message: 'Admin yetkisi gerekli' },
        { status: 403 }
      );
    }

    const { data: currencies, error } = await supabaseServer
      .from('crypto_currencies')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // Format currencies
    const formattedCurrencies = (currencies || []).map((curr: any) => ({
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
      createdAt: curr.created_at,
      updatedAt: curr.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: { currencies: formattedCurrencies },
    });
  } catch (error: any) {
    console.error('Admin crypto currencies GET error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Kripto para listesi hatası' },
      { status: 500 }
    );
  }
}

// POST /api/admin/crypto-currencies - Yeni kripto para oluştur
export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!requireAdmin(auth.user)) {
      return NextResponse.json(
        { success: false, message: 'Admin yetkisi gerekli' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { symbol, name, decimals, minAmount, networkFee, confirmations, walletAddress, isActive, displayOrder } = body;

    // Validation
    if (!symbol || !name || !decimals || minAmount === undefined || networkFee === undefined || !confirmations) {
      return NextResponse.json(
        { success: false, message: 'Symbol, isim, decimals, minAmount, networkFee ve confirmations gerekli' },
        { status: 400 }
      );
    }

    // Check if symbol exists
    const { data: existing, error: checkError } = await supabaseServer
      .from('crypto_currencies')
      .select('id')
      .eq('symbol', symbol.toUpperCase())
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(checkError.message);
    }

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Bu kripto para sembolü zaten kullanılıyor' },
        { status: 400 }
      );
    }

    // Create currency
    const { data: curr, error: createError } = await supabaseServer
      .from('crypto_currencies')
      .insert({
        symbol: symbol.toUpperCase(),
        name,
        decimals: parseInt(decimals),
        min_amount: parseFloat(minAmount),
        network_fee: parseFloat(networkFee),
        confirmations: parseInt(confirmations),
        wallet_address: walletAddress || null,
        is_active: isActive !== undefined ? isActive : true,
        display_order: displayOrder ? parseInt(displayOrder) : 0,
      })
      .select()
      .single();

    if (createError || !curr) {
      return NextResponse.json(
        { success: false, message: createError?.message || 'Kripto para oluşturulamadı' },
        { status: 500 }
      );
    }

    // Format currency
    const formattedCurrency = {
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
      createdAt: curr.created_at,
      updatedAt: curr.updated_at,
    };

    return NextResponse.json({
      success: true,
      message: 'Kripto para başarıyla oluşturuldu',
      data: { currency: formattedCurrency },
    });
  } catch (error: any) {
    console.error('Admin crypto currencies POST error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Kripto para oluşturma hatası' },
      { status: 500 }
    );
  }
}

