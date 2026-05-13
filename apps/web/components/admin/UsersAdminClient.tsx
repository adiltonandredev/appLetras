'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS, ROLE_COLORS, initials, timeAgo } from '@rl/utils';
import { Search, UserCheck, UserX, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  last_login_at?: string;
  is_active: boolean;
  role: { id: string; name: string; level: number } | null;
}

interface Role {
  id: string;
  name: string;
  level: number;
}

interface Props {
  users: User[];
  roles: Role[];
  currentUserId: string;
  canDelete?: boolean;
}

export function UsersAdminClient({ users: initial, roles, currentUserId, canDelete = false }: Props) {
  const supabase = createClient();
  const { confirm, ConfirmDialogNode } = useConfirm();
  const [users, setUsers] = useState(initial);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role?.name === filterRole;
    return matchSearch && matchRole;
  });

  async function handleRoleChange(userId: string, newRoleId: string) {
    setChangingRole(userId);
    try {
      const { error: delError } = await supabase
        .from('user_role_assignments')
        .delete()
        .eq('user_id', userId);

      if (delError) throw delError;

      const { error: insError } = await supabase
        .from('user_role_assignments')
        .insert({ user_id: userId, role_id: newRoleId });

      if (insError) throw insError;

      const newRole = roles.find(r => r.id === newRoleId) ?? null;
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ));
      toast.success('Perfil atualizado.');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setChangingRole(null);
    }
  }

  async function handleToggleActive(user: User) {
    if (user.id === currentUserId) {
      toast.error('Você não pode desativar sua própria conta.');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;

      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, is_active: !u.is_active } : u
      ));
      toast.success(user.is_active ? 'Usuário desativado.' : 'Usuário reativado.');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  }

  async function handleDelete(user: User) {
    if (user.id === currentUserId) {
      toast.error('Você não pode excluir sua própria conta.');
      return;
    }

    const confirmed = await confirm({
      title: 'Excluir usuário',
      message: `"${user.full_name}" será removido permanentemente. Todos os dados do usuário serão excluídos e esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir permanentemente',
      variant: 'danger',
      icon: 'trash',
    });
    if (!confirmed) return;

    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? 'Erro ao excluir.');

      setUsers(prev => prev.filter(u => u.id !== user.id));
      toast.success(`Usuário "${user.full_name}" excluído.`);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {ConfirmDialogNode}
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-full pl-9"
          />
        </div>

        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="input w-auto"
        >
          <option value="all">Todos os perfis</option>
          {roles.map(r => (
            <option key={r.id} value={r.name}>{ROLE_LABELS[r.name as keyof typeof ROLE_LABELS] ?? r.name}</option>
          ))}
        </select>
      </div>

      {/* Mobile: cards */}
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 && (
          <div className="card p-8 text-center text-sm text-gray-400">
            Nenhum usuário encontrado.
          </div>
        )}
        {filtered.map(user => {
          const userInitials = initials(user.full_name);
          const roleName = user.role?.name ?? 'padrao';
          const roleColor = ROLE_COLORS[roleName as keyof typeof ROLE_COLORS] ?? '#6B7280';
          const isChanging = changingRole === user.id;
          const isDeleting = deletingId === user.id;
          const isSelf = user.id === currentUserId;

          return (
            <div key={user.id} className={clsx('card p-4', !user.is_active && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                {/* Avatar + info */}
                <div className="flex items-center gap-3 min-w-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: roleColor }}>
                      {userInitials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user.full_name}
                      {isSelf && <span className="ml-1 text-xs text-gray-400">(você)</span>}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {user.last_login_at ? timeAgo(user.last_login_at) : 'Nunca acessou'}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleActive(user)}
                    disabled={isSelf}
                    title={user.is_active ? 'Desativar' : 'Reativar'}
                    className={clsx(
                      'p-1.5 rounded-lg transition-colors disabled:opacity-30',
                      user.is_active
                        ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                        : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                    )}
                  >
                    {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>

                  {canDelete && !isSelf && (
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={isDeleting}
                      title="Excluir usuário permanentemente"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Role selector + status */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                <div className="relative flex-1">
                  <select
                    value={user.role?.id ?? ''}
                    onChange={e => handleRoleChange(user.id, e.target.value)}
                    disabled={isChanging || isSelf}
                    className="appearance-none w-full text-xs font-semibold rounded-full px-3 py-1.5 pr-7 border-0 cursor-pointer disabled:cursor-default"
                    style={{ backgroundColor: roleColor + '20', color: roleColor }}
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>
                        {ROLE_LABELS[r.name as keyof typeof ROLE_LABELS] ?? r.name}
                      </option>
                    ))}
                  </select>
                  {!isSelf && (
                    <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: roleColor }} />
                  )}
                </div>

                <span className={clsx('badge text-xs shrink-0', user.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500')}>
                  {user.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="card overflow-hidden hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuário</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Perfil</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Último acesso</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {filtered.map(user => {
              const userInitials = initials(user.full_name);
              const roleName = user.role?.name ?? 'padrao';
              const roleColor = ROLE_COLORS[roleName as keyof typeof ROLE_COLORS] ?? '#6B7280';
              const isChanging = changingRole === user.id;
              const isDeleting = deletingId === user.id;
              const isSelf = user.id === currentUserId;

              return (
                <tr key={user.id} className={clsx('hover:bg-gray-50', !user.is_active && 'opacity-60')}>
                  {/* User */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: roleColor }}>
                          {userInitials}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.full_name}
                          {isSelf && <span className="ml-1.5 text-xs text-gray-400">(você)</span>}
                        </p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-5 py-3">
                    <div className="relative">
                      <select
                        value={user.role?.id ?? ''}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        disabled={isChanging || isSelf}
                        className="appearance-none text-xs font-semibold rounded-full px-3 py-1.5 pr-7 border-0 cursor-pointer disabled:cursor-default"
                        style={{ backgroundColor: roleColor + '20', color: roleColor }}
                      >
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>
                            {ROLE_LABELS[r.name as keyof typeof ROLE_LABELS] ?? r.name}
                          </option>
                        ))}
                      </select>
                      {!isSelf && (
                        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: roleColor }} />
                      )}
                    </div>
                  </td>

                  {/* Last access */}
                  <td className="px-5 py-3 hidden md:table-cell">
                    <span className="text-xs text-gray-400">
                      {user.last_login_at ? timeAgo(user.last_login_at) : 'Nunca acessou'}
                    </span>
                  </td>

                  {/* Active status */}
                  <td className="px-5 py-3">
                    <span className={clsx('badge text-xs', user.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={isSelf}
                        title={user.is_active ? 'Desativar usuário' : 'Reativar usuário'}
                        className={clsx(
                          'p-1.5 rounded-lg transition-colors disabled:opacity-30',
                          user.is_active
                            ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                            : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                        )}
                      >
                        {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>

                      {canDelete && !isSelf && (
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={isDeleting}
                          title="Excluir usuário permanentemente"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-right">
        {filtered.length} de {users.length} usuários
      </p>
    </div>
  );
}
