import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { RepertoriesClient } from '@/components/repertories/RepertoriesClient';

export const metadata: Metadata = { title: 'Repertórios' };

export default async function RepertoriesPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  return <RepertoriesClient userId={session.user.id} />;
}
