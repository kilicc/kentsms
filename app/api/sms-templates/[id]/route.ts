import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// PUT /api/sms-templates/:id - Şablon güncelleme
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
    const { name, content, category, variables, isActive } = body;

    // Check if template exists and belongs to user using Supabase
    const { data: existingTemplate, error: checkError } = await supabaseServer
      .from('sms_templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', auth.user.userId)
      .single();

    if (checkError || !existingTemplate) {
      return NextResponse.json(
        { success: false, message: 'Şablon bulunamadı' },
        { status: 404 }
      );
    }

    // Update template using Supabase
    const updateData: any = {};
    if (name) updateData.name = name;
    if (content) updateData.content = content;
    if (category) updateData.category = category;
    if (variables) updateData.variables = variables;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: templateData, error: updateError } = await supabaseServer
      .from('sms_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !templateData) {
      return NextResponse.json(
        { success: false, message: updateError?.message || 'Şablon güncellenemedi' },
        { status: 500 }
      );
    }

    // Format template data
    const template = {
      id: templateData.id,
      userId: templateData.user_id,
      name: templateData.name,
      content: templateData.content,
      category: templateData.category || 'Genel',
      variables: templateData.variables || [],
      isActive: templateData.is_active ?? true,
      usageCount: templateData.usage_count || 0,
      lastUsed: templateData.last_used,
      createdAt: templateData.created_at,
      updatedAt: templateData.updated_at,
    };

    return NextResponse.json({
      success: true,
      message: 'Şablon güncellendi',
      data: { template },
    });
  } catch (error: any) {
    console.error('SMS template PUT error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Şablon güncelleme hatası' },
      { status: 500 }
    );
  }
}

// DELETE /api/sms-templates/:id - Şablon silme
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

    // Check if template exists and belongs to user using Supabase
    const { data: template, error: checkError } = await supabaseServer
      .from('sms_templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', auth.user.userId)
      .single();

    if (checkError || !template) {
      return NextResponse.json(
        { success: false, message: 'Şablon bulunamadı' },
        { status: 404 }
      );
    }

    // Delete template using Supabase
    const { error: deleteError } = await supabaseServer
      .from('sms_templates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, message: deleteError.message || 'Şablon silinemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Şablon silindi',
    });
  } catch (error: any) {
    console.error('SMS template DELETE error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Şablon silme hatası' },
      { status: 500 }
    );
  }
}

