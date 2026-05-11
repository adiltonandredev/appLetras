'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getSongs } from '@rl/api-client';
import { SONG_STATUS_LABELS, SONG_STATUS_COLORS, truncate } from '@rl/utils';
import type { LiturgicalCategory, SongStatus, UserRole } from '@rl/types';
import { Plus, Search, Music, ExternalLink, Filter } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

interface SongsClientProps {
  role: UserRole;
  canCreate: boolean;
  canApprove: boolean;
  categories: LiturgicalCategory[];
}

export function SongsClient({ role, canCreate, canApprove, categories }: SongsClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SongStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);

  const supabase = createClient();

  const { data, isLoading } = useQuery({
    queryKey: ['songs', search, statusFilter, categoryFilter, page],
    queryFn: () => getSongs(supabase, {
      q: search || undefined,
      status: statusFilter || undefined,
      category_id: categoryFilter || undefined,
      page,
      per_page: 20,
    }),
  });

  const statusOptions: { value: SongStatus | ''; label: string }[] = [
    { value: '', label: 'Todos os status' },
    { value: 'approved', label: 'Aprovadas' },
    ...(canApprove ? [{ value: 'pending' as SongStatus, label: 'Pendentes' }] : []),
    { value: 'draft', label: 'Rascunhos' },
    { value: 'rejected', label: 'Reprovadas' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Músicas</h1>
          <p className="text-gray-500 text-sm mt-0.5">{data?.count ?? 0} músicas encontradas</p>
        </div>
        {canCreate && (
          <Link href="/musicas/nova" className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova música</span>
            <span className="sm:hidden">Nova</span>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as SongStatus | ''); setPage(1); }}
          className="input w-auto"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
          className="input w-auto"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Songs grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
              <div className="h-3 bg-gray-100 rounded w-full mb-1.5" />
              <div className="h-3 bg-gray-100 rounded w-4/5" />
            </div>
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="card p-16 text-center">
          <Music className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma música encontrada</p>
          {canCreate && (
            <Link href="/musicas/nova" className="btn-primary mt-4 inline-flex">
              <Plus className="w-4 h-4" /> Cadastrar primeira música
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data?.data.map((song) => (
            <Link
              key={song.id}
              href={`/musicas/${song.id}`}
              className="card p-5 hover:shadow-card-hover transition-shadow group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors truncate">
                    {song.title}
                  </h3>
                  {song.author && (
                    <p className="text-xs text-gray-400 mt-0.5">{song.author}</p>
                  )}
                </div>
                <span
                  className="badge ml-2 shrink-0"
                  style={{
                    backgroundColor: SONG_STATUS_COLORS[song.status] + '20',
                    color: SONG_STATUS_COLORS[song.status],
                  }}
                >
                  {SONG_STATUS_LABELS[song.status]}
                </span>
              </div>

              {/* Categories */}
              {song.categories && song.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {song.categories.slice(0, 2).map((cat) => (
                    <span key={cat.id} className="badge bg-brand-50 text-brand-600">
                      {cat.name}
                    </span>
                  ))}
                  {song.categories.length > 2 && (
                    <span className="badge bg-gray-100 text-gray-500">
                      +{song.categories.length - 2}
                    </span>
                  )}
                </div>
              )}

              {/* Lyrics preview */}
              <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                {truncate(song.lyrics, 100)}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  {song.key_note && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {song.key_note}
                    </span>
                  )}
                  {song.bpm && (
                    <span className="text-xs text-gray-400">{song.bpm} BPM</span>
                  )}
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
            className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">
            Página {page} de {data.total_pages}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= data.total_pages}
            className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
