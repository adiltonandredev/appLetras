'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@rl/types';
import { Music, BookOpen, Shield, Save, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
}

interface Props {
  profile: Profile;
  role: UserRole;
  roleLabel: string;
  songCount: number;
  repertoryCount: number;
}

const ROLE_COLORS: Record<string, string> = {
  padrao: '#6B7280',
  intermediario: '#3B82F6',
  master: '#8B5CF6',
  administrador: '#C9A84C',
};

export function PerfilClient({ profile, role, roleLabel, songCount, repertoryCount }: Props) {
  const supabase = createClient();

  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  const roleColor = ROLE_COLORS[role] ?? '#6B7280';
  const avatarInitials = (fullName || profile.email).slice(0, 2).toUpperCase();

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
      if (authError) throw authError;

      const { error: dbError } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', profile.id);
      if (dbError) throw dbError;

      toast.success('Perfil atualizado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    setChangingPw(true);
    setPwSuccess(false);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword('');
      setNewPassword('');
      setPwSuccess(true);
      toast.success('Senha alterada com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao alterar senha: ' + err.message);
    } finally {
      setChangingPw(false);
    }
  }

  return (
    <div className="space-y-5">

      {/* Avatar + stats card */}
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)` }}
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={fullName} className="w-full h-full rounded-2xl object-cover" />
          ) : (
            avatarInitials
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-gray-900">{fullName || profile.email}</h2>
          <p className="text-gray-500 text-sm">{profile.email}</p>
          <span
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-3 py-1 rounded-full"
            style={{ backgroundColor: roleColor + '20', color: roleColor }}
          >
            <Shield className="w-3 h-3" />
            {roleLabel}
          </span>
        </div>

        <div className="flex gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-brand-900">{songCount}</p>
            <p className="text-xs text-gray-400 flex items-center gap-1 justify-center"><Music className="w-3 h-3" /> Músicas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-brand-900">{repertoryCount}</p>
            <p className="text-xs text-gray-400 flex items-center gap-1 justify-center"><BookOpen className="w-3 h-3" /> Repertórios</p>
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Informações pessoais</h3>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="label">Nome completo</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="input"
              placeholder="Seu nome"
            />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input type="email" value={profile.email} disabled className="input opacity-60 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">O e-mail não pode ser alterado aqui.</p>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Alterar senha</h3>
        {pwSuccess && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />
            Senha alterada com sucesso!
          </div>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Nova senha</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="input pr-10"
                placeholder="Mínimo 8 caracteres"
                required
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="mt-1.5 flex gap-1">
                {[8, 12, 16].map((len, i) => (
                  <div key={len} className={clsx('h-1 flex-1 rounded-full transition-colors',
                    newPassword.length >= len
                      ? i === 0 ? 'bg-red-400' : i === 1 ? 'bg-yellow-400' : 'bg-green-400'
                      : 'bg-gray-200'
                  )} />
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={changingPw} className="btn-secondary">
              {changingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {changingPw ? 'Alterando...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
