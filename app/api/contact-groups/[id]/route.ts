import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// PUT /api/contact-groups/:id - Grup güncelleme
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

    const { id } = await params;
    const body = await request.json();
    const { name, description, color, icon } = body;

    // Check if group exists and belongs to user using Supabase
    const { data: existingGroup, error: checkError } = await supabaseServer
      .from('contact_groups')
      .select('*')
      .eq('id', id)
      .eq('user_id', auth.user.userId)
      .single();

    if (checkError || !existingGroup) {
      return NextResponse.json(
        { success: false, message: 'Grup bulunamadı' },
        { status: 404 }
      );
    }

    // Update group using Supabase
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color) updateData.color = color;
    if (icon) updateData.icon = icon;

    const { data: groupData, error: updateError } = await supabaseServer
      .from('contact_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !groupData) {
      return NextResponse.json(
        { success: false, message: updateError?.message || 'Grup güncellenemedi' },
        { status: 500 }
      );
    }

    // Format group data
    const group = {
      id: groupData.id,
      userId: groupData.user_id,
      name: groupData.name,
      description: groupData.description,
      color: groupData.color || '#1976d2',
      icon: groupData.icon || 'group',
      isDefault: groupData.is_default ?? false,
      isActive: groupData.is_active ?? true,
      contactCount: groupData.contact_count || 0,
      createdAt: groupData.created_at,
      updatedAt: groupData.updated_at,
    };

    return NextResponse.json({
      success: true,
      message: 'Grup güncellendi',
      data: { group },
    });
  } catch (error: any) {
    console.error('Contact group PUT error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Grup güncelleme hatası' },
      { status: 500 }
    );
  }
}

// DELETE /api/contact-groups/:id - Grup silme
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

    const { id } = await params;

    // Check if group exists and belongs to user using Supabase
    const { data: group, error: checkError } = await supabaseServer
      .from('contact_groups')
      .select('id')
      .eq('id', id)
      .eq('user_id', auth.user.userId)
      .single();

    if (checkError || !group) {
      return NextResponse.json(
        { success: false, message: 'Grup bulunamadı' },
        { status: 404 }
      );
    }

    // Delete group using Supabase (contacts will have group_id set to null due to onDelete: SetNull)
    const { error: deleteError } = await supabaseServer
      .from('contact_groups')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, message: deleteError.message || 'Grup silinemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Grup silindi',
    });
  } catch (error: any) {
    console.error('Contact group DELETE error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Grup silme hatası' },
      { status: 500 }
    );
  }
}

