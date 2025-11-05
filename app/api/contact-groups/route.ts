import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/contact-groups - Grup listesi
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: groupsData, error } = await supabaseServer
      .from('contact_groups')
      .select('*')
      .eq('user_id', auth.user.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Format groups data
    const groups = (groupsData || []).map((group: any) => ({
      id: group.id,
      userId: group.user_id,
      name: group.name,
      description: group.description,
      color: group.color || '#1976d2',
      icon: group.icon || 'group',
      isDefault: group.is_default ?? false,
      isActive: group.is_active ?? true,
      contactCount: group.contact_count || 0,
      createdAt: group.created_at,
      updatedAt: group.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: { groups },
    });
  } catch (error: any) {
    console.error('Contact groups GET error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Grup listesi hatası' },
      { status: 500 }
    );
  }
}

// POST /api/contact-groups - Grup oluşturma
export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, color, icon } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Grup adı gerekli' },
        { status: 400 }
      );
    }

    // Check if group already exists using Supabase
    const { data: existingGroups, error: checkError } = await supabaseServer
      .from('contact_groups')
      .select('id')
      .eq('user_id', auth.user.userId)
      .eq('name', name)
      .limit(1);

    if (checkError || (existingGroups && existingGroups.length > 0)) {
      return NextResponse.json(
        { success: false, message: 'Bu grup adı zaten kullanılıyor' },
        { status: 400 }
      );
    }

    // Create group using Supabase
    const { data: groupData, error: createError } = await supabaseServer
      .from('contact_groups')
      .insert({
        user_id: auth.user.userId,
        name,
        description: description || null,
        color: color || '#1976d2',
        icon: icon || 'group',
      })
      .select()
      .single();

    if (createError || !groupData) {
      return NextResponse.json(
        { success: false, message: createError?.message || 'Grup oluşturulamadı' },
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
      message: 'Grup oluşturuldu',
      data: { group },
    });
  } catch (error: any) {
    console.error('Contact groups POST error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Grup oluşturma hatası' },
      { status: 500 }
    );
  }
}

