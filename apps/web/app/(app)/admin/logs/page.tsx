import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { can, formatDateTime } from '@rl/utils';
import { LogsFilterSelect } from '@/components/admin/LogsFilterSelect';

export const metadata: Metadata = { title: 'Logs de Auditoria — Admin' };

const ACTION_LABELS: Record<string, string> = {
  // Songs
  song_created:             'Música criada',
  song_updated:             'Música editada',
  song_deleted:             'Música excluída',
  song_status_changed:      'Status da música alterado',
  song_lyrics_deleted:      'Letra da música excluída',
  song_submitted:           'Música enviada para aprovação',
  song_approved:            'Música aprovada',
  song_rejected:            'Música reprovada',
  song_revision_requested:  'Revisão solicitada',
  // Repertories
  repertory_created:        'Repertório criado',
  repertory_updated:        'Repertório editado',
  repertory_deleted:        'Repertório excluído',
  // Groups
  group_created:            'Grupo criado',
  group_deleted:            'Grupo excluído',
  // Users / roles
  role_assigned:            'Perfil atribuído',
  role_changed:             'Perfil alterado',
  role_removed:             'Perfil removido',
  user_deactivated:         'Usuário desativado',
  user_activated:           'Usuário reativado',
  user_deleted:             'Usuário excluído',
  // Groups - members
  member_added:             'Membro adicionado',
  member_removed:           'Membro removido',
  // Categories
  category_created:         'Categoria criada',
  category_updated:         'Categoria editada',
  category_deleted:         'Categoria excluída',
  // Celebration types
  celebration_type_created:     'Tipo de celebração criado',
  celebration_type_updated:     'Tipo de celebração editado',
  celebration_type_deleted:     'Tipo de celebração excluído',
  celebration_type_activated:   'Tipo de celebração ativado',
  celebration_type_deactivated: 'Tipo de celebração desativado',
};

const ACTION_COLORS: Record<string, string> = {
  song_created:             '#10B981',
  song_updated:             '#3B82F6',
  song_deleted:             '#EF4444',
  song_status_changed:      '#3B82F6',
  song_lyrics_deleted:      '#EF4444',
  song_submitted:           '#F59E0B',
  song_approved:            '#10B981',
  song_rejected:            '#EF4444',
  song_revision_requested:  '#F97316',
  repertory_created:        '#10B981',
  repertory_updated:        '#3B82F6',
  repertory_deleted:        '#EF4444',
  group_created:            '#06B6D4',
  group_deleted:            '#EF4444',
  role_assigned:            '#8B5CF6',
  role_changed:             '#8B5CF6',
  role_removed:             '#8B5CF6',
  user_deactivated:         '#EF4444',
  user_activated:           '#10B981',
  user_deleted:             '#EF4444',
  member_added:             '#06B6D4',
  member_removed:           '#F97316',
  category_created:         '#10B981',
  category_updated:         '#3B82F6',
  category_deleted:         '#EF4444',
  celebration_type_created:     '#10B981',
  celebration_type_updated:     '#3B82F6',
  celebration_type_deleted:     '#EF4444',
  celebration_type_activated:   '#10B981',
  celebration_type_deactivated: '#6B7280',
};

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const role = await getCurrentRole(session.user.id);
  if (!can(role, 'admin:audit')) redirect('/musicas');

  // Extrair params de forma segura
  const rawPage   = Array.isArray(searchParams.page)   ? searchParams.page[0]   : searchParams.page;
  const rawAction = Array.isArray(searchParams.action) ? searchParams.action[0] : searchParams.action;

  const page    = Math.max(1, parseInt(rawPage ?? '1'));
  const perPage = 50;
  const from    = (page - 1) * perPage;

  // Diagnóstico de variáveis de ambiente
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Service client bypassa RLS — usuário já foi verificado como admin acima
  const admin = createServiceClient();

  let query = admin
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, old_value, new_value, created_at, user_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1);

  if (rawAction) {
    query = query.eq('action', rawAction);
  }

  const { data: logs, count, error: logsError } = await query;

  // Buscar nomes dos usuários separadamente para evitar erro de join
  const userIds = [...new Set((logs ?? []).map((l: any) => l.user_id).filter(Boolean))];
  let usersMap: Record<string, { full_name: string; email: string }> = {};

  if (userIds.length > 0) {
    const { data: usersData } = await admin
      .from('users')
      .select('id, full_name, email')
      .in('id', userIds);

    usersMap = Object.fromEntries((usersData ?? []).map((u: any) => [u.id, u]));
  }

  const totalPages = Math.ceil((count ?? 0) / perPage);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="page-title">Logs de Auditoria</h1>
        <p className="text-gray-500 text-sm mt-1">
          {count ?? 0} eventos registrados
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <LogsFilterSelect
          value={rawAction ?? ''}
          options={Object.entries(ACTION_LABELS).map(([key, label]) => ({ key, label }))}
        />
      </div>

      {/* Diagnóstico: variável de ambiente ausente */}
      {!hasServiceKey && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-1">
          <p className="font-semibold">⚠️ Variável de ambiente ausente</p>
          <p><code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> não está configurada neste ambiente.</p>
          <p className="text-amber-700">No Vercel: <strong>Settings → Environment Variables</strong> → adicione a chave encontrada em <strong>Supabase → Project Settings → API → service_role</strong>.</p>
        </div>
      )}

      {/* Erro de query */}
      {logsError && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 space-y-1">
          <p className="font-semibold">Erro ao carregar logs</p>
          <p className="font-mono text-xs">{logsError.message}</p>
          {logsError.message?.includes('does not exist') && (
            <p className="text-red-600 mt-2">
              A tabela <code className="bg-red-100 px-1 rounded">audit_logs</code> não foi encontrada.
              Execute o SQL da migration <strong>016_fix_audit_system.sql</strong> no Supabase Dashboard.
            </p>
          )}
        </div>
      )}

      {/* Aviso: 0 logs mas tabela ok */}
      {!logsError && count === 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 space-y-1">
          <p className="font-semibold">ℹ️ Nenhum evento registrado ainda</p>
          <p>Os triggers de auditoria registram ações automaticamente quando usuários criam, editam ou excluem músicas, repertórios e grupos.</p>
          <p className="text-blue-600">Se você já realizou ações e nada aparece, aplique o SQL <strong>016_fix_audit_system.sql</strong> no <strong>Supabase Dashboard → SQL Editor</strong> para instalar os triggers.</p>
        </div>
      )}

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
                const color  = ACTION_COLORS[log.action] ?? '#6B7280';
                const label  = ACTION_LABELS[log.action] ?? log.action;
                const actor  = usersMap[log.user_id];

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
                      <p className="text-sm text-gray-700">{actor?.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{actor?.email ?? ''}</p>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      {(log.new_value || log.old_value) && (
                        <pre className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 max-w-xs overflow-x-auto">
                          {JSON.stringify(log.new_value ?? log.old_value, null, 2)}
                        </pre>
                      )}
                      {log.entity_type && (
                        <p className="text-xs text-gray-400 mt-1">
                          {log.entity_type}
                          {log.entity_id ? ` · ${String(log.entity_id).slice(0, 8)}…` : ''}
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
              href={`?page=${p}${rawAction ? `&action=${rawAction}` : ''}`}
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
