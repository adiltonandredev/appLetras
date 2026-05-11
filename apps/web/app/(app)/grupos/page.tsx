import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GruposClient } from '@/components/grupos/GruposClient';

export const metadata = { title: 'Grupos' };

export default async function GruposPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // Grupos criados pelo usuário
  const { data: myGroups } = await supabase
    .from('teams')
    .select('*, members:team_members(count)')
    .eq('created_by', session.user.id)
    .order('created_at', { ascending: false });

  // Grupos onde o usuário é membro (mas não criador)
  const { data: memberOf } = await supabase
    .from('team_members')
    .select('team:teams(*, members:team_members(count))')
    .eq('user_id', session.user.id)
    .neq('teams.created_by', session.user.id);

  const memberGroups = (memberOf ?? [])
    .map((m: any) => m.team)
    .filter(Boolean)
    .filter((t: any) => t.created_by !== session.user.id);

  return (
    <GruposClient
      myGroups={myGroups ?? []}
      memberGroups={memberGroups}
      userId={session.user.id}
    />
  );
}
