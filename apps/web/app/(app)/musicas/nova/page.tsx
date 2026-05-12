import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireRole, getCurrentRole } from '@/lib/auth/permissions';
import { SongForm } from '@/components/songs/SongForm';

export const metadata: Metadata = { title: 'Nova Música' };

export default async function NewSongPage() {
  await requireRole('intermediario');

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const [categoriesResult, role] = await Promise.all([
    supabase.from('liturgical_categories').select('*').order('sort_order'),
    session ? getCurrentRole(session.user.id) : Promise.resolve('padrao' as const),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Nova Música</h1>
        <p className="text-gray-500 text-sm mt-1">
          Preencha os dados da música.{role !== 'administrador' && ' Ela será enviada para aprovação antes de ficar disponível.'}
        </p>
      </div>
      <SongForm categories={categoriesResult.data ?? []} mode="create" userRole={role} />
    </div>
  );
}
