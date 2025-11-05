import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest, requireAdmin } from '@/lib/middleware/auth';

// PUT /api/admin/payment-packages/:id - Paket güncelle
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
    const { packageId, name, credits, price, currency, bonus, isActive, displayOrder } = body;

    // Build update object
    const updateData: any = {};
    if (packageId !== undefined) updateData.package_id = packageId;
    if (name !== undefined) updateData.name = name;
    if (credits !== undefined) updateData.credits = parseInt(credits);
    if (price !== undefined) updateData.price = parseFloat(price);
    if (currency !== undefined) updateData.currency = currency;
    if (bonus !== undefined) updateData.bonus = parseInt(bonus);
    if (isActive !== undefined) updateData.is_active = isActive;
    if (displayOrder !== undefined) updateData.display_order = parseInt(displayOrder);

    // If packageId is being updated, check for conflicts
    if (packageId) {
      const { data: existing, error: checkError } = await supabaseServer
        .from('payment_packages')
        .select('id')
        .eq('package_id', packageId)
        .neq('id', id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(checkError.message);
      }

      if (existing) {
        return NextResponse.json(
          { success: false, message: 'Bu paket ID zaten kullanılıyor' },
          { status: 400 }
        );
      }
    }

    // Update package
    const { data: pkg, error: updateError } = await supabaseServer
      .from('payment_packages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !pkg) {
      return NextResponse.json(
        { success: false, message: updateError?.message || 'Paket güncellenemedi' },
        { status: 500 }
      );
    }

    // Format package
    const formattedPackage = {
      id: pkg.id,
      packageId: pkg.package_id,
      name: pkg.name,
      credits: pkg.credits,
      price: Number(pkg.price),
      currency: pkg.currency || 'TRY',
      bonus: pkg.bonus || 0,
      isActive: pkg.is_active ?? true,
      displayOrder: pkg.display_order || 0,
      createdAt: pkg.created_at,
      updatedAt: pkg.updated_at,
    };

    return NextResponse.json({
      success: true,
      message: 'Paket başarıyla güncellendi',
      data: { package: formattedPackage },
    });
  } catch (error: any) {
    console.error('Admin payment packages PUT error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Paket güncelleme hatası' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/payment-packages/:id - Paket sil
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

    // Delete package
    const { error: deleteError } = await supabaseServer
      .from('payment_packages')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, message: deleteError.message || 'Paket silinemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Paket başarıyla silindi',
    });
  } catch (error: any) {
    console.error('Admin payment packages DELETE error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Paket silme hatası' },
      { status: 500 }
    );
  }
}

