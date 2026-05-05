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

  // Service client bypasses RLS
  const admin = createServiceClient();

  // Query 1: all users
  const { data: users, error: usersError } = await admin
    .from('users')
    .select('id, full_name, email, avatar_url, created_at, last_login_at, is_active')
    .order('created_at', { ascending: false });

  // Query 2: all role assignments
  const { data: assignments } = await admin
    .from('user_role_assignments')
    .select('user_id, role_id');

  // Query 3: all roles
  const { data: roles } = await admin
    .from('roles')
    .select('id, name, label, level')
    .order('level');

  // Merge: attach role to each user
  const normalized = (users ?? []).map((u: any) => {
    const assignment = (assignments ?? []).find((a: any) => a.user_id === u.id);
    const userRole = assignment
      ? (roles ?? []).find((r: any) => r.id === assignment.role_id) ?? null
      : null;
    return { ...u, role: userRole };
  });

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
      />
    </div>
  );
}
