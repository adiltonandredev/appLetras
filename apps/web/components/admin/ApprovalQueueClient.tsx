'use client';

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { approveSong, rejectSong, requestRevision } from '@rl/api-client';
import { timeAgo, initials } from '@rl/utils';
import type { SongApproval } from '@rl/types';
import { CheckCircle, XCircle, MessageSquare, ChevronRight, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';

interface ApprovalQueueClientProps {
  initialPending: SongApproval[];
  reviewerId: string;
}

export function ApprovalQueueClient({ initialPending, reviewerId }: ApprovalQueueClientProps) {
  const [items, setItems] = useState<SongApproval[]>(initialPending);
  const [selected, setSelected] = useState<SongApproval | null>(items[0] ?? null);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createClient();

  async function handleAction(action: 'approve' | 'reject' | 'revision', approvalId: string) {
    setActionLoading(action);
    try {
      if (action === 'approve') {
        await approveSong(supabase, approvalId, reviewerId, { comment });
        toast.success('Música aprovada!');
      } else if (action === 'reject') {
        if (!comment.trim()) {
          toast.error('Adicione um comentário explicando a reprovação.');
          return;
        }
        await rejectSong(supabase, approvalId, reviewerId, { comment });
        toast.success('Música reprovada.');
      } else {
        if (!comment.trim()) {
          toast.error('Adicione um comentário com as revisões necessárias.');
          return;
        }
        await requestRevision(supabase, approvalId, reviewerId, { comment });
        toast.success('Revisão solicitada ao autor.');
      }

      // Remove from queue
      setItems(prev => {
        const next = prev.filter(i => i.id !== approvalId);
        setSelected(next[0] ?? null);
        return next;
      });
      setComment('');
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="card p-16 text-center">
        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        <p className="text-gray-700 font-semibold">Tudo em dia!</p>
        <p className="text-gray-400 text-sm mt-1">Nenhuma música aguardando aprovação.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Queue list */}
      <div className="lg:col-span-2 card divide-y divide-gray-50 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {items.length} Pendentes
          </p>
        </div>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelected(item)}
            className={clsx(
              'w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors',
              selected?.id === item.id && 'bg-brand-50 border-l-2 border-brand-600'
            )}
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{(item.song as any)?.title}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                  {initials((item.submitter as any)?.full_name ?? 'U')}
                </div>
                <p className="text-xs text-gray-400">
                  {(item.submitter as any)?.full_name} · {timeAgo(item.submitted_at)}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="lg:col-span-3 space-y-4">
          <div className="card p-5">
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900">{(selected.song as any)?.title}</h2>
              {(selected.song as any)?.key_note && (
                <span className="badge bg-gray-100 text-gray-600">{(selected.song as any).key_note}</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-1">{(selected.song as any)?.author ?? '—'}</p>
            <p className="text-xs text-gray-400 mb-4">
              Enviado por {(selected.submitter as any)?.full_name} · {timeAgo(selected.submitted_at)}
            </p>

            {/* Lyrics */}
            <div className="bg-gray-50 rounded-xl p-4 max-h-72 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {(selected.song as any)?.lyrics}
              </pre>
            </div>
          </div>

          {/* Review actions */}
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm">Decisão do Revisor</h3>

            <div>
              <label className="label">Comentário</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="Opcional para aprovação. Obrigatório para reprovação ou revisão."
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleAction('approve', selected.id)}
                disabled={!!actionLoading}
                className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-500"
              >
                {actionLoading === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Aprovar
              </button>
              <button
                onClick={() => handleAction('revision', selected.id)}
                disabled={!!actionLoading}
                className="btn-secondary flex-1"
              >
                {actionLoading === 'revision' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                Solicitar revisão
              </button>
              <button
                onClick={() => handleAction('reject', selected.id)}
                disabled={!!actionLoading}
                className="btn-danger"
              >
                {actionLoading === 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
