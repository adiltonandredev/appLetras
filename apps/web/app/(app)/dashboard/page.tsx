import type { Metadata } from 'next';
import type { CelebrationType } from '@rl/types';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { can } from '@rl/utils';
import {
  Music, BookOpen, ClipboardCheck, Plus, ArrowRight,
  Users, Tag, CalendarDays, User, ListMusic, PlusCircle,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, timeAgo, CELEBRATION_ICONS } from '@rl/utils';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const role = await getCurrentRole(session.user.id);
  const userName = session.user.user_metadata?.full_name?.split(' ')[0] ?? 'usuário';

  const isAdmin = can(role, 'users:view');

  const [songsResult, repertoriesResult, pendingResult] = await Promise.all([
    supabase.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    isAdmin
      ? supabase.from('repertories').select('id', { count: 'exact', head: true })
      : supabase.from('repertories').select('id', { count: 'exact', head: true }).eq('created_by', session.user.id),
    can(role, 'songs:approve')
      ? supabase.from('song_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const [recentRepertories, recentSongs] = await Promise.all([
    isAdmin
      ? supabase.from('repertories')
          .select('id, title, celebration, event_date, created_at')
          .order('created_at', { ascending: false })
          .limit(5)
      : supabase.from('repertories')
          .select('id, title, celebration, event_date, created_at')
          .eq('created_by', session.user.id)
          .order('created_at', { ascending: false })
          .limit(5),
    supabase.from('songs')
      .select('id, title, status, created_at, key_note')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const quickLinks = [
    { label: 'Nova Música',      href: '/musicas/nova',        icon: PlusCircle,    color: 'text-brand-600',   bg: 'bg-brand-50',   border: 'border-brand-200',   show: can(role, 'songs:create') },
    { label: 'Novo Repertório',  href: '/repertorios/novo',    icon: ListMusic,     color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', show: true },
    { label: 'Músicas',          href: '/musicas',             icon: Music,         color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',    show: true },
    { label: 'Repertórios',      href: '/repertorios',         icon: BookOpen,      color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200',  show: true },
    { label: 'Aprovações',       href: '/admin/aprovacoes',    icon: ClipboardCheck,color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   show: can(role, 'songs:approve') },
    { label: 'Usuários',         href: '/admin/usuarios',      icon: Users,         color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200',    show: can(role, 'users:view') },
    { label: 'Categorias',       href: '/admin/categorias',    icon: Tag,           color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200',    show: can(role, 'categories:create') },
    { label: 'Celebrações',      href: '/admin/celebracoes',   icon: CalendarDays,  color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  show: can(role, 'categories:create') },
    { label: 'Meu Perfil',       href: '/perfil',              icon: User,          color: 'text-gray-600',    bg: 'bg-gray-100',   border: 'border-gray-200',    show: true },
  ].filter(l => l.show);

  const stats = [
    { label: 'Músicas aprovadas', value: songsResult.count ?? 0, icon: Music, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: isAdmin ? 'Total repertórios' : 'Meus repertórios', value: repertoriesResult.count ?? 0, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    ...(can(role, 'songs:approve') ? [{
      label: 'Aguardando aprovação',
      value: (pendingResult as any).count ?? 0,
      icon: ClipboardCheck,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    }] : []),
  ];

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Greeting ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl sm:text-4xl font-black text-brand-900">
            {greeting}, {userName}! 👋
          </h1>
          <p className="text-gray-400 mt-0.5 text-xs sm:text-base">
            Confira o que está acontecendo no seu repertório.
          </p>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`card p-4 sm:p-6 flex items-center gap-3 sm:gap-4 border-l-4 ${stat.border} hover:shadow-lg transition-shadow`}
          >
            <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon className={`w-5 h-5 sm:w-7 sm:h-7 ${stat.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-none">{stat.value}</p>
              <p className="text-[11px] sm:text-sm text-gray-500 font-medium mt-0.5 leading-tight">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Acesso Rápido ─────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Acesso Rápido
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-9 gap-2 sm:gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border ${link.border} ${link.bg} hover:shadow-md active:scale-95 hover:scale-105 transition-all group`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${link.bg} group-hover:scale-110 transition-transform`}>
                <link.icon className={`w-5 h-5 ${link.color}`} />
              </div>
              <span className={`text-[10px] sm:text-xs font-semibold text-center leading-tight ${link.color}`}>
                {link.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recentes (visível em todos os tamanhos) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Últimos Repertórios */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100">
            <h2 className="font-serif text-base sm:text-xl font-bold text-brand-900">
              {isAdmin ? 'Últimos Repertórios' : 'Repertórios Recentes'}
            </h2>
            <div className="flex items-center gap-1.5">
              <Link href="/repertorios/novo" className="btn-primary py-1 px-2.5 text-xs">
                <Plus className="w-3 h-3" /> Novo
              </Link>
              <Link href="/repertorios" className="btn-ghost py-1 px-2">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {recentRepertories.data?.length === 0 ? (
              <div className="p-8 text-center">
                <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhum repertório ainda.</p>
                <Link href="/repertorios/novo" className="text-xs text-brand-600 font-medium mt-1 inline-block">
                  Criar o primeiro
                </Link>
              </div>
            ) : recentRepertories.data?.map((r) => (
              <Link
                key={r.id}
                href={`/repertorios/${r.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{CELEBRATION_ICONS[((r.celebration || 'outro') as CelebrationType)]}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors truncate max-w-[180px] sm:max-w-none">
                      {r.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {r.event_date ? formatDate(r.event_date) : timeAgo(r.created_at)}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-600 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* Músicas Recentes */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100">
            <h2 className="font-serif text-base sm:text-xl font-bold text-brand-900">Músicas Recentes</h2>
            <div className="flex items-center gap-1.5">
              {can(role, 'songs:create') && (
                <Link href="/musicas/nova" className="btn-primary py-1 px-2.5 text-xs">
                  <Plus className="w-3 h-3" /> Nova
                </Link>
              )}
              <Link href="/musicas" className="btn-ghost py-1 px-2">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSongs.data?.length === 0 ? (
              <div className="p-8 text-center">
                <Music className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhuma música ainda.</p>
              </div>
            ) : recentSongs.data?.map((s) => (
              <Link
                key={s.id}
                href={`/musicas/${s.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors truncate">
                    {s.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {s.key_note ? `Tom: ${s.key_note} · ` : ''}{timeAgo(s.created_at)}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-600 transition-colors shrink-0 ml-2" />
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
