import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { can } from '@rl/utils';
import { SongReportsClient } from '@/components/admin/SongReportsClient';
import { Flag } from 'lucide-react';

export const metadata: Metadata = { title: 'Reportes — Admin' };

export default async function AdminReportesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const role = await getCurrentRole(user.id);
  if (!can(role, 'users:view')) redirect('/dashboard');

  const { data: reports, error } = await supabase
    .from('song_reports')
    .select(`
      id, reason, description, status, admin_note, created_at, resolved_at,
      song:songs(id, title, author),
      reporter:users!reported_by(full_name, email),
      resolver:users!resolved_by(full_name)
    `)
    .order('created_at', { ascending: false });

  const pendingCount = (reports ?? []).filter((r: any) => r.status === 'pending').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
          <Flag className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500">
            {pendingCount > 0
              ? `${pendingCount} reporte${pendingCount !== 1 ? 's' : ''} pendente${pendingCount !== 1 ? 's' : ''}`
              : 'Nenhum reporte pendente'}
          </p>
        </div>
      </div>

      {error && (
        <div className="card p-4 border-red-200 bg-red-50 text-sm text-red-700">
          Erro ao carregar reportes: {error.message}
        </div>
      )}

      <SongReportsClient
        reports={(reports ?? []) as any}
        currentUserId={user.id}
      />
    </div>
  );
}
