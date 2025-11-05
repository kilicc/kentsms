import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest, requireAdmin } from '@/lib/middleware/auth';

// PUT /api/admin/crypto-currencies/:id - Kripto para güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { symbol, name, decimals, minAmount, networkFee, confirmations, walletAddress, isActive, displayOrder } = body;

    // Build update object
    const updateData: any = {};
    if (symbol !== undefined) updateData.symbol = symbol.toUpperCase();
    if (name !== undefined) updateData.name = name;
    if (decimals !== undefined) updateData.decimals = parseInt(decimals);
    if (minAmount !== undefined) updateData.min_amount = parseFloat(minAmount);
    if (networkFee !== undefined) updateData.network_fee = parseFloat(networkFee);
    if (confirmations !== undefined) updateData.confirmations = parseInt(confirmations);
    if (walletAddress !== undefined) updateData.wallet_address = walletAddress || null;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (displayOrder !== undefined) updateData.display_order = parseInt(displayOrder);

    // If symbol is being updated, check for conflicts
    if (symbol) {
      const { data: existing, error: checkError } = await supabaseServer
        .from('crypto_currencies')
        .select('id')
        .eq('symbol', symbol.toUpperCase())
        .neq('id', id)
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
    }

    // Update currency
    const { data: curr, error: updateError } = await supabaseServer
      .from('crypto_currencies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !curr) {
      return NextResponse.json(
        { success: false, message: updateError?.message || 'Kripto para güncellenemedi' },
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
      message: 'Kripto para başarıyla güncellendi',
      data: { currency: formattedCurrency },
    });
  } catch (error: any) {
    console.error('Admin crypto currencies PUT error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Kripto para güncelleme hatası' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/crypto-currencies/:id - Kripto para sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Delete currency
    const { error: deleteError } = await supabaseServer
      .from('crypto_currencies')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, message: deleteError.message || 'Kripto para silinemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kripto para başarıyla silindi',
    });
  } catch (error: any) {
    console.error('Admin crypto currencies DELETE error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Kripto para silme hatası' },
      { status: 500 }
    );
  }
}

