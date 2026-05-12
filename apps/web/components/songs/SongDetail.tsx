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
  Music, ChordDiagram, CheckCircle, XCircle, MessageSquare, Link2,
} from 'lucide-react';

function PlatformIcon({ url }: { url: string }) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#FF0000">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/>
      </svg>
    );
  }
  if (url.includes('spotify.com')) {
    return (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#1DB954">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    );
  }
  if (url.includes('soundcloud.com')) {
    return (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#FF5500">
        <path d="M1.175 12.225c-.015 0-.03.008-.03.025l-.325 2.138.325 2.1c0 .017.015.025.03.025.016 0 .03-.008.03-.025l.368-2.1-.368-2.138c0-.017-.014-.025-.03-.025zm1.016-.302c-.02 0-.033.012-.033.03l-.28 2.41.28 2.364c0 .018.013.03.033.03.018 0 .032-.012.032-.03l.32-2.364-.32-2.41c0-.018-.014-.03-.032-.03zm1.025-.145c-.024 0-.04.016-.04.04l-.233 2.555.233 2.493c0 .024.016.04.04.04s.04-.016.04-.04l.265-2.493-.265-2.555c0-.024-.016-.04-.04-.04zm1.03-.1c-.028 0-.047.02-.047.047l-.19 2.655.19 2.584c0 .028.02.048.047.048s.047-.02.047-.048l.215-2.584-.215-2.655c0-.028-.02-.047-.047-.047zm1.032-.06c-.032 0-.054.022-.054.054l-.148 2.715.148 2.668c0 .032.022.054.054.054s.054-.022.054-.054l.168-2.668-.168-2.715c0-.032-.022-.054-.054-.054zm1.034-.025c-.036 0-.06.024-.06.06l-.106 2.74.106 2.74c0 .036.024.06.06.06s.06-.024.06-.06l.12-2.74-.12-2.74c0-.036-.024-.06-.06-.06zm5.99 1.39c-.228 0-.448.033-.657.093-.136-3.136-2.705-5.634-5.875-5.634-.803 0-1.568.163-2.263.457-.262.108-.332.22-.336.32v10.808c.004.103.083.19.19.2h8.94c.104 0 .19-.086.19-.19l.002-.048V13.37c0-.104-.086-.19-.19-.19z"/>
      </svg>
    );
  }
  if (url.includes('deezer.com')) {
    return (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#A238FF">
        <path d="M18.944 16.08H24v1.68h-5.056v-1.68zm0-2.96H24v1.68h-5.056v-1.68zm0-2.92H24v1.68h-5.056V10.2zm0-2.96H24v1.68h-5.056V7.24zM12.838 16.08h5.057v1.68h-5.057v-1.68zm0-2.96h5.057v1.68h-5.057v-1.68zm0-2.92h5.057v1.68h-5.057V10.2zM6.733 16.08h5.056v1.68H6.733v-1.68zm0-2.96h5.056v1.68H6.733v-1.68zM.627 16.08h5.056v1.68H.627v-1.68z"/>
      </svg>
    );
  }
  return <Link2 className="w-5 h-5 text-gray-400" />;
}
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
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Músicas</span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {canSubmit && (
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary px-2.5 py-2 sm:px-3" title="Enviar para aprovação">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">{submitting ? 'Enviando...' : 'Enviar para aprovação'}</span>
            </button>
          )}
          {canEdit && (
            <Link href={`/musicas/${song.id}/editar`} className="btn-secondary px-2.5 py-2 sm:px-3" title="Editar">
              <Edit2 className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
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
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
          {song.author && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Autor</p>
              <p className="text-sm font-medium text-gray-700">{song.author}</p>
            </div>
          )}
          {song.key_note && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Tom</p>
              <p className="text-sm font-bold text-brand-700 font-mono">{song.key_note}</p>
            </div>
          )}
          {song.media_urls && song.media_urls.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Ouvir música</p>
              <div className="flex items-center gap-2 flex-wrap">
                {song.media_urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={url}
                    className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-colors"
                  >
                    <PlatformIcon url={url} />
                  </a>
                ))}
              </div>
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
