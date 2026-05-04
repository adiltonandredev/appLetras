'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { submitSongForReview } from '@rl/api-client';
import { SONG_STATUS_LABELS, SONG_STATUS_COLORS, ROLE_LABELS, can, formatDateTime, timeAgo } from '@rl/utils';
import type { Song, UserRole, SongApproval } from '@rl/types';
import {
  ArrowLeft, Edit2, Send, Archive, Clock, User, Tag,
  Music, ChordDiagram, CheckCircle, XCircle, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { LyricsRenderer } from './LyricsRenderer';

interface SongDetailProps {
  song: Song & { creator: any };
  role: UserRole;
  currentUserId: string;
  latestApproval?: SongApproval | null;
}

export function SongDetail({ song, role, currentUserId, latestApproval }: SongDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<'lyrics' | 'chords'>('lyrics');
  const [submitting, setSubmitting] = useState(false);

  const isOwner = song.created_by === currentUserId;
  const canEdit = (isOwner && ['draft', 'revision_requested'].includes(song.status)) || can(role, 'songs:edit:any');
  const canSubmit = isOwner && ['draft', 'revision_requested'].includes(song.status);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitSongForReview(supabase, song.id, currentUserId);
      toast.success('Música enviada para aprovação!');
      router.refresh();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const statusColor = SONG_STATUS_COLORS[song.status];
  const statusLabel = SONG_STATUS_LABELS[song.status];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link href="/musicas" className="btn-ghost -ml-2">
          <ArrowLeft className="w-4 h-4" /> Músicas
        </Link>
        <div className="flex items-center gap-2">
          {canSubmit && (
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
              <Send className="w-4 h-4" />
              {submitting ? 'Enviando...' : 'Enviar para aprovação'}
            </button>
          )}
          {canEdit && (
            <Link href={`/musicas/${song.id}/editar`} className="btn-secondary">
              <Edit2 className="w-4 h-4" /> Editar
            </Link>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{song.title}</h1>
              <span
                className="badge"
                style={{ backgroundColor: statusColor + '20', color: statusColor }}
              >
                {statusLabel}
              </span>
            </div>
            {song.subtitle && (
              <p className="text-gray-500 text-sm">{song.subtitle}</p>
            )}
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          {song.author && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Autor</p>
              <p className="text-sm font-medium text-gray-700">{song.author}</p>
            </div>
          )}
          {song.composer && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Compositor</p>
              <p className="text-sm font-medium text-gray-700">{song.composer}</p>
            </div>
          )}
          {song.key_note && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Tom</p>
              <p className="text-sm font-bold text-brand-700 font-mono">{song.key_note}</p>
            </div>
          )}
          {song.bpm && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">BPM</p>
              <p className="text-sm font-medium text-gray-700">{song.bpm}</p>
            </div>
          )}
        </div>

        {/* Categories */}
        {song.categories && song.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {song.categories.map((cat: any) => (
              <span key={cat.id} className="badge bg-indigo-50 text-indigo-700">
                {cat.name}
              </span>
            ))}
          </div>
        )}

        {/* Tags */}
        {song.tags && song.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {song.tags.map((tag: string) => (
              <span key={tag} className="badge bg-gray-100 text-gray-500">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Approval status (if not approved) */}
      {song.status !== 'approved' && latestApproval && (
        <div className={clsx(
          'card p-4 border-l-4',
          song.status === 'pending' && 'border-l-amber-400 bg-amber-50',
          song.status === 'rejected' && 'border-l-red-400 bg-red-50',
          song.status === 'revision_requested' && 'border-l-orange-400 bg-orange-50',
        )}>
          <div className="flex items-start gap-3">
            {song.status === 'pending' && <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
            {song.status === 'rejected' && <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
            {song.status === 'revision_requested' && <MessageSquare className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />}
            <div>
              <p className="font-semibold text-gray-900 text-sm">{statusLabel}</p>
              {latestApproval.comment && (
                <p className="text-sm text-gray-600 mt-1">{latestApproval.comment}</p>
              )}
              {latestApproval.reviewed_at && (
                <p className="text-xs text-gray-400 mt-1">
                  por {(latestApproval.reviewer as any)?.full_name} · {timeAgo(latestApproval.reviewed_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lyrics / Chords */}
      <div className="card overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-2 pt-2 gap-1">
          {(['lyrics', 'chords'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors',
                tab === t
                  ? 'bg-white text-brand-700 border-b-2 border-brand-600'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t === 'lyrics' ? '🎵 Letra' : '🎸 Cifra'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'lyrics' ? (
            <LyricsRenderer lyrics={song.lyrics} />
          ) : song.chords ? (
            <pre className="text-gray-700 whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {song.chords}
            </pre>
          ) : (
            <p className="text-gray-400 text-sm">Cifra não cadastrada para esta música.</p>
          )}
        </div>
      </div>

      {/* Observations */}
      {song.observations && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Observações
          </h3>
          <p className="text-gray-700 text-sm leading-relaxed">{song.observations}</p>
        </div>
      )}

      {/* Meta footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pb-4">
        <span>
          Cadastrada por{' '}
          <span className="font-medium text-gray-600">{song.creator?.full_name ?? '—'}</span>
          {' · '}{timeAgo(song.created_at)}
        </span>
        <Link href={`/musicas/${song.id}/historico`} className="text-brand-600 hover:underline font-medium">
          Ver histórico de revisões →
        </Link>
      </div>
    </div>
  );
}
