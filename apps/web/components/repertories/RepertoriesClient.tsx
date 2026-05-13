'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getRepertories, getSharedRepertories, deleteRepertory, duplicateRepertory } from '@rl/api-client';
import { CELEBRATION_ICONS, CELEBRATION_LABELS, formatDate, can } from '@rl/utils';
import type { Repertory, UserRole } from '@rl/types';
import { Plus, Search, BookOpen, Calendar, Copy, Trash2, Eye, MoreVertical, Share2, Users, User } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface RepertoriesClientProps {
  userId: string;
  role: UserRole;
}

export function RepertoriesClient({ userId, role }: RepertoriesClientProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const canCreate = can(role, 'repertories:create');
  const isPadrao = role === 'padrao';

  const supabase = createClient();
  const queryClient = useQueryClient();

  // Usuário padrão não busca repertórios próprios (não pode criar)
  const { data, isLoading } = useQuery({
    queryKey: ['repertories', search, page],
    queryFn: () => getRepertories(supabase, userId, { q: search || undefined, page, per_page: 12 }),
    enabled: !isPadrao,
  });

  const { data: shared = [], isLoading: loadingShared } = useQuery({
    queryKey: ['repertories-shared', userId],
    queryFn: () => getSharedRepertories(supabase, userId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRepertory(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertories'] });
      toast.success('Repertório excluído.');
    },
    onError: () => toast.error('Erro ao excluir.'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateRepertory(supabase, id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repertories'] });
      toast.success('Repertório duplicado!');
    },
    onError: () => toast.error('Erro ao duplicar.'),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Repertórios</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isPadrao
              ? `${shared.length} repertório${shared.length !== 1 ? 's' : ''} compartilhado${shared.length !== 1 ? 's' : ''} com você`
              : `${data?.count ?? 0} criado${data?.count !== 1 ? 's' : ''}${shared.length > 0 ? ` · ${shared.length} compartilhado${shared.length !== 1 ? 's' : ''}` : ''}`}
          </p>
        </div>
        {canCreate && (
          <Link href="/repertorios/novo" className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo repertório</span>
            <span className="sm:hidden">Novo</span>
          </Link>
        )}
      </div>

      {/* Search — oculto para padrão (só vê compartilhados) */}
      {!isPadrao && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar repertório..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9"
          />
        </div>
      )}

      {/* ── Meus Repertórios — oculto para padrão ── */}
      {!isPadrao && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Meus repertórios</h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card p-5 animate-pulse">
                  <div className="h-5 bg-gray-100 rounded w-2/3 mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : data?.data.length === 0 ? (
            <div className="card p-14 text-center">
              <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum repertório ainda</p>
              {canCreate && (
                <Link href="/repertorios/novo" className="btn-primary mt-4 inline-flex">
                  <Plus className="w-4 h-4" /> Criar primeiro repertório
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data?.data.map((rep) => (
                <RepertoryCard
                  key={rep.id}
                  repertory={rep}
                  menuOpen={menuOpen === rep.id}
                  onMenuToggle={() => setMenuOpen(menuOpen === rep.id ? null : rep.id)}
                  onDuplicate={() => duplicateMutation.mutate(rep.id)}
                  onDelete={() => { if (confirm('Excluir este repertório?')) deleteMutation.mutate(rep.id); }}
                  showActions
                />
              ))}
            </div>
          )}

          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40">Anterior</button>
              <span className="text-sm text-gray-500">Página {page} de {data.total_pages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= data.total_pages}
                className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40">Próxima</button>
            </div>
          )}
        </section>
      )}

      {/* ── Compartilhados comigo — sempre visível ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          {isPadrao ? 'Repertórios disponíveis para você' : 'Compartilhados comigo'}
        </h2>

        {loadingShared ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-5 bg-gray-100 rounded w-2/3 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : shared.length === 0 ? (
          <div className="card p-10 text-center">
            <Share2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              {isPadrao
                ? 'Nenhum repertório foi compartilhado com você ainda.'
                : 'Nenhum repertório compartilhado com você ainda.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {shared.map((rep) => (
              <RepertoryCard
                key={rep.id}
                repertory={rep}
                menuOpen={false}
                onMenuToggle={() => {}}
                onDuplicate={() => {}}
                onDelete={() => {}}
                showActions={false}
                sharedBadge
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RepertoryCard({
  repertory, menuOpen, onMenuToggle, onDuplicate, onDelete, showActions, sharedBadge,
}: {
  repertory: Repertory;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  showActions: boolean;
  sharedBadge?: boolean;
}) {
  const celebration = (repertory.celebration as any) ?? 'outro';
  const creator = (repertory as any).creator;

  return (
    <div className="card overflow-hidden relative group hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5 flex flex-col">

      {/* Topo colorido com ícone */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 px-5 pt-5 pb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
            <span className="text-2xl leading-none">
              {CELEBRATION_ICONS[celebration]}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 leading-snug text-sm">{repertory.title}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {repertory.celebration && (
                <span className="inline-flex items-center text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  {CELEBRATION_LABELS[repertory.celebration]}
                </span>
              )}
              {sharedBadge && (
                <span className="inline-flex items-center gap-0.5 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                  <Share2 className="w-2.5 h-2.5" /> Compartilhado
                </span>
              )}
            </div>
          </div>
        </div>

        {showActions && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/70 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-modal border border-gray-100 py-1 z-20">
                <Link href={`/repertorios/${repertory.id}`} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Eye className="w-4 h-4 text-gray-400" /> Ver
                </Link>
                <button onClick={onDuplicate} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left">
                  <Copy className="w-4 h-4 text-gray-400" /> Duplicar
                </button>
                <button onClick={onDelete} className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Corpo com metadados */}
      <div className="px-5 py-3 flex-1 space-y-2">
        {repertory.event_date && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="font-medium">{formatDate(repertory.event_date)}</span>
          </div>
        )}
        {repertory.community && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{repertory.community}</span>
          </div>
        )}
        {creator?.full_name && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">por {creator.full_name}</span>
          </div>
        )}
      </div>

      {/* Rodapé com ações */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100">
        <Link href={`/repertorios/${repertory.id}`} className="btn-primary flex-1 justify-center py-2 text-xs">
          <Eye className="w-3.5 h-3.5" /> Abrir
        </Link>
        {showActions && (
          <Link href={`/repertorios/${repertory.id}/editar`} className="btn-secondary py-2 px-3 text-xs">
            Editar
          </Link>
        )}
      </div>
    </div>
  );
}
