import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { PAYMENT_PACKAGES } from '@/lib/utils/cryptoPayment';

// GET /api/payment/packages - Kredi paketleri
export async function GET() {
  try {
    // Önce veritabanından aktif paketleri dene
    const { data: dbPackages, error } = await supabaseServer
      .from('payment_packages')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('DB packages error, falling back to static:', error);
      // Hata durumunda statik verilere geri dön
      return NextResponse.json({
        success: true,
        data: { packages: PAYMENT_PACKAGES },
      });
    }

    // Eğer veritabanında paket yoksa statik verileri kullan
    if (!dbPackages || dbPackages.length === 0) {
      return NextResponse.json({
        success: true,
        data: { packages: PAYMENT_PACKAGES },
      });
    }

    // Veritabanı paketlerini formatla
    const formattedPackages = dbPackages.map((pkg: any) => ({
      id: pkg.id,
      packageId: pkg.package_id,
      name: pkg.name,
      credits: pkg.credits,
      price: Number(pkg.price),
      currency: pkg.currency || 'TRY',
      bonus: pkg.bonus || 0,
      isActive: pkg.is_active ?? true,
      displayOrder: pkg.display_order || 0,
    }));

    return NextResponse.json({
      success: true,
      data: { packages: formattedPackages },
    });
  } catch (error: any) {
    console.error('Payment packages error:', error);
    // Hata durumunda statik verileri kullan
    return NextResponse.json({
      success: true,
      data: { packages: PAYMENT_PACKAGES },
    });
  }
}
