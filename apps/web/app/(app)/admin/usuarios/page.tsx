import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { can } from '@rl/utils';
import { UsersAdminClient } from '@/components/admin/UsersAdminClient';

export const metadata: Metadata = { title: 'Usuários — Admin' };

export default async function AdminUsersPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const role = await getCurrentRole(session.user.id);
  if (!can(role, 'users:view')) redirect('/musicas');

  const admin = createServiceClient();

  // Fonte primária: auth.users (todos sem exceção)
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const authUsers = authData?.users ?? [];

  // Dados complementares de public.users
  const { data: publicUsers } = await admin
    .from('users')
    .select('id, full_name, avatar_url, last_login_at, is_active, created_at');

  // Perfis atribuídos
  const { data: assignments } = await admin
    .from('user_role_assignments')
    .select('user_id, role_id');

  // Roles disponíveis
  const { data: roles } = await admin
    .from('roles')
    .select('id, name, label, level')
    .order('level');

  // Mapa para lookup rápido
  const publicMap = Object.fromEntries((publicUsers ?? []).map((u: any) => [u.id, u]));
  const assignMap = Object.fromEntries((assignments ?? []).map((a: any) => [a.user_id, a.role_id]));
  const roleMap   = Object.fromEntries((roles ?? []).map((r: any) => [r.id, r]));

  // Mescla: auth como base + dados de public.users + role
  const normalized = authUsers.map((au) => {
    const pub = publicMap[au.id];
    const roleId = assignMap[au.id];
    const userRole = roleId ? roleMap[roleId] ?? null : null;

    return {
      id:            au.id,
      email:         au.email ?? '',
      full_name:     pub?.full_name ?? au.user_metadata?.full_name ?? au.email?.split('@')[0] ?? '—',
      avatar_url:    pub?.avatar_url ?? au.user_metadata?.avatar_url ?? null,
      created_at:    au.created_at,
      last_login_at: pub?.last_login_at ?? au.last_sign_in_at ?? null,
      is_active:     pub?.is_active ?? true,
      role:          userRole,
    };
  });

  // Ordena por data de cadastro mais recente
  normalized.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="page-title">Usuários</h1>
        <p className="text-gray-500 text-sm mt-1">
          {normalized.length} usuário{normalized.length !== 1 ? 's' : ''} cadastrado{normalized.length !== 1 ? 's' : ''}
        </p>
      </div>
      <UsersAdminClient
        users={normalized as any}
        roles={(roles ?? []).map((r: any) => ({ ...r, id: String(r.id) }))}
        currentUserId={session.user.id}
        canDelete={can(role, 'users:delete')}
      />
    </div>
  );
}
