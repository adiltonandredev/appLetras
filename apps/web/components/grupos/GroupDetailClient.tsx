'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, Users, UserPlus, Trash2, Crown,
  BookOpen, Search, X, Shield,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { formatDate } from '@rl/utils';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { logAudit } from '@/lib/audit-client';

interface Member {
  user_id: string;
  role: string;
  joined_at: string;
  user: { id: string; full_name: string; email: string; avatar_url?: string };
}

interface Group {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  members: Member[];
}

interface SharedRep {
  id: string;
  shared_at: string;
  permission: string;
  repertory: { id: string; title: string; celebration?: string; event_date?: string };
  sharer: { full_name: string };
}

interface Props {
  group: Group;
  sharedRepertories: SharedRep[];
  userId: string;
  isOwner: boolean;
}

export function GroupDetailClient({ group, sharedRepertories, userId, isOwner }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const { confirm, ConfirmDialogNode } = useConfirm();

  const [showAddMember, setShowAddMember]   = useState(false);
  const [searchEmail, setSearchEmail]       = useState('');
  const [searchResult, setSearchResult]     = useState<any>(null);
  const [searching, setSearching]           = useState(false);
  const [adding, setAdding]                 = useState(false);

  async function searchUser() {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const { data, error } = await supabase
        .rpc('search_user_by_email', { p_email: searchEmail.trim() });
      if (error) {
        console.error('[searchUser] RPC error:', error);
        throw error;
      }
      const user = Array.isArray(data) ? data[0] : data;
      if (!user) {
        toast.error('Nenhum usuário encontrado com este e-mail.');
      } else if (group.members.some(m => m.user_id === user.id)) {
        toast.error('Este usuário já é membro do grupo.');
      } else {
        setSearchResult(user);
      }
    } catch (e: any) {
      console.error('[searchUser] Erro:', e);
      toast.error(e?.message ?? 'Erro ao buscar usuário.');
    } finally {
      setSearching(false);
    }
  }

  async function addMember() {
    if (!searchResult) return;
    setAdding(true);
    try {
      const { error } = await supabase
        .rpc('add_team_member', { p_team_id: group.id, p_user_id: searchResult.id });
      if (error) {
        console.error('[addMember] RPC error:', error);
        throw error;
      }
      logAudit({ action: 'member_added', entity_type: 'group', entity_id: group.id, new_value: { member_name: searchResult.full_name, group_name: group.name } });
      toast.success(`${searchResult.full_name} adicionado ao grupo!`);
      setShowAddMember(false);
      setSearchEmail('');
      setSearchResult(null);
      router.refresh();
    } catch (e: any) {
      console.error('[addMember] Erro:', e);
      toast.error(e?.message ?? 'Erro ao adicionar membro.');
    } finally {
      setAdding(false);
    }
  }

  async function removeMember(memberId: string, memberName: string) {
    const ok = await confirm({
      title: 'Remover membro',
      message: `${memberName} perderá acesso ao grupo e aos repertórios compartilhados com ele.`,
      confirmLabel: 'Remover',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', group.id)
      .eq('user_id', memberId);
    if (error) { toast.error('Erro ao remover membro.'); return; }
    logAudit({ action: 'member_removed', entity_type: 'group', entity_id: group.id, old_value: { member_name: memberName, group_name: group.name } });
    toast.success(`${memberName} removido.`);
    router.refresh();
  }

  async function removeShare(shareId: string) {
    const ok = await confirm({
      title: 'Remover compartilhamento',
      message: 'Os membros deste grupo não poderão mais acessar este repertório.',
      confirmLabel: 'Remover',
      variant: 'warning',
      icon: 'alert',
    });
    if (!ok) return;
    const { error } = await supabase.from('shared_repertories').delete().eq('id', shareId);
    if (error) { toast.error('Erro ao remover compartilhamento.'); return; }
    toast.success('Compartilhamento removido.');
    router.refresh();
  }

  const avatarInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {ConfirmDialogNode}
      {/* Back */}
      <Link href="/grupos" className="btn-ghost -ml-2 inline-flex">
        <ArrowLeft className="w-4 h-4" /> Grupos
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-brand-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
              {isOwner && <Crown className="w-4 h-4 text-gold-500" />}
            </div>
            {group.description && (
              <p className="text-sm text-gray-500 mt-1">{group.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {group.members.length} membro{group.members.length !== 1 ? 's' : ''} •
              Criado em {formatDate(group.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Membros */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-600" /> Membros
          </h2>
          {isOwner && (
            <button onClick={() => setShowAddMember(true)} className="btn-primary py-1.5 text-xs">
              <UserPlus className="w-3.5 h-3.5" /> Adicionar
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-50">
          {group.members.map(member => (
            <div key={member.user_id} className="flex items-center gap-3 px-5 py-3">
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-bold shrink-0">
                {member.user?.avatar_url
                  ? <img src={member.user.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                  : avatarInitials(member.user?.full_name || member.user?.email || '?')
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {member.user?.full_name}
                  {member.user_id === group.created_by && (
                    <span className="ml-1.5 text-xs text-gold-600 font-semibold">Criador</span>
                  )}
                  {member.role === 'admin' && member.user_id !== group.created_by && (
                    <span className="ml-1.5 text-xs text-brand-600 font-semibold flex items-center gap-0.5 inline-flex">
                      <Shield className="w-3 h-3" /> Admin
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 truncate">{member.user?.email}</p>
              </div>
              {isOwner && member.user_id !== group.created_by && (
                <button
                  onClick={() => removeMember(member.user_id, member.user?.full_name)}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                  title="Remover membro"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Repertórios compartilhados com o grupo */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-600" /> Repertórios compartilhados
          </h2>
        </div>

        {sharedRepertories.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum repertório compartilhado com este grupo ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sharedRepertories.map(sr => (
              <div key={sr.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/repertorios/${sr.repertory?.id}`}
                    className="text-sm font-medium text-brand-700 hover:underline truncate block"
                  >
                    {sr.repertory?.title}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Compartilhado por {sr.sharer?.full_name} · {formatDate(sr.shared_at)}
                  </p>
                </div>
                {isOwner && (
                  <button
                    onClick={() => removeShare(sr.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                    title="Remover compartilhamento"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal adicionar membro */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Adicionar membro</h2>
              <button onClick={() => { setShowAddMember(false); setSearchEmail(''); setSearchResult(null); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <p className="text-sm text-gray-500">
              Busque pelo e-mail do usuário cadastrado no APPLetras.
            </p>

            <div className="flex gap-2">
              <input
                type="email"
                value={searchEmail}
                onChange={e => { setSearchEmail(e.target.value); setSearchResult(null); }}
                onKeyDown={e => e.key === 'Enter' && searchUser()}
                placeholder="email@exemplo.com"
                className="input flex-1"
                autoFocus
              />
              <button onClick={searchUser} disabled={searching || !searchEmail.trim()} className="btn-secondary px-3">
                <Search className="w-4 h-4" />
              </button>
            </div>

            {searchResult && (
              <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl border border-brand-100">
                <div className="w-9 h-9 rounded-full bg-brand-200 flex items-center justify-center text-brand-800 text-sm font-bold shrink-0">
                  {avatarInitials(searchResult.full_name || searchResult.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{searchResult.full_name}</p>
                  <p className="text-xs text-gray-500">{searchResult.email}</p>
                </div>
                <button onClick={addMember} disabled={adding} className="btn-primary py-1.5 text-xs">
                  {adding ? 'Adicionando…' : 'Adicionar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
