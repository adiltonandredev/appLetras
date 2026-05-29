'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Search, Users, User, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';

interface Props {
  repertoryId: string;
  repertoryTitle: string;
  userId: string;
  onClose: () => void;
}

interface ShareEntry {
  id: string;
  shared_at: string;
  permission: string;
  user?: { id: string; full_name: string; email: string };
  team?: { id: string; name: string };
}

export function ShareRepertoryModal({ repertoryId, repertoryTitle, userId, onClose }: Props) {
  const supabase = createClient();
  const [tab, setTab]                       = useState<'user' | 'group'>('group');
  const [query, setQuery]                   = useState('');
  const [results, setResults]               = useState<any[]>([]);
  const [searching, setSearching]           = useState(false);
  const [sharing, setSharing]               = useState<string | null>(null);
  const [shares, setShares]                 = useState<ShareEntry[]>([]);
  const [loadingShares, setLoadingShares]   = useState(true);

  // Carrega compartilhamentos existentes
  useEffect(() => {
    loadShares();
  }, []);

  async function loadShares() {
    setLoadingShares(true);
    const { data } = await supabase
      .from('shared_repertories')
      .select(`
        id, shared_at, permission,
        user:users!shared_with(id, full_name, email),
        team:teams!team_id(id, name)
      `)
      .eq('repertory_id', repertoryId)
      .order('shared_at', { ascending: false });
    setShares(data ?? []);
    setLoadingShares(false);
  }

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      if (tab === 'user') {
        const { data } = await supabase
          .from('users')
          .select('id, full_name, email')
          .ilike('email', `%${query.trim()}%`)
          .neq('id', userId)
          .limit(8);
        setResults(data ?? []);
      } else {
        // Busca grupos do usuário
        const { data: myGroups } = await supabase
          .from('teams')
          .select('id, name, description')
          .eq('created_by', userId)
          .ilike('name', `%${query.trim()}%`)
          .limit(5);

        const { data: memberGroups } = await supabase
          .from('team_members')
          .select('team:teams(id, name, description)')
          .eq('user_id', userId)
          .limit(5);

        const merged = [
          ...(myGroups ?? []),
          ...(memberGroups ?? []).map((m: any) => m.team).filter(Boolean),
        ];
        // deduplica
        const seen = new Set<string>();
        const unique = merged.filter(g => g && !seen.has(g.id) && seen.add(g.id));
        setResults(unique.filter(g => g.name.toLowerCase().includes(query.toLowerCase())));
      }
    } finally {
      setSearching(false);
    }
  }

  async function share(target: any) {
    const key = target.id;
    setSharing(key);
    try {
      const payload: any = {
        repertory_id: repertoryId,
        shared_by: userId,
        permission: 'view',
      };
      if (tab === 'user') {
        payload.shared_with = target.id;
      } else {
        payload.team_id = target.id;
      }

      // Evita duplicata
      const already = shares.some(s =>
        tab === 'user' ? s.user?.id === target.id : s.team?.id === target.id
      );
      if (already) { toast.error('Já compartilhado com este destino.'); return; }

      const { error } = await supabase.from('shared_repertories').insert(payload);
      if (error) throw error;
      toast.success(`Compartilhado com ${target.full_name ?? target.name}!`);
      await loadShares();
      setQuery('');
      setResults([]);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSharing(null);
    }
  }

  async function removeShare(shareId: string) {
    // shared_by = userId ensures only the creator of the share can remove it (enforced by RLS too)
    const { error } = await supabase
      .from('shared_repertories')
      .delete()
      .eq('id', shareId)
      .eq('shared_by', userId);
    if (error) { toast.error('Erro ao remover.'); return; }
    toast.success('Compartilhamento removido.');
    await loadShares();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Compartilhar repertório</h2>
            <p className="text-xs text-gray-400 truncate mt-0.5">{repertoryTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {(['group', 'user'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setQuery(''); setResults([]); }}
              className={clsx(
                'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors',
                tab === t
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              )}
            >
              {t === 'group' ? <><Users className="w-4 h-4" /> Grupo</> : <><User className="w-4 h-4" /> Usuário</>}
            </button>
          ))}
        </div>

        {/* Busca */}
        <div className="px-6 py-4 shrink-0 space-y-3">
          <div className="flex gap-2">
            <input
              type={tab === 'user' ? 'email' : 'text'}
              value={query}
              onChange={e => { setQuery(e.target.value); setResults([]); }}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder={tab === 'user' ? 'Buscar por e-mail…' : 'Buscar grupo…'}
              className="input flex-1"
              autoFocus
            />
            <button onClick={search} disabled={searching || !query.trim()} className="btn-secondary px-3">
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Resultados da busca */}
          {results.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-50">
              {results.map(r => {
                const alreadyShared = shares.some(s =>
                  tab === 'user' ? s.user?.id === r.id : s.team?.id === r.id
                );
                return (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
                      {tab === 'user'
                        ? (r.full_name || r.email).slice(0, 2).toUpperCase()
                        : <Users className="w-4 h-4" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {tab === 'user' ? r.full_name : r.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {tab === 'user' ? r.email : r.description ?? 'Grupo'}
                      </p>
                    </div>
                    {alreadyShared ? (
                      <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                        <Check className="w-3.5 h-3.5" /> Compartilhado
                      </span>
                    ) : (
                      <button
                        onClick={() => share(r)}
                        disabled={sharing === r.id}
                        className="btn-primary py-1 px-3 text-xs"
                      >
                        {sharing === r.id ? 'Enviando…' : 'Compartilhar'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {results.length === 0 && query && !searching && (
            <p className="text-xs text-gray-400 text-center py-2">Nenhum resultado encontrado.</p>
          )}
        </div>

        {/* Compartilhamentos ativos */}
        <div className="flex-1 overflow-y-auto border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">
            Compartilhado com
          </p>
          {loadingShares ? (
            <p className="text-xs text-gray-300 text-center py-4">Carregando…</p>
          ) : shares.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Nenhum compartilhamento ativo.
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {shares.map(s => {
                const isGroup = !!s.team;
                const label  = isGroup ? s.team!.name : s.user?.full_name ?? s.user?.email ?? '—';
                const sub    = isGroup ? 'Grupo' : s.user?.email ?? '';
                return (
                  <div key={s.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold shrink-0">
                      {isGroup ? <Users className="w-4 h-4" /> : label.slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
                      <p className="text-xs text-gray-400">{sub}</p>
                    </div>
                    <button
                      onClick={() => removeShare(s.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fechar */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="btn-secondary w-full">Fechar</button>
        </div>
      </div>
    </div>
  );
}
