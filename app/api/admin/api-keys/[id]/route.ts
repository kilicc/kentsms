import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// DELETE /api/admin/api-keys/[id] - API key sil
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

    const userRole = (auth.user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator';

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin yetkisi gerekli' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabaseServer = getSupabaseServer();

    const { error } = await supabaseServer
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message || 'API key silinemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key başarıyla silindi',
    });
  } catch (error: any) {
    console.error('API key delete error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'API key silinemedi' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/api-keys/[id] - API key güncelle (aktif/pasif, kredi)
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

    const userRole = (auth.user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'moderator' || userRole === 'administrator';

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin yetkisi gerekli' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { isActive, credit } = body;

    const supabaseServer = getSupabaseServer();

    // API key'i güncelle
    const updateData: any = {};
    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseServer
        .from('api_keys')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        return NextResponse.json(
          { success: false, message: updateError.message || 'API key güncellenemedi' },
          { status: 500 }
        );
      }
    }

    // Kredi güncelle (varsa)
    if (credit !== undefined && credit !== null) {
      const { data: apiKey } = await supabaseServer
        .from('api_keys')
        .select('user_id')
        .eq('id', id)
        .single();

      if (apiKey) {
        await supabaseServer
          .from('users')
          .update({ credit: credit })
          .eq('id', apiKey.user_id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'API key başarıyla güncellendi',
    });
  } catch (error: any) {
    console.error('API key update error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'API key güncellenemedi' },
      { status: 500 }
    );
  }
}

