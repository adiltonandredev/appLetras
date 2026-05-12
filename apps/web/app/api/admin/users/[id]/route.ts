import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { can } from '@rl/utils';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const role = await getCurrentRole(session.user.id);
  if (!can(role, 'users:delete')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  if (params.id === session.user.id) {
    return NextResponse.json(
      { error: 'Você não pode excluir sua própria conta.' },
      { status: 400 }
    );
  }

  const admin = createServiceClient();

  // Deleta dados públicos do usuário (cascade cuida dos relacionamentos)
  const { error: dbError } = await admin
    .from('users')
    .delete()
    .eq('id', params.id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Deleta conta de autenticação
  const { error: authError } = await admin.auth.admin.deleteUser(params.id);
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
