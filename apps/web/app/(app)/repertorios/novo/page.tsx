import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/permissions';
import { RepertoryForm } from '@/components/repertories/RepertoryForm';

export const metadata: Metadata = { title: 'Novo Repertório' };

export default async function NewRepertoryPage() {
  await requireAuth();

  const supabase = createClient();
  const [songsResult, categoriesResult] = await Promise.all([
    supabase
      .from('songs')
      .select(`
        id, title, author, key_note, media_urls,
        categories:song_categories(category:liturgical_categories(id, name, slug, icon))
      `)
      .eq('status', 'approved')
      .order('title'),
    supabase
      .from('liturgical_categories')
      .select('id, name, slug, icon')
      .order('sort_order'),
  ]);

  const normalizedSongs = (songsResult.data ?? []).map((s: any) => ({
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
      <RepertoryForm
        songs={normalizedSongs}
        categories={categoriesResult.data ?? []}
        mode="create"
      />
    </div>
 