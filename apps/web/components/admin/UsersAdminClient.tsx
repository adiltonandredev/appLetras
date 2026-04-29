'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS, ROLE_COLORS, initials, timeAgo } from '@rl/utils';
import { Search, Shield, UserCheck, UserX, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';

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
}

export function UsersAdminClient({ users: initial, roles, currentUserId }: Props) {
  const supabase = createClient();
  const [users, setUsers] = useState(initial);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [changingRole, setChangingRole] = useState<string | null>(null);

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
      // Upsert role assignment
      const { error } = await supabase
        .from('user_role_assignments')
        .upsert({ user_id: userId, role_id: newRoleId }, { onConflict: 'user_id' });

      if (error) throw error;

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

  return (
    <div className="space-y-4">
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

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuário</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Perfil</th>
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
              const roleLabel = ROLE_LABELS[roleName as keyof typeof ROLE_LABELS] ?? roleName;
              const isChanging = changingRole === user.id;
              const isSelf = user.id === currentUserId;

              return (
                <tr key={user.id} className={clsx('hover:bg-gray-50', !user.is_active && 'opacity-60')}>
                  {/* User */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: roleColor }}
                        >
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
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <div className="relative">
                      <select
                        value={user.role?.id ?? ''}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        disabled={isChanging || isSelf}
                        className="appearance-none text-xs font-semibold rounded-full px-3 py-1.5 pr-7 border-0 cursor-pointer disabled:cursor-default"
                        style={{
                          backgroundColor: roleColor + '20',
                          color: roleColor,
                        }}
                      >
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>
                            {ROLE_LABELS[r.name as keyof typeof ROLE_LABELS] ?? r.name}
                          </option>
                        ))}
                      </select>
                      {!isSelf && (
                        <ChevronDown
                          className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: roleColor }}
                        />
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
                    <span className={clsx(
                      'badge text-xs',
                      user.is_active
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    )}>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={isSelf}
                      title={user.is_active ? 'Desativar usuário' : 'Reativar usuário'}
                      className={clsx(
                        'p-1.5 rounded-lg transition-colors disabled:opacity-30',
                        user.is_active
                          ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                          : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                      )}
                    >
                      {user.is_active
                        ? <UserX className="w-4 h-4" />
                        : <UserCheck className="w-4 h-4" />
                      }
                    </button>
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
