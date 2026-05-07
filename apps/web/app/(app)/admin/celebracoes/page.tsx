import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { can } from '@rl/utils';
import { CelebrationTypesAdminClient } from '@/components/admin/CelebrationTypesAdminClient';

export const metadata: Metadata = { title: 'Tipos de Celebração — Admin' };

export default async function AdminCelebrationTypesPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const role = await getCurrentRole(session.user.id);
  if (!can(role, 'categories:create')) redirect('/repertorios');

  const { data: types } = await supabase
    .from('celebration_types')
    .select('*')
    .order('sort_order');

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="page-title">Tipos de Celebração</h1>
        <p className="text-gray-500 text-sm mt-1">
          Gerencie os tipos usados ao criar repertórios (Missa, Adoração, Novena...).
        </p>
      </div>
      <CelebrationTypesAdminClient types={types ?? []} />
    </div>
  );
}
