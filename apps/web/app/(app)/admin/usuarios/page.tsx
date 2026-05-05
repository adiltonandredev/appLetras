import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { can } from '@rl/utils';
import { createServiceClient } from '@/lib/supabase/server';
import { UsersAdminClient } from '@/components/admin/UsersAdminClient';

export const metadata: Metadata = { title: 'Usuários — Admin' };

export default async function AdminUsersPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const role = await getCurrentRole(session.user.id);
  if (!can(role, 'users:view')) redirect('/musicas');

  // Use service client to bypass RLS on admin queries
  const adminClient = createServiceClient();

  const { data: users } = await adminClient
    .from('users')
    .select(`
      id, full_name, email, avatar_url, created_at, last_login_at, is_active,
      role_assignments:user_role_assignments(
        role:roles(id, name, level)
      )
    `)
    .order('created_at', { ascending: false });

  const { data: roles } = await adminClient
    .from('roles')
    .select('*')
    .order('level');

  const normalized = (users ?? []).map((u: any) => ({
    ...u,
    role: u.role_assignments?.[0]?.role ?? null,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="page-title">Usuários</h1>
        <p className="text-gray-500 text-sm mt-1">
          {normalized.length} usuários cadastrados
        </p>
      </div>
      <UsersAdminClient
        users={normalized as any}
        roles={roles ?? []}
        currentUserId={session.user.id}
      />
    </div>
  );
}
