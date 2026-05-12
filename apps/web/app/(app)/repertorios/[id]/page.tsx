import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { RepertoryView } from '@/components/repertories/RepertoryView';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from('repertories')
    .select('title')
    .eq('id', params.id)
    .single();

  return { title: data?.title ?? 'Repertório' };
}

export default async function RepertoryPage({ params }: Props) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const role = await getCurrentRole(session.user.id);

  const { data: repertory, error } = await supabase
    .from('repertories')
    .select(`
      *,
      creator:users!created_by(id, full_name, avatar_url),
      items:repertory_items(
        *,
        song:songs(
          id, title, author, lyrics, key_note, media_urls, status,
          categories:song_categories(category:liturgical_categories(id, name, slug))
        )
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !repertory) notFound();

  const normalized = {
    ...repertory,
    items: (repertory.items ?? [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((item: any) => ({
        ...item,
        song: item.song
          ? { ...item.song, categories: item.song.categories?.map((sc: any) => sc.category) ?? [] }
          : null,
      })),
  };

  const isOwner = repertory.created_by === session.user.id;

  return (
    <RepertoryView
      repertory={normalized as any}
      role={role}
      isOwner={isOwner}
      userId={session.user.id}
    />
 
  );
}
