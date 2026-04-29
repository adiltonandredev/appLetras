import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/permissions';
import { RepertoryForm } from '@/components/repertories/RepertoryForm';

export const metadata: Metadata = { title: 'Novo Repertório' };

export default async function NewRepertoryPage() {
  await requireAuth();

  const supabase = createClient();
  const { data: songs } = await supabase
    .from('songs')
    .select(`
      id, title, author, key_note, bpm,
      categories:song_categories(category:liturgical_categories(id, name, slug))
    `)
    .eq('status', 'approved')
    .order('title');

  const normalizedSongs = (songs ?? []).map((s: any) => ({
    ...s,
    categories: s.categories?.map((sc: any) => sc.category) ?? [],
  }));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Novo Repertório</h1>
        <p className="text-gray-500 text-sm mt-1">
          Monte a sequência de músicas para a sua celebração.
        </p>
      </div>
      <RepertoryForm songs={normalizedSongs} mode="create" />
    </div>
  );
}
