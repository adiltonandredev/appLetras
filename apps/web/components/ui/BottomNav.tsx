'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { can } from '@rl/utils';
import type { UserRole } from '@rl/types';
import {
  LayoutDashboard, Music, BookOpen, UsersRound, ClipboardCheck,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  exact?: boolean;
}

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: 'Início',       href: '/dashboard',       icon: LayoutDashboard, exact: true },
  { label: 'Músicas',      href: '/musicas',          icon: Music },
  { label: 'Repertórios',  href: '/repertorios',      icon: BookOpen },
  { label: 'Grupos',       href: '/grupos',           icon: UsersRound },
  { label: 'Aprovações',   href: '/admin/aprovacoes', icon: ClipboardCheck, permission: 'songs:approve' },
];

interface BottomNavProps {
  role: UserRole;
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();

  const visibleItems = BOTTOM_NAV_ITEMS.filter(
    (item) => !item.permission || can(role, item.permission)
  );

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-stretch safe-area-pb">
      {visibleItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              isActive
                ? 'text-brand-600'
                : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <item.icon className={clsx('w-5 h-5', isActive && 'stroke-[2.5]')} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
