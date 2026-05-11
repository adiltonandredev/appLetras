'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Repertory, UserRole } from '@rl/types';
import { CELEBRATION_LABELS, CELEBRATION_ICONS, formatDate, can } from '@rl/utils';
import {
  Edit2, Printer, FileDown, Trash2, ArrowLeft,
  Music, ChevronRight, Clock, MapPin, Maximize2, Share2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { LyricsFullscreen } from './LyricsFullscreen';
import { ShareRepertoryModal } from './ShareRepertoryModal';

interface RepertoryViewProps {
  repertory: Repertory & { items: any[]; creator: any };
  role: UserRole;
  isOwner: boolean;
  userId: string;
}

export function RepertoryView({ repertory, role, isOwner, userId }: RepertoryViewProps) {
  const router = useRouter();
  const supabase = createClient();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [fullscreenSong, setFullscreenSong] = useState<{ title: string; lyrics: string } | null>(null);
  const [showShare, setShowShare] = useState(false);

  const canEdit = isOwner || can(role, 'repertories:edit:any');
  const canDelete = isOwner || can(role, 'repertories:edit:any');

  async function handleDelete() {
    if (!confirm('Excluir este repertório permanentemente?')) return;
    const { error } = await supabase.from('repertories').delete().eq('id', repertory.id);
    if (error) { toast.error('Erro ao excluir.'); return; }
    toast.success('Repertório excluído.');
    router.push('/repertorios');
  }

  function handlePrint() {
    window.open(`/repertorios/${repertory.id}/imprimir`, '_blank');
  }

  return (
    <>
      {/* Modal de letra em tela cheia */}
      {fullscreenSong && (
        <LyricsFullscreen
          title={fullscreenSong.title}
          lyrics={fullscreenSong.lyrics}
          onClose={() => setFullscreenSong(null)}
        />
      )}

      {/* Modal de compartilhamento */}
      {showShare && (
        <ShareRepertoryModal
          repertoryId={repertory.id}
          repertoryTitle={repertory.title}
          userId={userId}
          onClose={() => setShowShare(false)}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-5">
        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <Link href="/repertorios" className="btn-ghost -ml-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Repertórios</span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {canEdit && (
              <Link
                href={`/repertorios/${repertory.id}/editar`}
                className="btn-secondary px-2.5 py-2 sm:px-3"
                title="Editar"
              >
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </Link>
            )}
            <button
              onClick={() => setShowShare(true)}
              className="btn-secondary px-2.5 py-2 sm:px-3"
              title="Compartilhar"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>
            <button
              onClick={handlePrint}
              className="btn-secondary px-2.5 py-2 sm:px-3"
              title="Imprimir"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <Link
              href={`/repertorios/${repertory.id}/imprimir?pdf=1`}
              className="btn-secondary px-2.5 py-2 sm:px-3"
              target="_blank"
              title="Baixar PDF"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </Link>
            {canDelete && (
              <button
                onClick={handleDelete}
                className="btn-ghost px-2.5 py-2 text-red-500 hover:bg-red-50 hover:text-red-600"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Header card */}
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl">
              {CELEBRATION_ICONS[(repertory.celebration as any) ?? 'outro']}
            </span>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{repertory.title}</h1>
              {repertory.celebration && (
                <p className="text-brand-600 font-medium mt-0.5">
                  {CELEBRATION_LABELS[repertory.celebration]}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                {repertory.event_date && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(repertory.event_date, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                )}
                {repertory.community && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {repertory.community}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" />
                  {repertory.items?.length ?? 0} músicas
                </span>
              </div>

              {repertory.observations && (
                <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  {repertory.observations}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Song sequence */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Sequência de Músicas</h2>
            <span className="badge bg-brand-50 text-brand-700">
              {repertory.items?.length ?? 0} músicas
            </span>
          </div>

          <div className="divide-y divide-gray-50">
            {(repertory.items ?? []).length === 0 && (
              <div className="p-10 text-center">
                <Music className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nenhuma música adicionada.</p>
                {canEdit && (
                  <Link href={`/repertorios/${repertory.id}/editar`} className="btn-primary mt-3 inline-flex">
                    Adicionar músicas
                  </Link>
                )}
              </div>
            )}

            {(repertory.items ?? []).map((item: any, idx: number) => {
              const song = item.song;
              const isExpanded = expandedItem === item.id;
              const displayKey = item.custom_key ?? song?.key_note;

              return (
                <div key={item.id} className="group">
                  {/* Item header */}
                  <button
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="w-7 h-7 rounded-full bg-brand-50 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 truncate">
                          {song?.title ?? '(música removida)'}
                        </p>
                        {song?.categories?.[0] && (
                          <span className="badge bg-indigo-50 text-indigo-700 text-xs">
                            {song.categories[0].name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {song?.author && (
                          <span className="text-xs text-gray-400">{song.author}</span>
                        )}
                        {item.observations && (
                          <span className="text-xs text-amber-600 font-medium">
                            ⚡ {item.observations}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {displayKey && (
                        <span className="badge bg-gray-100 text-gray-600 font-mono">
                          {displayKey}
                        </span>
                      )}
                      {song?.bpm && (
                        <span className="text-xs text-gray-400">{song.bpm} BPM</span>
                      )}
                      <ChevronRight
                        className={clsx(
                          'w-4 h-4 text-gray-300 transition-transform',
                          isExpanded && 'rotate-90'
                        )}
                      />
                    </div>
                  </button>

                  {/* Preview da letra expandida */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pt-2 border-t border-gray-50 bg-gray-50/50">
                      {song?.lyrics ? (
                        <>
                          {/* Preview — primeiras linhas */}
                          <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed line-clamp-6 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 8, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {song.lyrics
                              .split('\n')
                              .filter((l: string) => !/^\[.+\]$/.test(l.trim()))
                              .join('\n')
                              .trim()}
                          </pre>

                          {/* Botão tela cheia */}
                          <button
                            onClick={() => setFullscreenSong({ title: song.title, lyrics: song.lyrics })}
                            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            Ver letra completa
                          </button>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Letra não cadastrada.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modo apresentação */}
        {(repertory.items ?? []).length > 0 && (
          <div className="text-center pb-4">
            <p className="text-sm text-gray-400 mb-2">Pronto para celebrar?</p>
            <a
              href={`/repertorios/${repertory.id}/apresentar`}
              className="btn-primary px-8 py-3 text-base"
            >
              🎵 Modo apresentação
            </a>
          </div>
        )}
      </div>
    </>
  );
}
