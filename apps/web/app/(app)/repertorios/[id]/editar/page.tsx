import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, getCurrentRole } from '@/lib/auth/permissions';
import { can } from '@rl/utils';
import { RepertoryForm } from '@/components/repertories/RepertoryForm';

export const metadata: Metadata = { title: 'Editar Repertório' };

interface Props { params: { id: string } }

export default async function EditRepertoryPage({ params }: Props) {
  const { user } = await requireAuth();
  const supabase = createClient();
  const role = await getCurrentRole(user.id);

  const [repertoryResult, songsResult, categoriesResult] = await Promise.all([
    supabase
      .from('repertories')
      .select(`
        *,
        items:repertory_items(
          id, position, custom_key, observations,
          song:songs(id, title, author, key_note, media_urls, status,
            categories:song_categories(category:liturgical_categories(id, name, slug)))
        )
      `)
      .eq('id', params.id)
      .single(),
    supabase
      .from('songs')
      .select(`id, title, author, key_note, media_urls,
        categories:song_categories(category:liturgical_categories(id, name, slug, icon))`)
      .eq('status', 'approved')
      .order('title'),
    supabase
      .from('liturgical_categories')
      .select('id, name, slug, icon')
      .order('sort_order'),
  ]);

  if (repertoryResult.error || !repertoryResult.data) notFound();

  // Authorization: only the owner or admin can edit
  const rep = repertoryResult.data;
  if (rep.created_by !== user.id && !can(role, 'repertories:edit:any')) {
    redirect(`/repertorios/${params.id}`);
  }

  const repertory = {
    ...repertoryResult.data,
    items: (repertoryResult.data.items ?? [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((item: any) => ({
        ...item,
        song: item.song
          ? { ...item.song, categories: item.song.categories?.map((sc: any) => sc.category) ?? [] }
          : null,
      })),
  };

  const songs = (songsResult.data ?? []).map((s: any) => ({
    ...s,
    categories: s.categories?.map((sc: any) => sc.category) ?? [],
  }));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Editar Repertório</h1>
        <p className="text-gray-500 text-sm mt-1">Altere as músicas e reordene arrastando.</p>
      </div>
      <RepertoryForm
        songs={songs as any}
        categories={categoriesResult.data ?? []}
        mode="edit"
        repertory={repertory as any}
      />
    </div>
  );
}
