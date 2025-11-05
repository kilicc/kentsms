import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/contact-groups/:id/contacts - Grup içindeki kişiler
export async function GET(
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
    const { data: groupData, error: groupError } = await supabaseServer
      .from('contact_groups')
      .select('*')
      .eq('id', id)
      .eq('user_id', auth.user.userId)
      .single();

    if (groupError || !groupData) {
      return NextResponse.json(
        { success: false, message: 'Grup bulunamadı' },
        { status: 404 }
      );
    }

    // Get contacts in group using Supabase
    const { data: contactsData, error: contactsError } = await supabaseServer
      .from('contacts')
      .select('*')
      .eq('user_id', auth.user.userId)
      .eq('group_id', id)
      .order('name', { ascending: true });

    if (contactsError) {
      throw new Error(contactsError.message);
    }

    // Format contacts data
    const contacts = (contactsData || []).map((contact: any) => ({
      id: contact.id,
      userId: contact.user_id,
      groupId: contact.group_id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      notes: contact.notes,
      tags: contact.tags || [],
      isActive: contact.is_active ?? true,
      isBlocked: contact.is_blocked ?? false,
      lastContacted: contact.last_contacted,
      contactCount: contact.contact_count || 0,
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
    }));

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
      data: { contacts, group },
    });
  } catch (error: any) {
    console.error('Group contacts GET error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Kişi listesi hatası' },
      { status: 500 }
    );
  }
}

