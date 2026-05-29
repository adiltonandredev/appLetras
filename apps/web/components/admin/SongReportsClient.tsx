'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Flag, CheckCircle, XCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { timeAgo } from '@rl/utils';
import { clsx } from 'clsx';
import { logAudit } from '@/lib/audit-client';

const REASON_LABELS: Record<string, string> = {
  wrong_lyrics: '🎵 Letra incorreta',
  wrong_info:   '✏️ Informações erradas',
  duplicate:    '🔁 Música duplicada',
  copyright:    '⚠️ Direitos autorais',
  other:        '💬 Outro',
};

interface Report {
  id: string;
  reason: string;
  description: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  song: { id: string; title: string; author: string | null };
  reporter: { full_name: string; email: string };
  resolver: { full_name: string } | null;
}

interface Props {
  reports: Report[];
  currentUserId: string;
}

export function SongReportsClient({ reports: initial, currentUserId }: Props) {
  const supabase = createClient();
  const [reports, setReports] = useState(initial);
  const [filter, setFilter] = useState<'pending' | 'resolved' | 'dismissed' | 'all'>('pending');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);
  const pendingCount = reports.filter(r => r.status === 'pending').length;

  async function handleResolve(report: Report, newStatus: 'resolved' | 'dismissed') {
    setSaving(report.id);
    try {
      const note = adminNote[report.id]?.trim() ?? null;
      const { error } = await supabase
        .from('song_reports')
        .update({
          status: newStatus,
          admin_note: note || null,
          resolved_by: currentUserId,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', report.id);

      if (error) throw error;

      setReports(prev => prev.map(r =>
        r.id === report.id
          ? { ...r, status: newStatus, admin_note: note, resolved_at: new Date().toISOString() }
          : r
      ));
      logAudit({
        action: `report_${newStatus}`,
        entity_type: 'song_report',
        entity_id: report.id,
        new_value: { song_title: report.song.title, status: newStatus },
      });
      setExpanded(null);
      toast.success(newStatus === 'resolved' ? 'Reporte marcado como resolvido.' : 'Reporte descartado.');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSaving(null);
    }
  }

  const statusBadge = (status: string) => {
    if (status === 'pending')   return <span className="badge bg-amber-50 text-amber-700">Pendente</span>;
    if (status === 'resolved')  return <span className="badge bg-green-50 text-green-700">Resolvido</span>;
    if (status === 'dismissed') return <span className="badge bg-gray-100 text-gray-500">Descartado</span>;
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['pending', 'resolved', 'dismissed', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
              filter === f
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            )}
          >
            {f === 'pending' && `Pendentes${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
            {f === 'resolved' && 'Resolvidos'}
            {f === 'dismissed' && 'Descartados'}
            {f === 'all' && 'Todos'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Flag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {filter === 'pending' ? 'Nenhum reporte pendente. 🎉' : 'Nenhum reporte encontrado.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => {
            const isExpanded = expanded === report.id;
            const isPending = report.status === 'pending';

            return (
              <div key={report.id} className={clsx(
                'card overflow-hidden transition-all',
                isPending && 'border-l-4 border-l-amber-400'
              )}>
                {/* Cabeçalho do card */}
                <button
                  className="w-full flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => setExpanded(isExpanded ? null : report.id)}
                >
                  <Flag className={clsx('w-4 h-4 mt-0.5 shrink-0', isPending ? 'text-amber-500' : 'text-gray-300')} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/musicas/${report.song.id}`}
                        target="_blank"
                        onClick={e => e.stopPropagation()}
                        className="text-sm font-semibold text-brand-700 hover:underline flex items-center gap-1"
                      >
                        {report.song.title}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                      {statusBadge(report.status)}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {REASON_LABELS[report.reason] ?? report.reason}
                      {' · '}por {report.reporter.full_name}
                      {' · '}{timeAgo(report.created_at)}
                    </p>
                    <p className="text-sm text-gray-700 mt-1.5 line-clamp-2">{report.description}</p>
                  </div>

                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-1" />}
                </button>

                {/* Expansão */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-gray-50 space-y-4 bg-gray-50/50">
                    {/* Descrição completa */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Descrição completa</p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{report.description}</p>
                    </div>

                    {/* Detalhes */}
                    <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                      <div>
                        <span className="font-semibold">Reportado por:</span>{' '}
                        {report.reporter.full_name} ({report.reporter.email})
                      </div>
                      <div>
                        <span className="font-semibold">Música:</span>{' '}
                        {report.song.title}{report.song.author ? ` — ${report.song.author}` : ''}
                      </div>
                    </div>

                    {/* Nota do admin existente */}
                    {report.admin_note && (
                      <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-sm text-green-800">
                        <span className="font-semibold">Nota admin:</span> {report.admin_note}
                        {report.resolver && (
                          <span className="text-green-600 ml-1">— {report.resolver.full_name}, {timeAgo(report.resolved_at!)}</span>
                        )}
                      </div>
                    )}

                    {/* Ações — apenas para pendentes */}
                    {isPending && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                            Nota (opcional)
                          </label>
                          <textarea
                            rows={2}
                            value={adminNote[report.id] ?? ''}
                            onChange={e => setAdminNote(p => ({ ...p, [report.id]: e.target.value }))}
                            placeholder="Adicione uma nota sobre como foi resolvido..."
                            className="input resize-none text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/musicas/${report.song.id}/editar`}
                            target="_blank"
                            className="btn-secondary text-sm py-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Editar música
                          </Link>
                          <button
                            onClick={() => handleResolve(report, 'resolved')}
                            disabled={saving === report.id}
                            className="btn-primary text-sm py-1.5 bg-green-600 border-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {saving === report.id ? 'Salvando…' : 'Marcar resolvido'}
                          </button>
                          <button
                            onClick={() => handleResolve(report, 'dismissed')}
                            disabled={saving === report.id}
                            className="btn-ghost text-sm py-1.5 text-gray-500"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Descartar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
