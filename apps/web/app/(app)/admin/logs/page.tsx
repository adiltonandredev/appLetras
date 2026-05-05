import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { can, formatDateTime } from '@rl/utils';

export const metadata: Metadata = { title: 'Logs de Auditoria — Admin' };

const ACTION_LABELS: Record<string, string> = {
  song_created:   'Música criada',
  song_updated:   'Música editada',
  song_deleted:   'Música excluída',
  song_submitted: 'Música enviada para aprovação',
  song_approved:  'Música aprovada',
  song_rejected:  'Música reprovada',
  song_revision:  'Revisão solicitada',
  repertory_created: 'Repertório criado',
  repertory_updated: 'Repertório editado',
  repertory_deleted: 'Repertório excluído',
  user_role_changed: 'Perfil de usuário alterado',
  user_deactivated:  'Usuário desativado',
  user_activated:    'Usuário reativado',
};

const ACTION_COLORS: Record<string, string> = {
  song_created:      '#10B981',
  song_updated:      '#3B82F6',
  song_deleted:      '#EF4444',
  song_submitted:    '#F59E0B',
  song_approved:     '#10B981',
  song_rejected:     '#EF4444',
  song_revision:     '#F97316',
  repertory_created: '#10B981',
  repertory_updated: '#3B82F6',
  repertory_deleted: '#EF4444',
  user_role_changed: '#8B5CF6',
  user_deactivated:  '#EF4444',
  user_activated:    '#10B981',
};

interface SearchParams {
  page?: string;
  action?: string;
  user?: string;
}

export default async function AdminLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const role = await getCurrentRole(session.user.id);
  if (!can(role, 'admin:audit')) redirect('/musicas');

  const page = Math.max(1, parseInt(searchParams.page ?? '1'));
  const perPage = 50;
  const from = (page - 1) * perPage;

  let query = supabase
    .from('audit_logs')
    .select('*, actor:users!user_id(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1);

  if (searchParams.action) {
    query = query.eq('action', searchParams.action);
  }

  const { data: logs, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / perPage);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="page-title">Logs de Auditoria</h1>
        <p className="text-gray-500 text-sm mt-1">
          {count} eventos registrados
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <form>
          <select
            name="action"
            defaultValue={searchParams.action ?? ''}
            onChange={e => {
              const url = new URL(window.location.href);
              url.searchParams.set('action', e.target.value);
              url.searchParams.set('page', '1');
              window.location.href = url.toString();
            }}
            className="input w-auto"
          >
            <option value="">Todas as ações</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </form>
      </div>

      {/* Logs table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ação</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Usuário</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {!logs || logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">
                  Nenhum log encontrado.
                </td>
              </tr>
            ) : (
              logs.map((log: any) => {
                const color = ACTION_COLORS[log.action] ?? '#6B7280';
                const label = ACTION_LABELS[log.action] ?? log.action;

                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="badge text-xs font-medium"
                        style={{ backgroundColor: color + '15', color }}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <p className="text-sm text-gray-700">{log.actor?.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{log.actor?.email ?? ''}</p>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      {(log.new_value || log.old_value) && (
                        <pre className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 max-w-xs overflow-x-auto">
                          {JSON.stringify(log.new_value ?? log.old_value, null, 2)}
                        </pre>
                      )}
                      {log.entity_type && (
                        <p className="text-xs text-gray-400 mt-1">
                          {log.entity_type} {log.entity_id ? `· ${log.entity_id.slice(0, 8)}…` : ''}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <a
              key={p}
              href={`?page=${p}${searchParams.action ? `&action=${searchParams.action}` : ''}`}
              className={`w-8 h-8 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                p === page
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
