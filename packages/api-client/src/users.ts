import type { SupabaseClient } from '@supabase/supabase-js';
import type { User, UserFilters, UserRole, PaginatedResponse } from '@rl/types';

export async function getUsers(
  client: SupabaseClient,
  filters: UserFilters = {}
): Promise<PaginatedResponse<User>> {
  const { page = 1, per_page = 20, q, is_active } = filters;
  const from = (page - 1) * per_page;
  const to = from + per_page - 1;

  let query = client
    .from('users')
    .select(`
      *,
      role_assignments:user_role_assignments(
        role:roles(name, label, level)
      )
    `, { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (q) query = query.ilike('full_name', `%${q}%`);
  if (is_active !== undefined) query = query.eq('is_active', is_active);

  const { data, error, count } = await query;
  if (error) throw error;

  const users = (data ?? []).map((u: any) => ({
    ...u,
    role: u.role_assignments?.[0]?.role?.name ?? 'padrao',
  }));

  return {
    data: users,
    count: count ?? 0,
    page,
    per_page,
    total_pages: Math.ceil((count ?? 0) / per_page),
  };
}

export async function getUserById(client: SupabaseClient, id: string): Promise<User> {
  const { data, error } = await client
    .from('users')
    .select(`
      *,
      role_assignments:user_role_assignments(
        role:roles(name, label, level)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return { ...data, role: data.role_assignments?.[0]?.role?.name ?? 'padrao' };
}

export async function updateUser(
  client: SupabaseClient,
  id: string,
  payload: Partial<Pick<User, 'full_name' | 'avatar_url' | 'phone' | 'is_active'>>
): Promise<User> {
  const { data, error } = await client
    .from('users')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUser(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('users').delete().eq('id', id);
  if (error) throw error;
}

export async function promoteUser(
  client: SupabaseClient,
  userId: string,
  newRole: UserRole,
  promotedBy: string
): Promise<void> {
  // Get role ID
  const { data: role, error: roleError } = await client
    .from('roles')
    .select('id')
    .eq('name', newRole)
    .single();
  if (roleError) throw roleError;

  // Remove current role
  await client.from('user_role_assignments').delete().eq('user_id', userId);

  // Assign new role
  const { error } = await client.from('user_role_assignments').insert({
    user_id: userId,
    role_id: role.id,
    assigned_by: promotedBy,
  });
  if (error) throw error;
}

export async function getCurrentUser(client: SupabaseClient): Promise<User | null> {
  const { data: { user: authUser } } = await client.auth.getUser();
  if (!authUser) return null;
  return getUserById(client, authUser.id);
}
