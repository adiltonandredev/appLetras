'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS, ROLE_COLORS } from '@rl/utils';
import type { UserRole } from '@rl/types';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Bell, LogOut, User, Moon, Sun, ChevronDown, Menu } from 'lucide-react';
import { useUIStore } from '@/stores/ui.store';
import { useState } from 'react';
import { initials } from '@rl/utils';

interface TopBarProps {
  user: SupabaseUser;
  role: UserRole;
}

export function TopBar({ user, role }: TopBarProps) {
  const router = useRouter();
  const { darkMode, toggleDarkMode, setSidebarOpen } = useUIStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const supabase = createClient();
  const name = user.user_metadata?.full_name ?? user.email ?? 'Usuário';
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="h-14 bg-white/95 backdrop-blur-sm border-b border-gold-200/30 flex items-center justify-between px-6 shrink-0 shadow-sm">
      {/* Left side — hamburger (mobile) + breadcrumb placeholder */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden btn-ghost p-2 -ml-1"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5 text-brand-700" />
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Dark mode */}
        <button
          onClick={toggleDarkMode}
          className="btn-ghost p-2"
          aria-label="Alternar modo escuro"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button className="btn-ghost p-2 relative" aria-label="Notificações">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gold-50 transition-colors border border-gold-100/50"
          >
            {/* Avatar */}
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 text-brand-900 flex items-center justify-center text-xs font-bold">
                {initials(name)}
              </div>
            )}

            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-900 leading-none">{name.split(' ')[0]}</p>
              <p className="text-xs font-medium mt-0.5 text-gold-600">
                {ROLE_LABELS[role]}
              </p>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-gold-500" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white/97 backdrop-blur-sm rounded-xl shadow-modal border border-gold-200/50 py-1 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>

              <a href="/perfil" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <User className="w-4 h-4 text-gray-400" /> Meu perfil
              </a>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
