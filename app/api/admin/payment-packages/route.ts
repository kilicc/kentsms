import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest, requireAdmin } from '@/lib/middleware/auth';

// GET /api/admin/payment-packages - Tüm paketler
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

    const { data: packages, error } = await supabaseServer
      .from('payment_packages')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // Format packages
    const formattedPackages = (packages || []).map((pkg: any) => ({
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
    }));

    return NextResponse.json({
      success: true,
      data: { packages: formattedPackages },
    });
  } catch (error: any) {
    console.error('Admin payment packages GET error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Paket listesi hatası' },
      { status: 500 }
    );
  }
}

// POST /api/admin/payment-packages - Yeni paket oluştur
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
    const { packageId, name, credits, price, currency, bonus, isActive, displayOrder } = body;

    // Validation
    if (!packageId || !name || !credits || !price) {
      return NextResponse.json(
        { success: false, message: 'Paket ID, isim, kredi ve fiyat gerekli' },
        { status: 400 }
      );
    }

    // Check if package ID exists
    const { data: existing, error: checkError } = await supabaseServer
      .from('payment_packages')
      .select('id')
      .eq('package_id', packageId)
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

    // Create package
    const { data: pkg, error: createError } = await supabaseServer
      .from('payment_packages')
      .insert({
        package_id: packageId,
        name,
        credits: parseInt(credits),
        price: parseFloat(price),
        currency: currency || 'TRY',
        bonus: bonus ? parseInt(bonus) : 0,
        is_active: isActive !== undefined ? isActive : true,
        display_order: displayOrder ? parseInt(displayOrder) : 0,
      })
      .select()
      .single();

    if (createError || !pkg) {
      return NextResponse.json(
        { success: false, message: createError?.message || 'Paket oluşturulamadı' },
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
      message: 'Paket başarıyla oluşturuldu',
      data: { package: formattedPackage },
    });
  } catch (error: any) {
    console.error('Admin payment packages POST error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Paket oluşturma hatası' },
      { status: 500 }
    );
  }
}

