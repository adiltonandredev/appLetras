import type { UserRole } from '@rl/types';
import { can, hasMinRole } from '@rl/utils';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export { can, hasMinRole };

export async function requireAuth() {
  const supabase = createClient();
  // getUser() validates JWT server-side — more secure than getSession() which reads cookies
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return { user: user! };
}

export async function requireRole(minRole: UserRole) {
  const { user } = await requireAuth();
  const supabase = createClient();

  const { data: assignment } = await supabase
    .from('user_role_assignments')
    .select('role:roles(name)')
    .eq('user_id', user.id)
    .single();

  const role = (assignment?.role as any)?.name as UserRole ?? 'padrao';

  if (!hasMinRole(role, minRole)) {
    redirect('/dashboard?error=unauthorized');
  }

  return { session: { user }, role };
}

export async function getCurrentRole(userId: string): Promise<UserRole> {
  const supabase = createClient();
  const { data } = await supabase
    .from('user_role_assignments')
    .select('role:roles(name)')
    .eq('user_id', userId)
    .single();

  return ((data?.role as any)?.name as UserRole) ?? 'padrao';
}
