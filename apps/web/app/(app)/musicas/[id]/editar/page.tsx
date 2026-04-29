import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { can } from '@rl/utils';
import { SongForm } from '@/components/songs/SongForm';

export const metadata: Metadata = { title: 'Editar Música' };

interface Props { params: { id: string } }

export default async function EditSongPage({ params }: Props) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const role = await getCurrentRole(session.user.id);

  const [songResult, categoriesResult] = await Promise.all([
    supabase
      .from('songs')
      .select(`
        *,
        categories:song_categories(category:liturgical_categories(*))
      `)
      .eq('id', params.id)
      .single(),
    supabase
      .from('liturgical_categories')
      .select('*')
      .order('sort_order'),
  ]);

  if (songResult.error || !songResult.data) notFound();

  const song = songResult.data;
  const isOwner = song.created_by === session.user.id;
  const canEdit =
    (isOwner && ['draft', 'revision_requested'].includes(song.status)) ||
    can(role, 'songs:edit:any');

  if (!canEdit) redirect(`/musicas/${params.id}`);

  const normalized = {
    ...song,
    categories: song.categories?.map((sc: any) => sc.category) ?? [],
  };

  const categories = categoriesResult.data ?? [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Editar Música</h1>
        <p className="text-gray-500 text-sm mt-1">
          Atualize as informações da música. Cada alteração cria uma nova versão no histórico.
        </p>
      </div>
      <SongForm
        categories={categories}
        mode="edit"
        song={normalized as any}
        userId={session.user.id}
      />
    </div>
  );
}
