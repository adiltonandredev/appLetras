import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { RepertoriesClient } from '@/components/repertories/RepertoriesClient';

export const metadata: Metadata = { title: 'Repertórios' };

export default async function RepertoriesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const role = await getCurrentRole(user.id);

  return <RepertoriesClient userId={user.id} role={role} />;
}
