'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@rl/utils';
import type { UserRole } from '@rl/types';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { LogOut, User, ChevronDown, Menu, Music } from 'lucide-react';
import { useUIStore } from '@/stores/ui.store';
import { useState } from 'react';
import { initials } from '@rl/utils';
import Link from 'next/link';

interface TopBarProps {
  user: SupabaseUser;
  role: UserRole;
}

export function TopBar({ user, role }: TopBarProps) {
  const router = useRouter();
  const { setSidebarOpen } = useUIStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const supabase = createClient();
  const name = user.user_metadata?.full_name ?? user.email ?? 'Usuário';
  const firstName = name.split(' ')[0];
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 shrink-0 z-10">

      {/* Esquerda — hamburguer mobile + logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo — visível só no mobile (desktop tem a sidebar) */}
        <Link href="/dashboard" className="lg:hidden flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-brand-700 to-brand-900 rounded-lg flex items-center justify-center">
            <Music className="w-4 h-4 text-gold-400" />
          </div>
          <span className="font-black text-sm text-brand-900 font-serif">APPLetras</span>
        </Link>
      </div>

      {/* Direita — usuário */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl hover:bg-gray-50 transition-colors"
        >
          {/* Avatar */}
          {avatarUrl ? (
            <img src={avatarUrl} alt={firstName} className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white text-xs font-bold">
              {initials(name)}
            </div>
          )}

          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-gray-900 leading-none">{firstName}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{ROLE_LABELS[role]}</p>
          </div>

          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-[90]" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-[100]">

              <div className="px-4 py-3 border-b border-gray-100 mb-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
              </div>

              <Link
                href="/perfil"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="w-4 h-4 text-gray-400" />
                Meu perfil
              </Link>

              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
