import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/sms-templates - Şablon listesi
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: templatesData, error } = await supabaseServer
      .from('sms_templates')
      .select('*')
      .eq('user_id', auth.user.userId)
      .eq('is_active', true)
      .order('usage_count', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Format templates data
    const templates = (templatesData || []).map((template: any) => ({
      id: template.id,
      userId: template.user_id,
      name: template.name,
      content: template.content,
      category: template.category || 'Genel',
      variables: template.variables || [],
      isActive: template.is_active ?? true,
      usageCount: template.usage_count || 0,
      lastUsed: template.last_used,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: { templates },
    });
  } catch (error: any) {
    console.error('SMS templates GET error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Şablon listesi hatası' },
      { status: 500 }
    );
  }
}

// POST /api/sms-templates - Şablon oluşturma
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
    const { name, content, category, variables } = body;

    if (!name || !content) {
      return NextResponse.json(
        { success: false, message: 'Şablon adı ve içeriği gerekli' },
        { status: 400 }
      );
    }

    // Check if template already exists using Supabase
    const { data: existingTemplates, error: checkError } = await supabaseServer
      .from('sms_templates')
      .select('id')
      .eq('user_id', auth.user.userId)
      .eq('name', name)
      .limit(1);

    if (checkError || (existingTemplates && existingTemplates.length > 0)) {
      return NextResponse.json(
        { success: false, message: 'Bu şablon adı zaten kullanılıyor' },
        { status: 400 }
      );
    }

    // Create template using Supabase
    const { data: templateData, error: createError } = await supabaseServer
      .from('sms_templates')
      .insert({
        user_id: auth.user.userId,
        name,
        content,
        category: category || 'Genel',
        variables: variables || [],
      })
      .select()
      .single();

    if (createError || !templateData) {
      return NextResponse.json(
        { success: false, message: createError?.message || 'Şablon oluşturulamadı' },
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
      message: 'Şablon oluşturuldu',
      data: { template },
    });
  } catch (error: any) {
    console.error('SMS template POST error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Şablon oluşturma hatası' },
      { status: 500 }
    );
  }
}

