import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { GroupDetailClient } from '@/components/grupos/GroupDetailClient';

export const metadata = { title: 'Grupo' };

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: group } = await supabase
    .from('teams')
    .select(`
      *,
      members:team_members(
        user_id, role, joined_at,
        user:users(id, full_name, email, avatar_url)
      )
    `)
    .eq('id', params.id)
    .single();

  if (!group) notFound();

  // Verifica se o usuário é membro ou criador
  const isMember = group.members?.some((m: any) => m.user_id === user.id);
  const isOwner  = group.created_by === user.id;
  if (!isMember && !isOwner) notFound();

  // Repertórios compartilhados com este grupo
  const { data: sharedReps } = await supabase
    .from('shared_repertories')
    .select(`
      id, shared_at, permission,
      repertory:repertories(id, title, celebration, event_date),
      sharer:users!shared_by(full_name)
    `)
    .eq('team_id', params.id)
    .order('shared_at', { ascending: false });

  return (
    <GroupDetailClient
      group={group}
      sharedRepertories={sharedReps ?? []}
      userId={user.id}
      isOwner={isOwner}
    />
  );
}
