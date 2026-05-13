'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Users, Plus, ChevronRight, Crown, LogOut, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { can } from '@rl/utils';
import type { UserRole } from '@rl/types';

interface Group {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  members?: { count: number }[];
}

interface Props {
  myGroups: Group[];
  memberGroups: Group[];
  userId: string;
  role: UserRole;
}

export function GruposClient({ myGroups, memberGroups, userId, role }: Props) {
  const canCreate = can(role, 'groups:create');
  const router = useRouter();
  const supabase = createClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const slug = name.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now();

      const { data, error } = await supabase
        .from('teams')
        .insert({ name: name.trim(), slug, description: description.trim() || null, created_by: userId })
        .select()
        .single();

      if (error) throw error;

      // Adiciona o criador como membro admin para aparecer no painel e nas queries de grupo
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({ team_id: data.id, user_id: userId, role: 'admin' });
      if (memberError) console.warn('[handleCreate] Erro ao adicionar criador como membro:', memberError);

      toast.success('Grupo criado!');
      setShowCreate(false);
      setName('');
      setDescription('');
      router.refresh();
      router.push(`/grupos/${data.id}`);
    } catch (err: any) {
      toast.error('Erro ao criar grupo: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLeave(groupId: string) {
    if (!confirm('Sair deste grupo?')) return;
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', groupId)
      .eq('user_id', userId);
    if (error) { toast.error('Erro ao sair do grupo.'); return; }
    toast.success('Você saiu do grupo.');
    router.refresh();
  }

  async function handleDelete(groupId: string) {
    if (!confirm('Excluir este grupo permanentemente? Todos os compartilhamentos serão removidos.')) return;
    const { error } = await supabase.from('teams').delete().eq('id', groupId);
    if (error) { toast.error('Erro ao excluir grupo.'); return; }
    toast.success('Grupo excluído.');
    router.refresh();
  }

  const GroupCard = ({ group, owner }: { group: Group; owner: boolean }) => {
    const count = group.members?.[0]?.count ?? 0;
    return (
      <div className="card p-0 overflow-hidden hover:shadow-md transition-shadow">
        <Link href={`/grupos/${group.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 truncate">{group.name}</p>
              {owner && <Crown className="w-3.5 h-3.5 text-gold-500 shrink-0" />}
            </div>
            {group.description && (
              <p className="text-xs text-gray-400 truncate mt-0.5">{group.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{count} membro{count !== 1 ? 's' : ''}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
        </Link>

        {/* Ações rápidas */}
        <div className="border-t border-gray-50 px-5 py-2 flex gap-3">
          {owner ? (
            <button
              onClick={() => handleDelete(group.id)}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Excluir grupo
            </button>
          ) : (
            <button
              onClick={() => handleLeave(group.id)}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3 h-3" /> Sair do grupo
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grupos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {canCreate ? 'Crie e gerencie grupos de música' : 'Grupos em que você participa'}
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Novo grupo
          </button>
        )}
      </div>

      {/* Modal criar grupo — apenas para quem tem permissão */}
      {canCreate && showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Criar grupo</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Nome do grupo *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Grupo de Música — Paróquia São José"
                  className="input"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="label">Descrição (opcional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ex: Equipe de música da missa dominical"
                  className="input"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !name.trim()} className="btn-primary flex-1">
                  {saving ? 'Criando…' : 'Criar grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meus grupos — apenas para quem pode criar */}
      {canCreate && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Meus grupos</h2>
          {myGroups.length === 0 ? (
            <div className="card p-8 text-center">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Você ainda não criou nenhum grupo.</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary mt-3 inline-flex">
                <Plus className="w-4 h-4" /> Criar primeiro grupo
              </button>
            </div>
          ) : (
            myGroups.map(g => <GroupCard key={g.id} group={g} owner />)
          )}
        </section>
      )}

      {/* Grupos em que é membro */}
      {memberGroups.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Grupos em que participo</h2>
          {memberGroups.map(g => <GroupCard key={g.id} group={g} owner={false} />)}
        </section>
      )}
    </div>
  );
}
