import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { timeAgo } from '@rl/utils';

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase.from('songs').select('title').eq('id', params.id).single();
  return { title: `Histórico — ${data?.title ?? 'Música'}` };
}

export default async function SongHistoryPage({ params }: Props) {
  const supabase = createClient();

  const [songResult, revisionsResult, approvalsResult] = await Promise.all([
    supabase.from('songs').select('id, title, status').eq('id', params.id).single(),
    supabase
      .from('song_revisions')
      .select('*, author:users!changed_by(id, full_name, avatar_url)')
      .eq('song_id', params.id)
      .order('version', { ascending: false }),
    supabase
      .from('song_approvals')
      .select('*, submitter:users!submitted_by(id, full_name), reviewer:users!reviewed_by(id, full_name)')
      .eq('song_id', params.id)
      .order('submitted_at', { ascending: false }),
  ]);

  if (songResult.error || !songResult.data) notFound();

  const song = songResult.data;
  const revisions = revisionsResult.data ?? [];
  const approvals = approvalsResult.data ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-4">
        <Link href={`/musicas/${song.id}`} className="btn-ghost -ml-2">
          <ArrowLeft className="w-4 h-4" /> {song.title}
        </Link>
      </div>

      <div>
        <h1 className="page-title">Histórico de Revisões</h1>
        <p className="text-gray-500 text-sm mt-1">
          {revisions.length} versões · {approvals.length} avaliações
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revisions */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Versões da Letra</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {revisions.length === 0 && (
              <p className="p-8 text-center text-sm text-gray-400">Sem histórico ainda.</p>
            )}
            {revisions.map((rev: any) => (
              <div key={rev.id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="badge bg-brand-50 text-brand-700 font-mono">
                    v{rev.version}
                  </span>
                  <span className="text-xs text-gray-400">{timeAgo(rev.created_at)}</span>
                </div>
                <p className="text-sm font-medium text-gray-700">
                  {rev.author?.full_name ?? '—'}
                </p>
                {rev.change_note && (
                  <p className="text-xs text-gray-400 mt-0.5">{rev.change_note}</p>
                )}
                {rev.lyrics && (
                  <details className="mt-2">
                    <summary className="text-xs text-brand-600 cursor-pointer font-medium">
                      Ver conteúdo desta versão
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto font-sans">
                      {rev.lyrics}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Approvals */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Histórico de Aprovação</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {approvals.length === 0 && (
              <p className="p-8 text-center text-sm text-gray-400">Nenhuma avaliação ainda.</p>
            )}
            {approvals.map((ap: any) => {
              const statusMap: Record<string, { label: string; color: string; icon: string }> = {
                approved:           { label: 'Aprovada',           color: '#10B981', icon: '✅' },
                rejected:           { label: 'Reprovada',          color: '#EF4444', icon: '❌' },
                revision_requested: { label: 'Revisão solicitada', color: '#F97316', icon: '📝' },
                pending:            { label: 'Pendente',           color: '#F59E0B', icon: '⏳' },
              };
              const s = statusMap[ap.status] ?? { label: ap.status, color: '#6B7280', icon: '•' };

              return (
                <div key={ap.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: s.color }}>
                      {s.icon} {s.label}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(ap.submitted_at)}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Enviado por <span className="font-medium">{ap.submitter?.full_name ?? '—'}</span>
                    {ap.reviewer && (
                      <> · Revisado por <span className="font-medium">{ap.reviewer?.full_name}</span></>
                    )}
                  </p>
                  {ap.comment && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-2">
                      "{ap.comment}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
