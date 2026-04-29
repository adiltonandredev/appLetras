import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { SongDetail } from '@/components/songs/SongDetail';

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase.from('songs').select('title').eq('id', params.id).single();
  return { title: data?.title ?? 'Música' };
}

export default async function SongPage({ params }: Props) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const role = await getCurrentRole(session.user.id);

  const { data: song, error } = await supabase
    .from('songs')
    .select(`
      *,
      creator:users!created_by(id, full_name, avatar_url),
      categories:song_categories(category:liturgical_categories(*))
    `)
    .eq('id', params.id)
    .single();

  if (error || !song) notFound();

  const normalized = {
    ...song,
    categories: song.categories?.map((sc: any) => sc.category) ?? [],
  };

  // Latest approval
  const { data: approval } = await supabase
    .from('song_approvals')
    .select('*, reviewer:users!reviewed_by(id, full_name)')
    .eq('song_id', params.id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <SongDetail
      song={normalized as any}
      role={role}
      currentUserId={session.user.id}
      latestApproval={approval as any}
    />
  );
}
