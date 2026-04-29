'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { can } from '@rl/utils';
import type { UserRole } from '@rl/types';
import {
  LayoutDashboard, Music, BookOpen, Users, Tag,
  ClipboardCheck, Settings, ScrollText, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useUIStore } from '@/stores/ui.store';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
  { label: 'Músicas', href: '/musicas', icon: Music },
  { label: 'Repertórios', href: '/repertorios', icon: BookOpen },
  { label: 'Aprovações', href: '/admin/aprovacoes', icon: ClipboardCheck, permission: 'songs:approve' },
  { label: 'Usuários', href: '/admin/usuarios', icon: Users, permission: 'users:view' },
  { label: 'Categorias', href: '/admin/categorias', icon: Tag, permission: 'categories:create' },
  { label: 'Logs', href: '/admin/logs', icon: ScrollText, permission: 'admin:audit' },
  { label: 'Configurações', href: '/admin/configuracoes', icon: Settings, permission: 'admin:settings' },
];

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || can(role, item.permission)
  );

  return (
    <aside
      className={clsx(
        'relative flex flex-col bg-brand-600 text-white transition-all duration-300 shrink-0',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0 border border-white/20">
          <Music className="w-4 h-4 text-white" />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm leading-none">Repertório</p>
            <p className="text-blue-200 text-xs mt-0.5">Litúrgico</p>
          </div>
        )}
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
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              )}
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
              {!sidebarOpen && (
                <div className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg
                                opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-brand-600 border border-white/20 rounded-full flex items-center justify-center hover:bg-brand-500 transition-colors z-10"
        aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {sidebarOpen
          ? <ChevronLeft className="w-3.5 h-3.5 text-white" />
          : <ChevronRight className="w-3.5 h-3.5 text-white" />}
      </button>
    </aside>
  );
}
