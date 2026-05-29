import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { can } from '@rl/utils';
import { SongsClient } from '@/components/songs/SongsClient';

export const metadata: Metadata = { title: 'Músicas' };

export default async function SongsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const role = await getCurrentRole(user.id);

  const { data: categories } = await supabase
    .from('liturgical_categories')
    .select('*')
    .order('sort_order');

  return (
    <SongsClient
      role={role}
      canCreate={can(role, 'songs:create')}
      canApprove={can(role, 'songs:approve')}
      categories={categories ?? []}
    />
  );
}
