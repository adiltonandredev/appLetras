'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { can } from '@rl/utils';
import type { UserRole } from '@rl/types';
import {
  LayoutDashboard, Music, BookOpen, Users, Tag,
  ClipboardCheck, ScrollText, ChevronLeft, ChevronRight, X, CalendarDays, UsersRound, Info,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useUIStore } from '@/stores/ui.store';
import { useEffect } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',   href: '/dashboard',         icon: LayoutDashboard, exact: true },
  { label: 'Musicas',     href: '/musicas',            icon: Music },
  { label: 'Repertorios', href: '/repertorios',        icon: BookOpen },
  { label: 'Grupos',      href: '/grupos',             icon: UsersRound },
  { label: 'Aprovacoes',  href: '/admin/aprovacoes',   icon: ClipboardCheck, permission: 'songs:approve' },
  { label: 'Usuarios', href: '/admin/usuarios', icon: Users, permission: 'users:view' },
  { label: 'Categorias', href: '/admin/categorias', icon: Tag, permission: 'categories:create' },
  { label: 'Celebrações', href: '/admin/celebracoes', icon: CalendarDays, permission: 'categories:create' },
  { label: 'Logs', href: '/admin/logs', icon: ScrollText, permission: 'admin:audit' },
  { label: 'Sobre', href: '/sobre', icon: Info },
];

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useUIStore();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || can(role, item.permission)
  );

  // Close sidebar on route change (mobile)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) return;
      setSidebarOpen(false);
    };
    handleResize();
  }, [pathname]);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 h-full z-40 flex flex-col text-white transition-all duration-300',
          'bg-gradient-to-b from-brand-900 to-brand-800',
          // Mobile: drawer behavior
          'lg:relative lg:translate-x-0',
          sidebarOpen
            ? 'translate-x-0 w-64'
            : '-translate-x-full lg:translate-x-0 lg:w-16'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gold-500/20 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-gradient-to-br from-gold-400 to-gold-500 rounded-xl flex items-center justify-center shrink-0 border border-gold-300/50 shadow-lg">
              <Music className="w-5 h-5 text-brand-900" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="font-serif font-black text-sm leading-none truncate">APPLetras</p>
                <p className="text-gold-300 text-xs mt-0.5 font-medium">Liturgica</p>
              </div>
            )}
          </div>
          {/* Close button (mobile only) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/70 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group relative',
                  isActive
                    ? 'bg-gold-400/20 text-white border-l-2 border-gold-400'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
                {!sidebarOpen && (
                  <div className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg
                                  opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity hidden lg:block">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Toggle button — desktop only */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-r from-gold-400 to-gold-500 border-2 border-gold-300 rounded-full items-center justify-center hover:shadow-lg transition-all z-10"
          aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {sidebarOpen
            ? <ChevronLeft className="w-3.5 h-3.5 text-brand-900" />
            : <ChevronRight className="w-3.5 h-3.5 text-brand-900" />}
        </button>
      </aside>
    </>
  );
}
