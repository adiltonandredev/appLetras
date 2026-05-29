import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { can } from '@rl/utils';
import { CategoriesAdminClient } from '@/components/admin/CategoriesAdminClient';

export const metadata: Metadata = { title: 'Categorias — Admin' };

export default async function AdminCategoriesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const role = await getCurrentRole(user.id);
  if (!can(role, 'categories:create')) redirect('/musicas');

  const { data: categories } = await supabase
    .from('liturgical_categories')
    .select('*, song_categories(count)')
    .order('sort_order');

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="page-title">Categorias Litúrgicas</h1>
        <p className="text-gray-500 text-sm mt-1">
          Gerencie as categorias usadas para classificar as músicas.
        </p>
      </div>
      <CategoriesAdminClient categories={categories ?? []} />
    </div>
  );
}
